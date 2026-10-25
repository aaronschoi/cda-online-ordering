# Buyer pays when a Worker fulfills the Order

A Buyer places an Order without paying. A Worker marks that Order paid when fulfilling it. Square does not show the unpaid Order on POS as an open ticket, and it rejects a completed fulfillment before payment, so the Worker does this in this app.

## Considered options

- Taking payment when the Buyer places the Order. Rejected.
- Leaving the Order unpaid for staff to charge as an open ticket on Square POS. Square does not support that for an Order created through the API.
