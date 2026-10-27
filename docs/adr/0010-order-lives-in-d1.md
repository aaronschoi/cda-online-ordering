# The Order lives in D1 and the sale lives in Square

The Order, its SKUs, Quantities, Prices, the Style name, Color, and Size from when each SKU was added, whether it is for Pickup or Delivery, Pickup time or Delivery time, Delivery address, Delivery note, Delivery charge, Confirmation, Change requests, and Reservations are stored in Cloudflare D1. The picture is read from Square and is not stored on the Order. Square holds the sale Staff create later, not this Order. The Order does not store that sale's id.

## Considered options

- Creating the Square order when the Buyer places the Order, and treating Square as the record of that Order. Rejected, so a later Square flow can change how Staff fulfill without changing how Buyers order.
- Showing the live Square name on an Order after the Style is renamed or removed. Rejected. The Order remembers the Style name, Color, and Size from when the SKU was added.
