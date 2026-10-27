# The Delivery zip set is edited in Keystatic

Keystatic holds each Delivery zip's five-digit code and the name the map shows. Open or closed for each of those zips stays in Cloudflare D1. The map shows a zip only when Keystatic has that code and name and the GeoJSON file has its shape. A code with no shape, or a shape with no Keystatic entry, is left off the map, so Staff cannot open it. Staff cannot add a zip from the map. Closing a zip, or removing it from Keystatic or from the GeoJSON file, blocks a new Delivery choice and blocks an approved move to that zip. An Order already placed for that zip stays Delivery. A Change request that keeps that zip can still be approved.

## Considered options

- Storing the zip set only in D1, so Staff could add zips while working. Rejected. The set is a fixed list, and the map toggles open or closed.
- Sending a placed Order back to Pickup when its zip is removed from the set. Rejected. The Order stays Delivery, and a same-zip correction can still be approved.
