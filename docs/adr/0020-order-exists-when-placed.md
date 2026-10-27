# An Order exists when the Buyer places it

Nothing is stored before the Buyer places the Order. There is no unplaced Order to resume. Placing creates the Proposed Order for the Season open then, with at least one SKU, its Prices, its Pickup or Delivery choice, its Delivery charge when it has one, and its Reservations. The Order keeps that Season. If no Season is open, the Buyer cannot place an Order. Placing needs a Square price for every SKU, a reading of the units on hand at the Pickup location, the open Season, and the Delivery charge setting. Zero or off still means no Delivery charge. If any of those cannot be read, nothing is stored.

## Considered options

- Saving an unplaced Order for the Buyer to resume. Rejected.
- Placing an Order when a Square price, the units on hand, the Season, or the Delivery charge setting cannot be read. Rejected. Nothing is stored. Zero or off is a real setting and means no Delivery charge.
- Moving an Order to a later Season. Rejected. It keeps the Season open at place.
