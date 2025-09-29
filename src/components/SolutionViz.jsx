import { useState, useRef, useEffect } from 'preact/hooks';
import L from 'leaflet';
import hotline from 'leaflet-hotline';
hotline(L);
import CaseSelector from './CaseSelector.jsx';
import Button from './Button.jsx';
import StatsTable from './StatsTable.jsx';
import { getPolyline, getPoint } from '../geo-helpers.jsx';
import 'leaflet-svg-shape-markers';
import 'leaflet-arrowheads';
import SolutionFileSelector from './SolutionFileSelector.jsx';
import { interpolatePressures, interpolateColor } from '../helpers.jsx';

const mapLinear = (value, inMin, inMax, outMin, outMax) => {
  if (inMax - inMin === 0) {
    return (outMin + outMax) / 2;
  }
  const normalizedValue = (value - inMin) / (inMax - inMin);
  return outMin + normalizedValue * (outMax - outMin);
};

export default function SolutionVizualizer() {
  const [data, setData] = useState(null);
  const [solution, setSolution] = useState(null);
  const [mapSize, setMapSize] = useState({
    ht: '400px',
    st: 'mw6 ba bw2 b--gray',
  });
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const networkRef = useRef(null);
  const compressorRef = useRef(null);
  const nominationRef = useRef(null);
  const pressureRef = useRef(null);
  const flowRef = useRef(null);
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
    const map = L.map(mapEl.current, { attributionControl: false }).setView(
      [39.8283, -98.5795],
      3
    );
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        attributionControl: false,
        // attribution: '&copy; OpenStreetMap',
      }
    ).addTo(map);
    mapRef.current = map;
    if (networkRef.current) plotNetwork();
    if (compressorRef.current) plotCompressors();
    if (nominationRef.current) plotNominations();
    if (pressureRef.current) plotPressures();
    if (flowRef.current) plotFlows();
    return () => map.remove();
  }, [mapSize]);

  /* function to plot the network - passed to the corresponding button */
  const plotNetwork = () => {
    if (data == null) return;
    const refs = [pressureRef, flowRef];
    refs.forEach((ref) => {
      if (ref.current) {
        map.removeLayer(ref.current);
        ref.current = null;
      }
    });
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
      layer.bindTooltip(`Pipe id: ${id}`, {
        permanent: false, // Tooltip appears only on hover
        direction: 'auto', // Tooltip direction adapts to available space
        sticky: true, // Tooltip follows the mouse cursor
        className: 'f6',
      });
      layer.addTo(group);
      pts.forEach(([lat, lng]) => allBounds.extend([lat, lng]));
    });
    group.addTo(map);
    group.bringToBack();
    networkRef.current = group;
    if (allBounds && allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [5.5, 5.5] });
    }
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
    const source = geo && (geo.compressors ?? geo);
    const compressorIds = Object.keys(net.compressors);
    compressorIds.forEach((id) => {
      const pt = getPoint(source[id]);
      const layer = L.shapeMarker(pt[0], {
        shape: 'square',
        color: 'black',
        weight: 0.1,
        fillColor: 'black', // Fill color
        fillOpacity: 0.7, // Fill opacity
        radius: 2,
      });
      const cName = net.compressors[id].name;
      layer.bindTooltip(`Comp. id: ${id}, ${cName}`, {
        permanent: false, // Tooltip appears only on hover
        direction: 'auto', // Tooltip direction adapts to available space
        sticky: true, // Tooltip follows the mouse cursor
        className: 'f6',
      });
      layer.addTo(group);
    });
    group.addTo(map);
    compressorRef.current = group;
  };

  /* function to plot the nominations - passed to the corresponding button */
  const plotNominations = () => {
    if (data == null) return;
    const geo = data.geo;
    const nom = data.nominations;
    const net = data.network;
    const map = mapRef.current;
    if (!map || !geo || typeof geo !== 'object') return;
    if (nominationRef.current) {
      map.removeLayer(nominationRef.current);
      nominationRef.current = null;
    }
    const group = L.featureGroup();
    const rIds = Object.keys(nom.receipts);
    const dIds = Object.keys(nom.deliveries);
    const iIds = Object.keys(nom.interconnects);
    const sIds = Object.keys(nom.storages);
    const allValues = [
      ...Object.values(nom.receipts),
      ...Object.values(nom.deliveries),
      ...Object.values(nom.interconnects),
    ];
    const pMax = Math.max(...allValues);
    const nMax = Math.abs(Math.min(...allValues));
    rIds.forEach((id) => {
      const pt = getPoint(geo.receipts[id]);
      const val = nom.receipts[id];
      const r = mapLinear(val, 0.0, pMax, 3, 6);
      const layer = L.circleMarker(pt[0], {
        color: 'black',
        weight: 0.2,
        fillColor: 'green',
        fillOpacity: 0.6,
        radius: r,
      });
      const rName = net.receipts[id].name;
      layer.bindTooltip(`Receipt: (${id}, ${val}, ${rName}) `, {
        permanent: false, // Tooltip appears only on hover
        direction: 'auto', // Tooltip direction adapts to available space
        sticky: true, // Tooltip follows the mouse cursor
        className: 'f6',
      });
      layer.addTo(group);
    });
    dIds.forEach((id) => {
      const pt = getPoint(geo.deliveries[id]);
      const val = Math.abs(nom.deliveries[id]);
      const r = mapLinear(val, 0.0, nMax, 3, 6);
      const layer = L.circleMarker(pt[0], {
        color: 'black',
        weight: 0.2,
        fillColor: 'salmon',
        fillOpacity: 0.6,
        radius: r,
      });
      const dName = net.deliveries[id].name;
      layer.bindTooltip(`Del.: (${id}, ${val}, ${dName}) `, {
        permanent: false, // Tooltip appears only on hover
        direction: 'auto', // Tooltip direction adapts to available space
        sticky: true, // Tooltip follows the mouse cursor
        className: 'f6',
      });
      layer.addTo(group);
    });
    iIds.forEach((id) => {
      const pt = getPoint(geo.interconnects[id]);
      const val = nom.interconnects[id];
      const r =
        val > 0.0
          ? mapLinear(val, 0.0, pMax, 3, 6)
          : mapLinear(Math.abs(val), 0.0, nMax, 3, 6);
      const color = val > 0.0 ? 'green' : 'salmon';
      const layer = L.circleMarker(pt[0], {
        color: 'black',
        weight: 0.2,
        fillColor: color,
        fillOpacity: 0.6,
        radius: r,
      });
      const iName = net.interconnects[id].name;
      layer.bindTooltip(`Int.: (${id}, ${val}, ${iName}) `, {
        permanent: false, // Tooltip appears only on hover
        direction: 'auto', // Tooltip direction adapts to available space
        sticky: true, // Tooltip follows the mouse cursor
        className: 'f6',
      });
      layer.addTo(group);
    });
    sIds.forEach((id) => {
      const pt = getPoint(geo.storages[id]);
      const layer = L.shapeMarker(pt[0], {
        shape: 'diamond',
        color: 'black',
        weight: 0.1,
        fillColor: 'caedtBlue',
        fillOpacity: 0.6,
        radius: 3,
      });
      const s = nom.storages[id]['0'];
      const d = nom.storages[id]['1'];
      const sName = net.storages[id].name;
      layer.bindTooltip(`Storage: (${id}, ${s}, ${d}, ${sName}) `, {
        permanent: false, // Tooltip appears only on hover
        direction: 'auto', // Tooltip direction adapts to available space
        sticky: true, // Tooltip follows the mouse cursor
        className: 'f6',
      });
      layer.addTo(group);
    });
    group.addTo(map);
    nominationRef.current = group;
  };

  /* function to plot pressures - passed to corresponding button */
  const plotPressures = () => {
    if (data == null) return;
    if (solution == null) return;
    const geo = data.geo;
    const net = data.network;
    const pressures = solution.nodal_pressure;
    const map = mapRef.current;
    if (!map || !geo || !pressures || typeof geo !== 'object') return;
    clear();
    const maxP = Math.max(...Object.values(pressures));
    const minP = Math.min(...Object.values(pressures));
    const group = L.featureGroup();
    let allBounds = L.latLngBounds([]);
    const source = geo && (geo.pipes ?? geo);
    const pipeIds = Object.keys(net.pipes);
    pipeIds.forEach((id) => {
      const nodeFr = net.pipes[id]['fr_node'];
      const nodeTo = net.pipes[id]['to_node'];
      const pFr = pressures[String(nodeFr)];
      const pTo = pressures[String(nodeTo)];
      if (pFr === undefined || pTo === undefined) return;
      const pts = getPolyline(source[id]);
      const hotlinePts = interpolatePressures(pts, pFr, pTo);
      const layer = L.hotline(hotlinePts, {
        min: minP,
        max: maxP,
        palette: {
          0.0: 'dodgerBlue',
          1.0: 'indianRed',
        },
        weight: 5,
        outlineColor: '#000000',
        outlineWidth: 0.0,
      });
      layer.addTo(group);
      pts.forEach(([lat, lng]) => allBounds.extend([lat, lng]));
    });
    group.addTo(map);
    group.bringToBack();
    pressureRef.current = group;
    if (allBounds && allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [5.5, 5.5] });
    }
  };

  /* function to plot flows - passed to the corresponding button */
  const plotFlows = () => {
    if (data == null) return;
    if (solution == null) return;
    const geo = data.geo;
    const net = data.network;
    const flows = solution.pipe_flow;
    const map = mapRef.current;
    if (!map || !geo || !flows || typeof geo !== 'object') return;
    clear();
    const flowValues = [...Object.values(flows)].map(Math.abs);
    const maxF = Math.max(...flowValues);
    const minF = Math.min(...flowValues);
    const group = L.featureGroup();
    let allBounds = L.latLngBounds([]);
    const source = geo && (geo.pipes ?? geo);
    const pipeIds = Object.keys(net.pipes);
    pipeIds.forEach((id) => {
      const flowVal = Math.round(flows[id] * 1000.0) / 1000.0;
      if (flowVal === undefined) return;
      const pts = getPolyline(source[id]);
      if (flowVal < 0.0) pts.reverse();
      const color = interpolateColor(
        Math.abs(flowVal),
        minF,
        maxF,
        '#fa8072',
        '#2e8b57'
      );
      const layer = L.polyline(pts, {
        color: color,
        weight: 3,
      });
      //   }).arrowheads({
      //     yawn: 60,
      //     fill: true,
      //     opacity: 0.6,
      //     frequency: 5,
      //     size: '25m',
      //     offsets: { end: '15px' },
      //   });
      layer.bindTooltip(`Pipe id: (${id}, ${flowVal})`, {
        permanent: false, // Tooltip appears only on hover
        direction: 'auto', // Tooltip direction adapts to available space
        sticky: true, // Tooltip follows the mouse cursor
        className: 'f6',
      });
      layer.addTo(group);
      pts.forEach(([lat, lng]) => allBounds.extend([lat, lng]));
    });
    group.addTo(map);
    group.bringToBack();
    networkRef.current = group;
    if (allBounds && allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [5.5, 5.5] });
    }
  };

  /* function to clear the map - passed to the corresponding button */
  const clear = () => {
    const map = mapRef.current;
    if (!map) return;
    const refs = [
      networkRef,
      compressorRef,
      nominationRef,
      pressureRef,
      flowRef,
    ];
    refs.forEach((ref) => {
      if (ref.current) {
        if (map.hasLayer(ref.current)) map.removeLayer(ref.current);
        ref.current = null;
      }
    });
    if (pressureLegendRef.current) {
      pressureLegendRef.current.remove();
      pressureLegendRef.current = null;
    }
    return;
  };

  /* function to toggle map size - passed to the corresponding button */
  const toggleSize = () => {
    if (mapSize.ht == '400px') {
      setMapSize({
        ht: '500px',
        st: 'mw7 ba bw2 b--gray',
      });
    } else {
      setMapSize({
        ht: '400px',
        st: 'mw6 ba bw2 b--gray',
      });
    }
  };

  return (
    <div class="mw8 center">
      <h1 class="mt4 f6 f5-ns ttu tracked">Visualization</h1>
      <CaseSelector setData={setData} />
      <SolutionFileSelector setSolution={setSolution} />
      <Button buttonText="Network" onClick={plotNetwork} />
      &nbsp;&nbsp;
      <Button buttonText="Compressors" onClick={plotCompressors} />
      &nbsp;&nbsp;
      <Button buttonText="Nominations" onClick={plotNominations} />
      &nbsp;&nbsp;
      <Button buttonText="Pressures" onClick={plotPressures} />
      &nbsp;&nbsp;
      <Button buttonText="Flows" onClick={plotFlows} />
      &nbsp;&nbsp;
      <Button buttonText="Clear" onClick={clear} />
      &nbsp;&nbsp;
      {/* <a class="f6 link dim ba pa2 mb2 dib black" href="#0">
        Export as PDF
      </a>
      &nbsp;&nbsp; */}
      <Button buttonText="Toggle size" onClick={toggleSize} />
      &nbsp;&nbsp;
      <div
        id="map"
        ref={mapEl}
        class={mapSize.st}
        style={{ height: mapSize.ht }}
      />
      <h1 class="mt4 f6 f5-ns ttu tracked">Pipeline network statistics</h1>
      <StatsTable stats={stats} />
    </div>
  );
}
