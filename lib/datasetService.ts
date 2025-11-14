import { createClient } from '@supabase/supabase-js';

export type DatasetMetadata = {
  project: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  flight_id: string;
  uploader?: string;
  bbox: [number, number, number, number];
  layers: Array<{
    id: string;
    name: string;
    type: 'tile' | 'geojson';
    path: string; // relative to dataset folder
    minzoom?: number;
    maxzoom?: number;
    tileSize?: number;
  }>;
};

export type DatasetFolder = {
  project: string;
  date_time: string; // e.g. 2025-10-27_07-30
  urlBase: string; // absolute base URL to folder
  metadata: DatasetMetadata;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function isPrivate() {
  return !!import.meta.env.VITE_DATASETS_PRIVATE;
}

function showAllOverlaysEnabled(): boolean {
  try {
    if ((import.meta as any).env?.VITE_DEMO_SHOW_ALL_OVERLAYS === 'true') return true;
    const ls = localStorage.getItem('DEMO_SHOW_ALL_OVERLAYS');
    return ls === 'true';
  } catch {
    return false;
  }
}

export const datasetService = {
  async listDatasets(project: string): Promise<DatasetFolder[]> {
    // Configurable public base (falls back to /sample-data)
    const root = (import.meta as any).env?.VITE_DATASETS_PUBLIC_BASE || '/sample-data';
    const base = `${String(root).replace(/\/$/, '')}/datasets/${project}`;
    try {
      // Try reading an index.json manifest listing available date_time folders
      const idxRes = await fetch(`${base}/index.json`);
      if (idxRes.ok) {
        const idx = await idxRes.json();
        // Flexible: allow array of strings or objects with date_time fields
        const entries: string[] = Array.isArray(idx)
          ? idx.map((e: any) => (typeof e === 'string' ? e : e.date_time || e.folder || e))
          : (idx.date_times || idx.items || []);
        const results: DatasetFolder[] = [];
        for (const dt of entries) {
          if (!dt) continue;
          const metaUrl = `${base}/${dt}/metadata.json`;
          const res = await fetch(metaUrl);
          if (!res.ok) continue;
          const metadata: DatasetMetadata = await res.json();
          results.push({ project, date_time: dt, urlBase: `${base}/${dt}`, metadata });
        }
        return results;
      }
      // Fallback: probe a known example folder
      const dateTime = '2025-10-27_07-30';
      const metaUrl = `${base}/${dateTime}/metadata.json`;
      const res = await fetch(metaUrl);
      if (!res.ok) return [];
      const metadata: DatasetMetadata = await res.json();
      return [{ project, date_time: dateTime, urlBase: `${base}/${dateTime}`, metadata }];
    } catch {
      return [];
    }
  },

  async getDatasetLayers(project: string, date_time: string): Promise<DatasetMetadata['layers']> {
    const root = (import.meta as any).env?.VITE_DATASETS_PUBLIC_BASE || '/sample-data';
    const base = `${String(root).replace(/\/$/, '')}/datasets/${project}`;
    const metaUrl = `${base}/${date_time}/metadata.json`;
    const res = await fetch(metaUrl);
    if (!res.ok) throw new Error('metadata.json not found');
    const metadata: DatasetMetadata = await res.json();
    return metadata.layers;
  },

  async getSignedUrl(path: string): Promise<string> {
    if (!isPrivate() || !supabase) return path; // public path
    // Example: sign a Supabase Storage path (bucket and key must be encoded into path)
    // Expected path format: storage://bucket/key
    if (!path.startsWith('storage://')) return path;
    const [, , bucket, ...keyParts] = path.split('/');
    const key = keyParts.join('/');
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 3600);
    if (error || !data) throw error || new Error('Failed to sign URL');
    return data.signedUrl;
  },
};
