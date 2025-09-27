/**
 * Interpolate t along a path of [lat, lon] points.
 *
 * @param {Array<[number, number]>} coords - list of [lat, lon]
 * @param {number} pStart - p at the first point
 * @param {number} pEnd - p at the last point
 * @returns {Array<[number, number, number]>} list of [lat, lon, p]
 */
export function interpolatePressures(coords, pStart, pEnd) {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  if (coords.length === 1) return [[coords[0][0], coords[0][1], pStart]];

  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const haversine = (a, b) => {
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  // cumulative distances
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum[i] = cum[i - 1] + haversine(coords[i - 1], coords[i]);
  }

  const total = cum[cum.length - 1];
  const out = [];

  if (total <= 1e-6) {
    // all points identical, spread uniformly
    const n = coords.length - 1;
    for (let i = 0; i < coords.length; i++) {
      const f = n === 0 ? 0 : i / n;
      out.push([coords[i][0], coords[i][1], pStart + f * (pEnd - pStart)]);
    }
  } else {
    for (let i = 0; i < coords.length; i++) {
      const f = cum[i] / total;
      out.push([coords[i][0], coords[i][1], pStart + f * (pEnd - pStart)]);
    }
  }

  return out;
}

/**
 * Linearly interpolate a color between two hex values
 * based on a numeric value in [minF, maxF].
 *
 * @param {number} value - the scalar to map
 * @param {number} minF  - minimum value of range
 * @param {number} maxF  - maximum value of range
 * @param {string} colorMin - hex color string for min
 * @param {string} colorMax - hex color string for max
 * @returns {string} interpolated hex color
 */
export function interpolateColor(value, minF, maxF, colorMin, colorMax) {
  if (maxF === minF) return colorMin; // avoid divide-by-zero

  const f = Math.min(1, Math.max(0, (value - minF) / (maxF - minF)));

  const c1 = parseInt(colorMin.slice(1), 16);
  const c2 = parseInt(colorMax.slice(1), 16);

  const r1 = (c1 >> 16) & 0xff,
    g1 = (c1 >> 8) & 0xff,
    b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff,
    g2 = (c2 >> 8) & 0xff,
    b2 = c2 & 0xff;

  const r = Math.round(r1 + f * (r2 - r1));
  const g = Math.round(g1 + f * (g2 - g1));
  const b = Math.round(b1 + f * (b2 - b1));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
