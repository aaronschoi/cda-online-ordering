# Delivery zip boundaries live in the repo

The staff map draws one boundary per Delivery zip. Keystatic holds the code and the name. A GeoJSON file in the repo holds the shape, matched by that code. Staff toggle open or closed on those shapes. They do not draw a boundary from the map.

The shape is for drawing. Delivery is allowed by the zip code on the Delivery address, not by testing the street against the shape.

## Considered options

- Drawing boundaries in the staff map. Rejected.
- Storing the shapes in D1. Rejected. The shapes belong to the fixed set, and D1 holds which of those zips are open.
- Allowing Delivery only when the street falls inside the shape. Rejected. The zip code decides.
