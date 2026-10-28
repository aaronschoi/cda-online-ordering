import { defineMiddleware } from "astro:middleware"
import { accessEmail, envOf, orderingFor } from "./server/app.ts"

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname
  const keepPin =
    path.startsWith("/staff") ||
    path.startsWith("/manage") ||
    path.startsWith("/keystatic") ||
    path.startsWith("/api/keystatic") ||
    path === "/api/act"
  const dest = context.request.headers.get("sec-fetch-dest")
  const prefetch =
    context.request.headers.get("sec-purpose") === "prefetch" || context.request.headers.get("purpose") === "prefetch"
  if (!keepPin && !prefetch && (dest === "document" || dest == null)) {
    context.cookies.delete("cda_acting", { path: "/" })
  }

  const keystatic = path.startsWith("/keystatic") || path.startsWith("/api/keystatic")
  if (keystatic) {
    const env = envOf(context.locals)
    const ordering = await orderingFor(env)
    const access = accessEmail(context.request, env)
    const admitted = access ? await ordering.admit(access.email) : { ok: false as const }
    if (!admitted.ok) {
      context.cookies.delete("cda_acting", { path: "/" })
      return context.redirect("/")
    }
  }

  return next()
})
