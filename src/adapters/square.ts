import { fixtureCustomers, fixtureLocation, fixtureOnHand, fixtureStyles } from "../domain/fixture.ts"
import type { Customer, LocationInfo, Sku, SquarePort, Style } from "../domain/types.ts"

type SquareEnv = {
  SQUARE_ACCESS_TOKEN?: string
  SQUARE_LOCATION_ID?: string
  SQUARE_ENV?: string
}

export function createSquare(env: SquareEnv): SquarePort {
  if (!env.SQUARE_ACCESS_TOKEN) return fixtureSquare()
  return liveSquare(env.SQUARE_ACCESS_TOKEN, env.SQUARE_LOCATION_ID, env.SQUARE_ENV === "sandbox")
}

export function fixtureSquare(): SquarePort {
  return {
    async customerByEmail(email) {
      return fixtureCustomers.find((customer) => customer.email === email) ?? null
    },
    async location() {
      return fixtureLocation
    },
    async catalog() {
      return { styles: fixtureStyles }
    },
    async onHand(skuIds) {
      const counts: Record<string, number> = {}
      for (const id of skuIds) counts[id] = fixtureOnHand[id] ?? 0
      return counts
    },
  }
}

type SquareObject = {
  type?: string
  id?: string
  item_data?: {
    name?: string
    description?: string
    image_ids?: string[]
    variations?: {
      id?: string
      item_variation_data?: {
        name?: string
        price_money?: { amount?: number }
        image_ids?: string[]
      }
    }[]
  }
  image_data?: { url?: string }
}

export function catalogFromSquare(objects: SquareObject[]): { styles: Style[] } {
  const images = new Map<string, string>()
  for (const object of objects) {
    if (object.type === "IMAGE" && object.id && object.image_data?.url) images.set(object.id, object.image_data.url)
  }
  const styles: Style[] = []
  for (const object of objects) {
    if (object.type !== "ITEM" || !object.id || !object.item_data) continue
    const styleImage = object.item_data.image_ids?.map((id) => images.get(id)).find(Boolean) ?? null
    const skus: Sku[] = (object.item_data.variations ?? []).flatMap((variation) => {
      if (!variation.id) return []
      const data = variation.item_variation_data
      const name = data?.name ?? ""
      const [color, size] = name.includes(" / ") ? name.split(" / ") : [name || "One", "one"]
      const imageId = data?.image_ids?.[0]
      return [
        {
          id: variation.id,
          color: color || "One",
          size: size || "one",
          priceCents: data?.price_money?.amount ?? null,
          imageUrl: (imageId && images.get(imageId)) || null,
        },
      ]
    })
    styles.push({
      id: object.id,
      name: object.item_data.name ?? "Style",
      description: object.item_data.description ?? "",
      imageUrl: styleImage,
      skus,
    })
  }
  return { styles }
}

function liveSquare(token: string, locationId: string | undefined, sandbox: boolean): SquarePort {
  const base = sandbox ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com"
  async function call<T>(path: string, init?: RequestInit): Promise<T | "unread"> {
    try {
      const response = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Square-Version": "2025-01-23",
          ...(init?.headers ?? {}),
        },
      })
      if (!response.ok) return "unread"
      return (await response.json()) as T
    } catch {
      return "unread"
    }
  }

  return {
    async customerByEmail(email) {
      const body = await call<{ customers?: { id?: string; email_address?: string; given_name?: string; family_name?: string; company_name?: string }[] }>(
        "/v2/customers/search",
        { method: "POST", body: JSON.stringify({ query: { filter: { email_address: { exact: email } } } }) },
      )
      if (body === "unread") return "unread"
      const customer = body.customers?.[0]
      if (!customer?.id) return null
      const name = customer.company_name || [customer.given_name, customer.family_name].filter(Boolean).join(" ") || email
      return { id: customer.id, email, name }
    },
    async location() {
      const body = await call<{ locations?: { id?: string; name?: string; timezone?: string; status?: string; address?: { address_line_1?: string; locality?: string; administrative_district_level_1?: string; postal_code?: string } }[] }>("/v2/locations")
      if (body === "unread") return "unread"
      const locations = body.locations ?? []
      const location = locations.find((item) => item.id === locationId) ?? locations.find((item) => item.status === "ACTIVE") ?? locations[0]
      if (!location?.id || !location.timezone) return "unread"
      const address = location.address
      const formatted = [address?.address_line_1, address?.locality, address?.administrative_district_level_1, address?.postal_code]
        .filter(Boolean)
        .join(", ")
      return { id: location.id, name: location.name ?? "CDA", address: formatted, timezone: location.timezone }
    },
    async catalog() {
      const objects: SquareObject[] = []
      let cursor = ""
      do {
        const path = `/v2/catalog/list?types=ITEM,IMAGE${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
        const body = await call<{ objects?: SquareObject[]; cursor?: string }>(path)
        if (body === "unread") return "unread"
        objects.push(...(body.objects ?? []))
        cursor = body.cursor ?? ""
      } while (cursor)
      return catalogFromSquare(objects)
    },
    async onHand(skuIds, id) {
      if (skuIds.length === 0) return {}
      const body = await call<{ counts?: { catalog_object_id?: string; location_id?: string; quantity?: string; state?: string }[] }>(
        "/v2/inventory/counts/batch-retrieve",
        { method: "POST", body: JSON.stringify({ catalog_object_ids: skuIds, location_ids: [id] }) },
      )
      if (body === "unread") return "unread"
      const counts: Record<string, number> = {}
      for (const skuId of skuIds) counts[skuId] = 0
      for (const count of body.counts ?? []) {
        if (count.state !== "IN_STOCK" || !count.catalog_object_id || count.location_id !== id) continue
        counts[count.catalog_object_id] = (counts[count.catalog_object_id] ?? 0) + Number(count.quantity ?? 0)
      }
      return counts
    },
  }
}

export type { Customer, LocationInfo }
