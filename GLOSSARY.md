# Wholesale ordering

CDA sells clothing wholesale. Buyers place Orders for Pickup or Delivery.

## Language

### Parties

**CDA**:
The business that sells clothing wholesale.

**Buyer**:
A business that purchases CDA's clothing for resale.
_Avoid_: Customer, client, retailer

**Staff**:
A person at CDA who reviews Orders.
_Avoid_: Worker, employee

### Goods

**Style**:
A clothing design CDA sells.
_Avoid_: Product, item, design

**Color**:
A color of a Style.
_Avoid_: Colorway

**Size**:
A size of a Style.

**SKU**:
One Style in one Color and one Size.
_Avoid_: Variant

**Quantity**:
A positive whole number of units of one SKU.

**Reservation**:
Units of a SKU held for an Order when the Buyer places it.
_Avoid_: Hold, allocation

**Price**:
The amount for one SKU on an Order, fixed when that SKU is added.
_Avoid_: Cost

**Line**:
The set of Styles CDA offers for one Season.
_Avoid_: Collection

**Season**:
The selling period a Line belongs to. It is open from its start through its end, only one Season is open at a time, and Seasons do not overlap.
_Avoid_: Drop

### Ordering

**Order**:
A Buyer's request for clothing from CDA, for Pickup or for Delivery, not both.

**Confirmed**:
An Order that will be filled.
_Avoid_: Approved

**Unconfirmed**:
An Order whose Reservation exceeds the units on hand and that Staff have not confirmed.
_Avoid_: Pending

**Confirmation**:
Whether the whole Order is Confirmed or Unconfirmed. Units on hand covering its Reservation make it Confirmed. Otherwise it stays Unconfirmed until Staff confirm it.
_Avoid_: Approval

**Change request**:
A Buyer's ask to add or remove SKUs, or to change the Quantities, Pickup time, Delivery time, Delivery address, or Delivery note, on a placed Order. It cannot switch the Order between Pickup and Delivery. Staff approve a move to a different Delivery zip only when that zip is open. A change that keeps the same zip can be approved after that zip is closed or removed from the set. Staff approve or deny the whole request before the Buyer receives the clothing, and the Order changes only when it is approved. The Buyer may withdraw a waiting request. Withdrawal leaves the Order unchanged. After a request is approved, denied, or withdrawn, the Buyer may submit another until the Change cutoff.
_Avoid_: Edit

**Change cutoff**:
The moment, a set duration before Pickup time or Delivery time, after which a Buyer can no longer submit a Change request. The same duration applies to every Order.

**Proposed**:
An Order a Buyer has placed and Staff have not reserved. Staff next move a Confirmed Order to Reserved. An Unconfirmed Order stays Proposed until Staff confirm it.

**Reserved**:
An Order Staff have accepted for its Pickup time or Delivery time. Staff next move it to Prepared.

**Prepared**:
An Order whose clothing is ready for Pickup or Delivery. Staff next move it to Completed.

**Completed**:
An Order Staff have marked done after they fulfill it. It stays Completed.
_Avoid_: Fulfilled

**Canceled**:
An Order Staff have stopped, from Proposed, Reserved, or Prepared, before the Buyer receives it.
_Avoid_: Void

**Pickup**:
The Buyer collects an Order's clothing from the pickup location.
_Avoid_: Shipment

**Delivery**:
A way to receive an Order at a Delivery address. The Buyer can choose it only when that address's zip is an open Delivery zip. A closed zip, or a zip that is not on the map, leaves Pickup available. Delivery uses the same statuses as Pickup.
_Avoid_: Shipment

**Delivery address**:
The street, city, state, zip, and phone number a Buyer gives for a Delivery Order. Delivery cannot be chosen without a phone number. The Delivery zip is the first five digits of that zip, and any further digits stay on the address. A Change request may move it to a different zip only when that zip is an open Delivery zip. A change that keeps the same zip, including a change to the phone number, can be approved after that zip is closed or removed from the set. The address changes only through an approved Change request.
_Avoid_: Shipping address

**Delivery note**:
Optional text a Buyer may add to a Delivery Order about receiving it. It may be blank. It changes only through an approved Change request, including after its Delivery zip is closed.
_Avoid_: Instructions, comment

**Delivery zip**:
The five-digit code Staff can open or close for Delivery. The map shows one only when Keystatic has its code and name and the repo has its shape. Staff do not add a zip from the map. Closing a zip, or removing it from that set, leaves Orders already placed for it on Delivery. A removed zip cannot be chosen for a new Order or for a move.
_Avoid_: Zone

**Delivery charge**:
One flat amount that may be added to every Delivery Order, fixed when the Order is placed. When it is zero or turned off, the Order has no delivery charge.
_Avoid_: Rate, shipping fee

**Delivery time**:
The time a Buyer names for receiving a Delivery Order, in the pickup location's local time. It is on or before the end of that Order's Season. A time already inside the Change cutoff can still be chosen.
_Avoid_: Window

**Pickup location**:
The one place CDA hands an Order to a Buyer.
_Avoid_: Store, branch

**Pickup time**:
The time a Buyer names for collecting an Order, in the pickup location's local time. It is on or before the end of that Order's Season. A time already inside the Change cutoff can still be chosen.
_Avoid_: Window
