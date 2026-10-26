# Buyer pays when a Worker fulfills the Order

A Buyer places an Order without paying. When a Worker fulfills it, this app records an external Square payment for the order total, with no sales tax, named cash, check, or other, then marks the Order Completed. Square rejects a completed fulfillment before payment, and it does not show the unpaid Order on POS as an open ticket.

## Considered options

- Taking payment when the Buyer places the Order. Rejected.
- Charging a card in this app, or leaving an open ticket on Square POS. Rejected. The Worker has already taken cash, check, or a card outside this app.
