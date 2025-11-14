import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Layers, ZoomIn, ZoomOut, Maximize2, AlertCircle } from 'lucide-react';
import { TilesetService } from '@/lib/tilesetService';
import { R2Service } from '@/lib/r2Service';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type GolfCourseTileset = Database['public']['Tables']['golf_course_tilesets']['Row'];

interface MapboxGolfCourseMapProps {
  golfClubId: string;
  mapboxAccessToken: string;
  baseStyle?: string; // Default: "mapbox://styles/mapbox/satellite-streets-v12"
  showControls?: boolean;
  className?: string;
  activeLayers?: Record<string, { key: string; type: 'tile'|'geojson'; url: string; meta?: any }>;
  navControlPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  overlayOrder?: string[]; // order of overlay ids (e.g., 'building', 'woodland'), top-to-bottom
}

const MapboxGolfCourseMap = ({
  golfClubId,
  mapboxAccessToken,
  baseStyle = 'mapbox://styles/mapbox/satellite-streets-v12',
  showControls = true,
  className = '',
  activeLayers = {},
  navControlPosition = 'top-right',
  overlayOrder = []
}: MapboxGolfCourseMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const baseCourseIdRef = useRef<string>('');
  const [tileset, setTileset] = useState<GolfCourseTileset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [showOverlay, setShowOverlay] = useState(true);
  const [allTilesets, setAllTilesets] = useState<GolfCourseTileset[]>([]);
  const [overlayDatesOn, setOverlayDatesOn] = useState(false);

  // Extract course folder from an R2 path by taking the segment before 'tiles'
  const getCourseFolder = (p: string): string => {
    try {
      const parts = String(p || '').split('/').filter(Boolean);
      const idx = parts.lastIndexOf('tiles');
      if (idx > 0) return parts[idx - 1];
      return parts[0] || '';
    } catch { return ''; }
  };

  // Helper to compute a safe courseId for tile-proxy
  const computeSafeCourseId = (fallbackPath?: string) => {
    const base = baseCourseIdRef.current || (fallbackPath ? (fallbackPath.split('/')[0] || '') : '');
    // Build a set of overlay ids from activeLayers (strip 'overlay:' prefix)
    const overlayIds = new Set(
      Object.values(activeLayers)
        .filter(l => l.type === 'geojson' && typeof l.key === 'string' && l.key.startsWith('overlay:'))
        .map(l => l.key.replace('overlay:', ''))
    );
    const knownCats = new Set(['woodland','open_sand','open_water','building','buildings','wetland','wetland_shrubs','others','office','shop','driving_range','gasterij','parking']);
    // If base accidentally equals an overlay id, fall back to first tileset's folder name
    if (overlayIds.has(base) || knownCats.has(base.toLowerCase())) {
      const alt = (tileset?.r2_folder_path || '').split('/')[0] || golfClubId || base;
      if (alt !== base) {
        console.warn('Overriding courseId that matched overlay id', { from: base, to: alt });
        return alt;
      }
    }
    return base || golfClubId;
  };

  // Set Mapbox access token
  mapboxgl.accessToken = mapboxAccessToken;

  // Load tileset metadata
  useEffect(() => {
    const loadTileset = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const tilesetData = await TilesetService.getTilesetForGolfClub(golfClubId);
        const listAll = await TilesetService.getTilesetsForGolfClub(golfClubId);
        
        if (!tilesetData) {
          setError('No tileset found for this golf course');
          setIsLoading(false);
          return;
        }

        setTileset(tilesetData);
        setAllTilesets(listAll || []);
        try { baseCourseIdRef.current = getCourseFolder(tilesetData.r2_folder_path || ''); } catch {}
      } catch (err) {
        console.error('Failed to load tileset:', err);
        setError('Failed to load map data');
      } finally {
        setIsLoading(false);
      }
    };
    loadTileset();
  }, [golfClubId]);

  // Sync overlays from activeLayers (separate effect)
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    // Determine if Health_Map_tiles is active
    const tileActive = Object.values(activeLayers).some(
      (l) => l.type === 'tile' && (l.meta?.id === 'health_tiles' || l.meta?.name === 'Health_Map_tiles')
    );
    // Respect current showOverlay state. Only show when both tileActive and showOverlay are true.
    try {
      m.setLayoutProperty(
        'golf-course-overlay',
        'visibility',
        tileActive && showOverlay ? 'visible' : 'none'
      );
    } catch {}

    // Build a set of desired geojson layer/source IDs
    const desired = new Set<string>();
    Object.values(activeLayers).forEach((l) => {
      if (l.type !== 'geojson') return;
      // Only accept overlays that were toggled from the Overlays sidebar
      if (typeof l.key !== 'string' || !l.key.startsWith('overlay:')) return;
      const safe = String(l.key).replace(/[^a-zA-Z0-9_-]/g, '_');
      const srcId = `geo_${safe}`;
      const fillId = `geo_${safe}_fill`;
      const lineId = `geo_${safe}_line`;
      const circleId = `geo_${safe}_circle`;
      desired.add(srcId);
      const overlayIdRaw = String(l.key).replace('overlay:', '');
      const catStr = overlayIdRaw.toLowerCase();
      const isBuildings = catStr === 'cat:building' || catStr === 'cat:buildings' || /building/.test(catStr);
      const isOpenSand = catStr.includes('open_sand') || catStr.includes('opensand') || /sand/.test(catStr);
      const isOpenWater = catStr.includes('open_water') || catStr.includes('openwater') || /water/.test(catStr);
      const isHeathland = /heathland/.test(catStr);
      const isWoodland = /woodland|forest|woods/.test(catStr);
      const isWetland = /wetland|shrubs/.test(catStr);
      const isHoles = /holes/.test(catStr);
      const isCourseBoundary = /course_boundary|course\s*building|course-building|coursebuilding/.test(catStr);

      const styleComputed = (() => {
        if (isBuildings) return { fill: '#ef4444', line: '#991b1b', fillOpacity: 0.5, lineWidth: 3 };
        if (isOpenSand) return { fill: '#ffffff', line: '#111827', fillOpacity: 0.9, lineWidth: 2 };
        if (isOpenWater) return { fill: '#3b82f6', line: '#1d4ed8', fillOpacity: 0.4, lineWidth: 2 };
        if (isHeathland) return { fill: '#a78bfa', line: '#6d28d9', fillOpacity: 0.35, lineWidth: 2 };
        if (isWoodland) return { fill: '#22c55e', line: '#166534', fillOpacity: 0.45, lineWidth: 2 };
        if (isWetland) return { fill: '#06b6d4', line: '#0e7490', fillOpacity: 0.4, lineWidth: 2 };
        if (isHoles) return { fill: '#10b981', line: '#065f46', fillOpacity: 0.35, lineWidth: 2 };
        if (isCourseBoundary) return { fill: '#f97316', line: '#c2410c', fillOpacity: 0.15, lineWidth: 3 };
        return { fill: '#22c55e', line: '#166534', fillOpacity: 0.4, lineWidth: 2 };
      })();
      const dataAny = (l.meta && (l.meta as any).geojson) ? (l.meta as any).geojson : l.url;
      const styleLoaded = (() => { try { return m.isStyleLoaded(); } catch { return false; } })();
      const addOrUpdate = () => {
        try {
          if (!m.getSource(srcId)) {
            console.log('Adding GeoJSON source', { srcId });
            m.addSource(srcId, { type: 'geojson', data: dataAny });
          } else {
            const src = m.getSource(srcId) as mapboxgl.GeoJSONSource;
            try { src.setData(dataAny as any); } catch (e) { console.error('Failed to set GeoJSON data on source', { srcId }, e); }
          }
        } catch (e) {
          console.error('Failed to add/update GeoJSON source', { srcId }, e);
        }
        // Add a filled polygon layer
        if (!m.getLayer(fillId)) {
          try {
            console.log('Adding fill layer', { fillId, overlayIdRaw });
            m.addLayer({
              id: fillId,
              type: 'fill',
              source: srcId,
              paint: {
                // Option C: polygon areas are always solid red regardless of data
                'fill-color': '#ef4444',
                'fill-opacity': 0.75,
                'fill-outline-color': '#7f1d1d',
              }
            });
          } catch (e) {
            console.error('Failed to add fill layer', { fillId }, e);
          }
        }
        // Always update fill paint on each sync
        try {
          m.setPaintProperty(fillId, 'fill-color', '#ef4444');
          m.setPaintProperty(fillId, 'fill-opacity', 0.75);
          m.setPaintProperty(fillId, 'fill-outline-color', '#7f1d1d');
        } catch {}
        // Add outline layer
        if (!m.getLayer(lineId)) {
          try {
            console.log('Adding line layer', { lineId, overlayIdRaw });
            m.addLayer({
              id: lineId,
              type: 'line',
              source: srcId,
              paint: { 'line-color': styleComputed.line, 'line-width': styleComputed.lineWidth }
            });
          } catch (e) {
            console.error('Failed to add line layer', { lineId }, e);
          }
        }
        // Always update line paint
        try {
          m.setPaintProperty(lineId, 'line-color', styleComputed.line);
          m.setPaintProperty(lineId, 'line-width', styleComputed.lineWidth);
        } catch {}
        // Add circle layer for point features
        if (!m.getLayer(circleId)) {
          try {
            console.log('Adding circle layer', { circleId, overlayIdRaw });
            m.addLayer({
              id: circleId,
              type: 'circle',
              source: srcId,
              paint: {
                // Option C: use data-driven color (or feature-provided color) for points
                'circle-color': [
                  'case',
                  ['any', ['has', 'color'], ['has', 'colour'], ['has', 'fill']],
                  ['coalesce', ['get', 'color'], ['get', 'colour'], ['get', 'fill']],
                  ['any', ['has', 'value'], ['has', 'ndvi']],
                  ['coalesce',
                    ['interpolate', ['linear'], ['to-number', ['get', 'value']],
                      0, '#fca5a5',
                      0.5, '#facc15',
                      1, '#22c55e'
                    ],
                    ['interpolate', ['linear'], ['to-number', ['get', 'ndvi']],
                      0, '#fca5a5',
                      0.5, '#facc15',
                      1, '#22c55e'
                    ],
                    '#22c55e'
                  ],
                  '#22c55e'
                ],
                'circle-radius': 4,
                'circle-stroke-color': '#111827',
                'circle-stroke-width': 1
              }
            });
          } catch (e) {
            console.error('Failed to add circle layer', { circleId }, e);
          }
        }
        // Always update circle paint
        try {
          m.setPaintProperty(
            circleId,
            'circle-color',
            [
              'case',
              ['any', ['has', 'color'], ['has', 'colour'], ['has', 'fill']],
              ['coalesce', ['get', 'color'], ['get', 'colour'], ['get', 'fill']],
              ['any', ['has', 'value'], ['has', 'ndvi']],
              ['coalesce',
                ['interpolate', ['linear'], ['to-number', ['get', 'value']], 0, '#fca5a5', 0.5, '#facc15', 1, '#22c55e'],
                ['interpolate', ['linear'], ['to-number', ['get', 'ndvi']], 0, '#fca5a5', 0.5, '#facc15', 1, '#22c55e'],
                '#22c55e'
              ],
              '#22c55e'
            ] as any
          );
          m.setPaintProperty(circleId, 'circle-radius', 4);
          m.setPaintProperty(circleId, 'circle-stroke-color', '#111827');
          m.setPaintProperty(circleId, 'circle-stroke-width', 1);
        } catch {}
        // Ensure overlay layers are drawn above raster tiles
        try { if (m.getLayer(lineId)) m.moveLayer(lineId); } catch {}
        try { if (m.getLayer(fillId)) m.moveLayer(fillId); } catch {}
        try { if (m.getLayer(circleId)) m.moveLayer(circleId); } catch {}

        // If this is Open Water, auto-zoom to its rendered extent once data is ready
        if (isOpenWater) {
          const computeBbox = (feats: mapboxgl.MapboxGeoJSONFeature[]) => {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const push = (x: number, y: number) => {
              if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
            };
            const walk = (arr: any) => {
              if (!Array.isArray(arr)) return;
              if (arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') { push(arr[0], arr[1]); return; }
              for (const el of arr) walk(el);
            };
            feats.forEach(f => { const c = (f.geometry as any)?.coordinates; walk(c); });
            if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;
            if (minX === maxX) { minX -= 1e-6; maxX += 1e-6; }
            if (minY === maxY) { minY -= 1e-6; maxY += 1e-6; }
            return [[minX, minY], [maxX, maxY]] as [[number, number], [number, number]];
          };
          try {
            m.once('idle', () => {
              try {
                const feats = m.queryRenderedFeatures(undefined, { layers: [fillId] });
                const bb = computeBbox(feats);
                if (bb) {
                  m.fitBounds(bb, { padding: 48, duration: 600 });
                }
              } catch {}
            });
          } catch {}
        }
      };

      if (!styleLoaded) {
        console.warn('Map style not loaded yet; deferring overlay add', { srcId });
        try { m.once('idle', addOrUpdate); } catch {}
      } else {
        addOrUpdate();
      }
    });

    // Remove stale: for each source not desired, remove its _fill, _line and _circle layers then the source
    const style = m.getStyle();
    const layerIds = (style.layers || []).map(l => l.id);
    const sourceIds = Object.keys(style.sources || {});
    sourceIds.forEach((srcId) => {
      if (!srcId.startsWith('geo_')) return;
      if (desired.has(srcId)) return;
      const fillId = `${srcId}_fill`;
      const lineId = `${srcId}_line`;
      const circleId = `${srcId}_circle`;
      if (layerIds.includes(lineId)) { try { m.removeLayer(lineId); } catch {} }
      if (layerIds.includes(fillId)) { try { m.removeLayer(fillId); } catch {} }
      if (layerIds.includes(circleId)) { try { m.removeLayer(circleId); } catch {} }
      try { if (m.getSource(srcId)) m.removeSource(srcId); } catch {}
    });

    // Reorder geojson overlay layers according to overlayOrder (top item should be visually on top)
    if (overlayOrder && overlayOrder.length) {
      // Build list of layer IDs corresponding to order entries
      // Safer: compute from existing activeLayers keys and provided order
      const existing = Object.values(activeLayers)
        .filter(l => l.type === 'geojson' && l.key.startsWith('overlay:'))
        .map(l => { const safe = String(l.key).replace(/[^a-zA-Z0-9_-]/g, '_'); return ({ id: l.key.replace('overlay:', ''), fillId: `geo_${safe}_fill`, lineId: `geo_${safe}_line`, circleId: `geo_${safe}_circle` }); });
      const sequence = overlayOrder
        .map(id => existing.find(e => e.id === id))
        .filter((e): e is { id: string; fillId: string; lineId: string; circleId: string } => !!e);
      // Move layers so first entry ends on top: move in reverse order to top
      sequence.slice().reverse().forEach((e) => {
        try { if (m.getLayer(e.lineId)) m.moveLayer(e.lineId); } catch {}
        try { if (m.getLayer(e.fillId)) m.moveLayer(e.fillId); } catch {}
        try { if (m.getLayer(e.circleId)) m.moveLayer(e.circleId); } catch {}
      });
    }

  }, [activeLayers, showOverlay, overlayOrder]);

  // Initialize map and add custom tile overlay
  useEffect(() => {
    if (!mapContainer.current || !tileset || map.current) return;

    try {
      // Initialize the map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: baseStyle,
        center: [tileset.center_lon, tileset.center_lat],
        zoom: tileset.default_zoom,
        minZoom: tileset.min_zoom,
        maxZoom: tileset.max_zoom,
        bounds: [
          [tileset.min_lon, tileset.min_lat],
          [tileset.max_lon, tileset.max_lat]
        ],
        fitBoundsOptions: {
          padding: 50
        }
      });

      // Add navigation controls
      if (showControls) {
        map.current.addControl(new mapboxgl.NavigationControl(), navControlPosition);
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
        map.current.addControl(new mapboxgl.FullscreenControl(), navControlPosition);
      }

      // Track zoom changes
      map.current.on('zoom', () => {
        if (map.current) {
          setCurrentZoom(Math.round(map.current.getZoom()));
        }
      });

      // Wait for map to load, then add custom tile layer
      map.current.on('load', async () => {
        if (!map.current || !tileset) return;

        // Get auth token for authenticated tile access
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('No active session for tile loading');
          setError('Authentication required to load tiles');
          return;
        }

        // Extract course ID from r2_folder_path (format: "course-name/tiles")
        const courseId = baseCourseIdRef.current || (tileset.r2_folder_path.split('/')[0]);
        
        // Use authenticated tile-proxy with token
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy?courseId=${courseId}&z={z}&x={x}&y={y}&token=${session.access_token}`;
        
        console.log('Loading tiles with URL pattern:', tileUrlTemplate.replace(session.access_token, 'TOKEN'), 'courseId=', courseId);
        
        map.current!.addSource('golf-course-tiles', {
          type: 'raster',
          tiles: [tileUrlTemplate],
          tileSize: tileset.tile_size || 256,
          minzoom: tileset.min_zoom,
          maxzoom: tileset.max_zoom,
          bounds: [
            tileset.min_lon,
            tileset.min_lat,
            tileset.max_lon,
            tileset.max_lat
          ]
        });

        map.current!.addLayer({
          id: 'golf-course-overlay',
          type: 'raster',
          source: 'golf-course-tiles',
          paint: {
            'raster-opacity': 0.85
          }
        });
      });

    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [tileset, baseStyle, showControls]);

  // Switch primary tileset based on latitude/longitude from an external event
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { lat: number; lon: number } | undefined;
      if (!detail || !map.current) return;
      const { lat, lon } = detail;
      if (!allTilesets?.length) return;

      // Choose tileset whose bounds contain the point; fallback to nearest center
      const contains = (t: GolfCourseTileset) => lat >= t.min_lat && lat <= t.max_lat && lon >= t.min_lon && lon <= t.max_lon;
      let target = allTilesets.find(contains) || null;
      if (!target) {
        target = allTilesets.slice().sort((a,b)=>{
          const da = Math.hypot((a.center_lat - lat), (a.center_lon - lon));
          const db = Math.hypot((b.center_lat - lat), (b.center_lon - lon));
          return da - db;
        })[0] || null;
      }
      if (!target) return;

      // If already using this tileset, do nothing
      if (tileset && target.id === tileset.id) return;

      const m = map.current;
      try {
        // Rebuild primary raster source/layer using the selected tileset
        // Acquire session for tokenized tile-proxy URL
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const courseId = baseCourseIdRef.current || (target.r2_folder_path.split('/')[0]);
        const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy?courseId=${courseId}&z={z}&x={x}&y={y}&token=${session.access_token}`;

        // Remove existing primary layer/source if present
        try { if (m.getLayer('golf-course-overlay')) m.removeLayer('golf-course-overlay'); } catch {}
        try { if (m.getSource('golf-course-tiles')) m.removeSource('golf-course-tiles'); } catch {}

        m.addSource('golf-course-tiles', {
          type: 'raster',
          tiles: [tileUrlTemplate],
          tileSize: target.tile_size || 256,
          minzoom: target.min_zoom,
          maxzoom: target.max_zoom,
          bounds: [target.min_lon, target.min_lat, target.max_lon, target.max_lat]
        });

        m.addLayer({
          id: 'golf-course-overlay',
          type: 'raster',
          source: 'golf-course-tiles',
          paint: { 'raster-opacity': 0.85 }
        });

        // Update component state so other logic (like overlay toggle) stays consistent
        console.log('Switched tileset; using courseId for tiles:', courseId, 'target.name=', target.name);
        setTileset(target);
      } catch {}
    };

    window.addEventListener('switch-tileset-by-lat', handler as EventListener);
    return () => window.removeEventListener('switch-tileset-by-lat', handler as EventListener);
  }, [allTilesets, tileset]);

  // Listen for zoom-to-bbox events to fit view to provided bounds [minLon,minLat,maxLon,maxLat]
  useEffect(() => {
    const handler = (e: CustomEvent<[number, number, number, number]>) => {
      if (!map.current) return;
      const [minLon, minLat, maxLon, maxLat] = e.detail;
      console.log('Map received zoom-to-bbox', { minLon, minLat, maxLon, maxLat });
      const doFit = () => {
        try {
          const numsOk = [minLon, minLat, maxLon, maxLat].every(n => Number.isFinite(n));
          const spansOk = (maxLon > minLon) && (maxLat > minLat);
          const center = [(minLon + maxLon) / 2, (minLat + maxLat) / 2] as [number, number];
          if (numsOk && spansOk) {
            map.current!.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 48, duration: 600 });
            const c = map.current!.getCenter();
            const b = map.current!.getBounds();
            console.log('Applied fitBounds', { center: [c.lng, c.lat], bounds: [[b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]] });
          } else {
            console.warn('Degenerate bbox; using flyTo fallback', { center });
            map.current!.flyTo({ center, zoom: 16, duration: 600, essential: true });
          }
        } catch (err) {
          const center = [(minLon + maxLon) / 2, (minLat + maxLat) / 2] as [number, number];
          console.warn('fitBounds failed; using flyTo fallback', err);
          try { map.current!.flyTo({ center, zoom: 16, duration: 600, essential: true }); } catch {}
        }
      };
      try {
        if (!map.current.isStyleLoaded()) {
          console.log('Style not loaded; waiting for idle before fitBounds');
          map.current.once('idle', doFit);
        } else {
          doFit();
        }
      } catch { doFit(); }
    };
    window.addEventListener('zoom-to-bbox', handler as EventListener);
    return () => window.removeEventListener('zoom-to-bbox', handler as EventListener);
  }, []);

  // Toggle second most-recent tileset overlay
  const toggleOverlayDates = async () => {
    if (!map.current) return;
    const m = map.current;
    // Refresh list to capture newly uploaded datasets
    try {
      const latest = await TilesetService.getTilesetsForGolfClub(golfClubId);
      setAllTilesets(latest || []);
      // Use freshly fetched list for computation to avoid stale state
      const pool = (latest || []).filter(t => t.id !== tileset?.id)
        .sort((a,b) => (new Date(b.created_at).getTime()) - (new Date(a.created_at).getTime()));
      const second = pool[0];
      if (!second) return;

      if (!overlayDatesOn) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const courseId2 = baseCourseIdRef.current || (second.r2_folder_path.split('/')[0]);
          const tileUrlTemplate2 = `${supabaseUrl}/functions/v1/tile-proxy?courseId=${courseId2}&z={z}&x={x}&y={y}&token=${session.access_token}`;
          if (!m.getSource('golf-course-tiles-2')) {
            m.addSource('golf-course-tiles-2', {
              type: 'raster',
              tiles: [tileUrlTemplate2],
              tileSize: second.tile_size || 256,
              minzoom: second.min_zoom,
              maxzoom: second.max_zoom,
              bounds: [second.min_lon, second.min_lat, second.max_lon, second.max_lat]
            });
          }
          if (!m.getLayer('golf-course-overlay-2')) {
            m.addLayer({
              id: 'golf-course-overlay-2',
              type: 'raster',
              source: 'golf-course-tiles-2',
              paint: { 'raster-opacity': 0.7 }
            });
          }
          setOverlayDatesOn(true);
        } catch {}
      } else {
        try { if (m.getLayer('golf-course-overlay-2')) m.removeLayer('golf-course-overlay-2'); } catch {}
        try { if (m.getSource('golf-course-tiles-2')) m.removeSource('golf-course-tiles-2'); } catch {}
        setOverlayDatesOn(false);
      }
      return;
    } catch {}
  };

  // Toggle overlay visibility
  const toggleOverlay = () => {
    if (!map.current) return;

    const newVisibility = !showOverlay;
    try {
      map.current.setLayoutProperty(
        'golf-course-overlay',
        'visibility',
        newVisibility ? 'visible' : 'none'
      );
    } catch {}
    setShowOverlay(newVisibility);
  };

  // Zoom controls
  const zoomIn = () => {
    map.current?.zoomIn();
  };

  const zoomOut = () => {
    map.current?.zoomOut();
  };

  const resetView = () => {
    if (!map.current || !tileset) return;
    
    map.current.flyTo({
      center: [tileset.center_lon, tileset.center_lat],
      zoom: tileset.default_zoom,
      essential: true
    });
  };

  const showAllOverlays = () => {
    try { localStorage.setItem('DEMO_SHOW_ALL_OVERLAYS', 'true'); } catch {}
    // Let any sidebar component know to open
    window.dispatchEvent(new CustomEvent('open-overlays-sidebar'));
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="animate-spin w-16 h-16 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <h3 className="text-lg font-medium">Loading Map</h3>
            <p className="text-muted-foreground">Fetching golf course data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !tileset) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">Map Not Available</h3>
            <p className="text-muted-foreground">
              {error || 'No map data found for this golf course'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {tileset.name}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Zoom: {currentZoom}
            </Badge>
            {tileset.attribution && (
              <Badge variant="outline" className="text-xs">
                {tileset.attribution}
              </Badge>
            )}
          </div>
        </CardTitle>

        {/* Map Controls */}
        {showControls && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button variant={overlayDatesOn ? 'default' : 'outline'} size="sm" onClick={toggleOverlayDates}>
                Overlay Date
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={zoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={zoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetView}>
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={showAllOverlays} title="Show 14 overlays">14</Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div 
          ref={mapContainer} 
          className="w-full h-[600px] rounded-lg overflow-hidden border"
        />
        
        {tileset.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {tileset.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MapboxGolfCourseMap;

