import { loadContent } from "../adapters/content.ts"
import { createD1Repo, type SqlDatabase } from "../adapters/d1.ts"
import { schemaSql } from "../adapters/schema.ts"
import { createSquare } from "../adapters/square.ts"
import { formatMoney, formatWhen, languageChoice, phrases, type Language } from "../domain/language.ts"
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
  async intros() {
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

type CookieJar = {
  get(name: string): { value: string } | undefined
  set(
    name: string,
    value: string,
    options?: {
      path?: string
      sameSite?: "lax" | "strict" | "none"
      maxAge?: number
      secure?: boolean
      httpOnly?: boolean
    },
  ): void
  delete(name: string, options?: { path?: string }): void
}

export async function loadPage(locals: App.Locals, cookies: CookieJar, url: URL, request: Request) {
  const env = envOf(locals)
  const ordering = await orderingFor(env)
  const sessionId = cookies.get("cda_session")?.value
  const session = sessionId ? await ordering.sessionFor(sessionId) : null
  const choice = languageChoice({
    query: url.searchParams.get("lang"),
    cookie: cookies.get("cda_lang")?.value ?? null,
    accept: request.headers.get("accept-language"),
  })
  if (choice.remember) {
    cookies.set("cda_lang", choice.remember, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      secure: import.meta.env.PROD,
      httpOnly: true,
    })
  }
  const language = choice.language
  const copy = phrases(language)
  const code = url.searchParams.get("error")
  const error = code && code in copy.failures ? copy.failures[code as Failure] : ""
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
    language,
    copy,
    open: admitted.ok ? admitted.value : null,
    acting,
    managerEmail: admitted.ok ? access?.email ?? "" : "",
    accessHeader: access?.header ?? false,
  }
}

export function staffLinks(current: "orders" | "zips" | "staff", language: Language) {
  const copy = phrases(language)
  return [
    { href: "/staff", label: copy.nav.orders, current: current === "orders" },
    { href: "/staff/delivery", label: copy.nav.deliveryZips, current: current === "zips" },
    { href: "/manage", label: copy.staff, current: current === "staff" },
    { href: "/keystatic", label: copy.nav.orderingCopy },
  ]
}

export function money(cents: number, language: Language = "en"): string {
  return formatMoney(cents, language)
}

export function when(local: string, language: Language = "en"): string {
  return formatWhen(local, language)
}

export function tint(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  return `hsl(${hash % 360} 32% 86%)`
}

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?"
}

export function stepName(step: string, language: Language = "en"): string {
  const labels = phrases(language).steps
  if (step in labels) return labels[step as keyof typeof labels]
  return step
}

export type { Session }
