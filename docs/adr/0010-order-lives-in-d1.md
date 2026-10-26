# The Order lives in D1 and the sale lives in Square

The Order, its SKUs, Quantities, Prices, Pickup time, Confirmation, Change requests, and Reservations are stored in Cloudflare D1. Square holds the sale Staff create later, not this Order.

## Considered options

Creating the Square order when the Buyer places the Order, and treating Square as the record of that Order. Rejected, so a later Square flow can change how Staff fulfill without changing how Buyers order.
