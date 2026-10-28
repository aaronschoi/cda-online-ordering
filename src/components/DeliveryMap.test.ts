import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { expect, it } from "vitest"
import DeliveryMap from "./DeliveryMap.astro"
import { phrases } from "../domain/language.ts"

// Seam: the Delivery zips page. A shape is the control while a PIN is acting,
// and the same shape is only a label when it is not.

const copy = phrases("en").deliveryMap
const shapes = [
  {
    code: "90026",
    name: "Echo Park",
    open: false,
    rings: [[[-118.28, 34.07], [-118.26, 34.08], [-118.25, 34.07], [-118.28, 34.07]]],
  },
  {
    code: "90027",
    name: "Los Feliz",
    open: true,
    rings: [[[-118.3, 34.1], [-118.28, 34.12], [-118.27, 34.1], [-118.3, 34.1]]],
  },
]

async function render(acting: boolean) {
  const container = await AstroContainer.create()
  return container.renderToString(DeliveryMap, {
    props: {
      shapes,
      acting,
      mapLabel: copy.mapLabel,
      openLabel: copy.open,
      closeLabel: copy.close,
      isOpen: copy.isOpen,
      isClosed: copy.isClosed,
    },
  })
}

it("opens or closes a Delivery zip by selecting its shape", async () => {
  const html = await render(true)
  expect(html).toContain("Open Echo Park, 90026")
  expect(html).toContain("Close Los Feliz, 90027")
  expect(html).toContain("data-delivery-map")
  expect(html).toContain('name="intent" value="zip"')
  expect(html).toContain('name="code" value="90026"')
  expect(html).toContain('name="open" value="1"')
  expect(html).toContain('name="code" value="90027"')
  expect(html).toContain('name="open" value="0"')
  expect(html).toContain("-118.28")
  expect(html).not.toContain('class="zips"')
})

it("shows the shape and does not ask for a PIN when none is acting", async () => {
  const html = await render(false)
  expect(html).not.toContain("<form")
  expect(html).not.toContain("<button")
  expect(html).toContain("Echo Park, 90026 is closed.")
  expect(html).toContain("Los Feliz, 90027 is open.")
  expect(html).toContain("data-delivery-map")
})
