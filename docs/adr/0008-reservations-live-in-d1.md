# Reservations are held in D1

The reserved Quantity and SKU are stored in Cloudflare D1. Square's in-stock count is not reduced when an Order is placed, because Staff complete the sale in Square's own app and Square moves those units to sold then. The API cannot write its reserved-for-sale state.

## Considered options

Moving units into Square's reserved-for-sale state, or decrementing in-stock at placement. Rejected. The reserved-for-sale state is read-only, and decrementing in-stock would remove the units again when the Order is completed.
