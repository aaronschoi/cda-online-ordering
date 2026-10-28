# Astro on Cloudflare Workers

The ordering app is one Astro project deployed as a Cloudflare Worker. Pages are server-rendered. React is installed because Keystatic needs it. Orders, Reservations, sessions, sign-in codes, Staff passwords, and Delivery zip toggles live in D1. Keystatic edits the Season, the Line, the Change cutoff, the Delivery charge, Buyer copy, and each Delivery zip's code and name in this repo. On Cloudflare the editor uses GitHub mode, because the Worker has no content disk to write. The Worker reads the content that was deployed with it, and reads GitHub when a token is configured.

Square is read for Styles, SKUs, prices, pictures, Customers, the Pickup location, and units on hand. This app still does not create the Square sale. With no Square token, a fixture catalog stands in so the same ordering rules run locally.

The ordering rules are one module, `createOrdering`. Tests call that module. Square, email, the clock, ids, and the database are passed in.

## Considered options

- Next.js on Cloudflare through OpenNext. Rejected. Keystatic's maintained Cloudflare path is Astro, and OpenNext is another project to keep working whenever Next.js changes.
- A separate API service beside the site. Rejected. One Worker and one D1 database are the whole runtime.
