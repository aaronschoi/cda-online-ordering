# Orders can exceed the units on hand

A Buyer can place an Order when its Quantity exceeds the units on hand, because stock is restocked. Confirmation is for the whole Order: it is Confirmed when units on hand cover its Reservation, including after an approved Change request, and otherwise Unconfirmed until Staff confirm it. A restock does not confirm it, and a later drop in units on hand does not return a Confirmed Order to Unconfirmed. Staff do not move an Unconfirmed Order from Proposed to Reserved, and they do not mark it Completed. An approved Change request can make a Reserved or Prepared Order Unconfirmed and leave it on that step. Units on hand cover a Reservation when Square's in-stock count at the pickup location, minus Quantities reserved for other Orders that are not Completed or Canceled, is at least this Order's Quantity. That check and the Reservation write happen together. The Buyer's choosing list leaves the units on hand off it and shows Confirmation on the Order after it is placed. Staff see the units on hand when they review an Order.

## Considered options

- Rejecting an Order that exceeds the units on hand. Rejected. Confirming each SKU on its own. Rejected.
- Returning a Reserved or Prepared Order to Proposed when an approved Change request makes it Unconfirmed. Rejected. The step stays.
- Showing units on hand on the Buyer's choosing list. Rejected. The list shows the SKU, its picture, and its Price. Confirmation shows on the Order.
