import type { ContentData, Customer, LocationInfo, Style } from "./types.ts"

export function swatch(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="104"><rect width="80" height="104" fill="${color}"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const fixtureLocation: LocationInfo = {
  id: "loc_cda",
  name: "CDA",
  address: "2148 Sunset Blvd, Los Angeles, CA 90026",
  timezone: "America/Los_Angeles",
}

export const fixtureCustomers: Customer[] = [
  { id: "cust_atelier", email: "buyer@atelier.example", name: "Atelier North" },
]

const jacketSwatch = swatch("#cfc8bc")
const indigoSwatch = swatch("#243f73")
const claySwatch = swatch("#a3684a")
const clayOtherSwatch = swatch("#d7a07a")
const trouserSwatch = swatch("#d9d6cf")
const inkSwatch = swatch("#1c2430")

export const fixtureStyles: Style[] = [
  {
    id: "style-jacket",
    name: "Mill Jacket",
    description: "Wool jacket with a set-in sleeve.",
    imageUrl: jacketSwatch,
    skus: [
      { id: "jacket-indigo-1", color: "Indigo", size: "1", priceCents: 24000, imageUrl: indigoSwatch },
      { id: "jacket-indigo-2", color: "Indigo", size: "2", priceCents: 24000, imageUrl: indigoSwatch },
      { id: "jacket-clay-1", color: "Clay", size: "1", priceCents: 24000, imageUrl: claySwatch },
      { id: "jacket-clay-2", color: "Clay", size: "2", priceCents: 24000, imageUrl: clayOtherSwatch },
      { id: "jacket-undyed-1", color: "Undyed", size: "1", priceCents: null, imageUrl: null },
    ],
  },
  {
    id: "style-trouser",
    name: "Work Trouser",
    description: "Cotton trouser with a straight leg.",
    imageUrl: trouserSwatch,
    skus: [
      { id: "trouser-ink-30", color: "Ink", size: "30", priceCents: 16000, imageUrl: inkSwatch },
      { id: "trouser-ink-32", color: "Ink", size: "32", priceCents: 16000, imageUrl: inkSwatch },
    ],
  },
  {
    id: "style-scarf",
    name: "Shop Scarf",
    description: "Wool scarf that is not on this Line.",
    imageUrl: swatch("#8d6b4a"),
    skus: [
      { id: "scarf-camel", color: "Camel", size: "one", priceCents: 9000, imageUrl: swatch("#8d6b4a") },
    ],
  },
]

export const fixtureOnHand: Record<string, number> = {
  "jacket-indigo-1": 4,
  "jacket-indigo-2": 0,
  "jacket-clay-1": 3,
  "jacket-clay-2": 3,
  "jacket-undyed-1": 2,
  "trouser-ink-30": 6,
  "trouser-ink-32": 6,
  "scarf-camel": 2,
}

export const fixtureContentBase: Omit<ContentData, "shapes"> = {
  intro: "The Spring line is open. Choose the SKUs, then place the Order for Pickup or Delivery.",
  intros: {
    en: "The Spring line is open. Choose the SKUs, then place the Order for Pickup or Delivery.",
    es: "La línea de primavera está abierta. Elige los SKU y haz el pedido para recogida o entrega.",
    ko: "봄 라인이 열렸습니다. SKU를 고른 다음 픽업 또는 배송으로 주문하세요.",
  },
  changeCutoffHours: 24,
  deliveryChargeEnabled: true,
  deliveryChargeCents: 1500,
  season: {
    name: "Spring 2027",
    startsAt: "2026-10-01T00:00:00-07:00",
    endsAt: "2027-03-31T23:59:00-07:00",
  },
  lineStyleIds: ["style-jacket", "style-trouser"],
  deliveryZips: [
    { code: "90026", name: "Echo Park" },
    { code: "90027", name: "Los Feliz" },
    { code: "90039", name: "Atwater" },
    { code: "90042", name: "Highland Park" },
    { code: "90210", name: "Beverly Hills" },
  ],
}
