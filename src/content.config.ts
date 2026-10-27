import { defineCollection, z } from "astro:content"
import { glob } from "astro/loaders"

const deliveryZips = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/delivery-zips" }),
  schema: z.object({ name: z.string() }),
})

export const collections = { "delivery-zips": deliveryZips }
