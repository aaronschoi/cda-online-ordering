# Wholesale ordering

CDA sells clothing wholesale. Buyers place Orders for Pickup.

## Language

### Parties

**CDA**:
The business that sells clothing wholesale.

**Buyer**:
A business that purchases CDA's clothing for resale.
_Avoid_: Customer, client, retailer

**Worker**:
A person at CDA who handles scheduled Orders.
_Avoid_: Staff, employee

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
A Buyer's request for clothing from CDA, for Pickup.

**Change request**:
A Buyer's ask to add or remove SKUs, or to change the Quantities or Pickup time, on a placed Order. A Worker approves or denies it before Pickup, and the Order changes only when it is approved.
_Avoid_: Edit

**Change cutoff**:
The moment, a set duration before Pickup time, after which a Buyer can no longer submit a Change request. The same duration applies to every Order.

**Proposed**:
An Order a Buyer has placed and a Worker has not reserved.

**Reserved**:
An Order a Worker has accepted for its Pickup time.

**Prepared**:
An Order whose clothing is ready for Pickup.

**Completed**:
An Order the Buyer has collected.
_Avoid_: Fulfilled

**Canceled**:
An Order a Worker has stopped before it is paid.
_Avoid_: Void

**Pickup**:
The Buyer collects an Order's clothing from the pickup location.
_Avoid_: Shipment, delivery

**Pickup location**:
The one place CDA hands an Order to a Buyer.
_Avoid_: Store, branch

**Pickup time**:
The time a Buyer names for collecting an Order. It is on or before the end of that Order's Season.
