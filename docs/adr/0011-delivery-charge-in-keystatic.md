# The Delivery charge is one flat amount edited in Keystatic

Keystatic holds one flat Delivery charge and an on/off toggle. It is not a percentage of the goods and not a different amount per Delivery zip. The amount on an Order is fixed when the Order is placed. When the toggle is off or the amount is zero at placement, that Order has no delivery charge, and a later Keystatic edit does not reprice it. A Pickup Order does not include it. An approved Change request does not change it.

## Considered options

- Hard-coding delivery as free. Rejected. The charge has to be editable, and the Order shows no delivery line when it is zero or off.
- A percentage of the goods, or a different amount per Delivery zip. Rejected.
- Repricing a placed Order when the Delivery charge changes. Rejected.
