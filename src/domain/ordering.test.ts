import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import geoText from "../content/delivery-zips.geojson?raw"

const geo = JSON.parse(geoText) as {
  features: { geometry: { type: string; coordinates: number[][][] }; properties: { code: string } }[]
}
import { schemaSql } from "../adapters/schema.ts"
import { fixtureContentBase, fixtureCustomers, fixtureOnHand, fixtureStyles } from "./fixture.ts"
import { createMemoryRepo } from "./memory-repo.ts"
import { createOrdering, type Ordering } from "./ordering.ts"
import { createPasswords } from "./passwords.ts"
import type { ContentData, ContentPort, PlaceInput, Session, SquarePort, Style, ZipShape } from "./types.ts"

const shapes: ZipShape[] = geo.features.flatMap((feature) => {
  if (feature.geometry.type !== "Polygon") return []
  return [{ code: String(feature.properties.code), rings: feature.geometry.coordinates }]
})

function contentData(): ContentData {
  return {
    ...structuredClone(fixtureContentBase),
    shapes: structuredClone(shapes),
  }
}

function mutableContent(data: ContentData) {
  const fail = {
    season: false,
    line: false,
    charge: false,
    cutoff: false,
    zips: false,
    shapes: false,
    intro: false,
  }
  const port: ContentPort = {
    async season() {
      return fail.season ? "unread" : data.season
    },
    async line() {
      return fail.line ? "unread" : data.lineStyleIds
    },
    async deliveryCharge() {
      return fail.charge ? "unread" : { enabled: data.deliveryChargeEnabled, cents: data.deliveryChargeCents }
    },
    async cutoffHours() {
      return fail.cutoff ? "unread" : data.changeCutoffHours
    },
    async deliveryZips() {
      return fail.zips ? "unread" : data.deliveryZips
    },
    async shapes() {
      return fail.shapes ? "unread" : data.shapes
    },
    async intro() {
      return fail.intro ? "unread" : data.intro
    },
  }
  return { port, data, fail }
}

function mutableSquare() {
  const customers = structuredClone(fixtureCustomers)
  const styles: Style[] = structuredClone(fixtureStyles)
  const onHand = { ...fixtureOnHand }
  const fail = { customer: false, location: false, catalog: false, onHand: false }
  let onHandImpl: SquarePort["onHand"] | null = null
  const port: SquarePort = {
    async customerByEmail(email) {
      if (fail.customer) return "unread"
      return customers.find((customer) => customer.email === email) ?? null
    },
    async location() {
      if (fail.location) return "unread"
      return {
        id: "loc_cda",
        name: "CDA",
        address: "2148 Sunset Blvd, Los Angeles, CA 90026",
        timezone: "America/Los_Angeles",
      }
    },
    async catalog() {
      if (fail.catalog) return "unread"
      return { styles }
    },
    async onHand(skuIds, locationId) {
      if (onHandImpl) return onHandImpl(skuIds, locationId)
      if (fail.onHand) return "unread"
      const counts: Record<string, number> = {}
      for (const id of skuIds) counts[id] = onHand[id] ?? 0
      return counts
    },
  }
  return {
    port,
    customers,
    styles,
    onHand,
    fail,
    setOnHand(fn: SquarePort["onHand"]) {
      onHandImpl = fn
    },
  }
}

function outbox() {
  const messages: { email: string; code: string }[] = []
  return {
    messages,
    mailer: {
      async sendSignInCode(email: string, code: string) {
        messages.push({ email, code })
      },
    },
    last(email: string) {
      return [...messages].reverse().find((message) => message.email === email)?.code ?? ""
    },
  }
}

async function world() {
  let now = new Date("2026-10-27T18:00:00.000Z")
  const repo = createMemoryRepo({
    togglesUnreadable: () => togglesUnreadable,
  })
  let togglesUnreadable = false
  const passwords = createPasswords()
  await repo.insertStaff("staff@cda.example", await passwords.hash("cda-staff"))
  const mail = outbox()
  const square = mutableSquare()
  const content = mutableContent(contentData())
  let n = 0
  const ordering = createOrdering({
    repo,
    square: square.port,
    content: content.port,
    mailer: mail.mailer,
    passwords,
    ids: { next: () => `id-${++n}` },
    now: () => now,
  })
  return {
    ordering,
    mail,
    square,
    content,
    setNow(date: Date) {
      now = date
    },
    setTogglesUnreadable(value: boolean) {
      togglesUnreadable = value
    },
  }
}

type World = Awaited<ReturnType<typeof world>>

async function asBuyer(app: World, email = "buyer@atelier.example"): Promise<Session> {
  const sent = await app.ordering.requestBuyerCode(email)
  expect(sent.ok).toBe(true)
  const signed = await app.ordering.signInBuyer(email, app.mail.last(email))
  if (!signed.ok) throw new Error(signed.error)
  return signed.value
}

async function asStaff(app: World): Promise<Session> {
  const signed = await app.ordering.signInStaff("staff@cda.example", "cda-staff")
  if (!signed.ok) throw new Error(signed.error)
  return signed.value
}

function pickup(skuId = "jacket-indigo-1", quantity = 1, scheduledLocal = "2026-11-12T10:00"): PlaceInput {
  return { lines: [{ skuId, quantity }], fulfillment: "pickup", scheduledLocal }
}

function delivery(skuId = "jacket-indigo-1", quantity = 1, zip = "90026"): PlaceInput {
  return {
    lines: [{ skuId, quantity }],
    fulfillment: "delivery",
    scheduledLocal: "2026-11-12T10:00",
    address: { street: "100 Echo Park Ave", city: "Los Angeles", state: "CA", zip, phone: "213-555-0100" },
    deliveryNote: "Leave at the side door",
  }
}

async function placed(ordering: Ordering, session: Session, input: PlaceInput = pickup()) {
  const result = await ordering.placeOrder(session, input)
  if (!result.ok) throw new Error(result.error)
  return result.value
}

async function countOrders(app: World) {
  const staff = await asStaff(app)
  const orders = await app.ordering.ordersFor(staff)
  if (!orders.ok) throw new Error(orders.error)
  return orders.value.length
}

describe("ordering", () => {
  it("keeps the D1 migration equal to the schema the worker applies", () => {
    const file = readFileSync(new URL("../../migrations/0001_init.sql", import.meta.url), "utf8")
    expect(file.trim()).toBe(schemaSql.trim())
  })

  it("refuses sign-in when the email is Staff and a Buyer", async () => {
    const app = await world()
    app.square.customers.push({ id: "cust_staff", email: "staff@cda.example", name: "Staff Buyer" })
    expect(await app.ordering.requestBuyerCode("staff@cda.example")).toEqual({ ok: false, error: "refused" })
    expect(await app.ordering.signInStaff("staff@cda.example", "cda-staff")).toEqual({ ok: false, error: "refused" })
  })

  it("sends a sign-in code only for a Square Customer and does not return the code", async () => {
    const app = await world()
    const sent = await app.ordering.requestBuyerCode("buyer@atelier.example")
    expect(sent).toEqual({ ok: true, value: { sent: true } })
    expect(app.mail.messages).toEqual([{ email: "buyer@atelier.example", code: expect.stringMatching(/^\d{6}$/) }])
    expect(await app.ordering.requestBuyerCode("nobody@example.com")).toEqual({ ok: false, error: "no-buyer" })
    expect(await app.ordering.signInBuyer("buyer@atelier.example", "000000")).toEqual({ ok: false, error: "refused" })
  })

  it("shows the Line only after the Buyer signs in, without units on hand", async () => {
    const app = await world()
    expect((await app.ordering.lineFor(null)).ok).toBe(false)
    const session = await asBuyer(app)
    const line = await app.ordering.lineFor(session)
    if (!line.ok) throw new Error(line.error)
    const skus = line.value.styles.flatMap((style) => style.skus)
    const ids = skus.map((sku) => sku.skuId)
    expect(ids).toContain("jacket-indigo-2")
    expect(ids).not.toContain("jacket-undyed-1")
    expect(ids).not.toContain("scarf-camel")
    expect(JSON.stringify(line.value)).not.toContain("unitsOnHand")
    const indigo = skus.find((sku) => sku.skuId === "jacket-indigo-1")
    const clay = skus.find((sku) => sku.skuId === "jacket-clay-1")
    expect(indigo?.pictureUrl).toBe(fixtureStyles[0]?.skus[0]?.imageUrl)
    expect(clay?.pictureUrl).toBe(fixtureStyles[0]?.imageUrl)
    expect(indigo?.priceCents).toBe(24000)
  })

  it("stores nothing when the Season, a price, units on hand, or the Delivery charge cannot be read", async () => {
    const app = await world()
    const session = await asBuyer(app)
    app.content.data.season = null
    expect(await app.ordering.placeOrder(session, pickup())).toEqual({ ok: false, error: "no-season" })
    app.content.data.season = contentData().season
    expect(await app.ordering.placeOrder(session, pickup("scarf-camel"))).toEqual({ ok: false, error: "not-on-line" })
    expect(await app.ordering.placeOrder(session, pickup("jacket-undyed-1"))).toEqual({ ok: false, error: "missing-price" })
    app.square.fail.onHand = true
    expect(await app.ordering.placeOrder(session, pickup())).toEqual({ ok: false, error: "unreadable" })
    app.square.fail.onHand = false
    app.content.fail.charge = true
    expect(await app.ordering.placeOrder(session, pickup())).toEqual({ ok: false, error: "unreadable" })
    expect(await countOrders(app)).toBe(0)
  })

  it("places Pickup with no Delivery charge and fixes a Delivery charge", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    await app.ordering.setDeliveryZip(staff, "90026", true)
    const picked = await placed(app.ordering, session, pickup("jacket-indigo-1", 2))
    expect(picked.deliveryChargeCents).toBeNull()
    expect(picked.goodsCents).toBe(48000)
    expect(picked.scheduledAt).toBe("2026-11-12T18:00:00.000Z")
    expect(picked.confirmation).toBe("confirmed")
    expect(picked.step).toBe("proposed")
    const delivered = await placed(app.ordering, session, delivery())
    expect(delivered.deliveryChargeCents).toBe(1500)
    expect(delivered.address?.zip).toBe("90026")
    app.content.data.deliveryChargeCents = 9999
    const again = await app.ordering.orderFor(session, delivered.id)
    if (!again.ok) throw new Error(again.error)
    expect(again.value.deliveryChargeCents).toBe(1500)
    app.content.data.deliveryChargeEnabled = false
    const free = await placed(app.ordering, session, delivery())
    expect(free.deliveryChargeCents).toBeNull()
  })

  it("checks the Delivery zip again at place and still allows Pickup", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    expect(await app.ordering.placeOrder(session, delivery())).toEqual({ ok: false, error: "delivery-closed" })
    expect(await app.ordering.placeOrder(session, { ...delivery(), address: undefined })).toEqual({
      ok: false,
      error: "bad-address",
    })
    expect(await app.ordering.placeOrder(session, delivery("jacket-indigo-1", 1, "90026-1234"))).toEqual({
      ok: false,
      error: "delivery-closed",
    })
    await app.ordering.setDeliveryZip(staff, "90026", true)
    const order = await placed(app.ordering, session, delivery("jacket-indigo-1", 1, "90026-1234"))
    expect(order.address?.zip).toBe("90026-1234")
    expect(await app.ordering.placeOrder(session, { ...delivery(), address: { ...delivery().address!, phone: "no" } })).toEqual({
      ok: false,
      error: "need-phone",
    })
    app.setTogglesUnreadable(true)
    expect(await app.ordering.placeOrder(session, delivery())).toEqual({ ok: false, error: "delivery-unavailable" })
    const pickupOrder = await placed(app.ordering, session, pickup())
    expect(pickupOrder.fulfillment).toBe("pickup")
  })

  it("marks an Order Unconfirmed when units on hand do not cover it, and a later place sees the Reservation", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const over = await placed(app.ordering, session, pickup("jacket-indigo-1", 5))
    expect(over.confirmation).toBe("unconfirmed")
    const first = await placed(app.ordering, session, pickup("jacket-indigo-2", 1))
    expect(first.confirmation).toBe("unconfirmed")
    app.square.onHand["jacket-indigo-1"] = 1
    const held = await placed(app.ordering, session, pickup("trouser-ink-30", 6))
    expect(held.confirmation).toBe("confirmed")
    const next = await placed(app.ordering, session, pickup("trouser-ink-30", 1))
    expect(next.confirmation).toBe("unconfirmed")
  })

  it("lets one place see the Reservation the other place is still writing", async () => {
    const app = await world()
    const session = await asBuyer(app)
    let started = 0
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    app.square.setOnHand(async () => {
      started += 1
      if (started === 1) await gate
      return { "jacket-indigo-1": 1 }
    })
    const first = app.ordering.placeOrder(session, pickup())
    for (let i = 0; i < 50 && started < 1; i++) await new Promise((resolve) => setTimeout(resolve, 5))
    const second = app.ordering.placeOrder(session, pickup())
    release()
    const [a, b] = await Promise.all([first, second])
    if (!a.ok || !b.ok) throw new Error("place failed")
    expect(a.value.confirmation).toBe("confirmed")
    expect(b.value.confirmation).toBe("unconfirmed")
  })

  it("does not confirm on a restock or unconfirm when units on hand drop", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    const order = await placed(app.ordering, session, pickup("jacket-indigo-2", 1))
    expect(order.confirmation).toBe("unconfirmed")
    app.square.onHand["jacket-indigo-2"] = 10
    const reread = await app.ordering.orderFor(staff, order.id)
    if (!reread.ok) throw new Error(reread.error)
    expect(reread.value.confirmation).toBe("unconfirmed")
    expect(reread.value.lines[0]?.unitsOnHand).toBe(10)
    await app.ordering.confirmOrder(staff, order.id)
    app.square.onHand["jacket-indigo-2"] = 0
    const confirmed = await app.ordering.orderFor(staff, order.id)
    if (!confirmed.ok) throw new Error(confirmed.error)
    expect(confirmed.value.confirmation).toBe("confirmed")
    expect(confirmed.value.lines[0]?.unitsOnHand).toBe(0)
  })

  it("moves a Confirmed Order one step at a time and releases the Reservation when Completed or Canceled", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    const order = await placed(app.ordering, session, pickup("jacket-indigo-1", 4))
    expect(order.actions).toBeUndefined()
    const proposed = await app.ordering.orderFor(staff, order.id)
    if (!proposed.ok) throw new Error(proposed.error)
    expect(proposed.value.actions?.advance).toBe("reserved")
    await app.ordering.advanceOrder(staff, order.id)
    await app.ordering.advanceOrder(staff, order.id)
    const prepared = await app.ordering.advanceOrder(staff, order.id)
    if (!prepared.ok) throw new Error(prepared.error)
    expect(prepared.value.step).toBe("completed")
    expect(await app.ordering.advanceOrder(staff, order.id)).toEqual({ ok: false, error: "cannot-advance" })
    const again = await placed(app.ordering, session, pickup("jacket-indigo-1", 4))
    expect(again.confirmation).toBe("confirmed")
    const blocked = await placed(app.ordering, session, pickup("jacket-clay-1", 1))
    expect((await app.ordering.advanceOrder(staff, blocked.id)).ok).toBe(true)
    await app.ordering.cancelOrder(staff, again.id)
    const freed = await placed(app.ordering, session, pickup("jacket-indigo-1", 4))
    expect(freed.confirmation).toBe("confirmed")
  })

  it("keeps an Unconfirmed Order on Proposed and blocks Completed while a Change request is waiting", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    const order = await placed(app.ordering, session, pickup("jacket-indigo-1", 5))
    expect(await app.ordering.advanceOrder(staff, order.id)).toEqual({ ok: false, error: "unconfirmed" })
    await app.ordering.confirmOrder(staff, order.id)
    await app.ordering.advanceOrder(staff, order.id)
    await app.ordering.submitChange(session, order.id, { lines: [{ skuId: "jacket-indigo-1", quantity: 5 }], deliveryNote: undefined })
    await app.ordering.advanceOrder(staff, order.id)
    expect(await app.ordering.advanceOrder(staff, order.id)).toEqual({ ok: false, error: "change-waiting" })
    await app.ordering.denyChange(staff, order.id)
    const done = await app.ordering.advanceOrder(staff, order.id)
    if (!done.ok) throw new Error(done.error)
    expect(done.value.step).toBe("completed")
  })

  it("Cancel denies a waiting Change request and drops the Reservation", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    const order = await placed(app.ordering, session, pickup("trouser-ink-30", 6))
    await app.ordering.submitChange(session, order.id, { lines: [{ skuId: "trouser-ink-30", quantity: 4 }] })
    const canceled = await app.ordering.cancelOrder(staff, order.id)
    if (!canceled.ok) throw new Error(canceled.error)
    expect(canceled.value.step).toBe("canceled")
    expect(canceled.value.waitingChange).toBeNull()
    const next = await placed(app.ordering, session, pickup("trouser-ink-30", 6))
    expect(next.confirmation).toBe("confirmed")
  })

  it("rejects a new Change request after the cutoff and still allows withdrawal", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const soon = await placed(app.ordering, session, pickup("jacket-indigo-1", 1, "2026-10-27T12:00"))
    expect(await app.ordering.submitChange(session, soon.id, { lines: [{ skuId: "jacket-indigo-1", quantity: 1 }] })).toEqual({
      ok: false,
      error: "cutoff",
    })
    const order = await placed(app.ordering, session)
    const waiting = await app.ordering.submitChange(session, order.id, { lines: [{ skuId: "jacket-indigo-1", quantity: 2 }] })
    if (!waiting.ok) throw new Error(waiting.error)
    expect(waiting.value.waitingChange?.lines[0]?.quantity).toBe(2)
    expect(await app.ordering.submitChange(session, order.id, { lines: [{ skuId: "jacket-indigo-1", quantity: 1 }] })).toEqual({
      ok: false,
      error: "waiting",
    })
    app.setNow(new Date("2026-11-11T19:00:00.000Z"))
    const withdrawn = await app.ordering.withdrawChange(session, order.id)
    if (!withdrawn.ok) throw new Error(withdrawn.error)
    expect(withdrawn.value.waitingChange).toBeNull()
    expect(withdrawn.value.lines[0]?.quantity).toBe(1)
    expect(await app.ordering.submitChange(session, order.id, { lines: [{ skuId: "jacket-indigo-1", quantity: 2 }] })).toEqual({
      ok: false,
      error: "cutoff",
    })
    expect(app.mail.messages).toHaveLength(1)
  })

  it("prices an added SKU at approval and keeps a Price already on the Order", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    const order = await placed(app.ordering, session)
    app.content.data.lineStyleIds = ["style-jacket"]
    app.square.styles[0]!.name = "Renamed Jacket"
    await app.ordering.submitChange(session, order.id, {
      lines: [
        { skuId: "jacket-indigo-1", quantity: 2 },
        { skuId: "trouser-ink-30", quantity: 1 },
      ],
    })
    expect(await app.ordering.approveChange(staff, order.id)).toEqual({ ok: false, error: "not-found" })
    const kept = await app.ordering.orderFor(session, order.id)
    if (!kept.ok) throw new Error(kept.error)
    expect(kept.value.lines[0]?.styleName).toBe("Mill Jacket")
    expect(kept.value.lines[0]?.quantity).toBe(1)

    app.content.data.lineStyleIds = ["style-jacket", "style-trouser"]
    const trouser = app.square.styles[1]!.skus[0]!
    trouser.priceCents = 17000
    app.square.styles[0]!.skus[0]!.priceCents = 100
    await app.ordering.submitChange(session, order.id, {
      lines: [
        { skuId: "jacket-indigo-1", quantity: 2 },
        { skuId: "trouser-ink-30", quantity: 1 },
      ],
    })
    const approved = await app.ordering.approveChange(staff, order.id)
    if (!approved.ok) throw new Error(approved.error)
    const jacket = approved.value.lines.find((line) => line.skuId === "jacket-indigo-1")
    const added = approved.value.lines.find((line) => line.skuId === "trouser-ink-30")
    expect(jacket?.priceCents).toBe(24000)
    expect(jacket?.styleName).toBe("Mill Jacket")
    expect(added?.priceCents).toBe(17000)
    expect(approved.value.seasonName).toBe("Spring 2027")
  })

  it("does not approve a Change request when the added SKU has no Square price", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    const order = await placed(app.ordering, session)
    await app.ordering.submitChange(session, order.id, {
      lines: [
        { skuId: "jacket-indigo-1", quantity: 1 },
        { skuId: "jacket-clay-1", quantity: 1 },
      ],
    })
    app.square.styles[0]!.skus.find((sku) => sku.id === "jacket-clay-1")!.priceCents = null
    expect(await app.ordering.approveChange(staff, order.id)).toEqual({ ok: false, error: "missing-price" })
    const unchanged = await app.ordering.orderFor(staff, order.id)
    if (!unchanged.ok) throw new Error(unchanged.error)
    expect(unchanged.value.lines.map((line) => line.skuId)).toEqual(["jacket-indigo-1"])
    expect(unchanged.value.waitingChange).not.toBeNull()
    const denied = await app.ordering.denyChange(staff, order.id)
    if (!denied.ok) throw new Error(denied.error)
    expect(denied.value.waitingChange).toBeNull()
  })

  it("does not let a Change request switch Pickup and Delivery", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    await app.ordering.setDeliveryZip(staff, "90026", true)
    const order = await placed(app.ordering, session, delivery())
    expect(
      await app.ordering.submitChange(session, order.id, {
        lines: [{ skuId: "jacket-indigo-1", quantity: 1 }],
        fulfillment: "pickup",
      }),
    ).toEqual({ ok: false, error: "cannot-switch" })
    const same = await app.ordering.orderFor(session, order.id)
    if (!same.ok) throw new Error(same.error)
    expect(same.value.fulfillment).toBe("delivery")
    expect(same.value.deliveryChargeCents).toBe(1500)
  })

  it("approves a move only to an open Delivery zip and keeps a same-zip change", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    await app.ordering.setDeliveryZip(staff, "90026", true)
    const order = await placed(app.ordering, session, delivery())
    const moved = {
      ...delivery().address!,
      zip: "90027",
      phone: "213-555-0199",
    }
    await app.ordering.submitChange(session, order.id, {
      lines: [{ skuId: "jacket-indigo-1", quantity: 1 }],
      address: moved,
    })
    expect(await app.ordering.approveChange(staff, order.id)).toEqual({ ok: false, error: "zip-closed" })
    await app.ordering.denyChange(staff, order.id)
    await app.ordering.setDeliveryZip(staff, "90026", false)
    await app.ordering.submitChange(session, order.id, {
      lines: [{ skuId: "jacket-indigo-1", quantity: 1 }],
      address: { ...delivery().address!, phone: "213-555-0111" },
      deliveryNote: "",
    })
    const sameZip = await app.ordering.approveChange(staff, order.id)
    if (!sameZip.ok) throw new Error(sameZip.error)
    expect(sameZip.value.address?.phone).toBe("213-555-0111")
    expect(sameZip.value.address?.zip).toBe("90026")
    expect(sameZip.value.deliveryNote).toBeNull()
    expect(sameZip.value.fulfillment).toBe("delivery")

    app.content.data.deliveryZips = app.content.data.deliveryZips.filter((zip) => zip.code !== "90026")
    await app.ordering.submitChange(session, order.id, {
      lines: [{ skuId: "jacket-indigo-1", quantity: 1 }],
      address: { ...sameZip.value.address!, phone: "213-555-0122" },
    })
    const removed = await app.ordering.approveChange(staff, order.id)
    if (!removed.ok) throw new Error(removed.error)
    expect(removed.value.address?.phone).toBe("213-555-0122")
    expect(removed.value.fulfillment).toBe("delivery")
  })

  it("can make a Reserved Order Unconfirmed without moving it backward", async () => {
    const app = await world()
    const session = await asBuyer(app)
    const staff = await asStaff(app)
    const order = await placed(app.ordering, session, pickup("jacket-indigo-1", 2))
    await app.ordering.advanceOrder(staff, order.id)
    await app.ordering.submitChange(session, order.id, { lines: [{ skuId: "jacket-indigo-1", quantity: 5 }] })
    const approved = await app.ordering.approveChange(staff, order.id)
    if (!approved.ok) throw new Error(approved.error)
    expect(approved.value.step).toBe("reserved")
    expect(approved.value.confirmation).toBe("unconfirmed")
    expect(approved.value.actions?.advance).toBe("prepared")
    await app.ordering.advanceOrder(staff, order.id)
    expect(await app.ordering.advanceOrder(staff, order.id)).toEqual({ ok: false, error: "unconfirmed" })
  })

  it("a Buyer sees only that Buyer's Orders", async () => {
    const app = await world()
    app.square.customers.push({ id: "cust_other", email: "other@shop.example", name: "Other Shop" })
    const first = await asBuyer(app)
    const second = await asBuyer(app, "other@shop.example")
    await placed(app.ordering, first)
    await placed(app.ordering, second, pickup("trouser-ink-30"))
    const mine = await app.ordering.ordersFor(first)
    const theirs = await app.ordering.ordersFor(second)
    if (!mine.ok || !theirs.ok) throw new Error("list failed")
    expect(mine.value.map((order) => order.buyerName)).toEqual(["Atelier North"])
    expect(theirs.value.map((order) => order.buyerName)).toEqual(["Other Shop"])
    expect(await app.ordering.orderFor(first, theirs.value[0]!.id)).toEqual({ ok: false, error: "not-found" })
    const staff = await asStaff(app)
    const all = await app.ordering.ordersFor(staff)
    if (!all.ok) throw new Error(all.error)
    expect(all.value).toHaveLength(2)
    expect(all.value[0]?.lines[0]?.unitsOnHand).toBe(4)
  })

  it("shows a Delivery zip on the map only when it has a name and a shape", async () => {
    const app = await world()
    const staff = await asStaff(app)
    const map = await app.ordering.deliveryMap(staff)
    if (!map.ok) throw new Error(map.error)
    const codes = map.value.map((zip) => zip.code)
    expect(codes).toContain("90026")
    expect(codes).not.toContain("90210")
    expect(codes).not.toContain("90012")
    expect(await app.ordering.setDeliveryZip(staff, "90210", true)).toEqual({ ok: false, error: "not-on-map" })
    const opened = await app.ordering.setDeliveryZip(staff, "90026", true)
    if (!opened.ok) throw new Error(opened.error)
    expect(opened.value.find((zip) => zip.code === "90026")?.open).toBe(true)
  })

  it("refuses a time after the Season ends", async () => {
    const app = await world()
    const session = await asBuyer(app)
    expect(await app.ordering.placeOrder(session, pickup("jacket-indigo-1", 1, "2027-04-01T00:00"))).toEqual({
      ok: false,
      error: "bad-time",
    })
    const end = await placed(app.ordering, session, pickup("jacket-indigo-1", 1, "2027-03-31T23:59"))
    expect(end.scheduledLocal).toBe("2027-03-31T23:59")
    expect(await countOrders(app)).toBe(1)
  })
})
