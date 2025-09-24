import { useState, useRef, useEffect } from 'preact/hooks';
import L from 'leaflet';
import CaseSelector from './CaseSelector.jsx';

export default function SolutionVizualizer() {
  const [data, setData] = useState(null);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (data === null) return;
    const net = data['network'];
    const units = net['metadata']['units'];
    const counts = {
      node: Object.keys(net['nodes']).length,
      pipe: Object.keys(net['pipes']).length,
      compressor: Object.keys(net['compressors']).length,
      receipt: Object.keys(net['receipts']).length,
      delivery: Object.keys(net['deliveries']).length,
      interconnect: Object.keys(net['interconnects']).length,
      storage: Object.keys(net['storages']).length,
    };
    const distance = Object.values(net['pipes'])
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

  useEffect(() => {
    if (!mapEl.current) return;
    const map = L.map(mapEl.current).setView([39.8283, -98.5795], 4);
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap',
      }
    ).addTo(map);
    mapRef.current = map;
    return () => map.remove();
  }, []);

  return (
    <div class="mw8 center">
      <h1 class="mt4 f5 f4-ns">Visualization</h1>
      <CaseSelector setData={setData} />
      <div
        id="map"
        ref={mapEl}
        class="mw6 ba bw2 b--gray"
        style={{ height: '400px' }}
      />
      <h1 class="mt4 f5 f4-ns">Pipeline network statistics</h1>
      <p class="measure-wide lh-copy">
        {stats != null && (
          <span>
            Length = {stats['pipelineLengthInKms']} km, # nodes ={' '}
            {stats['counts']['node']}, # pipe segments ={' '}
            {stats['counts']['pipe']}, # compressors ={' '}
            {stats['counts']['compressor']}, # receipts ={' '}
            {stats['counts']['receipt']}, # deliveries ={' '}
            {stats['counts']['delivery']}, # interconnects ={' '}
            {stats['counts']['interconnect']}, and # storages ={' '}
            {stats['counts']['storage']}.
          </span>
        )}
      </p>
    </div>
  );
}
