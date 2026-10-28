import { describe, expect, it } from "vitest"
import { fill, formatMoney, formatWhen, introIn, languageChoice, languageHref, languages, phrases } from "./language.ts"

// Seam: a visitor's language is the lang they asked for, else the one they saved,
// else the browser's language, else English. Only an explicit choice is saved.

describe("language choice", () => {
  it("uses the language the visitor just chose", () => {
    expect(languageChoice({ query: "ko", cookie: "es", accept: "en" })).toEqual({
      language: "ko",
      remember: "ko",
    })
  })

  it("keeps a saved language when this request does not choose one", () => {
    expect(languageChoice({ query: null, cookie: "es", accept: "ko" })).toEqual({
      language: "es",
      remember: null,
    })
  })

  it("follows the browser when nothing was chosen or saved", () => {
    expect(languageChoice({ query: null, cookie: null, accept: "ko-KR,ko;q=0.9,en;q=0.8" })).toEqual({
      language: "ko",
      remember: null,
    })
    expect(languageChoice({ query: null, cookie: "nope", accept: "es-MX,es;q=0.9,en;q=0.5" })).toEqual({
      language: "es",
      remember: null,
    })
  })

  it("stays in English when no supported language is offered", () => {
    expect(languageChoice({ query: "zz", cookie: null, accept: "fr" })).toEqual({
      language: "en",
      remember: null,
    })
    expect(languageChoice({ query: null, cookie: null, accept: "ko;q=0,fr;q=1" })).toEqual({
      language: "en",
      remember: null,
    })
  })
})

// Seam: the switch names each language in its own writing, and the site copy
// for that choice is the copy a Buyer or Staff member reads.

describe("site language", () => {
  it("names each language in its own writing", () => {
    expect(languages.map((language) => language.label)).toEqual(["English", "Español", "한국어"])
  })

  it("speaks the sign-in page in the chosen language", () => {
    expect(phrases("en").signIn.title).toBe("Sign in")
    expect(phrases("es").signIn.title).toBe("Entrar")
    expect(phrases("ko").signIn.title).toBe("로그인")
    expect(phrases("en").signIn.lede).toBe(
      "CDA sells clothing wholesale. A Buyer signs in with a code sent to the Square Customer email.",
    )
    expect(phrases("es").signIn.lede).toBe(
      "CDA vende ropa al por mayor. Un comprador entra con un código enviado al correo del cliente de Square.",
    )
    expect(phrases("ko").signIn.lede).toBe(
      "CDA는 의류를 도매합니다. 바이어는 Square 고객 이메일로 받은 코드로 로그인합니다.",
    )
  })

  it("names a missed PIN and a Manager in the chosen language", () => {
    expect(phrases("en").pin.missed).toBe("That PIN does not name a Staff member.")
    expect(phrases("es").pin.missed).toBe("Ese PIN no corresponde a nadie del equipo.")
    expect(phrases("ko").pin.missed).toBe("그 PIN은 스태프를 가리키지 않습니다.")
    expect(fill(phrases("en").manager.role, { email: "staff@cda.example" })).toBe("Manager · staff@cda.example")
    expect(fill(phrases("es").manager.role, { email: "staff@cda.example" })).toBe("Gerente · staff@cda.example")
    expect(fill(phrases("ko").manager.role, { email: "staff@cda.example" })).toBe("매니저 · staff@cda.example")
    expect(phrases("en").failures["last-manager"]).toBe("The last Manager stays.")
    expect(phrases("es").failures["last-manager"]).toBe("El último gerente se queda.")
    expect(phrases("ko").failures["last-manager"]).toBe("마지막 매니저는 남습니다.")
    expect(phrases("en").failures.taken).toBe("That name, PIN, or email is already used.")
    expect(phrases("es").failures.taken).toBe("Ese nombre, PIN o correo ya está en uso.")
    expect(phrases("ko").failures.taken).toBe("그 이름, PIN 또는 이메일은 이미 사용 중입니다.")
  })

  it("names a Delivery zip by its neighborhood and code", () => {
    const values = { name: "Echo Park", code: "90026" }
    expect(fill(phrases("en").deliveryMap.open, values)).toBe("Open Echo Park, 90026")
    expect(fill(phrases("es").deliveryMap.close, values)).toBe("Cerrar Echo Park, 90026")
    expect(fill(phrases("ko").deliveryMap.isClosed, values)).toBe("Echo Park, 90026 닫혀 있음.")
  })

  it("explains a refused Buyer in the chosen language", () => {
    expect(phrases("en").failures["no-buyer"]).toBe("CDA has no Buyer for that email.")
    expect(phrases("es").failures["no-buyer"]).toBe("CDA no tiene un comprador con ese correo.")
    expect(phrases("ko").failures["no-buyer"]).toBe("해당 이메일의 바이어가 CDA에 없습니다.")
  })

  it("keeps the page and its other details when the language changes", () => {
    const url = new URL("http://cda.local/line?error=refused&email=buyer%40atelier.example")
    expect(languageHref(url, "ko")).toBe("/line?error=refused&email=buyer%40atelier.example&lang=ko")
    expect(languageHref(new URL("http://cda.local/orders/42?lang=es"), "en")).toBe("/orders/42?lang=en")
  })

  it("says where pickup is in the chosen language", () => {
    const values = { name: "CDA", address: "2148 Sunset Blvd", timezone: "America/Los_Angeles" }
    expect(fill(phrases("en").line.pickupAt, values)).toBe(
      "Pickup is at CDA, 2148 Sunset Blvd. Times use America/Los_Angeles.",
    )
    expect(fill(phrases("es").line.pickupAt, values)).toBe(
      "La recogida es en CDA, 2148 Sunset Blvd. Los horarios usan America/Los_Angeles.",
    )
    expect(fill(phrases("ko").line.pickupAt, values)).toBe(
      "픽업 장소는 CDA, 2148 Sunset Blvd입니다. 시각은 America/Los_Angeles 기준입니다.",
    )
  })

  it("shows the Line intro in the chosen language and falls back to English", () => {
    const intros = {
      en: "The Spring line is open.",
      es: "La línea de primavera está abierta.",
      ko: "봄 라인이 열렸습니다.",
    }
    expect(introIn("es", intros)).toBe("La línea de primavera está abierta.")
    expect(introIn("ko", { en: "The Spring line is open.", es: "", ko: "  " })).toBe("The Spring line is open.")
    expect(introIn("en", intros)).toBe("The Spring line is open.")
  })

  it("formats money and the scheduled day in the chosen language", () => {
    expect(formatMoney(1500, "en")).toBe("$15.00")
    expect(formatMoney(1500, "es")).toBe("$15.00")
    expect(formatMoney(1500, "ko")).toBe("US$15.00")
    expect(formatWhen("2026-10-28T14:30", "en")).toBe("Oct 28, 2026, 14:30")
    expect(formatWhen("2026-10-28T14:30", "es")).toBe("28 oct 2026, 14:30")
    expect(formatWhen("2026-10-28T14:30", "ko")).toBe("2026년 10월 28일, 14:30")
    expect(formatWhen("noon", "es")).toBe("noon")
  })
})
