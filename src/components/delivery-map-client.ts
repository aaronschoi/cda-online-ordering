import L from "leaflet"
import "leaflet/dist/leaflet.css"

type Shape = {
  code: string
  name: string
  open: boolean
  rings: number[][][]
  label: string
}

type Payload = {
  acting: boolean
  shapes: Shape[]
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      default:
        return "&#39;"
    }
  })
}

function paint(open: boolean, hover = false): L.PathOptions {
  return {
    color: open ? "#243f73" : "#5c675f",
    weight: hover ? 3 : 2,
    fillColor: open ? "#243f73" : "#c5c9c2",
    fillOpacity: open ? (hover ? 0.5 : 0.32) : hover ? 0.72 : 0.5,
  }
}

export function mountDeliveryMap(root: ParentNode = document) {
  const host = root.querySelector<HTMLElement>("[data-delivery-map]")
  const raw = root.querySelector<HTMLScriptElement>("[data-delivery-map-data]")
  if (!host || !raw?.textContent || host.dataset.ready === "1") return
  const payload = JSON.parse(raw.textContent) as Payload
  if (payload.shapes.length === 0) return
  host.dataset.ready = "1"
  if (payload.acting) host.classList.add("acting")

  const map = L.map(host)
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  const collection: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: payload.shapes.map((shape) => ({
      type: "Feature",
      properties: { code: shape.code, name: shape.name, open: shape.open, label: shape.label },
      geometry: { type: "Polygon", coordinates: shape.rings },
    })),
  }

  const layer = L.geoJSON(collection, {
    style: (feature) => paint(Boolean(feature?.properties?.open)),
    onEachFeature(feature, shape) {
      const props = feature.properties as Shape
      const path = shape as L.Path
      path.bindTooltip(
        `<span class="zip-name">${escapeHtml(props.name)}</span><span class="zip-code">${escapeHtml(props.code)}</span>`,
        { permanent: true, direction: "center", className: "zip-label", opacity: 1 },
      )
      const submit = () => {
        host.parentElement?.querySelector<HTMLFormElement>(`form[data-code="${props.code}"]`)?.requestSubmit()
      }
      path.on("add", () => {
        const el = path.getElement()
        if (!el) return
        el.setAttribute("role", payload.acting ? "button" : "img")
        el.setAttribute("aria-label", props.label)
        if (!payload.acting) return
        el.setAttribute("tabindex", "0")
        el.addEventListener("keydown", (event) => {
          if (!(event instanceof KeyboardEvent)) return
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          submit()
        })
      })
      if (!payload.acting) return
      path.on("click", submit)
      path.on("mouseover", () => path.setStyle(paint(props.open, true)))
      path.on("mouseout", () => layer.resetStyle(path))
    },
  }).addTo(map)

  map.fitBounds(layer.getBounds(), { padding: [28, 28] })
}
