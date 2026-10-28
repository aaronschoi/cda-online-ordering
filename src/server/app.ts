import { loadContent } from "../adapters/content.ts"
import { createD1Repo, type SqlDatabase } from "../adapters/d1.ts"
import { schemaSql } from "../adapters/schema.ts"
import { createSquare } from "../adapters/square.ts"
import { formatMoney, formatWhen, languageChoice, phrases, type Language } from "../domain/language.ts"
import type { Failure } from "../domain/types.ts"
import { createOrdering, type Ordering } from "../domain/ordering.ts"
import { createPasswords } from "../domain/passwords.ts"
import type { Mailer, Session } from "../domain/types.ts"

export type Env = {
  DB: SqlDatabase
  SQUARE_ACCESS_TOKEN?: string
  SQUARE_LOCATION_ID?: string
  SQUARE_ENV?: string
  STAFF_EMAIL?: string
  STAFF_PASSWORD?: string
  KEYSTATIC_GITHUB_REPO?: string
  GITHUB_TOKEN?: string
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
  const statements = schemaSql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) => env.DB.prepare(statement))
  await env.DB.batch(statements)
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM staff").first<{ n: number }>()
  if (Number(count?.n ?? 0) > 0) return
  const dev = import.meta.env.DEV
  const email = (env.STAFF_EMAIL || (dev ? "staff@cda.example" : "")).trim().toLowerCase()
  const password = env.STAFF_PASSWORD || (dev ? "cda-staff" : "")
  if (!email || !password) return
  await env.DB.prepare("INSERT INTO staff (email, password_hash) VALUES (?, ?)").bind(email, await createPasswords().hash(password)).run()
}

export async function orderingFor(env: Env, mailer?: Mailer): Promise<Ordering> {
  await prepare(env)
  const content = await loadContent(env)
  return createOrdering({
    repo: createD1Repo(env.DB),
    square: createSquare(env),
    content,
    mailer: mailer ?? { async sendSignInCode() {} },
    passwords: createPasswords(),
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
}

export async function loadPage(locals: App.Locals, cookies: CookieJar, url: URL, acceptLanguage: string | null = null) {
  const ordering = await orderingFor(envOf(locals))
  const sessionId = cookies.get("cda_session")?.value
  const session = sessionId ? await ordering.sessionFor(sessionId) : null
  const choice = languageChoice({
    query: url.searchParams.get("lang"),
    cookie: cookies.get("cda_lang")?.value ?? null,
    accept: acceptLanguage,
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
  return { ordering, session, error, language, copy }
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
