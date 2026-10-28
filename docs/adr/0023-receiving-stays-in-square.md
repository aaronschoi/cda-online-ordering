# Receiving stays in Square

Staff count what arrived from a supplier and enter that quantity in Square at the pickup location. This app does not take supplier documents and does not apply inventory changes. The Inventory API can add in-stock units, and this app still leaves that write to Square. A supplier bill is the wrong quantity to add: the billed amount often differs from what arrived, and the supplier's item code is not a SKU. Units on hand stay Square's in-stock count at the pickup location. A restock still leaves an Unconfirmed Order Unconfirmed. A later flow may still create the Square sale, and Square then moves those units to sold.

## Considered options

- Reading a photo of a supplier bill with a model, then confirming the parsed lines in this app before writing Square. Rejected. The parsed quantity is what was billed, a supplier's item code is not a SKU, and a wrong increase becomes units on hand that the next Order treats as available.
- Applying the counted quantity from this app. Rejected. Square is where Staff enter what arrived, and a second write would drift from that count.
