function swapToLatLng(pt) {
  if (!Array.isArray(pt) || pt.length < 2) return pt;
  return [pt[1], pt[0]];
}

function hexToUint8(hex) {
  const clean = hex.trim().replace(/^0x/i, '');
  const len = clean.length;
  if (len % 2 !== 0) return null;
  const out = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    out[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return out;
}

function parseWkb(hex) {
  const bytes = hexToUint8(hex);
  if (!bytes) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  function parseGeom(offset) {
    if (offset + 5 > view.byteLength)
      return { offset, type: null, coords: null };
    const byteOrder = view.getUint8(offset);
    offset += 1;
    const le = byteOrder === 1;
    let wkbType = view.getUint32(offset, le);
    offset += 4;
    const hasSrid = (wkbType & 0x20000000) === 0x20000000;
    const isEwkb =
      wkbType & 0x20000000 || wkbType & 0x40000000 || wkbType & 0x80000000;
    let geomType;
    if (isEwkb) {
      geomType = wkbType & 0xf;
    } else {
      if (wkbType >= 3000) geomType = wkbType - 3000;
      else if (wkbType >= 2000) geomType = wkbType - 2000;
      else if (wkbType >= 1000) geomType = wkbType - 1000;
      else geomType = wkbType;
    }
    if (hasSrid) {
      if (offset + 4 > view.byteLength)
        return { offset, type: null, coords: null };
      /* const srid = */ view.getUint32(offset, le);
      offset += 4;
    }
    if (geomType === 1) {
      // Point
      if (offset + 16 > view.byteLength)
        return { offset, type: null, coords: null };
      const x = view.getFloat64(offset, le);
      offset += 8;
      const y = view.getFloat64(offset, le);
      offset += 8;
      return { offset, type: 1, coords: [[y, x]] };
    }
    if (geomType === 2) {
      // LineString
      if (offset + 4 > view.byteLength)
        return { offset, type: null, coords: null };
      const n = view.getUint32(offset, le);
      offset += 4;
      const pts = [];
      for (let i = 0; i < n; i++) {
        if (offset + 16 > view.byteLength) break;
        const x = view.getFloat64(offset, le);
        offset += 8;
        const y = view.getFloat64(offset, le);
        offset += 8;
        pts.push([y, x]);
      }
      return { offset, type: 2, coords: pts };
    }
    if (geomType === 5) {
      // MultiLineString
      if (offset + 4 > view.byteLength)
        return { offset, type: null, coords: null };
      const m = view.getUint32(offset, le);
      offset += 4;
      const lines = [];
      for (let j = 0; j < m; j++) {
        const sub = parseGeom(offset);
        offset = sub.offset;
        if (sub && sub.type === 2 && Array.isArray(sub.coords))
          lines.push(sub.coords);
      }
      return { offset, type: 5, coords: lines };
    }
    return { offset, type: geomType, coords: null };
  }

  const res = parseGeom(0);
  return res.coords;
}

export function getPolyline(value) {
  const isNumber = (n) => typeof n === 'number' && Number.isFinite(n);
  const isPair = (p) =>
    Array.isArray(p) && p.length >= 2 && isNumber(p[0]) && isNumber(p[1]);

  // 1) Hex WKB string → parse via parseWkb (returns [lat,lon] pairs or array of arrays)
  if (typeof value === 'string') {
    try {
      const coords = parseWkb(value);
      if (Array.isArray(coords)) return coords;
    } catch (e) {
      console.error('Failed to parse WKB hex:', e);
    }
    return null;
  }

  // 2) GeoJSON-like object with coordinates property
  if (value && typeof value === 'object' && Array.isArray(value.coordinates)) {
    const coords = value.coordinates;
    // LineString: [[lon,lat], ...]
    if (coords.length > 0 && isPair(coords[0])) {
      const looksLonLat =
        Math.abs(coords[0][0]) > 90 && Math.abs(coords[0][1]) <= 90;
      return looksLonLat ? coords.map(swapToLatLng) : coords;
    }
    // MultiLineString: [[[lon,lat], ...], ...]
    if (coords.length > 0 && Array.isArray(coords[0]) && isPair(coords[0][0])) {
      const looksLonLat =
        Math.abs(coords[0][0][0]) > 90 && Math.abs(coords[0][0][1]) <= 90;
      return coords.map((line) =>
        looksLonLat ? line.map(swapToLatLng) : line
      );
    }
  }

  // 3) Plain arrays
  if (Array.isArray(value) && value.length > 0) {
    if (isPair(value[0])) {
      const looksLonLat =
        Math.abs(value[0][0]) > 90 && Math.abs(value[0][1]) <= 90;
      return looksLonLat ? value.map(swapToLatLng) : value;
    }
    if (Array.isArray(value[0]) && isPair(value[0][0])) {
      const looksLonLat =
        Math.abs(value[0][0][0]) > 90 && Math.abs(value[0][0][1]) <= 90;
      return value.map((line) => (looksLonLat ? line.map(swapToLatLng) : line));
    }
  }

  return null;
}

export function getPoint(hex) {
  if (typeof hex !== 'string') return null;
  try {
    const coords = parseWkb(hex);
    if (!Array.isArray(coords)) return null;
    if (coords.length === 0) return [];
    const isLatLng = (pt) =>
      Array.isArray(pt) &&
      pt.length === 2 &&
      pt.every((n) => typeof n === 'number' && Number.isFinite(n));
    if (isLatLng(coords[0])) {
      return coords;
    }
    if (Array.isArray(coords[0])) {
      return coords.flat().filter(isLatLng);
    }
    return null;
  } catch (err) {
    console.error('Failed to derive lat/lon from hex string:', err);
    return null;
  }
}
