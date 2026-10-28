import type {
  Address,
  ChangePayload,
  ChangeRecord,
  Confirmation,
  Fulfillment,
  LineRecord,
  OrderRecord,
  Repo,
  Session,
  Step,
} from "../domain/types.ts"

type Statement = {
  bind(...values: unknown[]): Statement
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results?: T[] }>
  run(): Promise<unknown>
}

export type SqlDatabase = {
  prepare(query: string): Statement
  batch(statements: Statement[]): Promise<unknown>
  exec(query: string): Promise<unknown>
}

type OrderRow = {
  id: string
  buyer_email: string
  buyer_name: string
  season_name: string
  season_ends_at: string
  fulfillment: Fulfillment
  scheduled_at: string
  scheduled_local: string
  confirmation: Confirmation
  step: Step
  delivery_charge_cents: number | null
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  delivery_note: string | null
  placed_at: string
}

type LineRow = {
  id: string
  order_id: string
  sku_id: string
  style_id: string
  style_name: string
  style_description: string
  color: string
  size: string
  quantity: number
  price_cents: number
}

export function createD1Repo(db: SqlDatabase): Repo {
  return {
    async findStaff(email) {
      return db.prepare("SELECT email, password_hash AS passwordHash FROM staff WHERE email = ?").bind(email).first()
    },
    async insertStaff(email, passwordHash) {
      await db.prepare("INSERT INTO staff (email, password_hash) VALUES (?, ?)").bind(email, passwordHash).run()
    },
    async countStaff() {
      const row = await db.prepare("SELECT COUNT(*) AS n FROM staff").first<{ n: number }>()
      return Number(row?.n ?? 0)
    },
    async saveCode(email, codeHash, expiresAt) {
      await db
        .prepare(
          `INSERT INTO sign_in_codes (email, code_hash, expires_at) VALUES (?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at`,
        )
        .bind(email, codeHash, expiresAt)
        .run()
    },
    async findCode(email) {
      return db
        .prepare("SELECT code_hash AS codeHash, expires_at AS expiresAt FROM sign_in_codes WHERE email = ?")
        .bind(email)
        .first()
    },
    async deleteCode(email) {
      await db.prepare("DELETE FROM sign_in_codes WHERE email = ?").bind(email).run()
    },
    async createSession(session) {
      await db
        .prepare(
          `INSERT INTO sessions (id, role, email, buyer_name, square_customer_id, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(session.id, session.role, session.email, session.buyerName, session.squareCustomerId, session.expiresAt)
        .run()
    },
    async findSession(id) {
      const row = await db
        .prepare(
          `SELECT id, role, email, buyer_name AS buyerName, square_customer_id AS squareCustomerId, expires_at AS expiresAt
           FROM sessions WHERE id = ?`,
        )
        .bind(id)
        .first<Session>()
      return row ?? null
    },
    async deleteSession(id) {
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run()
    },
    async zipToggles() {
      try {
        const rows = await db.prepare("SELECT code, open FROM delivery_zip_toggles").all<{ code: string; open: number }>()
        const toggles: Record<string, boolean> = {}
        for (const row of rows.results ?? []) toggles[row.code] = row.open === 1
        return toggles
      } catch {
        return "unread"
      }
    },
    async setZipToggle(code, open) {
      await db
        .prepare(
          `INSERT INTO delivery_zip_toggles (code, open) VALUES (?, ?)
           ON CONFLICT(code) DO UPDATE SET open = excluded.open`,
        )
        .bind(code, open ? 1 : 0)
        .run()
    },
    async activeReservations() {
      const rows = await db
        .prepare("SELECT order_id AS orderId, sku_id AS skuId, quantity FROM reservations")
        .all<{ orderId: string; skuId: string; quantity: number }>()
      return rows.results ?? []
    },
    async insertPlaced(order, lines) {
      await db.batch([
        orderInsert(db, order),
        ...lines.map((line) => lineInsert(db, line)),
        ...lines.map((line) =>
          db
            .prepare("INSERT INTO reservations (order_id, sku_id, quantity) VALUES (?, ?, ?)")
            .bind(line.orderId, line.skuId, line.quantity),
        ),
      ])
    },
    async orders() {
      const rows = await db.prepare("SELECT * FROM orders ORDER BY placed_at").all<OrderRow>()
      return (rows.results ?? []).map(orderFrom)
    },
    async order(id) {
      const row = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<OrderRow>()
      return row ? orderFrom(row) : null
    },
    async lines(orderId) {
      const rows = await db.prepare("SELECT * FROM order_lines WHERE order_id = ?").bind(orderId).all<LineRow>()
      return (rows.results ?? []).map(lineFrom)
    },
    async allLines() {
      const rows = await db.prepare("SELECT * FROM order_lines").all<LineRow>()
      return (rows.results ?? []).map(lineFrom)
    },
    async waitingChange(orderId) {
      const row = await db
        .prepare("SELECT * FROM change_requests WHERE order_id = ? AND status = 'waiting'")
        .bind(orderId)
        .first<ChangeRow>()
      return row ? changeFrom(row) : null
    },
    async waitingChanges() {
      const rows = await db.prepare("SELECT * FROM change_requests WHERE status = 'waiting'").all<ChangeRow>()
      return (rows.results ?? []).map(changeFrom)
    },
    async insertChange(change) {
      await db
        .prepare(
          `INSERT INTO change_requests (id, order_id, status, payload_json, submitted_at, decided_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(change.id, change.orderId, change.status, JSON.stringify(change.payload), change.submittedAt, change.decidedAt)
        .run()
    },
    async setChangeStatus(id, status, decidedAt) {
      await db.prepare("UPDATE change_requests SET status = ?, decided_at = ? WHERE id = ?").bind(status, decidedAt, id).run()
    },
    async setConfirmation(orderId, confirmation) {
      await db.prepare("UPDATE orders SET confirmation = ? WHERE id = ?").bind(confirmation, orderId).run()
    },
    async setStep(orderId, step) {
      await db.prepare("UPDATE orders SET step = ? WHERE id = ?").bind(step, orderId).run()
    },
    async cancel(orderId, decidedAt) {
      await db.batch([
        db.prepare("UPDATE orders SET step = 'canceled' WHERE id = ?").bind(orderId),
        db.prepare("DELETE FROM reservations WHERE order_id = ?").bind(orderId),
        db
          .prepare("UPDATE change_requests SET status = 'denied', decided_at = ? WHERE order_id = ? AND status = 'waiting'")
          .bind(decidedAt, orderId),
      ])
    },
    async complete(orderId) {
      await db.batch([
        db.prepare("UPDATE orders SET step = 'completed' WHERE id = ?").bind(orderId),
        db.prepare("DELETE FROM reservations WHERE order_id = ?").bind(orderId),
      ])
    },
    async applyChange(order, lines, changeId, decidedAt) {
      await db.batch([
        orderUpdate(db, order),
        db.prepare("DELETE FROM order_lines WHERE order_id = ?").bind(order.id),
        db.prepare("DELETE FROM reservations WHERE order_id = ?").bind(order.id),
        ...lines.map((line) => lineInsert(db, line)),
        ...lines.map((line) =>
          db
            .prepare("INSERT INTO reservations (order_id, sku_id, quantity) VALUES (?, ?, ?)")
            .bind(line.orderId, line.skuId, line.quantity),
        ),
        db.prepare("UPDATE change_requests SET status = 'approved', decided_at = ? WHERE id = ?").bind(decidedAt, changeId),
      ])
    },
  }
}

type ChangeRow = {
  id: string
  order_id: string
  status: ChangeRecord["status"]
  payload_json: string
  submitted_at: string
  decided_at: string | null
}

function orderInsert(db: SqlDatabase, order: OrderRecord): Statement {
  return db
    .prepare(
      `INSERT INTO orders (
        id, buyer_email, buyer_name, season_name, season_ends_at, fulfillment, scheduled_at, scheduled_local,
        confirmation, step, delivery_charge_cents, street, city, state, zip, phone, delivery_note, placed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      order.id,
      order.buyerEmail,
      order.buyerName,
      order.seasonName,
      order.seasonEndsAt,
      order.fulfillment,
      order.scheduledAt,
      order.scheduledLocal,
      order.confirmation,
      order.step,
      order.deliveryChargeCents,
      order.address?.street ?? null,
      order.address?.city ?? null,
      order.address?.state ?? null,
      order.address?.zip ?? null,
      order.address?.phone ?? null,
      order.deliveryNote,
      order.placedAt,
    )
}

function orderUpdate(db: SqlDatabase, order: OrderRecord): Statement {
  return db
    .prepare(
      `UPDATE orders SET scheduled_at = ?, scheduled_local = ?, confirmation = ?, street = ?, city = ?, state = ?,
       zip = ?, phone = ?, delivery_note = ? WHERE id = ?`,
    )
    .bind(
      order.scheduledAt,
      order.scheduledLocal,
      order.confirmation,
      order.address?.street ?? null,
      order.address?.city ?? null,
      order.address?.state ?? null,
      order.address?.zip ?? null,
      order.address?.phone ?? null,
      order.deliveryNote,
      order.id,
    )
}

function lineInsert(db: SqlDatabase, line: LineRecord): Statement {
  return db
    .prepare(
      `INSERT INTO order_lines (
        id, order_id, sku_id, style_id, style_name, style_description, color, size, quantity, price_cents
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      line.id,
      line.orderId,
      line.skuId,
      line.styleId,
      line.styleName,
      line.styleDescription,
      line.color,
      line.size,
      line.quantity,
      line.priceCents,
    )
}

function orderFrom(row: OrderRow): OrderRecord {
  const address: Address | null = row.street
    ? { street: row.street, city: row.city ?? "", state: row.state ?? "", zip: row.zip ?? "", phone: row.phone ?? "" }
    : null
  return {
    id: row.id,
    buyerEmail: row.buyer_email,
    buyerName: row.buyer_name,
    seasonName: row.season_name,
    seasonEndsAt: row.season_ends_at,
    fulfillment: row.fulfillment,
    scheduledAt: row.scheduled_at,
    scheduledLocal: row.scheduled_local,
    confirmation: row.confirmation,
    step: row.step,
    deliveryChargeCents: row.delivery_charge_cents,
    address,
    deliveryNote: row.delivery_note,
    placedAt: row.placed_at,
  }
}

function lineFrom(row: LineRow): LineRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    skuId: row.sku_id,
    styleId: row.style_id,
    styleName: row.style_name,
    styleDescription: row.style_description,
    color: row.color,
    size: row.size,
    quantity: row.quantity,
    priceCents: row.price_cents,
  }
}

function changeFrom(row: ChangeRow): ChangeRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    payload: JSON.parse(row.payload_json) as ChangePayload,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
  }
}
