export function drawZips(
  zips: { code: string; rings: number[][][] }[],
  width = 640,
  height = 420,
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
    const d = pts.map((point, index) => `${index === 0 ? "M" : "L"}${point[0]} ${point[1]}`).join(" ") + " Z"
    const [x, y] = pts.reduce((sum, point) => [sum[0]! + point[0]!, sum[1]! + point[1]!], [0, 0])
    return { code: zip.code, d, x: Math.round((x / pts.length) * 10) / 10, y: Math.round((y / pts.length) * 10) / 10 }
  })
}
