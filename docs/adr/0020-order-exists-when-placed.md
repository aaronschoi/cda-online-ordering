# An Order exists when the Buyer places it

Nothing is stored before the Buyer places the Order. There is no unplaced Order to resume. Placing creates the Proposed Order for the Season open then, with at least one SKU, its Prices, its Pickup or Delivery choice, its Delivery charge when it has one, and its Reservations. The Order keeps that Season. If no Season is open, the Buyer cannot place an Order. Placing needs a Square price for every SKU and a reading of the units on hand at the Pickup location. If either is missing, nothing is stored.

## Considered options

- Saving an unplaced Order for the Buyer to resume. Rejected.
- Placing an Order when a Square price or the units on hand cannot be read. Rejected. Nothing is stored.
- Moving an Order to a later Season. Rejected. It keeps the Season open at place.
