import { useState, useRef, useEffect } from 'preact/hooks';
import L from 'leaflet';
import CaseSelector from './CaseSelector.jsx';
import Button from './Button.jsx';
import StatsTable from './StatsTable.jsx';
import { getPolyline, getPoint } from '../geo-helpers.jsx';

export default function SolutionVizualizer() {
  const [data, setData] = useState(null);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const networkRef = useRef(null);
  const compressorRef = useRef(null);
  const [stats, setStats] = useState(null);

  /* render the pipeline statistics when data is populated using the useEffect hook */
  useEffect(() => {
    if (data === null) return;
    const net = data.network;
    const units = net['metadata']['units'];
    const counts = {
      node: Object.keys(net.nodes ?? {}).length,
      pipe: Object.keys(net.pipes ?? {}).length,
      compressor: Object.keys(net.compressors ?? {}).length,
      receipt: Object.keys(net.receipts ?? {}).length,
      delivery: Object.keys(net.deliveries ?? {}).length,
      interconnect: Object.keys(net.interconnects ?? {}).length,
      storage: Object.keys(net.storages ?? {}).length,
    };
    const distance = Object.values(net.pipes)
      .map((v) => v['length'])
      .reduce((acc, val) => acc + val, 0.0);
    const distanceInKms =
      units['length'] === 'meter' ? distance / 1000.0 : distance * 1.60934;
    setStats({
      counts: counts,
      pipelineLengthInKms: Math.ceil(distanceInKms),
    });
    return;
  }, [data]);

  /* render the map tile once using the useEffect hook*/
  useEffect(() => {
    if (!mapEl.current) return;
    const map = L.map(mapEl.current).setView([39.8283, -98.5795], 4);
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        // attribution: '&copy; OpenStreetMap',
      }
    ).addTo(map);
    mapRef.current = map;
    return () => map.remove();
  }, []);

  /* function to plot the network - passed to the corresponding button */
  const plotNetwork = () => {
    if (data == null) return;
    const geo = data.geo;
    const net = data.network;
    const map = mapRef.current;
    if (!map || !geo || typeof geo !== 'object') return;
    if (networkRef.current) {
      map.removeLayer(networkRef.current);
      networkRef.current = null;
    }
    const group = L.featureGroup();
    let allBounds = L.latLngBounds([]);
    const source = geo && (geo.pipes ?? geo);
    const pipeIds = Object.keys(net.pipes);
    pipeIds.forEach((id) => {
      const pts = getPolyline(source[id]);
      const layer = L.polyline(pts, {
        color: 'orange',
        weight: 3,
        opacity: 0.6,
      });
      layer.addTo(group);
      pts.forEach(([lat, lng]) => allBounds.extend([lat, lng]));
    });
    group.addTo(map);
    group.bringToBack();
    networkRef.current = group;
    if (allBounds && allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [5, 5] });
    }
  };

  /* function to clear the map - passed to the corresponding button */
  const clear = () => {
    const map = mapRef.current;
    const refs = [networkRef, compressorRef];
    refs.forEach((ref) => {
      if (ref.current) {
        map.removeLayer(ref.current);
        ref.current = null;
      }
    });
    return;
  };

  /* function to plot the compressors - passed to the corresponding button */
  const plotCompressors = () => {
    if (data == null) return;
    const geo = data.geo;
    const net = data.network;
    const map = mapRef.current;
    if (!map || !geo || typeof geo !== 'object') return;
    if (compressorRef.current) {
      map.removeLayer(compressorRef.current);
      compressorRef.current = null;
    }
    const group = L.featureGroup();
    let allBounds = L.latLngBounds([]);
    const source = geo && (geo.compressors ?? geo);
    const compressorIds = Object.keys(net.compressors);
    compressorIds.forEach((id) => {
      const pt = getPoint(source[id]);
      const layer = L.circleMarker(pt[0], {
        color: 'black',
        weight: 1,
        opacity: 0.5,
        fillColor: 'blue', // Fill color
        fillOpacity: 0.7, // Fill opacity
        radius: 2,
      });
      layer.addTo(group);
      allBounds.extend(pt[0]);
    });
    group.addTo(map);
    compressorRef.current = group;
    if (allBounds && allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [5, 5] });
    }
  };

  return (
    <div class="mw8 center">
      <h1 class="mt4 f6 f5-ns ttu tracked">Visualization</h1>
      <CaseSelector setData={setData} />
      <Button buttonText="Network" onClick={plotNetwork} />
      &nbsp;&nbsp;
      <Button buttonText="Compressors" onClick={plotCompressors} />
      &nbsp;&nbsp;
      <a class="f6 link dim ba pa2 mb2 dib black" href="#0">
        Nominations
      </a>
      &nbsp;&nbsp;
      <a class="f6 link dim ba pa2 mb2 dib black" href="#0">
        Pressures
      </a>
      &nbsp;&nbsp;
      <a class="f6 link dim ba pa2 mb2 dib black" href="#0">
        Flows
      </a>
      &nbsp;&nbsp;
      <Button buttonText="Clear" onClick={clear} />
      <div
        id="map"
        ref={mapEl}
        class="mw6 ba bw2 b--gray"
        style={{ height: '400px' }}
      />
      <h1 class="mt4 f6 f5-ns ttu tracked">Pipeline network statistics</h1>
      <StatsTable stats={stats} />
    </div>
  );
}
