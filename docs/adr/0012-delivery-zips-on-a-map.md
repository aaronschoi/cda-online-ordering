# Delivery zips are toggled on a map and stored in D1

An Order is for Pickup or for Delivery, not both. Delivery can be chosen only when the Delivery address's zip is an open Delivery zip. A closed zip, or a zip that is not on the map, leaves Pickup available.

Staff open and close Delivery zips from a map in the staff area. Each toggle is stored in Cloudflare D1. The map shows a fixed set of zips, and Staff do not add a zip from the map. Keystatic does not hold the toggles, because Staff change them while working and Keystatic writes through GitHub.

A Delivery Order has a Delivery time with the same bounds as a Pickup time: the pickup location's local time, on or before the Season's end. The Change cutoff is that same duration before the time. A time already inside the cutoff can still be chosen.

## Considered options

- Letting one Order be both Pickup and Delivery. Rejected.
- Blocking the Order entirely when the zip is closed. Rejected. Pickup stays available.
- Editing Delivery zip toggles in Keystatic. Rejected. Toggles change while Staff work, and Keystatic writes through GitHub.
- Letting Staff add any postal code from the map. Rejected. The map shows a fixed set.
