import { useEffect, useMemo, useState } from 'react';
import { datasetService, type DatasetFolder } from '@/lib/datasetService';

type ActiveLayer = { key: string; type: 'tile' | 'geojson'; url: string; meta?: any; datasetDateTime: string };

const LS_KEY = 'dataset_ui_state_v1';

type PersistedState = {
  activeKeys: string[];
  swipeEnabled: boolean;
};

export function useDatasets(project: string) {
  const [folders, setFolders] = useState<DatasetFolder[]>([]);
  const [active, setActive] = useState<Record<string, ActiveLayer>>({});
  const [swipe, setSwipe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        const parsed: PersistedState = JSON.parse(raw);
        setSwipe(parsed.swipeEnabled);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({
      activeKeys: Object.keys(active),
      swipeEnabled: swipe,
    } satisfies PersistedState));
  }, [active, swipe]);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await datasetService.listDatasets(project);
      setFolders(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [project]);

  const toggleLayer = async (folder: DatasetFolder, layerId: string) => {
    const key = `${folder.date_time}:${layerId}`;
    const existing = active[key];
    if (existing) {
      const next = { ...active };
      delete next[key];
      setActive(next);
      return;
    }
    const layer = folder.metadata.layers.find(l => l.id === layerId);
    if (!layer) return;
    const url = `${folder.urlBase}/${layer.path}`;
    setActive({ ...active, [key]: { key, type: layer.type, url, meta: layer, datasetDateTime: folder.date_time } });
  };

  const activeTiles = useMemo(() => Object.values(active).filter(l => l.type==='tile'), [active]);
  const canSwipe = activeTiles.length === 2 && activeTiles[0].datasetDateTime !== activeTiles[1].datasetDateTime;

  return { folders, active, toggleLayer, refresh, loading, swipe, setSwipe, canSwipe };
}
