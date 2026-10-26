# Change requests until the cutoff

A Buyer may have one waiting Change request until the Change cutoff, while the Order is Proposed, Reserved, or Prepared. The request may add or remove SKUs on that Order's Line, or change Quantities, the Pickup time, the Delivery time, or the Delivery address. It cannot switch the Order between Pickup and Delivery. Approval updates the Order, leaves at least one SKU, and keeps that time on or before the Season's end. A new Delivery address is approved only when its zip is an open Delivery zip. A waiting request blocks fulfillment, and canceling the Order denies it.

## Considered options

- Leaving a placed Order unchanged by the Buyer. Rejected.
- Closing Change requests when the Order becomes Prepared. Rejected. The Change cutoff closes them.
- Letting a Change request switch Pickup and Delivery. Rejected. That choice is fixed when the Order is placed.
- Approving a Delivery address whose zip is closed. Rejected.
