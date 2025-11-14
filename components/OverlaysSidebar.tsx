import type { DatasetFolder } from '@/lib/datasetService';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Crosshair, GripVertical } from 'lucide-react';
import { useMemo, useState } from 'react';

type Props = {
  folders: DatasetFolder[];
  active: Record<string, { key: string; type: 'tile' | 'geojson'; url: string; meta?: any }>;
  onToggle: (folder: DatasetFolder, layerId: string) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  extraOverlays?: Array<{ id: string; name: string; type: 'tile' | 'geojson' }>;
  order?: string[];
  onReorder?: (ids: string[]) => void;
  checkedMap?: Record<string, boolean>;
};

export default function OverlaysSidebar({ folders, active, onToggle, disabled, open: openProp, onOpenChange, extraOverlays, order, onReorder, checkedMap }: Props) {
  const [internalOpen, setInternalOpen] = useState(true);
  const open = openProp ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v); else setInternalOpen(v);
  };
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const base = folders.flatMap((f) =>
      f.metadata.layers
        .filter((l) => {
          const q = query.toLowerCase();
          if (!q) return true;
          return (
            l.name.toLowerCase().includes(q) ||
            l.type.toLowerCase().includes(q) ||
            f.date_time.toLowerCase().includes(q)
          );
        })
        .map((l) => ({ folder: f, layer: l, available: true }))
    );
    // Append extras not in metadata (make toggles available so user can try enabling)
    const presentIds = new Set(base.map(b => `${b.folder.date_time}:${b.layer.id}`));
    const extras = (extraOverlays || []).map((eo) => ({ folder: folders[0] || {
      project: 'Unknown', date_time: 'N/A', urlBase: '', metadata: { project: '', date: '', time: '', flight_id: '', uploader: '', bbox: [0,0,0,0] as [number,number,number,number], layers: [] }
    } as DatasetFolder, layer: eo as any, available: true }))
      .filter(e => !presentIds.has(`${e.folder.date_time}:${e.layer.id}`))
      .filter(e => {
        const q = query.toLowerCase();
        if (!q) return true;
        return e.layer.name.toLowerCase().includes(q) || e.layer.type.toLowerCase().includes(q);
      });
    const merged = [...base, ...extras];
    // Apply optional order: sort by provided order of layer.id
    if (order && order.length) {
      const rank = new Map(order.map((id, idx) => [id, idx] as const));
      merged.sort((a,b)=> (rank.get(a.layer.id) ?? 1e9) - (rank.get(b.layer.id) ?? 1e9));
    }
    return merged;
  }, [folders, query, extraOverlays, order]);

  const activeCount = Object.keys(active).length;

  return (
    <div className={`absolute top-0 right-0 h-full w-80 bg-background border-l shadow transform transition-transform duration-300 z-20 ${open ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'}`}>
      {open && (
        <button className="absolute -left-8 top-4 bg-background border rounded-full p-1 shadow" onClick={() => setOpen(!open)}>
          <ChevronRight className="w-4 h-4"/>
        </button>
      )}
      <div className="p-3 border-b">
        <div className="font-medium">Map Overlays ({activeCount})</div>
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Filter overlays..." className="mt-2 w-full px-2 py-1 border rounded" disabled={disabled} />
      </div>
      <div className="overflow-auto h-[calc(100%-60px)] p-2 space-y-2">
        {rows.map(({ folder, layer, available }) => {
            const key = `${folder.date_time}:${layer.id}`;
            const isOn = checkedMap ? !!checkedMap[layer.id] : !!active[key];
            const bbox = folder.metadata.bbox;
            const subtitle = layer.type === 'tile' ? 'live maps (Tile Map)' : 'live maps (Image Overlay)';
            const handleDragStart = (e: React.DragEvent) => {
              e.dataTransfer.setData('text/plain', layer.id);
              e.dataTransfer.effectAllowed = 'move';
            };
            const handleDragOver = (e: React.DragEvent) => {
              if (!onReorder) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            };
            const handleDrop = (e: React.DragEvent) => {
              if (!onReorder) return;
              e.preventDefault();
              const srcId = e.dataTransfer.getData('text/plain');
              const dstId = layer.id;
              if (!srcId || srcId === dstId) return;
              const current = (order && order.length) ? [...order] : rows.map(r => r.layer.id);
              const from = current.indexOf(srcId);
              let to = current.indexOf(dstId);
              if (from < 0 || to < 0) return;
              const next = [...current];
              const [moved] = next.splice(from, 1);
              // Insert before destination
              to = next.indexOf(dstId);
              next.splice(to, 0, moved);
              onReorder(next);
            };
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-2 p-2 border rounded"
                draggable={!!onReorder}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate" title={`${layer.name} (${folder.date_time})`}>{layer.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{folder.date_time} · {subtitle}</div>
                </div>
                <div className="flex items-center gap-2">
                  {onReorder && <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />}
                  <Button size="icon" variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('zoom-to-bbox', { detail: bbox }))} title="Zoom to overlay" disabled={disabled || !available}>
                    <Crosshair className="w-4 h-4" />
                  </Button>
                  <Switch checked={isOn} onCheckedChange={() => onToggle(folder, layer.id)} disabled={disabled || !available} />
                </div>
              </div>
            );
        })}
        {!rows.length && <div className="text-sm text-muted-foreground">No overlays</div>}
      </div>
    </div>
  );
}
