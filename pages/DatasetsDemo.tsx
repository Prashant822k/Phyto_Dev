import MapView from '@/components/MapView';
import OverlaysSidebar from '@/components/OverlaysSidebar';
import TopControls from '@/components/TopControls';
import SwipeController from '@/components/SwipeController';
import { useDatasets } from '@/hooks/useDatasets';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function DatasetsDemo() {
  const project = 'GolfCourse_01';
  const { folders, active, toggleLayer, refresh, canSwipe, swipe, setSwipe } = useDatasets(project);
  const [divider, setDivider] = useState(0.5);
  const [camera, setCamera] = useState<{ center: [number, number]; zoom: number }>({ center: [72.83, 18.939], zoom: 14 });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [forceShowAll, setForceShowAll] = useState<boolean>(false);
  const leftMapRef = useRef<mapboxgl.Map | null>(null);
  const rightMapRef = useRef<mapboxgl.Map | null>(null);
  const [compareActive, setCompareActive] = useState(false);
  const compareInstanceRef = useRef<any>(null);

  // Build list of currently active dataset-layer keys
  const activeKeys = useMemo(() => Object.keys(active), [active]);

  // Handle multi-select of datasets (date_time + layer id key)
  const onSelectDateTimes = async (selected: string[]) => {
    // Deactivate keys not selected
    const toDisable = activeKeys.filter(k => !selected.includes(k));
    for (const k of toDisable) {
      const [dt, layerId] = k.split(':');
      const folder = folders.find(f => f.date_time === dt);
      if (folder) await toggleLayer(folder, layerId); // toggles off
    }
    // Activate selected that are not yet active
    const toEnable = selected.filter(k => !activeKeys.includes(k));
    for (const k of toEnable) {
      const [dt, layerId] = k.split(':');
      const folder = folders.find(f => f.date_time === dt);
      if (folder) await toggleLayer(folder, layerId);
    }
  };

  // Overlay Dates handler: pick two most recent date_time folders and overlay their first tile layer
  const onOverlayDates = async () => {
    // Parse and sort folders by date_time descending
    const parseDT = (s: string) => {
      // format: YYYY-MM-DD_HH-MM
      const m = s.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})/);
      if (!m) return 0;
      const [_, Y, M, D, h, m2] = m;
      return new Date(Number(Y), Number(M)-1, Number(D), Number(h), Number(m2)).getTime();
    };
    const sorted = [...folders].sort((a,b)=>parseDT(b.date_time)-parseDT(a.date_time));
    const pick = sorted.slice(0,2);
    if (pick.length < 2) return;
    // Build desired keys (first tile layer per dataset)
    const desired: string[] = [];
    for (const f of pick) {
      const layer = f.metadata.layers.find(l=>l.type==='tile');
      if (layer) desired.push(`${f.date_time}:${layer.id}`);
    }
    // Disable swipe explicitly
    setSwipe(false);
    // Apply selection
    await onSelectDateTimes(desired);
  };

  const activeTileKeys = useMemo(() => Object.values(active).filter(l => l.type==='tile').map(l => l.key), [active]);
  const [leftKey, rightKey] = activeTileKeys;
  const leftActive = useMemo(() => {
    if (!(swipe && leftKey)) return active;
    const l: typeof active = {};
    const item = active[leftKey];
    if (item) l[leftKey] = item;
    return l;
  }, [active, swipe, leftKey]);
  const rightActive = useMemo(() => {
    if (!(swipe && rightKey)) return active;
    const r: typeof active = {};
    const item = active[rightKey];
    if (item) r[rightKey] = item;
    return r;
  }, [active, swipe, rightKey]);

  const sidebarDisabled = swipe;

  // Try to initialize mapbox-gl-compare when swipe begins and both maps are ready
  useEffect(() => {
    const ready = swipe && leftMapRef.current && rightMapRef.current;
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const mod: any = await import('mapbox-gl-compare').catch(() => null);
        if (!mod || cancelled) return;
        const Compare = mod.default || mod;
        const cmp = new Compare(leftMapRef.current!, rightMapRef.current!, undefined);
        compareInstanceRef.current = cmp;
        setCompareActive(true);
      } catch {
        // fallback remains
      }
    })();
    return () => { cancelled = true; };
  }, [swipe]);

  // Cleanup compare when swipe ends
  useEffect(() => {
    if (!swipe && compareInstanceRef.current) {
      try { compareInstanceRef.current.remove(); } catch {}
      compareInstanceRef.current = null;
      setCompareActive(false);
    }
  }, [swipe]);

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0">
        {!swipe && (
          <MapView folders={folders} active={active} canSwipe={canSwipe} camera={camera} onCameraChange={setCamera} />
        )}
        {swipe && !compareActive && (
          <div className="absolute inset-0">
            <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - divider*100}% 0 0)` }}>
              <MapView folders={folders} active={leftActive} canSwipe={canSwipe} camera={camera} onCameraChange={setCamera} onMapReady={(m)=>{ leftMapRef.current = m; }} />
            </div>
            <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${divider*100}%)` }}>
              <MapView folders={folders} active={rightActive} canSwipe={canSwipe} camera={camera} onCameraChange={setCamera} onMapReady={(m)=>{ rightMapRef.current = m; }} />
            </div>
            <SwipeController enabled={true} position={divider} onPositionChange={setDivider} onExit={() => setSwipe(false)} />
          </div>
        )}
        {swipe && compareActive && (
          <div className="absolute inset-0">
            <MapView folders={folders} active={leftActive} canSwipe={canSwipe} camera={camera} onCameraChange={setCamera} onMapReady={(m)=>{ leftMapRef.current = m; }} />
            <MapView folders={folders} active={rightActive} canSwipe={canSwipe} camera={camera} onCameraChange={setCamera} onMapReady={(m)=>{ rightMapRef.current = m; }} />
            {/* compare provides its own slider */}
          </div>
        )}
      </div>
      <TopControls
        folders={folders}
        onRefresh={refresh}
        canSwipe={canSwipe}
        swipe={swipe}
        setSwipe={setSwipe}
        activeKeys={activeKeys}
        onSelectDateTimes={onSelectDateTimes}
        onOverlayDates={onOverlayDates}
        onToggleSidebar={() => setSidebarOpen(v=>!v)}
      />
      <OverlaysSidebar folders={folders} active={active} onToggle={toggleLayer} disabled={sidebarDisabled} open={sidebarOpen} onOpenChange={setSidebarOpen} />
    </div>
  );
}
