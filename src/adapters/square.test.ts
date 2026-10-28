import { describe, expect, it } from "vitest"
import { catalogFromSquare } from "./square.ts"

describe("Square catalog", () => {
  it("reads a Style, a shared Color picture, and a missing price", () => {
    const catalog = catalogFromSquare([
      { type: "IMAGE", id: "img-style", image_data: { url: "https://images.example/style.jpg" } },
      { type: "IMAGE", id: "img-indigo", image_data: { url: "https://images.example/indigo.jpg" } },
      {
        type: "ITEM",
        id: "item-1",
        item_data: {
          name: "Mill Jacket",
          description: "Wool jacket.",
          image_ids: ["img-style"],
          variations: [
            {
              id: "var-1",
              item_variation_data: { name: "Indigo / 1", price_money: { amount: 24000 }, image_ids: ["img-indigo"] },
            },
            {
              id: "var-2",
              item_variation_data: { name: "Indigo / 2", price_money: { amount: 24000 }, image_ids: ["img-indigo"] },
            },
            { id: "var-3", item_variation_data: { name: "Undyed / 1" } },
          ],
        },
      },
    ])
    const style = catalog.styles[0]
    expect(style?.name).toBe("Mill Jacket")
    expect(style?.description).toBe("Wool jacket.")
    expect(style?.imageUrl).toBe("https://images.example/style.jpg")
    expect(style?.skus[0]).toMatchObject({ id: "var-1", color: "Indigo", size: "1", priceCents: 24000, imageUrl: "https://images.example/indigo.jpg" })
    expect(style?.skus[2]?.priceCents).toBeNull()
  })
})
