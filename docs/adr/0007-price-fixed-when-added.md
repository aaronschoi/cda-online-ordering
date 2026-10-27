# Price is fixed when a SKU is added

The Price of a SKU on an Order is fixed when that SKU is added, and the goods total is the sum of each Price times its Quantity, with no discount. A Delivery Order may also include the flat Delivery charge fixed when that Order was placed. An approved Change request that adds a SKU uses the Square price at approval. If that price is missing, Staff cannot approve the request. A later catalog change does not reprice SKUs already on the Order. A SKU that leaves the catalog or the Line keeps the Price already fixed on the Order.

## Considered options

- Repricing an Order when Square's catalog price changes. Rejected.
- Approving an add when Square has no price for that SKU. Rejected.
