import { useEffect, useRef, useState } from 'preact/hooks'
import L from 'leaflet'
import hotline from 'leaflet-hotline'
hotline(L)
import FileInput from './components/FileInput.jsx'
import Layout from './components/Layout.jsx'

export function App() {
  const title = 'Gas Pipeline Infrastructure Models Visualizations'
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const pipesLayerRef = useRef(null)
  const [geoFile, setGeoFile] = useState(null)
  const [networkFile, setNetworkFile] = useState(null)
  const [solutionFile, setSolutionFile] = useState(null)
  const [geoData, setGeoData] = useState(null)
  const [networkData, setNetworkData] = useState(null)
  const [solutionData, setSolutionData] = useState(null)
  const [error, setError] = useState('')

  async function handlePlot() {
    setError('')
    try {
      if (!geoFile || !networkFile || !solutionFile) {
        setError('Please select all three files before plotting.')
        return
      }
      const [geoText, networkText, solutionText] = await Promise.all([
        geoFile.text(),
        networkFile.text(),
        solutionFile.text(),
      ])
      const parsedGeo = JSON.parse(geoText)
      const parsedNetwork = JSON.parse(networkText)
      const parsedSolution = JSON.parse(solutionText)
      setGeoData(parsedGeo)
      setNetworkData(parsedNetwork)
      setSolutionData(parsedSolution)
      console.log('Parsed files:', { geo: parsedGeo, network: parsedNetwork, solution: parsedSolution })
      drawGeoLines(parsedGeo)
    } catch (e) {
      console.error(e)
      setError('Failed to read/parse one or more files. Ensure they are valid JSON.')
    }
  }

  useEffect(() => {
    if (!mapEl.current) return
    const map = L.map(mapEl.current).setView([39.8283, -98.5795], 4)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(map)
    mapRef.current = map
    return () => map.remove()
  }, [])

  function swapToLatLng(pt) {
    if (!Array.isArray(pt) || pt.length < 2) return pt
    return [pt[1], pt[0]]
  }

  function hexToUint8(hex) {
    const clean = hex.trim().replace(/^0x/i, '')
    const len = clean.length
    if (len % 2 !== 0) return null
    const out = new Uint8Array(len / 2)
    for (let i = 0; i < len; i += 2) {
      out[i / 2] = parseInt(clean.substr(i, 2), 16)
    }
    return out
  }

  function parseWkb(hex) {
    const bytes = hexToUint8(hex)
    if (!bytes) return null
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

    function parseGeom(offset) {
      if (offset + 5 > view.byteLength) return { offset, type: null, coords: null }
      const byteOrder = view.getUint8(offset); offset += 1
      const le = byteOrder === 1
      let wkbType = view.getUint32(offset, le); offset += 4
      const hasSrid = (wkbType & 0x20000000) === 0x20000000
      const isEwkb = (wkbType & 0x20000000) || (wkbType & 0x40000000) || (wkbType & 0x80000000)
      let geomType
      if (isEwkb) {
        geomType = wkbType & 0xF
      } else {
        if (wkbType >= 3000) geomType = wkbType - 3000
        else if (wkbType >= 2000) geomType = wkbType - 2000
        else if (wkbType >= 1000) geomType = wkbType - 1000
        else geomType = wkbType
      }
      if (hasSrid) {
        if (offset + 4 > view.byteLength) return { offset, type: null, coords: null }
        /* const srid = */ view.getUint32(offset, le); offset += 4
      }
      if (geomType === 2) { // LineString
        if (offset + 4 > view.byteLength) return { offset, type: null, coords: null }
        const n = view.getUint32(offset, le); offset += 4
        const pts = []
        for (let i = 0; i < n; i++) {
          if (offset + 16 > view.byteLength) break
          const x = view.getFloat64(offset, le); offset += 8
          const y = view.getFloat64(offset, le); offset += 8
          pts.push([y, x])
        }
        return { offset, type: 2, coords: pts }
      }
      if (geomType === 5) { // MultiLineString
        if (offset + 4 > view.byteLength) return { offset, type: null, coords: null }
        const m = view.getUint32(offset, le); offset += 4
        const lines = []
        for (let j = 0; j < m; j++) {
          const sub = parseGeom(offset)
          offset = sub.offset
          if (sub && sub.type === 2 && Array.isArray(sub.coords)) lines.push(sub.coords)
        }
        return { offset, type: 5, coords: lines }
      }
      return { offset, type: geomType, coords: null }
    }

    const res = parseGeom(0)
    return res.coords
  }

  function getLatLngsFromValue(value) {
    const isNumber = (n) => typeof n === 'number' && Number.isFinite(n)
    const isPair = (p) => Array.isArray(p) && p.length >= 2 && isNumber(p[0]) && isNumber(p[1])

    // 1) Hex WKB string → parse via parseWkb (returns [lat,lon] pairs or array of arrays)
    if (typeof value === 'string') {
      try {
        const coords = parseWkb(value)
        if (Array.isArray(coords)) return coords
      } catch (e) {
        console.error('Failed to parse WKB hex:', e)
      }
      return null
    }

    // 2) GeoJSON-like object with coordinates property
    if (value && typeof value === 'object' && Array.isArray(value.coordinates)) {
      const coords = value.coordinates
      // LineString: [[lon,lat], ...]
      if (coords.length > 0 && isPair(coords[0])) {
        const looksLonLat = Math.abs(coords[0][0]) > 90 && Math.abs(coords[0][1]) <= 90
        return looksLonLat ? coords.map(swapToLatLng) : coords
      }
      // MultiLineString: [[[lon,lat], ...], ...]
      if (coords.length > 0 && Array.isArray(coords[0]) && isPair(coords[0][0])) {
        const looksLonLat = Math.abs(coords[0][0][0]) > 90 && Math.abs(coords[0][0][1]) <= 90
        return coords.map(line => looksLonLat ? line.map(swapToLatLng) : line)
      }
    }

    // 3) Plain arrays
    if (Array.isArray(value) && value.length > 0) {
      if (isPair(value[0])) {
        const looksLonLat = Math.abs(value[0][0]) > 90 && Math.abs(value[0][1]) <= 90
        return looksLonLat ? value.map(swapToLatLng) : value
      }
      if (Array.isArray(value[0]) && isPair(value[0][0])) {
        const looksLonLat = Math.abs(value[0][0][0]) > 90 && Math.abs(value[0][0][1]) <= 90
        return value.map(line => looksLonLat ? line.map(swapToLatLng) : line)
      }
    }

    return null
  }

  function drawGeoLines(geo) {
    const map = mapRef.current
    if (!map || !geo || typeof geo !== 'object') return
    if (pipesLayerRef.current) {
      map.removeLayer(pipesLayerRef.current)
      pipesLayerRef.current = null
    }
    const group = L.featureGroup()
    let drawn = 0
    let skipped = 0
    let allBounds = L.latLngBounds([])
    const source = geo && (geo.pipes ?? geo)
    const iterable = Array.isArray(source)
      ? source.map((item, idx) => [item && (item.id ?? item.pipeId ?? idx), item && (item.geometry ?? item)])
      : Object.entries(source)
    for (const [pipeId, polyline] of iterable) {
      const latlngs = getLatLngsFromValue(polyline)
      if (!latlngs) { skipped++; continue }

      const addHotline = (pts) => {
        if (!Array.isArray(pts) || pts.length < 2) return
        const vals = pts.map(([lat, lng]) => {
          // random value in [0,1] for gradient demo
          return [lat, lng, Math.random()]
        })
        const layer = L.hotline(vals, {
          min: 0,
          max: 1,
          palette: {
            0.0: '#00e5ff',
            0.5: '#ffff00',
            1.0: '#ff006e',
          },
          weight: 8,
          outlineColor: '#000',
          outlineWidth: 0,
        })
        layer.addTo(group)
        // Tooltip: attach a simple marker mid-way for hover label
        const mid = pts[Math.floor(pts.length / 2)]
        if (mid) {
          const tip = L.circleMarker([mid[0], mid[1]], { radius: 1, opacity: 0, fillOpacity: 0 })
            .bindTooltip(String(pipeId), { sticky: true })
            .addTo(group)
        }
        pts.forEach(([lat, lng]) => allBounds.extend([lat, lng]))
        drawn++
      }

      if (Array.isArray(latlngs[0]) && typeof latlngs[0][0] === 'number') {
        // Single LineString: [[lat,lng], ...]
        addHotline(latlngs)
      } else if (Array.isArray(latlngs[0])) {
        // MultiLineString: [ [[lat,lng],...], ... ]
        for (const seg of latlngs) addHotline(seg)
      }
    }
    group.addTo(map)
    pipesLayerRef.current = group
    if (allBounds && allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [20, 20] })
    }
    console.log(`Plotted ${drawn} pipe(s); skipped ${skipped}.`)
  }

  return (
    <Layout title={title} footer={null}>
      <section style={{ margin: '0 0 1rem 1rem' }}>
        <FileInput id="geo" label="Geo JSON" accept=".json,application/json" onSelect={(files) => setGeoFile(files[0] || null)} />
        <small>{geoFile ? `Selected: ${geoFile.name}` : 'No file selected'}</small>
        <br />
        <FileInput id="network" label="Network JSON" accept=".json,application/json" onSelect={(files) => setNetworkFile(files[0] || null)} />
        <small>{networkFile ? `Selected: ${networkFile.name}` : 'No file selected'}</small>
        <br />
        <FileInput id="solution" label="Solution JSON" accept=".json,application/json" onSelect={(files) => setSolutionFile(files[0] || null)} />
        <small>{solutionFile ? `Selected: ${solutionFile.name}` : 'No file selected'}</small>
        <div style={{ marginTop: '0.75rem' }}>
          <button onClick={handlePlot} disabled={!geoFile || !networkFile || !solutionFile}>Plot</button>
        </div>
        {error && (
          <p style={{ color: 'crimson' }}>{error}</p>
        )}
      </section>
      <div
        id="map"
        ref={mapEl}
        style={{
          width: 'min(90vw, 80vh)',
          height: 'min(90vw, 80vh)',
          border: '2px solid #000',
          overflow: 'hidden',
          margin: '1rem 0 1rem 1rem',
        }}
      />
    </Layout>
  )
}
