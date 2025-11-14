import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { DatasetFolder } from '@/lib/datasetService';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

type Camera = { center: [number, number]; zoom: number };
type Props = { 
  folders: DatasetFolder[];
  active: Record<string, { key: string; type: 'tile' | 'geojson'; url: string; meta?: any }>;
  canSwipe: boolean;
  camera?: Camera;
  onCameraChange?: (c: Camera) => void;
  onMapReady?: (map: mapboxgl.Map) => void;
  onShowAllOverlays?: () => void;
  onToggleSidebar?: () => void;
};

export default function MapView({ folders, active, canSwipe, camera, onCameraChange, onMapReady, onShowAllOverlays, onToggleSidebar }: Props) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: elRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: camera?.center || [72.83, 18.939],
      zoom: camera?.zoom ?? 14,
    });

    // Add default zoom controls (top-right)
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const onZoomToBbox = (e: Event) => {
      const detail = (e as CustomEvent).detail as [number, number, number, number] | undefined;
      if (!detail || !mapRef.current) return;
      const [minLon, minLat, maxLon, maxLat] = detail;
      mapRef.current.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 40, duration: 400 });
    };
    window.addEventListener('zoom-to-bbox', onZoomToBbox as EventListener);
    mapRef.current.on('moveend', () => {
      const m = mapRef.current!;
      onCameraChange?.({ center: m.getCenter().toArray() as [number, number], zoom: m.getZoom() });
    });
    onMapReady?.(mapRef.current);
    return () => {
      window.removeEventListener('zoom-to-bbox', onZoomToBbox as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !camera) return;
    const m = mapRef.current;
    const cur = { center: m.getCenter().toArray() as [number, number], zoom: m.getZoom() };
    if (cur.zoom !== camera.zoom || cur.center[0] !== camera.center[0] || cur.center[1] !== camera.center[1]) {
      m.jumpTo({ center: camera.center, zoom: camera.zoom });
    }
  }, [camera]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setBusy(true);
    // Remove all dynamic layers/sources first
    map.getStyle().layers?.forEach(l => {
      if (l.id.startsWith('ds-')) map.removeLayer(l.id);
    });
    Object.keys(map.getStyle().sources).forEach(id => {
      if (id.startsWith('ds-')) map.removeSource(id);
    });

    // Add active layers in a stable, meaningful order: older first, newest last (on top)
    const parseDT = (s?: string) => {
      if (!s) return 0;
      const m = s.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})/);
      if (!m) return 0;
      const [, Y, M, D, h, m2] = m;
      return new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(m2)).getTime();
    };
    const ordered = Object.values(active).sort((a, b) => parseDT(a.meta?.datasetDateTime || (a as any).datasetDateTime) - parseDT(b.meta?.datasetDateTime || (b as any).datasetDateTime));
    const tileCount = ordered.filter(l => l.type === 'tile').length;

    ordered.forEach((layer, idx) => {
      const srcId = `ds-src-${idx}`;
      const lyrId = `ds-lyr-${idx}`;
      if (layer.type === 'tile') {
        const tiles = [layer.url];
        const replaced = tiles.map(t => t.replace('{z}','{z}').replace('{x}','{x}').replace('{y}','{y}'));
        map.addSource(srcId, { type: 'raster', tiles: replaced, tileSize: layer.meta?.tileSize || 256, minzoom: layer.meta?.minzoom, maxzoom: layer.meta?.maxzoom });
        const opacity = tileCount >= 2 ? 0.6 : 0.9;
        map.addLayer({ id: lyrId, type: 'raster', source: srcId, paint: { 'raster-opacity': opacity } });
      } else {
        map.addSource(srcId, { type: 'geojson', data: layer.url });
        map.addLayer({ id: lyrId, type: 'line', source: srcId, paint: { 'line-color': '#22c55e', 'line-width': 2 } });
      }
    });
    const t = setTimeout(()=>setBusy(false), 300);
    return ()=>clearTimeout(t);
  }, [active]);

  return (
    <div className="relative w-full h-[600px]">
      <div ref={elRef} className="absolute inset-0" />
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">{folders.length} dataset · swipe {canSwipe? 'ready':'n/a'}</div>
    </div>
  );
}
