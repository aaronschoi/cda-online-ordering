import { hashSignInCode } from "./passwords.ts"
import type {
  Address,
  ChangeInput,
  ChangePayload,
  ChangeRecord,
  ChangeView,
  ContentPort,
  Failure,
  Ids,
  LineRecord,
  LineView,
  Mailer,
  MapZip,
  OrderActions,
  OrderRecord,
  OrderView,
  Passwords,
  PlaceInput,
  Repo,
  Result,
  Session,
  Sku,
  SkuChoice,
  SquarePort,
  Style,
} from "./types.ts"
import { isSeasonOpen, localToUtc } from "./time.ts"

const sessionDays = 14
const codeMinutes = 10

let tail: Promise<unknown> = Promise.resolve()

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(fn, fn)
  tail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export type OrderingDeps = {
  repo: Repo
  square: SquarePort
  content: ContentPort
  mailer: Mailer
  passwords: Passwords
  ids: Ids
  now(): Date
}

export function createOrdering(deps: OrderingDeps) {
  const { repo, square, content, mailer, passwords, ids, now } = deps

  function fail<T>(error: Failure): Result<T> {
    return { ok: false, error }
  }

  function emailOf(value: string): string | null {
    const email = value.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
    return email
  }

  async function overlap(email: string): Promise<"both" | "staff" | "buyer" | "neither" | "unread"> {
    const [staff, customer] = await Promise.all([repo.findStaff(email), square.customerByEmail(email)])
    if (customer === "unread") return "unread"
    if (staff && customer) return "both"
    if (staff) return "staff"
    if (customer) return "buyer"
    return "neither"
  }

  async function sessionFor(id: string): Promise<Session | null> {
    const session = await repo.findSession(id)
    if (!session) return null
    if (new Date(session.expiresAt).getTime() <= now().getTime()) return null
    return session
  }

  function buyer(session: Session | null): Session | null {
    if (!session || session.role !== "buyer") return null
    return session
  }

  function staff(session: Session | null): Session | null {
    if (!session || session.role !== "staff") return null
    return session
  }

  async function requestBuyerCode(emailInput: string): Promise<Result<{ sent: true }>> {
    const email = emailOf(emailInput)
    if (!email) return fail("refused")
    const who = await overlap(email)
    if (who === "unread") return fail("unreadable")
    if (who === "both" || who === "staff") return fail("refused")
    if (who === "neither") return fail("no-buyer")
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000).padStart(6, "0")
    try {
      await mailer.sendSignInCode(email, code)
    } catch {
      return fail("unreadable")
    }
    const expires = new Date(now().getTime() + codeMinutes * 60_000).toISOString()
    await repo.saveCode(email, await hashSignInCode(email, code), expires)
    return { ok: true, value: { sent: true } }
  }

  async function signInBuyer(emailInput: string, code: string): Promise<Result<Session>> {
    const email = emailOf(emailInput)
    if (!email || !/^\d{6}$/.test(code)) return fail("refused")
    const who = await overlap(email)
    if (who === "unread") return fail("unreadable")
    if (who !== "buyer") return fail(who === "neither" ? "no-buyer" : "refused")
    const saved = await repo.findCode(email)
    if (!saved) return fail("refused")
    if (new Date(saved.expiresAt).getTime() <= now().getTime()) return fail("refused")
    if (saved.codeHash !== (await hashSignInCode(email, code))) return fail("refused")
    const customer = await square.customerByEmail(email)
    if (customer === "unread" || !customer) return fail("unreadable")
    await repo.deleteCode(email)
    const session: Session = {
      id: ids.next(),
      role: "buyer",
      email,
      buyerName: customer.name,
      squareCustomerId: customer.id,
      expiresAt: new Date(now().getTime() + sessionDays * 86_400_000).toISOString(),
    }
    await repo.createSession(session)
    return { ok: true, value: session }
  }

  async function signInStaff(emailInput: string, password: string): Promise<Result<Session>> {
    const email = emailOf(emailInput)
    if (!email || !password) return fail("refused")
    const who = await overlap(email)
    if (who === "unread") return fail("unreadable")
    if (who === "both" || who === "buyer") return fail("refused")
    const member = await repo.findStaff(email)
    if (!member || !(await passwords.verify(password, member.passwordHash))) return fail("refused")
    const session: Session = {
      id: ids.next(),
      role: "staff",
      email,
      buyerName: null,
      squareCustomerId: null,
      expiresAt: new Date(now().getTime() + sessionDays * 86_400_000).toISOString(),
    }
    await repo.createSession(session)
    return { ok: true, value: session }
  }

  async function signOut(sessionId: string): Promise<void> {
    await repo.deleteSession(sessionId)
  }

  function pictureFor(style: Style, color: string): string | null {
    const group = style.skus.filter((sku) => sku.color === color)
    const first = group[0]?.imageUrl
    if (first && group.every((sku) => sku.imageUrl === first)) return first
    return style.imageUrl
  }

  function choiceFrom(style: Style, sku: Sku, onLine: boolean): SkuChoice | null {
    if (sku.priceCents == null) return null
    return {
      skuId: sku.id,
      styleId: style.id,
      styleName: style.name,
      styleDescription: style.description,
      color: sku.color,
      size: sku.size,
      priceCents: sku.priceCents,
      pictureUrl: pictureFor(style, sku.color),
      onLine,
    }
  }

  async function lineFor(session: Session | null): Promise<Result<LineView>> {
    if (!buyer(session)) return fail("forbidden")
    const [season, lineIds, catalog, location, charge, intro, intros] = await Promise.all([
      content.season(),
      content.line(),
      square.catalog(),
      square.location(),
      content.deliveryCharge(),
      content.intro(),
      content.intros(),
    ])
    if (season === "unread" || lineIds === "unread" || catalog === "unread") return fail("unreadable")
    if (!season || !isSeasonOpen(season.startsAt, season.endsAt, now())) return fail("no-season")
    const line = new Set(lineIds)
    const styles = catalog.styles.flatMap((style) => {
      if (!line.has(style.id)) return []
      const skus = style.skus.flatMap((sku) => {
        const choice = choiceFrom(style, sku, true)
        return choice ? [choice] : []
      })
      if (skus.length === 0) return []
      return [{ id: style.id, name: style.name, description: style.description, skus }]
    })
    const deliveryChargeCents =
      charge !== "unread" && charge.enabled && charge.cents > 0 ? charge.cents : null
    return {
      ok: true,
      value: {
        intro: intro === "unread" ? "" : intro,
        intros: intros === "unread" ? { en: "", es: "", ko: "" } : intros,
        seasonName: season.name,
        seasonEndsAt: season.endsAt,
        location: location === "unread" ? null : location,
        deliveryChargeCents,
        styles,
      },
    }
  }

  function parseLines(input: { skuId: string; quantity: number }[]): Result<{ skuId: string; quantity: number }[]> {
    const seen = new Set<string>()
    const lines: { skuId: string; quantity: number }[] = []
    for (const line of input) {
      if (!line.skuId || seen.has(line.skuId)) return fail("bad-quantity")
      if (!Number.isSafeInteger(line.quantity) || line.quantity < 0) return fail("bad-quantity")
      seen.add(line.skuId)
      if (line.quantity === 0) continue
      lines.push({ skuId: line.skuId, quantity: line.quantity })
    }
    if (lines.length === 0) return fail("empty-order")
    return { ok: true, value: lines }
  }

  function parseAddress(input: Address | undefined, required: boolean): Result<Address | null> {
    if (!input) return required ? fail("bad-address") : { ok: true, value: null }
    const street = input.street.trim()
    const city = input.city.trim()
    const state = input.state.trim()
    const zip = input.zip.trim()
    const phone = input.phone.trim()
    if (!street || !city || !state || !zip) return fail("bad-address")
    if (!/^(\d{5})(?:-\d{4})?$/.test(zip)) return fail("bad-address")
    const digits = phone.replace(/\D/g, "")
    if (digits.length < 7) return fail("need-phone")
    return { ok: true, value: { street, city, state, zip, phone } }
  }

  function zip5(zip: string): string {
    return zip.slice(0, 5)
  }

  async function mapZips(): Promise<Result<MapZip[]>> {
    const [named, shapes, toggles] = await Promise.all([
      content.deliveryZips(),
      content.shapes(),
      repo.zipToggles(),
    ])
    if (named === "unread" || shapes === "unread" || toggles === "unread") return fail("unreadable")
    const shapeByCode = new Map(shapes.map((shape) => [shape.code, shape]))
    const zips: MapZip[] = []
    for (const zip of named) {
      const shape = shapeByCode.get(zip.code)
      if (!shape) continue
      zips.push({ code: zip.code, name: zip.name, open: toggles[zip.code] === true, rings: shape.rings })
    }
    return { ok: true, value: zips }
  }

  async function openZip(code: string): Promise<Result<boolean>> {
    const map = await mapZips()
    if (!map.ok) return fail("delivery-unavailable")
    const zip = map.value.find((item) => item.code === code)
    if (!zip) return fail("zip-closed")
    return { ok: true, value: zip.open }
  }

  function findSku(styles: Style[], skuId: string): { style: Style; sku: Sku } | null {
    for (const style of styles) {
      const sku = style.skus.find((item) => item.id === skuId)
      if (sku) return { style, sku }
    }
    return null
  }

  function quantitiesDiffer(
    current: { skuId: string; quantity: number }[],
    next: { skuId: string; quantity: number }[],
  ): boolean {
    if (current.length !== next.length) return true
    const bySku = new Map(current.map((line) => [line.skuId, line.quantity]))
    return next.some((line) => bySku.get(line.skuId) !== line.quantity)
  }

  function covered(
    lines: { skuId: string; quantity: number }[],
    onHand: Record<string, number>,
    reservations: { orderId: string; skuId: string; quantity: number }[],
    orderId: string | null,
  ): boolean {
    return lines.every((line) => {
      const others = reservations
        .filter((row) => row.skuId === line.skuId && row.orderId !== orderId)
        .reduce((sum, row) => sum + row.quantity, 0)
      return (onHand[line.skuId] ?? 0) - others >= line.quantity
    })
  }

  function goodsCents(lines: { priceCents: number; quantity: number }[]): number {
    return lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0)
  }

  function changeView(change: ChangeRecord | null): ChangeView | null {
    if (!change) return null
    return {
      id: change.id,
      lines: change.payload.lines.map((line) => ({
        skuId: line.skuId,
        styleName: line.styleName,
        color: line.color,
        size: line.size,
        quantity: line.quantity,
        priceCents: line.priceCents,
      })),
      scheduledLocal: change.payload.scheduledLocal,
      address: change.payload.address,
      deliveryNote: change.payload.deliveryNote,
    }
  }

  function actionsFor(order: OrderRecord, waiting: boolean): OrderActions {
    const open = order.step === "proposed" || order.step === "reserved" || order.step === "prepared"
    let advance: OrderActions["advance"] = null
    if (order.step === "proposed" && order.confirmation === "confirmed") advance = "reserved"
    if (order.step === "reserved") advance = "prepared"
    if (order.step === "prepared" && order.confirmation === "confirmed" && !waiting) advance = "completed"
    return {
      confirm: order.confirmation === "unconfirmed" && open,
      advance,
      cancel: open,
      approve: waiting,
      deny: waiting,
    }
  }

  async function viewOrder(
    order: OrderRecord,
    lines: LineRecord[],
    waiting: ChangeRecord | null,
    onHand: Record<string, number> | "unread" | "omit",
  ): Promise<OrderView> {
    const showHand = onHand !== "omit"
    return {
      id: order.id,
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName,
      seasonName: order.seasonName,
      fulfillment: order.fulfillment,
      scheduledLocal: order.scheduledLocal,
      scheduledAt: order.scheduledAt,
      confirmation: order.confirmation,
      step: order.step,
      lines: lines.map((line) => ({
        skuId: line.skuId,
        styleName: line.styleName,
        styleDescription: line.styleDescription,
        color: line.color,
        size: line.size,
        quantity: line.quantity,
        priceCents: line.priceCents,
        ...(showHand ? { unitsOnHand: onHand === "unread" ? null : (onHand[line.skuId] ?? 0) } : {}),
      })),
      goodsCents: goodsCents(lines),
      deliveryChargeCents: order.deliveryChargeCents,
      address: order.address,
      deliveryNote: order.deliveryNote,
      waitingChange: changeView(waiting),
      ...(showHand
        ? { actions: actionsFor(order, waiting != null), unitsOnHandUnreadable: onHand === "unread" }
        : {}),
    }
  }

  async function loadOrder(id: string) {
    const order = await repo.order(id)
    if (!order) return null
    const [lines, waiting] = await Promise.all([repo.lines(id), repo.waitingChange(id)])
    return { order, lines, waiting }
  }

  async function ordersFor(session: Session | null): Promise<Result<OrderView[]>> {
    if (!session) return fail("forbidden")
    const all = await repo.orders()
    const visible = session.role === "staff" ? all : all.filter((order) => order.buyerEmail === session.email)
    const [allLines, waiting] = await Promise.all([repo.allLines(), repo.waitingChanges()])
    let onHand: Record<string, number> | "unread" | "omit" = "omit"
    if (session.role === "staff") {
      const location = await square.location()
      if (location === "unread") onHand = "unread"
      else {
        const skuIds = [...new Set(allLines.map((line) => line.skuId))]
        onHand = skuIds.length === 0 ? {} : await square.onHand(skuIds, location.id)
      }
    }
    const views: OrderView[] = []
    for (const order of visible) {
      views.push(
        await viewOrder(
          order,
          allLines.filter((line) => line.orderId === order.id),
          waiting.find((change) => change.orderId === order.id) ?? null,
          onHand,
        ),
      )
    }
    return { ok: true, value: views }
  }

  async function orderFor(session: Session | null, orderId: string): Promise<Result<OrderView>> {
    if (!session) return fail("forbidden")
    const loaded = await loadOrder(orderId)
    if (!loaded) return fail("not-found")
    if (session.role === "buyer" && loaded.order.buyerEmail !== session.email) return fail("not-found")
    let onHand: Record<string, number> | "unread" | "omit" = "omit"
    if (session.role === "staff") {
      const location = await square.location()
      if (location === "unread") onHand = "unread"
      else onHand = await square.onHand(loaded.lines.map((line) => line.skuId), location.id)
    }
    return { ok: true, value: await viewOrder(loaded.order, loaded.lines, loaded.waiting, onHand) }
  }

  async function placeOrder(session: Session | null, input: PlaceInput): Promise<Result<OrderView>> {
    const actor = buyer(session)
    if (!actor) return fail("forbidden")
    const parsed = parseLines(input.lines)
    if (!parsed.ok) return parsed
    if (input.fulfillment !== "pickup" && input.fulfillment !== "delivery") return fail("cannot-switch")
    const address = parseAddress(input.address, input.fulfillment === "delivery")
    if (!address.ok) return address
    if (input.fulfillment === "pickup" && (input.address || input.deliveryNote)) return fail("cannot-switch")
    const note = input.deliveryNote?.trim() ? input.deliveryNote.trim() : null

    const [season, charge, lineIds, catalog, location] = await Promise.all([
      content.season(),
      content.deliveryCharge(),
      content.line(),
      square.catalog(),
      square.location(),
    ])
    if (season === "unread" || charge === "unread" || lineIds === "unread" || catalog === "unread" || location === "unread") {
      return fail("unreadable")
    }
    if (!Number.isSafeInteger(charge.cents) || charge.cents < 0) return fail("unreadable")
    if (!season || !isSeasonOpen(season.startsAt, season.endsAt, now())) return fail("no-season")
    const when = localToUtc(input.scheduledLocal, location.timezone)
    if (!when || when.getTime() > new Date(season.endsAt).getTime()) return fail("bad-time")

    const line = new Set(lineIds)
    const snapshots: LineRecord[] = []
    for (const wanted of parsed.value) {
      const found = findSku(catalog.styles, wanted.skuId)
      if (!found || found.sku.priceCents == null) return fail("missing-price")
      if (!line.has(found.style.id)) return fail("not-on-line")
      snapshots.push({
        id: ids.next(),
        orderId: "",
        skuId: found.sku.id,
        styleId: found.style.id,
        styleName: found.style.name,
        styleDescription: found.style.description,
        color: found.sku.color,
        size: found.sku.size,
        quantity: wanted.quantity,
        priceCents: found.sku.priceCents,
      })
    }

    const deliveryChargeCents =
      input.fulfillment === "delivery" && charge.enabled && charge.cents > 0 ? charge.cents : null

    return serialize(async () => {
      if (input.fulfillment === "delivery") {
        const zip = address.value ? zip5(address.value.zip) : ""
        const opened = await openZip(zip)
        if (!opened.ok) {
          if (opened.error === "delivery-unavailable") return opened
          return fail("delivery-closed")
        }
        if (!opened.value) return fail("delivery-closed")
      }
      const onHand = await square.onHand(
        snapshots.map((line) => line.skuId),
        location.id,
      )
      if (onHand === "unread") return fail("unreadable")
      const reservations = await repo.activeReservations()
      const confirmation = covered(snapshots, onHand, reservations, null) ? "confirmed" : "unconfirmed"
      const orderId = ids.next()
      const order: OrderRecord = {
        id: orderId,
        buyerEmail: actor.email,
        buyerName: actor.buyerName ?? actor.email,
        seasonName: season.name,
        seasonEndsAt: season.endsAt,
        fulfillment: input.fulfillment,
        scheduledAt: when.toISOString(),
        scheduledLocal: input.scheduledLocal,
        confirmation,
        step: "proposed",
        deliveryChargeCents,
        address: input.fulfillment === "delivery" ? address.value : null,
        deliveryNote: input.fulfillment === "delivery" ? note : null,
        placedAt: now().toISOString(),
      }
      const lines = snapshots.map((line) => ({ ...line, orderId }))
      await repo.insertPlaced(order, lines)
      return { ok: true as const, value: await viewOrder(order, lines, null, "omit") }
    })
  }

  async function submitChange(session: Session | null, orderId: string, input: ChangeInput): Promise<Result<OrderView>> {
    const actor = buyer(session)
    if (!actor) return fail("forbidden")
    const loaded = await loadOrder(orderId)
    if (!loaded || loaded.order.buyerEmail !== actor.email) return fail("not-found")
    if (loaded.order.step === "completed" || loaded.order.step === "canceled") return fail("cannot-advance")
    if (loaded.waiting) return fail("waiting")
    if (input.fulfillment && input.fulfillment !== loaded.order.fulfillment) return fail("cannot-switch")
    const parsed = parseLines(input.lines)
    if (!parsed.ok) return parsed

    const [hours, lineIds, catalog, location] = await Promise.all([
      content.cutoffHours(),
      content.line(),
      square.catalog(),
      square.location(),
    ])
    if (hours === "unread" || lineIds === "unread" || catalog === "unread" || location === "unread") return fail("unreadable")
    if (!Number.isSafeInteger(hours) || hours < 0) return fail("unreadable")
    const cutoff = new Date(loaded.order.scheduledAt).getTime() - hours * 3_600_000
    if (now().getTime() > cutoff) return fail("cutoff")

    const scheduledLocal = input.scheduledLocal ?? loaded.order.scheduledLocal
    const when = localToUtc(scheduledLocal, location.timezone)
    if (!when || when.getTime() > new Date(loaded.order.seasonEndsAt).getTime()) return fail("bad-time")

    let address = loaded.order.address
    if (loaded.order.fulfillment === "pickup" && (input.address || input.deliveryNote !== undefined)) {
      return fail("cannot-switch")
    }
    if (loaded.order.fulfillment === "delivery" && input.address) {
      const parsedAddress = parseAddress(input.address, true)
      if (!parsedAddress.ok) return parsedAddress
      address = parsedAddress.value
    }
    const deliveryNote =
      loaded.order.fulfillment === "delivery"
        ? input.deliveryNote !== undefined
          ? input.deliveryNote.trim() || null
          : loaded.order.deliveryNote
        : null

    const line = new Set(lineIds)
    const currentBySku = new Map(loaded.lines.map((row) => [row.skuId, row]))
    const payloadLines: ChangePayload["lines"] = []
    for (const wanted of parsed.value) {
      const existing = currentBySku.get(wanted.skuId)
      if (existing) {
        payloadLines.push({
          skuId: existing.skuId,
          quantity: wanted.quantity,
          styleId: existing.styleId,
          styleName: existing.styleName,
          styleDescription: existing.styleDescription,
          color: existing.color,
          size: existing.size,
          priceCents: existing.priceCents,
          existing: true,
        })
        continue
      }
      const found = findSku(catalog.styles, wanted.skuId)
      if (!found || !line.has(found.style.id)) return fail("not-on-line")
      payloadLines.push({
        skuId: found.sku.id,
        quantity: wanted.quantity,
        styleId: found.style.id,
        styleName: found.style.name,
        styleDescription: found.style.description,
        color: found.sku.color,
        size: found.sku.size,
        priceCents: null,
        existing: false,
      })
    }

    const change: ChangeRecord = {
      id: ids.next(),
      orderId,
      status: "waiting",
      submittedAt: now().toISOString(),
      decidedAt: null,
      payload: {
        lines: payloadLines,
        scheduledLocal,
        scheduledAt: when.toISOString(),
        address,
        deliveryNote,
      },
    }
    await repo.insertChange(change)
    return { ok: true, value: await viewOrder(loaded.order, loaded.lines, change, "omit") }
  }

  async function withdrawChange(session: Session | null, orderId: string): Promise<Result<OrderView>> {
    const actor = buyer(session)
    if (!actor) return fail("forbidden")
    const loaded = await loadOrder(orderId)
    if (!loaded || loaded.order.buyerEmail !== actor.email) return fail("not-found")
    if (!loaded.waiting) return fail("not-found")
    await repo.setChangeStatus(loaded.waiting.id, "withdrawn", now().toISOString())
    return { ok: true, value: await viewOrder(loaded.order, loaded.lines, null, "omit") }
  }

  async function approveChange(session: Session | null, orderId: string): Promise<Result<OrderView>> {
    if (!staff(session)) return fail("forbidden")
    const loaded = await loadOrder(orderId)
    if (!loaded) return fail("not-found")
    if (!loaded.waiting) return fail("not-found")
    const change = loaded.waiting
    return serialize(async () => {
      const fresh = await loadOrder(orderId)
      if (!fresh?.waiting || fresh.waiting.id !== change.id) return fail("not-found")
      const payload = fresh.waiting.payload
      if (fresh.order.fulfillment === "delivery" && payload.address) {
        const nextZip = zip5(payload.address.zip)
        const currentZip = fresh.order.address ? zip5(fresh.order.address.zip) : ""
        if (nextZip !== currentZip) {
          const opened = await openZip(nextZip)
          if (!opened.ok) return fail(opened.error === "delivery-unavailable" ? "unreadable" : "zip-closed")
          if (!opened.value) return fail("zip-closed")
        }
      }
      const priced = payload.lines.map((line) => ({ ...line }))
      if (priced.some((line) => !line.existing)) {
        const catalog = await square.catalog()
        if (catalog === "unread") return fail("unreadable")
        for (const line of priced) {
          if (line.existing) continue
          const found = findSku(catalog.styles, line.skuId)
          if (!found || found.sku.priceCents == null) return fail("missing-price")
          line.priceCents = found.sku.priceCents
        }
      }
      const changed = quantitiesDiffer(fresh.lines, priced)
      let confirmation = fresh.order.confirmation
      if (changed) {
        const location = await square.location()
        if (location === "unread") return fail("unreadable")
        const onHand = await square.onHand(
          priced.map((line) => line.skuId),
          location.id,
        )
        if (onHand === "unread") return fail("unreadable")
        const reservations = await repo.activeReservations()
        confirmation = covered(priced, onHand, reservations, fresh.order.id) ? "confirmed" : "unconfirmed"
      }
      const lines: LineRecord[] = priced.map((line) => ({
        id: ids.next(),
        orderId: fresh.order.id,
        skuId: line.skuId,
        styleId: line.styleId,
        styleName: line.styleName,
        styleDescription: line.styleDescription,
        color: line.color,
        size: line.size,
        quantity: line.quantity,
        priceCents: line.priceCents ?? 0,
      }))
      const order: OrderRecord = {
        ...fresh.order,
        scheduledAt: payload.scheduledAt,
        scheduledLocal: payload.scheduledLocal,
        confirmation,
        address: fresh.order.fulfillment === "delivery" ? payload.address : null,
        deliveryNote: fresh.order.fulfillment === "delivery" ? payload.deliveryNote : null,
      }
      await repo.applyChange(order, lines, fresh.waiting.id, now().toISOString())
      const location = await square.location()
      const onHand =
        location === "unread" ? "unread" : await square.onHand(lines.map((line) => line.skuId), location.id)
      return { ok: true as const, value: await viewOrder(order, lines, null, onHand) }
    })
  }

  async function denyChange(session: Session | null, orderId: string): Promise<Result<OrderView>> {
    if (!staff(session)) return fail("forbidden")
    const loaded = await loadOrder(orderId)
    if (!loaded?.waiting) return fail("not-found")
    await repo.setChangeStatus(loaded.waiting.id, "denied", now().toISOString())
    return orderFor(session, orderId)
  }

  async function confirmOrder(session: Session | null, orderId: string): Promise<Result<OrderView>> {
    if (!staff(session)) return fail("forbidden")
    const loaded = await loadOrder(orderId)
    if (!loaded) return fail("not-found")
    if (loaded.order.confirmation !== "unconfirmed") return fail("cannot-advance")
    if (loaded.order.step === "completed" || loaded.order.step === "canceled") return fail("cannot-advance")
    await repo.setConfirmation(orderId, "confirmed")
    return orderFor(session, orderId)
  }

  async function advanceOrder(session: Session | null, orderId: string): Promise<Result<OrderView>> {
    if (!staff(session)) return fail("forbidden")
    return serialize(async () => {
      const loaded = await loadOrder(orderId)
      if (!loaded) return fail("not-found")
      const waiting = loaded.waiting != null
      const { step, confirmation } = loaded.order
      if (step === "proposed") {
        if (confirmation !== "confirmed") return fail("unconfirmed")
        await repo.setStep(orderId, "reserved")
      } else if (step === "reserved") {
        await repo.setStep(orderId, "prepared")
      } else if (step === "prepared") {
        if (confirmation !== "confirmed") return fail("unconfirmed")
        if (waiting) return fail("change-waiting")
        await repo.complete(orderId)
      } else {
        return fail("cannot-advance")
      }
      return orderFor(session, orderId)
    })
  }

  async function cancelOrder(session: Session | null, orderId: string): Promise<Result<OrderView>> {
    if (!staff(session)) return fail("forbidden")
    return serialize(async () => {
      const loaded = await loadOrder(orderId)
      if (!loaded) return fail("not-found")
      if (loaded.order.step === "completed" || loaded.order.step === "canceled") return fail("cannot-advance")
      await repo.cancel(orderId, now().toISOString())
      return orderFor(session, orderId)
    })
  }

  async function deliveryMap(session: Session | null): Promise<Result<MapZip[]>> {
    if (!staff(session)) return fail("forbidden")
    return mapZips()
  }

  async function setDeliveryZip(session: Session | null, code: string, open: boolean): Promise<Result<MapZip[]>> {
    if (!staff(session)) return fail("forbidden")
    const map = await mapZips()
    if (!map.ok) return map
    if (!map.value.some((zip) => zip.code === code)) return fail("not-on-map")
    await repo.setZipToggle(code, open)
    return mapZips()
  }

  async function changeChoices(session: Session | null, orderId: string): Promise<Result<SkuChoice[]>> {
    const actor = buyer(session)
    if (!actor) return fail("forbidden")
    const loaded = await loadOrder(orderId)
    if (!loaded || loaded.order.buyerEmail !== actor.email) return fail("not-found")
    const [lineIds, catalog] = await Promise.all([content.line(), square.catalog()])
    if (lineIds === "unread" || catalog === "unread") return fail("unreadable")
    const line = new Set(lineIds)
    const choices: SkuChoice[] = []
    const seen = new Set<string>()
    for (const style of catalog.styles) {
      if (!line.has(style.id)) continue
      for (const sku of style.skus) {
        const choice = choiceFrom(style, sku, true)
        if (!choice) continue
        choices.push(choice)
        seen.add(sku.id)
      }
    }
    for (const row of loaded.lines) {
      if (seen.has(row.skuId)) continue
      choices.push({
        skuId: row.skuId,
        styleId: row.styleId,
        styleName: row.styleName,
        styleDescription: row.styleDescription,
        color: row.color,
        size: row.size,
        priceCents: row.priceCents,
        pictureUrl: null,
        onLine: false,
      })
    }
    return { ok: true, value: choices }
  }

  return {
    requestBuyerCode,
    signInBuyer,
    signInStaff,
    signOut,
    sessionFor,
    lineFor,
    placeOrder,
    ordersFor,
    orderFor,
    submitChange,
    withdrawChange,
    approveChange,
    denyChange,
    confirmOrder,
    advanceOrder,
    cancelOrder,
    deliveryMap,
    setDeliveryZip,
    changeChoices,
  }
}

export type Ordering = ReturnType<typeof createOrdering>
