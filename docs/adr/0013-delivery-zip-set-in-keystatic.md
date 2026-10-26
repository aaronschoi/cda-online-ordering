# The Delivery zip set is edited in Keystatic

Keystatic holds each Delivery zip's five-digit code and the name the map shows. Open or closed for each of those zips stays in Cloudflare D1. The map shows a zip only when Keystatic has that code and name and the GeoJSON file has its shape. A code with no shape, or a shape with no Keystatic entry, is left off the map, so Staff cannot open it. Staff cannot add a zip from the map. Closing a zip blocks a new Delivery choice and blocks an approved move to that zip. It does not change an Order already placed for that zip.

## Considered options

Storing the zip set only in D1, so Staff could add zips while working. Rejected. The set is a fixed list, and the map toggles open or closed.
