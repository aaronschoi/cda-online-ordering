# Delivery zips are toggled on a map and stored in D1

An Order is for Pickup or for Delivery, not both. Delivery can be chosen only when the Delivery address's zip is an open Delivery zip. A closed zip, or a zip that is not on the map, leaves Pickup available.

Staff open and close Delivery zips from a map in the staff area. Each toggle is stored in Cloudflare D1. The map shows a fixed set of zips, and Staff do not add a zip from the map. Closing a zip leaves Orders already placed for it on Delivery. Keystatic holds each zip's code and name, and does not hold the toggles, because Staff change them while working and Keystatic writes through GitHub.

A Delivery Order has a Delivery time with the same bounds as a Pickup time: the pickup location's local time, on or before the Season's end. The Change cutoff is that same duration before the time. A time already inside the cutoff can still be chosen. Delivery uses the same statuses as Pickup. Prepared means the clothing is ready. Completed means Staff have fulfilled the sale in Square's app and marked the Order done here.

The map draws one boundary per Delivery zip from a file in the repo. Keystatic holds the code and the name. Staff toggle open or closed on those shapes and do not draw a boundary. The boundary is what the map draws. Delivery is allowed by the zip code on the address. A Delivery address includes a phone number, and Delivery cannot be chosen without one. A Delivery Order may include a Delivery note, and that note may be blank.

## Considered options

- Letting one Order be both Pickup and Delivery. Rejected.
- Blocking the Order entirely when the zip is closed. Rejected. Pickup stays available.
- Editing Delivery zip toggles in Keystatic. Rejected. Toggles change while Staff work, and Keystatic writes through GitHub.
- Letting Staff add any postal code from the map. Rejected. The map shows a fixed set.
- Adding a status for clothing on its way to the Buyer. Rejected. Delivery uses the same statuses as Pickup.
- Testing the street against the boundary to allow Delivery. Rejected. The zip code on the address decides.
- Keeping the Delivery address to street, city, state, and zip. Rejected. It includes a phone number, and the Order may include a Delivery note.
