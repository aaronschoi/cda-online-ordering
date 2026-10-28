import type { APIRoute } from "astro"
import type { Address, Failure, Fulfillment } from "../../domain/types.ts"
import { accessEmail, envOf, orderingFor } from "../../server/app.ts"

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

  const access = accessEmail(request, envOf(locals))
  const admitted = access ? await ordering.admit(access.email) : { ok: false as const, error: "forbidden" as const }
  const pin = cookies.get("cda_acting")?.value ?? ""
  const acting = admitted.ok && pin ? await ordering.actingFor(pin) : null
  if (pin && !acting) cookies.delete("cda_acting", { path: "/" })

  if (intent === "enter-pin") {
    const back = staffReturn(String(form.get("return") ?? "/staff"))
    if (!admitted.ok) return go("/", admitted.error)
    const result = await ordering.enterPin(String(form.get("pin") ?? ""))
    if (!result.ok) return go(back, result.error)
    cookies.set("cda_acting", String(form.get("pin") ?? ""), cookie)
    return redirect(back)
  }

  if (intent === "clear-pin") {
    cookies.delete("cda_acting", { path: "/" })
    return redirect(staffReturn(String(form.get("return") ?? "/staff")))
  }

  if (intent === "save-staff" || intent === "add-manager" || intent === "remove-staff" || intent === "clear-email") {
    if (!admitted.ok || !access) return go("/manage", "forbidden")
    const id = String(form.get("id") ?? "")
    if (intent === "save-staff") {
      const result = await ordering.saveStaff(access.email, {
        id: id || undefined,
        name: String(form.get("name") ?? ""),
        pin: String(form.get("pin") ?? ""),
      })
      return result.ok ? redirect("/manage") : go("/manage", result.error)
    }
    if (intent === "add-manager") {
      const result = await ordering.addManager(access.email, {
        name: String(form.get("name") ?? ""),
        pin: String(form.get("pin") ?? ""),
        email: String(form.get("email") ?? ""),
      })
      return result.ok ? redirect("/manage") : go("/manage", result.error)
    }
    if (intent === "clear-email") {
      const result = await ordering.clearManagerEmail(access.email, id)
      return result.ok ? redirect("/manage") : go("/manage", result.error)
    }
    const result = await ordering.removeStaff(access.email, id)
    return result.ok ? redirect("/manage") : go("/manage", result.error)
  }

  if (intent === "place" || intent === "change" || intent === "withdraw") {
    if (!session) return go("/")
  }

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
  const staffIntent = intent === "confirm" || intent === "advance" || intent === "cancel" || intent === "approve" || intent === "deny" || intent === "zip"
  if (staffIntent) {
    if (!acting) return go(intent === "zip" ? "/staff/delivery" : staffPath, "forbidden")
    if (intent === "confirm") {
      const result = await ordering.confirmOrder(acting, orderId)
      return result.ok ? redirect(staffPath) : go(staffPath, result.error)
    }
    if (intent === "advance") {
      const result = await ordering.advanceOrder(acting, orderId)
      return result.ok ? redirect(staffPath) : go(staffPath, result.error)
    }
    if (intent === "cancel") {
      const result = await ordering.cancelOrder(acting, orderId)
      return result.ok ? redirect(staffPath) : go(staffPath, result.error)
    }
    if (intent === "approve") {
      const result = await ordering.approveChange(acting, orderId)
      return result.ok ? redirect(staffPath) : go(staffPath, result.error)
    }
    if (intent === "deny") {
      const result = await ordering.denyChange(acting, orderId)
      return result.ok ? redirect(staffPath) : go(staffPath, result.error)
    }
    const open = String(form.get("open") ?? "") === "1"
    const result = await ordering.setDeliveryZip(acting, String(form.get("code") ?? ""), open)
    return result.ok ? redirect("/staff/delivery") : go("/staff/delivery", result.error)
  }

  return go(back, "forbidden")
}

function staffReturn(value: string): string {
  if (value.startsWith("/staff") || value.startsWith("/manage") || value.startsWith("/keystatic")) {
    const url = new URL(value, "http://cda.local")
    if (url.origin === "http://cda.local") return url.pathname
  }
  return "/staff"
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
