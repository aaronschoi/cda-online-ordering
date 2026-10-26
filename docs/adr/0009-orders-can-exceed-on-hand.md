# Orders can exceed the units on hand

A Buyer can place an Order when its Quantity exceeds the units on hand, because stock is restocked. Confirmation is for the whole Order: it is Confirmed when units on hand cover its Reservation, including after an approved Change request, and otherwise Unconfirmed until Staff confirm it. A restock does not confirm it, and Staff do not move an Unconfirmed Order to Reserved.

## Considered options

Rejecting an Order that exceeds the units on hand. Rejected. Confirming each SKU on its own. Rejected.
