import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { expect, it } from "vitest"
import Shell from "./Shell.astro"

// Seam: every page uses the workroom shell, so the language switch is on every page.
// Each language is named in its own writing, and choosing one stays on this address.

it("offers English, Español, and 한국어 on the page", async () => {
  const container = await AstroContainer.create()
  const html = await container.renderToString(Shell, {
    props: {
      title: "Sign in",
      account: "Atelier North",
      language: "es",
      requestUrl: new URL("http://cda.local/?sent=1"),
    },
  })
  expect(html).toContain('<html lang="es">')
  expect(html).toMatch(/<a[^>]*lang="en"[^>]*>\s*English\s*<\/a>/)
  expect(html).toMatch(/<a[^>]*lang="es"[^>]*aria-current="true"[^>]*>\s*Español\s*<\/a>/)
  expect(html).toMatch(/<a[^>]*lang="ko"[^>]*>\s*한국어\s*<\/a>/)
  expect(html).toContain('href="/?sent=1&#38;lang=ko"')
  expect(html).toContain(">Salir<")
  expect(html).toContain(">Mayoreo<")
  expect(html).not.toContain("noto-sans-kr")
})

it("loads a Hangul face when the page is Korean", async () => {
  const container = await AstroContainer.create()
  const html = await container.renderToString(Shell, {
    props: {
      title: "로그인",
      language: "ko",
      requestUrl: new URL("http://cda.local/"),
    },
  })
  expect(html).toContain('<html lang="ko">')
  expect(html).toContain("Noto Sans KR")
  expect(html).toContain("noto-sans-kr-korean-400-normal")
  expect(html).toContain("noto-sans-kr-korean-600-normal")
})
