import { loadContent } from "../adapters/content.ts"
import { createD1Repo, type SqlDatabase } from "../adapters/d1.ts"
import { schemaSql } from "../adapters/schema.ts"
import { createSquare } from "../adapters/square.ts"
import { failureText } from "../domain/failures.ts"
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

type Cookies = {
  get(name: string): { value: string } | undefined
}

export async function loadPage(locals: App.Locals, cookies: Cookies, url: URL) {
  const ordering = await orderingFor(envOf(locals))
  const sessionId = cookies.get("cda_session")?.value
  const session = sessionId ? await ordering.sessionFor(sessionId) : null
  const code = url.searchParams.get("error")
  const error = code && code in failureText ? failureText[code as Failure] : ""
  return { ordering, session, error }
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
