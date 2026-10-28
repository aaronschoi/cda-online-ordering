export type Failure =
  | "refused"
  | "no-buyer"
  | "no-season"
  | "unreadable"
  | "delivery-closed"
  | "delivery-unavailable"
  | "need-phone"
  | "empty-order"
  | "bad-quantity"
  | "bad-time"
  | "not-on-line"
  | "cutoff"
  | "waiting"
  | "not-found"
  | "forbidden"
  | "cannot-switch"
  | "cannot-advance"
  | "unconfirmed"
  | "change-waiting"
  | "missing-price"
  | "zip-closed"
  | "not-on-map"
  | "bad-address"

export type Result<T> = { ok: true; value: T } | { ok: false; error: Failure }

export type Step = "proposed" | "reserved" | "prepared" | "completed" | "canceled"

export type Confirmation = "confirmed" | "unconfirmed"

export type Fulfillment = "pickup" | "delivery"

export type Address = {
  street: string
  city: string
  state: string
  zip: string
  phone: string
}

export type Session = {
  id: string
  role: "buyer" | "staff"
  email: string
  buyerName: string | null
  squareCustomerId: string | null
  expiresAt: string
}

export type Sku = {
  id: string
  color: string
  size: string
  priceCents: number | null
  imageUrl: string | null
}

export type Style = {
  id: string
  name: string
  description: string
  imageUrl: string | null
  skus: Sku[]
}

export type LocationInfo = {
  id: string
  name: string
  address: string
  timezone: string
}

export type Customer = {
  id: string
  email: string
  name: string
}

export type SquarePort = {
  customerByEmail(email: string): Promise<Customer | null | "unread">
  location(): Promise<LocationInfo | "unread">
  catalog(): Promise<{ styles: Style[] } | "unread">
  onHand(skuIds: string[], locationId: string): Promise<Record<string, number> | "unread">
}

export type Season = {
  name: string
  startsAt: string
  endsAt: string
}

export type ZipShape = {
  code: string
  rings: number[][][]
}

export type ContentData = {
  intro: string
  changeCutoffHours: number
  deliveryChargeEnabled: boolean
  deliveryChargeCents: number
  season: Season | null
  lineStyleIds: string[]
  deliveryZips: { code: string; name: string }[]
  shapes: ZipShape[]
}

export type ContentPort = {
  season(): Promise<Season | null | "unread">
  line(): Promise<string[] | "unread">
  deliveryCharge(): Promise<{ enabled: boolean; cents: number } | "unread">
  cutoffHours(): Promise<number | "unread">
  deliveryZips(): Promise<{ code: string; name: string }[] | "unread">
  shapes(): Promise<ZipShape[] | "unread">
  intro(): Promise<string | "unread">
}

export type Mailer = {
  sendSignInCode(email: string, code: string): Promise<void>
}

export type Passwords = {
  hash(password: string): Promise<string>
  verify(password: string, stored: string): Promise<boolean>
}

export type Ids = {
  next(): string
}

export type OrderRecord = {
  id: string
  buyerEmail: string
  buyerName: string
  seasonName: string
  seasonEndsAt: string
  fulfillment: Fulfillment
  scheduledAt: string
  scheduledLocal: string
  confirmation: Confirmation
  step: Step
  deliveryChargeCents: number | null
  address: Address | null
  deliveryNote: string | null
  placedAt: string
}

export type LineRecord = {
  id: string
  orderId: string
  skuId: string
  styleId: string
  styleName: string
  styleDescription: string
  color: string
  size: string
  quantity: number
  priceCents: number
}

export type ChangePayload = {
  lines: {
    skuId: string
    quantity: number
    styleId: string
    styleName: string
    styleDescription: string
    color: string
    size: string
    priceCents: number | null
    existing: boolean
  }[]
  scheduledLocal: string
  scheduledAt: string
  address: Address | null
  deliveryNote: string | null
}

export type ChangeRecord = {
  id: string
  orderId: string
  status: "waiting" | "approved" | "denied" | "withdrawn"
  payload: ChangePayload
  submittedAt: string
  decidedAt: string | null
}

export type Reservation = {
  orderId: string
  skuId: string
  quantity: number
}

export type Repo = {
  findStaff(email: string): Promise<{ email: string; passwordHash: string } | null>
  insertStaff(email: string, passwordHash: string): Promise<void>
  countStaff(): Promise<number>
  saveCode(email: string, codeHash: string, expiresAt: string): Promise<void>
  findCode(email: string): Promise<{ codeHash: string; expiresAt: string } | null>
  deleteCode(email: string): Promise<void>
  createSession(session: Session): Promise<void>
  findSession(id: string): Promise<Session | null>
  deleteSession(id: string): Promise<void>
  zipToggles(): Promise<Record<string, boolean> | "unread">
  setZipToggle(code: string, open: boolean): Promise<void>
  activeReservations(): Promise<Reservation[]>
  insertPlaced(order: OrderRecord, lines: LineRecord[]): Promise<void>
  orders(): Promise<OrderRecord[]>
  order(id: string): Promise<OrderRecord | null>
  lines(orderId: string): Promise<LineRecord[]>
  allLines(): Promise<LineRecord[]>
  waitingChange(orderId: string): Promise<ChangeRecord | null>
  waitingChanges(): Promise<ChangeRecord[]>
  insertChange(change: ChangeRecord): Promise<void>
  setChangeStatus(id: string, status: ChangeRecord["status"], decidedAt: string): Promise<void>
  setConfirmation(orderId: string, confirmation: Confirmation): Promise<void>
  setStep(orderId: string, step: Step): Promise<void>
  cancel(orderId: string, decidedAt: string): Promise<void>
  complete(orderId: string): Promise<void>
  applyChange(order: OrderRecord, lines: LineRecord[], changeId: string, decidedAt: string): Promise<void>
}

export type SkuChoice = {
  skuId: string
  styleId: string
  styleName: string
  styleDescription: string
  color: string
  size: string
  priceCents: number
  pictureUrl: string | null
  onLine: boolean
}

export type LineView = {
  intro: string
  seasonName: string
  seasonEndsAt: string
  location: LocationInfo | null
  deliveryChargeCents: number | null
  styles: {
    id: string
    name: string
    description: string
    skus: SkuChoice[]
  }[]
}

export type ChangeView = {
  id: string
  lines: {
    skuId: string
    styleName: string
    color: string
    size: string
    quantity: number
    priceCents: number | null
  }[]
  scheduledLocal: string
  address: Address | null
  deliveryNote: string | null
}

export type OrderActions = {
  confirm: boolean
  advance: "reserved" | "prepared" | "completed" | null
  cancel: boolean
  approve: boolean
  deny: boolean
}

export type OrderView = {
  id: string
  buyerEmail: string
  buyerName: string
  seasonName: string
  fulfillment: Fulfillment
  scheduledLocal: string
  scheduledAt: string
  confirmation: Confirmation
  step: Step
  lines: {
    skuId: string
    styleName: string
    styleDescription: string
    color: string
    size: string
    quantity: number
    priceCents: number
    unitsOnHand?: number | null
  }[]
  goodsCents: number
  deliveryChargeCents: number | null
  address: Address | null
  deliveryNote: string | null
  waitingChange: ChangeView | null
  actions?: OrderActions
  unitsOnHandUnreadable?: boolean
}

export type PlaceInput = {
  lines: { skuId: string; quantity: number }[]
  fulfillment: Fulfillment
  scheduledLocal: string
  address?: Address
  deliveryNote?: string
}

export type ChangeInput = {
  lines: { skuId: string; quantity: number }[]
  scheduledLocal?: string
  address?: Address
  deliveryNote?: string
  fulfillment?: Fulfillment
}

export type MapZip = {
  code: string
  name: string
  open: boolean
  rings: number[][][]
}
