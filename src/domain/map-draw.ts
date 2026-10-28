export const mapSize = { width: 640, height: 420 }

export function drawZips(
  zips: { code: string; rings: number[][][] }[],
  width = mapSize.width,
  height = mapSize.height,
  pad = 28,
) {
  const points = zips.flatMap((zip) => zip.rings.flat())
  if (points.length === 0) return []
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  for (const [lon, lat] of points) {
    if (lon == null || lat == null) continue
    minLon = Math.min(minLon, lon)
    maxLon = Math.max(maxLon, lon)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  }
  const spanLon = maxLon - minLon || 1
  const spanLat = maxLat - minLat || 1
  const scale = Math.min((width - pad * 2) / spanLon, (height - pad * 2) / spanLat)
  const offsetX = pad + (width - pad * 2 - spanLon * scale) / 2
  const offsetY = pad + (height - pad * 2 - spanLat * scale) / 2
  const project = (lon: number, lat: number) => [
    Math.round((offsetX + (lon - minLon) * scale) * 10) / 10,
    Math.round((offsetY + (maxLat - lat) * scale) * 10) / 10,
  ]
  return zips.map((zip) => {
    const ring = zip.rings[0] ?? []
    const pts = ring.flatMap(([lon, lat]) => (lon == null || lat == null ? [] : [project(lon, lat)]))
    if (pts.length === 0) return { code: zip.code, d: "", x: 0, y: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 }
    const d = pts.map((point, index) => `${index === 0 ? "M" : "L"}${point[0]} ${point[1]}`).join(" ") + " Z"
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let sumX = 0
    let sumY = 0
    for (const point of pts) {
      const px = point[0]!
      const py = point[1]!
      minX = Math.min(minX, px)
      maxX = Math.max(maxX, px)
      minY = Math.min(minY, py)
      maxY = Math.max(maxY, py)
      sumX += px
      sumY += py
    }
    return {
      code: zip.code,
      d,
      x: Math.round((sumX / pts.length) * 10) / 10,
      y: Math.round((sumY / pts.length) * 10) / 10,
      minX,
      minY,
      maxX,
      maxY,
    }
  })
}
