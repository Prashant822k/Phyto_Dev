import { Crosshair, RefreshCw, Layers, SwitchCamera, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DatasetFolder } from '@/lib/datasetService';

type Props = {
  folders: DatasetFolder[];
  onRefresh: () => void;
  canSwipe: boolean;
  swipe: boolean;
  setSwipe: (v: boolean) => void;
  onToggleSidebar?: () => void;
  activeKeys?: string[];
  onSelectDateTimes?: (selected: string[]) => void;
  onOverlayDates?: () => void;
};

export default function TopControls({ folders, onRefresh, canSwipe, swipe, setSwipe, onToggleSidebar, activeKeys = [], onSelectDateTimes, onOverlayDates }: Props) {
  const computed = folders.reduce((n,f)=>n+f.metadata.layers.length,0);
  const overlaysCount = computed;
  return (
    <div className="absolute top-3 left-3 flex gap-2 z-10 items-center">
      <Button className="rounded-full" variant="secondary" onClick={() => { onToggleSidebar?.(); }}><Layers className="w-4 h-4 mr-1" />{overlaysCount} Overlays</Button>
      <Button className="rounded-full" variant="secondary" onClick={()=>navigator.geolocation.getCurrentPosition(()=>{})}><Crosshair className="w-4 h-4 mr-1" />Current</Button>
      <Button className="rounded-full" variant="secondary" onClick={onRefresh}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
      <Button className="rounded-full" variant={canSwipe?'default':'outline'} disabled={!canSwipe} onClick={()=>setSwipe(!swipe)} title="Swipe compare two selected layers"><SwitchCamera className="w-4 h-4 mr-1" />Swipe</Button>
      <Button className="rounded-full" variant="outline" onClick={()=>setSwipe(false)} title="Overlay selected layers"><Layers3 className="w-4 h-4 mr-1" />Overlay</Button>
      <Button className="rounded-full" variant="secondary" onClick={()=>{ setSwipe(false); onOverlayDates?.(); }} title="Overlay tiles from two different dates">Overlay Dates</Button>
      {/* Dataset date/time selector (multi-select) */}
      <div className="bg-background/90 border rounded px-2 py-1">
        <label className="text-xs mr-2">Datasets</label>
        <select
          multiple
          size={Math.min(4, Math.max(2, folders.length))}
          className="align-middle text-xs border rounded px-1 py-0.5 min-w-[220px]"
          value={activeKeys.filter(k=>k.endsWith(':imagery'))}
          onChange={(e)=>{
            if (!onSelectDateTimes) return;
            const opts = Array.from(e.target.selectedOptions).map(o=>o.value);
            onSelectDateTimes(opts);
          }}
        >
          {folders.flatMap((f)=>{
            return f.metadata.layers
              .filter(l=>l.type==='tile')
              .map(l=>{
                const value = `${f.date_time}:${l.id}`;
                const label = `${f.metadata.date} ${f.metadata.time} · ${l.name}`;
                return (
                  <option key={value} value={value}>{label}</option>
                );
              });
          })}
        </select>
      </div>
    </div>
  );
}
