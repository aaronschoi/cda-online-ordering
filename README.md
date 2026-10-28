# CDA online ordering

Wholesale Buyers place Orders for the current Season. Staff review those Orders here, then fulfill the sale in Square and mark the Order Completed. This app does not take payment and does not open a ticket in Square.

The app is one Astro project on a Cloudflare Worker. Pages are server-rendered. Orders, Reservations, sessions, sign-in codes, Staff passwords, and Delivery zip toggles are in D1. Season, Line, Change cutoff, Delivery charge, Buyer copy, and Delivery zip names are edited in Keystatic. Square is read for Styles, SKUs, prices, pictures, Customers, the Pickup location, and units on hand. The ordering rules live in `src/domain/ordering.ts`.

## Run locally

```sh
npm install
npm test
npm run dev
```

The dev server is http://127.0.0.1:4321. The first request creates the D1 tables in the local database named `cda-ordering`.

With no Square token, the Line is the fixture catalog. In dev, Staff can sign in as `staff@cda.example` / `cda-staff` until a Staff password is stored. The fixture Buyer is `buyer@atelier.example`. Requesting a code shows it on the sign-in page, because dev does not send email.

Keystatic is at `/keystatic`. It writes `src/content` on disk. Set `KEYSTATIC_GITHUB_REPO` to `owner/name` when the editor should commit to GitHub instead. The Worker has no content disk.

## Deploy

Create a D1 database and put its id in `wrangler.jsonc` under `d1_databases[0].database_id`. Apply `migrations/0001_init.sql`, then `npm run build` and deploy the Worker with Wrangler.

| Variable | Use |
| --- | --- |
| `SQUARE_ACCESS_TOKEN` | Square catalog, inventory, customers, and location. Absent in dev: fixture catalog. |
| `SQUARE_LOCATION_ID` | Limits the read to one location. |
| `SQUARE_ENV` | `sandbox` uses the Square sandbox host. |
| `STAFF_EMAIL` / `STAFF_PASSWORD` | Seeds the first Staff password when the staff table is empty. |
| `KEYSTATIC_GITHUB_REPO` | `owner/name`. Keystatic GitHub mode, and live content reads when a token is set. |
| `GITHUB_TOKEN` | Reads content from that repo. A failed read refuses the action instead of using the deployed copy. |

Words used in the interface are defined in `GLOSSARY.md`. Decisions are in `docs/adr`.
