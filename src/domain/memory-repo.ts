import type {
  ChangeRecord,
  LineRecord,
  OrderRecord,
  Repo,
  Session,
} from "./types.ts"

export function createMemoryRepo(options?: { togglesUnreadable?: () => boolean }): Repo {
  const staff: { email: string; passwordHash: string }[] = []
  const codes: { email: string; codeHash: string; expiresAt: string }[] = []
  const sessions: Session[] = []
  const toggles = new Map<string, boolean>()
  const orders: OrderRecord[] = []
  const lines: LineRecord[] = []
  const reservations: { orderId: string; skuId: string; quantity: number }[] = []
  const changes: ChangeRecord[] = []

  return {
    async findStaff(email) {
      return staff.find((row) => row.email === email) ?? null
    },
    async insertStaff(email, passwordHash) {
      staff.push({ email, passwordHash })
    },
    async countStaff() {
      return staff.length
    },
    async saveCode(email, codeHash, expiresAt) {
      const index = codes.findIndex((row) => row.email === email)
      const next = { email, codeHash, expiresAt }
      if (index >= 0) codes[index] = next
      else codes.push(next)
    },
    async findCode(email) {
      return codes.find((row) => row.email === email) ?? null
    },
    async deleteCode(email) {
      const index = codes.findIndex((row) => row.email === email)
      if (index >= 0) codes.splice(index, 1)
    },
    async createSession(session) {
      sessions.push(session)
    },
    async findSession(id) {
      return sessions.find((session) => session.id === id) ?? null
    },
    async deleteSession(id) {
      const index = sessions.findIndex((session) => session.id === id)
      if (index >= 0) sessions.splice(index, 1)
    },
    async zipToggles() {
      if (options?.togglesUnreadable?.()) return "unread"
      return Object.fromEntries(toggles)
    },
    async setZipToggle(code, open) {
      toggles.set(code, open)
    },
    async activeReservations() {
      return reservations.map((row) => ({ ...row }))
    },
    async insertPlaced(order, placedLines) {
      orders.push(order)
      lines.push(...placedLines)
      for (const line of placedLines) {
        reservations.push({ orderId: order.id, skuId: line.skuId, quantity: line.quantity })
      }
    },
    async orders() {
      return orders.map((order) => ({ ...order }))
    },
    async order(id) {
      const found = orders.find((order) => order.id === id)
      return found ? { ...found } : null
    },
    async lines(orderId) {
      return lines.filter((line) => line.orderId === orderId).map((line) => ({ ...line }))
    },
    async allLines() {
      return lines.map((line) => ({ ...line }))
    },
    async waitingChange(orderId) {
      return changes.find((change) => change.orderId === orderId && change.status === "waiting") ?? null
    },
    async waitingChanges() {
      return changes.filter((change) => change.status === "waiting")
    },
    async insertChange(change) {
      changes.push(change)
    },
    async setChangeStatus(id, status, decidedAt) {
      const change = changes.find((row) => row.id === id)
      if (!change) return
      change.status = status
      change.decidedAt = decidedAt
    },
    async setConfirmation(orderId, confirmation) {
      const order = orders.find((row) => row.id === orderId)
      if (order) order.confirmation = confirmation
    },
    async setStep(orderId, step) {
      const order = orders.find((row) => row.id === orderId)
      if (order) order.step = step
    },
    async cancel(orderId, decidedAt) {
      const order = orders.find((row) => row.id === orderId)
      if (order) order.step = "canceled"
      for (let i = reservations.length - 1; i >= 0; i--) {
        if (reservations[i]?.orderId === orderId) reservations.splice(i, 1)
      }
      for (const change of changes) {
        if (change.orderId === orderId && change.status === "waiting") {
          change.status = "denied"
          change.decidedAt = decidedAt
        }
      }
    },
    async complete(orderId) {
      const order = orders.find((row) => row.id === orderId)
      if (order) order.step = "completed"
      for (let i = reservations.length - 1; i >= 0; i--) {
        if (reservations[i]?.orderId === orderId) reservations.splice(i, 1)
      }
    },
    async applyChange(order, nextLines, changeId, decidedAt) {
      const index = orders.findIndex((row) => row.id === order.id)
      if (index >= 0) orders[index] = order
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i]?.orderId === order.id) lines.splice(i, 1)
      }
      lines.push(...nextLines)
      for (let i = reservations.length - 1; i >= 0; i--) {
        if (reservations[i]?.orderId === order.id) reservations.splice(i, 1)
      }
      for (const line of nextLines) {
        reservations.push({ orderId: order.id, skuId: line.skuId, quantity: line.quantity })
      }
      const change = changes.find((row) => row.id === changeId)
      if (change) {
        change.status = "approved"
        change.decidedAt = decidedAt
      }
    },
  }
}
