# Wholesale ordering

CDA sells clothing wholesale. Buyers place Orders for Pickup.

## Language

### Parties

**CDA**:
The business that sells clothing wholesale.

**Buyer**:
A business that purchases CDA's clothing for resale.
_Avoid_: Customer, client, retailer

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

**Line**:
The set of Styles CDA offers for one Season.
_Avoid_: Collection

**Season**:
The selling period a Line belongs to.
_Avoid_: Drop

### Ordering

**Order**:
A Buyer's request for clothing from CDA, for Pickup.

**Pickup**:
The Buyer collects an Order's clothing from CDA.
_Avoid_: Shipment, delivery
