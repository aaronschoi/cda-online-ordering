import { loadContent } from "../adapters/content.ts"
import { createD1Repo, type SqlDatabase } from "../adapters/d1.ts"
import { schemaSql } from "../adapters/schema.ts"
import { createSquare } from "../adapters/square.ts"
import { failureText } from "../domain/failures.ts"
import type { Acting, ContentPort, Failure, Mailer, Session } from "../domain/types.ts"
import { createOrdering, type Ordering } from "../domain/ordering.ts"

export type Env = {
  DB: SqlDatabase
  SQUARE_ACCESS_TOKEN?: string
  SQUARE_LOCATION_ID?: string
  SQUARE_ENV?: string
  MANAGER_EMAIL?: string
  KEYSTATIC_GITHUB_REPO?: string
  GITHUB_TOKEN?: string
}

const quietContent: ContentPort = {
  async season() {
    return "unread"
  },
  async line() {
    return "unread"
  },
  async deliveryCharge() {
    return "unread"
  },
  async cutoffHours() {
    return "unread"
  },
  async deliveryZips() {
    return "unread"
  },
  async shapes() {
    return "unread"
  },
  async intro() {
    return "unread"
  },
}

export function managerEmail(env: Env): string {
  const configured = env.MANAGER_EMAIL?.trim().toLowerCase() ?? ""
  if (configured) return configured
  if (import.meta.env.DEV) return "staff@cda.example"
  return ""
}

export function accessEmail(request: Request, env: Env): { email: string; header: boolean } | null {
  const header = request.headers.get("CF-Access-Authenticated-User-Email")?.trim().toLowerCase() ?? ""
  if (header) return { email: header, header: true }
  const email = managerEmail(env)
  if (import.meta.env.DEV && email) return { email, header: false }
  return null
}

let ready: Promise<void> | null = null

export function prepare(env: Env): Promise<void> {
  if (!ready) {
    ready = seed(env).catch((error: unknown) => {
      ready = null
      throw error
    })
  }
  return ready
}

async function seed(env: Env) {
  const info = await env.DB.prepare("PRAGMA table_info(staff)").all<{ name: string }>()
  if ((info.results ?? []).some((column) => column.name === "password_hash")) {
    await env.DB.prepare("DROP TABLE staff").run()
  }
  const statements = schemaSql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) => env.DB.prepare(statement))
  await env.DB.batch(statements)
  const email = managerEmail(env)
  if (!email) return
  const ordering = createOrdering({
    repo: createD1Repo(env.DB),
    square: createSquare(env),
    content: quietContent,
    mailer: { async sendSignInCode() {} },
    ids: { next: () => crypto.randomUUID() },
    now: () => new Date(),
  })
  const created = await ordering.ensureFirstManager(email)
  if (!created.ok && created.error === "unreadable") throw new Error("Manager email could not be checked")
}

export async function orderingFor(env: Env, mailer?: Mailer): Promise<Ordering> {
  await prepare(env)
  const content = await loadContent(env)
  return createOrdering({
    repo: createD1Repo(env.DB),
    square: createSquare(env),
    content,
    mailer: mailer ?? { async sendSignInCode() {} },
    ids: { next: () => crypto.randomUUID() },
    now: () => new Date(),
  })
}

export function envOf(locals: App.Locals): Env {
  return locals.runtime.env as Env
}

type Cookies = {
  get(name: string): { value: string } | undefined
  delete(name: string, options?: { path?: string }): void
}

export async function loadPage(locals: App.Locals, cookies: Cookies, url: URL, request: Request) {
  const env = envOf(locals)
  const ordering = await orderingFor(env)
  const sessionId = cookies.get("cda_session")?.value
  const session = sessionId ? await ordering.sessionFor(sessionId) : null
  const code = url.searchParams.get("error")
  const error = code && code in failureText ? failureText[code as Failure] : ""
  const access = accessEmail(request, env)
  const path = url.pathname
  const staffArea = path.startsWith("/staff") || path.startsWith("/manage") || path.startsWith("/keystatic")
  const admitted = access ? await ordering.admit(access.email) : { ok: false as const, error: "forbidden" as const }
  let acting: Acting | null = null
  if (admitted.ok && staffArea) {
    const pin = cookies.get("cda_acting")?.value ?? ""
    acting = pin ? await ordering.actingFor(pin) : null
    if (pin && !acting) cookies.delete("cda_acting", { path: "/" })
  }
  return {
    ordering,
    session,
    error,
    open: admitted.ok ? admitted.value : null,
    acting,
    managerEmail: admitted.ok ? access?.email ?? "" : "",
    accessHeader: access?.header ?? false,
  }
}

export function staffLinks(current: "orders" | "zips" | "staff") {
  return [
    { href: "/staff", label: "Orders", current: current === "orders" },
    { href: "/staff/delivery", label: "Delivery zips", current: current === "zips" },
    { href: "/manage", label: "Staff", current: current === "staff" },
    { href: "/keystatic", label: "Ordering copy" },
  ]
}

export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

export function when(local: string): string {
  const [date, time] = local.split("T")
  if (!date || !time) return local
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return local
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
  return `${formatted}, ${time}`
}

export function tint(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  return `hsl(${hash % 360} 32% 86%)`
}

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}

const stepLabels: Record<string, string> = {
  proposed: "Proposed",
  reserved: "Reserved",
  prepared: "Prepared",
  completed: "Completed",
  canceled: "Canceled",
}

export function stepName(step: string): string {
  return stepLabels[step] ?? step
}

export type { Session }
