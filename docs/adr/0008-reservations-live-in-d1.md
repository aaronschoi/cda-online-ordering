# Reservations are held in D1

Each Reservation is a row in Cloudflare D1 for one Order, one SKU, and the Quantity held. The stock check and that write happen together when the Buyer places an Order and when Staff approve a Change request that changes Quantities, so a later place or approval sees the new Reservation. Cancel deletes that Order's rows. Completed deletes them when Square marks the units sold. Square's in-stock count is not reduced when an Order is placed, because Staff complete the sale in Square's own app and Square moves those units to sold then. The API cannot write its reserved-for-sale state.

## Considered options

- Moving units into Square's reserved-for-sale state, or decrementing in-stock at placement. Rejected. The reserved-for-sale state is read-only, and decrementing in-stock would remove the units again when Staff complete the sale.
- Reading units on hand and writing the Reservation as two separate steps. Rejected. The second place or approval would miss the first Reservation.
