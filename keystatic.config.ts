import { collection, config, fields, singleton } from "@keystatic/core"

const repo = process.env.KEYSTATIC_GITHUB_REPO
const storage = repo
  ? { kind: "github" as const, repo: repo as `${string}/${string}` }
  : { kind: "local" as const }

export default config({
  storage,
  ui: {
    brand: { name: "CDA" },
    navigation: ["settings", "copy", "deliveryZips"],
  },
  singletons: {
    settings: singleton({
      label: "Settings",
      path: "src/content/settings",
      format: { data: "json" },
      schema: {
        changeCutoffHours: fields.integer({
          label: "Change cutoff hours",
          description: "Hours before the scheduled time when a Buyer can no longer submit a Change request.",
        }),
        deliveryChargeEnabled: fields.checkbox({
          label: "Delivery charge",
          description: "When this is off, a Delivery Order has no charge line.",
        }),
        deliveryChargeCents: fields.integer({
          label: "Delivery charge cents",
          description: "Flat amount in cents, fixed on the Order when it is placed.",
        }),
        seasonName: fields.text({ label: "Season name" }),
        seasonStartsAt: fields.text({
          label: "Season starts",
          description: "Location-local instant with an offset, such as 2026-10-01T00:00:00-07:00.",
        }),
        seasonEndsAt: fields.text({
          label: "Season ends",
          description: "Location-local instant with an offset, such as 2027-03-31T23:59:00-07:00.",
        }),
        lineStyleIds: fields.array(fields.text({ label: "Style id" }), {
          label: "Styles on the Line",
          description: "Square item ids. A Style off this list is hidden, even when it has a price.",
          itemLabel: (props) => props.value,
        }),
      },
    }),
    copy: singleton({
      label: "Copy",
      path: "src/content/copy",
      format: { data: "json" },
      schema: {
        intro: fields.text({ label: "Line intro (English)", multiline: true }),
        introEs: fields.text({ label: "Line intro (Español)", multiline: true }),
        introKo: fields.text({ label: "Line intro (한국어)", multiline: true }),
      },
    }),
  },
  collections: {
    deliveryZips: collection({
      label: "Delivery zips",
      path: "src/content/delivery-zips/*",
      slugField: "name",
      format: { data: "json" },
      schema: {
        name: fields.slug({
          name: { label: "Neighborhood" },
          slug: {
            label: "Zip code",
            description: "Five digits. The file is named with this code.",
            validation: {
              pattern: { regex: /^\d{5}$/, message: "Use five digits." },
            },
          },
        }),
      },
    }),
  },
})
