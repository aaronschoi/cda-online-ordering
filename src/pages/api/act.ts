import type { APIRoute } from "astro"
import type { Address, Failure, Fulfillment } from "../../domain/types.ts"
import { envOf, orderingFor } from "../../server/app.ts"

export const prerender = false

const cookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: import.meta.env.PROD,
}

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const form = await request.formData()
  const intent = String(form.get("intent") ?? "")
  const back = String(form.get("return") ?? "/")
  let sentCode: string | null = null
  const ordering = await orderingFor(envOf(locals), {
    async sendSignInCode(_email, code) {
      sentCode = code
    },
  })
  const sessionId = cookies.get("cda_session")?.value
  const session = sessionId ? await ordering.sessionFor(sessionId) : null

  const go = (path: string, error?: Failure) => {
    const url = new URL(path, "http://cda.local")
    if (error) url.searchParams.set("error", error)
    return redirect(`${url.pathname}${url.search}`)
  }

  if (intent === "sign-out") {
    if (sessionId) await ordering.signOut(sessionId)
    cookies.delete("cda_session", { path: "/" })
    return redirect("/")
  }

  if (intent === "request-code") {
    const result = await ordering.requestBuyerCode(String(form.get("email") ?? ""))
    if (!result.ok) return go("/", result.error)
    if (import.meta.env.DEV && sentCode) {
      cookies.set("cda_dev_code", sentCode, { ...cookie, maxAge: 120 })
    }
    const email = String(form.get("email") ?? "")
    return redirect(`/?sent=1&email=${encodeURIComponent(email)}`)
  }

  if (intent === "buyer-sign-in") {
    const result = await ordering.signInBuyer(String(form.get("email") ?? ""), String(form.get("code") ?? ""))
    if (!result.ok) return go(`/?email=${encodeURIComponent(String(form.get("email") ?? ""))}`, result.error)
    cookies.set("cda_session", result.value.id, { ...cookie, maxAge: 60 * 60 * 24 * 14 })
    cookies.delete("cda_dev_code", { path: "/" })
    return redirect("/line")
  }

  if (intent === "staff-sign-in") {
    const result = await ordering.signInStaff(String(form.get("email") ?? ""), String(form.get("password") ?? ""))
    if (!result.ok) return go("/", result.error)
    cookies.set("cda_session", result.value.id, { ...cookie, maxAge: 60 * 60 * 24 * 14 })
    return redirect("/staff")
  }

  if (!session) return go("/")

  if (intent === "place") {
    const fulfillment = String(form.get("fulfillment") ?? "") as Fulfillment
    const lines = quantities(form)
    const result = await ordering.placeOrder(session, {
      lines,
      fulfillment,
      scheduledLocal: String(form.get("scheduledLocal") ?? ""),
      address: fulfillment === "delivery" ? addressOf(form) : undefined,
      deliveryNote: fulfillment === "delivery" ? String(form.get("deliveryNote") ?? "") : undefined,
    })
    if (!result.ok) return go("/line", result.error)
    return redirect(`/orders/${result.value.id}`)
  }

  if (intent === "change") {
    const orderId = String(form.get("orderId") ?? "")
    const current = await ordering.orderFor(session, orderId)
    const fulfillment = current.ok ? current.value.fulfillment : "pickup"
    const result = await ordering.submitChange(session, orderId, {
      lines: quantities(form),
      scheduledLocal: String(form.get("scheduledLocal") ?? "") || undefined,
      address: fulfillment === "delivery" ? addressOf(form) : undefined,
      deliveryNote: fulfillment === "delivery" ? String(form.get("deliveryNote") ?? "") : undefined,
    })
    if (!result.ok) return go(`/orders/${orderId}`, result.error)
    return redirect(`/orders/${orderId}`)
  }

  if (intent === "withdraw") {
    const orderId = String(form.get("orderId") ?? "")
    const result = await ordering.withdrawChange(session, orderId)
    if (!result.ok) return go(`/orders/${orderId}`, result.error)
    return redirect(`/orders/${orderId}`)
  }

  const orderId = String(form.get("orderId") ?? "")
  const staffPath = `/staff/orders/${orderId}`
  if (intent === "confirm") {
    const result = await ordering.confirmOrder(session, orderId)
    return result.ok ? redirect(staffPath) : go(staffPath, result.error)
  }
  if (intent === "advance") {
    const result = await ordering.advanceOrder(session, orderId)
    return result.ok ? redirect(staffPath) : go(staffPath, result.error)
  }
  if (intent === "cancel") {
    const result = await ordering.cancelOrder(session, orderId)
    return result.ok ? redirect(staffPath) : go(staffPath, result.error)
  }
  if (intent === "approve") {
    const result = await ordering.approveChange(session, orderId)
    return result.ok ? redirect(staffPath) : go(staffPath, result.error)
  }
  if (intent === "deny") {
    const result = await ordering.denyChange(session, orderId)
    return result.ok ? redirect(staffPath) : go(staffPath, result.error)
  }
  if (intent === "zip") {
    const open = String(form.get("open") ?? "") === "1"
    const result = await ordering.setDeliveryZip(session, String(form.get("code") ?? ""), open)
    return result.ok ? redirect("/staff/delivery") : go("/staff/delivery", result.error)
  }

  return go(back, "forbidden")
}

function quantities(form: FormData) {
  const lines: { skuId: string; quantity: number }[] = []
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("qty.") || typeof value !== "string" || value.trim() === "") continue
    lines.push({ skuId: key.slice(4), quantity: Number(value) })
  }
  return lines
}

function addressOf(form: FormData): Address {
  return {
    street: String(form.get("street") ?? ""),
    city: String(form.get("city") ?? ""),
    state: String(form.get("state") ?? ""),
    zip: String(form.get("zip") ?? ""),
    phone: String(form.get("phone") ?? ""),
  }
}
