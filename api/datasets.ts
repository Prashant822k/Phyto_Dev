import type { DatasetFolder, DatasetMetadata } from '@/lib/datasetService';

export async function listDatasets(project: string): Promise<DatasetFolder[]> {
  const base = `/sample-data/datasets/${project}`;
  const dateTime = '2025-10-27_07-30';
  const res = await fetch(`${base}/${dateTime}/metadata.json`);
  if (!res.ok) return [];
  const metadata: DatasetMetadata = await res.json();
  return [{ project, date_time: dateTime, urlBase: `${base}/${dateTime}`, metadata }];
}

export async function getDatasetLayers(project: string, date_time: string): Promise<DatasetMetadata['layers']> {
  const res = await fetch(`/sample-data/datasets/${project}/${date_time}/metadata.json`);
  if (!res.ok) return [];
  const metadata: DatasetMetadata = await res.json();
  return metadata.layers;
}

export async function uploadDataset(): Promise<{ ok: boolean }> {
  return { ok: true };
}
