# Staff fulfill Orders in Square's own app

This app is an intermediary. Buyers place Orders here, and Staff fulfill those Orders in Square's own app. This app does not take payment or create the Square sale. After Staff fulfill the Order in Square's app, they mark it Completed here. Sales tax is not a blanket rule. Staff handle it case by case when they fulfill in Square.

## Considered options

- Recording an external Square payment and marking the fulfillment Completed from this app. Rejected for now, so a later Square flow can replace it.
- Recording that every Order has no sales tax. Rejected. Tax is case by case.
