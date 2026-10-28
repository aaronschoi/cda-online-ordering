# Wholesale ordering

CDA sells clothing wholesale. Buyers place Orders for Pickup or Delivery.

## Language

### Parties

**CDA**:
The business that sells clothing wholesale.

**Buyer**:
A business that purchases CDA's clothing for resale. After signing in, a Buyer sees the open Line and only that Buyer's Orders, including Completed and Canceled. A signed-out visitor sees neither Styles, prices, nor Orders. The Buyer's email is that Square Customer email and is not a Manager's email.
_Avoid_: Customer, client, retailer

**Staff**:
A person at CDA who reviews Orders. Staff see every Order and the units on hand. A Staff member who is not a Manager has a name and a PIN and no email. No two Staff members share a name.
_Avoid_: Worker, employee

**Manager**:
A Staff member with an email that is not a Buyer's Square Customer email. A Buyer code to that email is refused. There is always at least one Manager. The first Manager's email is named before the pages open, and that Manager sets their name and PIN afterward. Once a Manager exists, the Staff list is who may open the pages. A Manager maintains the Staff list, sees every PIN and the Staff log, and edits the Season, the Line, the Change cutoff, the Delivery charge, Buyer copy, and Delivery zip names. A PIN is not required for that work. Other Staff members cannot.
_Avoid_: Admin, owner

**PIN**:
A Staff member's four-digit secret for acting on an Order. It belongs to one Staff member, a Manager can read it, and no two Staff members share one. It remains who is acting until a different PIN replaces it, the Staff member clears it, the staff pages and the manager section are left, or a Manager changes or removes it. A PIN that belongs to nobody leaves who is acting unchanged.
_Avoid_: Password, code

### Goods

**Style**:
A clothing design CDA sells. Its name, description, and image come from Square's catalog.
_Avoid_: Product, item, design

**Color**:
A color of a Style. The SKUs of one Style and Color share one picture from Square. When that picture is missing, or those SKUs do not show the same picture, Buyers see the Style picture.
_Avoid_: Colorway

**Size**:
A size of a Style.

**SKU**:
One Style in one Color and one Size. An Order remembers the Style name, description, Color, and Size on that SKU from when it was added. The description is the Style's description from that moment. A SKU has no description of its own.
_Avoid_: Variant

**Quantity**:
A positive whole number of units of one SKU.

**Reservation**:
Units of a SKU held for an Order when the Buyer places it, or when an approved Change request changes its Quantity. The stock check and this write happen together, so a later place or approval sees it.
_Avoid_: Hold, allocation

**Price**:
The amount for one SKU on an Order, fixed when that SKU is added. An added SKU on a Change request takes the Square price at approval. A missing price blocks approval of that whole request.
_Avoid_: Cost

**Line**:
The set of Styles CDA offers for one Season. After signing in, Buyers choosing SKUs see the Line of the open Season, and only SKUs with a Square price, including when the units on hand are zero. That list shows each SKU, its picture, and its Price, and leaves the units on hand off it. A Style with no priced SKU is left off that list. A Change request can add a SKU only when its Style is on the Line at submission. A SKU already on an Order stays on it, with its Quantity and Price, after it leaves the Line or the catalog.
_Avoid_: Collection

**Season**:
The selling period a Line belongs to. It is open from its start through its end, only one Season is open at a time, and Seasons do not overlap. An Order takes the Season open when the Buyer places it, and keeps that Season.
_Avoid_: Drop

### Ordering

**Order**:
A Buyer's request for clothing from CDA, for Pickup or for Delivery, not both. It exists when the Buyer places it, for the Season open then, with at least one SKU. If no Season is open, the Buyer cannot place one. Placing needs a Square price for every SKU, a reading of the units on hand, and the Delivery charge setting. If any of those cannot be read, nothing is stored.

**Staff log**:
The record of a staff action. It names the Staff member, the action, when it happened in the pickup location's local time, and either the Order or the Delivery zip. It does not assign the Order to that Staff member, and a later change leaves the entry as written. When that location cannot be read, the action is not done and there is no entry.
_Avoid_: Audit trail, history

**Confirmed**:
An Order that will be filled.
_Avoid_: Approved

**Unconfirmed**:
An Order whose Reservation exceeds the units on hand and that Staff have not confirmed.
_Avoid_: Pending

**Confirmation**:
Whether the whole Order is Confirmed or Unconfirmed. Units on hand covering its Reservation make it Confirmed, including after an approved Change request. Otherwise it stays Unconfirmed until Staff confirm it. A restock does not confirm it. An approved Change request can make a Reserved or Prepared Order Unconfirmed and leave it on that step. Staff cannot mark the Order Completed while it is Unconfirmed. A Buyer sees Confirmation on the Order after placing it.
_Avoid_: Approval

**Change request**:
A Buyer's ask to add or remove SKUs, or to change the Quantities, Pickup time, Delivery time, Delivery address, or Delivery note, on a placed Order. It cannot switch the Order between Pickup and Delivery. Staff approve a move to a different Delivery zip only when that zip is open. A change that keeps the same zip can be approved after that zip is closed or removed from the set. Staff approve or deny the whole request before the Buyer receives the clothing, and the Order changes only when it is approved. The Buyer may withdraw a waiting request, including after the Change cutoff. Withdrawal leaves the Order unchanged. A waiting request blocks Completed. Staff may still move the Order to Reserved and to Prepared. After a request is approved, denied, or withdrawn, the Buyer may submit another until the Change cutoff.
_Avoid_: Edit

**Change cutoff**:
The moment, a set duration before Pickup time or Delivery time, after which a Buyer can no longer submit a Change request. Submitting needs that duration and the Line. If either cannot be read, the request is not submitted. The Buyer may still withdraw a request that is already waiting. The same duration applies to every Order.

**Proposed**:
An Order a Buyer has placed and Staff have not reserved. Staff next move a Confirmed Order to Reserved. An Unconfirmed Order that is still Proposed stays there until Staff confirm it.

**Reserved**:
An Order Staff have accepted for its Pickup time or Delivery time. Staff next move it to Prepared. An approved Change request can make it Unconfirmed and leave it Reserved.

**Prepared**:
An Order whose clothing is ready for Pickup or Delivery. Staff next move it to Completed when it is Confirmed. An approved Change request can make it Unconfirmed and leave it Prepared.

**Completed**:
An Order Staff have marked done after they fulfill it. It stays Completed. Staff mark it Completed when it is Confirmed and no Change request is waiting.
_Avoid_: Fulfilled

**Canceled**:
An Order Staff have stopped, from Proposed, Reserved, or Prepared, before the Buyer receives it.
_Avoid_: Void

**Pickup**:
The Buyer collects an Order's clothing from the pickup location.
_Avoid_: Shipment

**Delivery**:
A way to receive an Order at a Delivery address. The Buyer can choose it only when that address's zip is an open Delivery zip, and the zip is checked again when the Buyer places the Order. A closed zip, or a zip that is not on the map, leaves Pickup available. If the Delivery zip set or the open and closed toggles cannot be read, Delivery cannot be chosen and Pickup can still be placed. Delivery uses the same statuses as Pickup.
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
The time a Buyer names for receiving a Delivery Order, in the pickup location's local time. It is on or before the end of that Order's Season, and it is not limited to shop hours. A time already inside the Change cutoff can still be chosen. Its arrival does not move the Order.
_Avoid_: Window

**Pickup location**:
The one Square Location this app uses, where CDA hands an Order to a Buyer. Its name, address, and local time come from that Location. Any other Square Location is outside this app.
_Avoid_: Store, branch

**Pickup time**:
The time a Buyer names for collecting an Order, in the pickup location's local time. It is on or before the end of that Order's Season, and it is not limited to shop hours. A time already inside the Change cutoff can still be chosen. Its arrival does not move the Order.
_Avoid_: Window
