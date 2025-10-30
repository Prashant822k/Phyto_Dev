// Web Worker for ZIP extraction (runs in background thread)
import JSZip from 'jszip';

self.onmessage = async (e: MessageEvent) => {
  const { zipFile } = e.data;
  
  try {
    const zip = await JSZip.loadAsync(zipFile);
    const tiles: Array<{ z: number; x: number; y: number; blob: Blob }> = [];

    for (const [path, file] of Object.entries(zip.files)) {
      const match = path.match(/(?:tiles\/)?(\d+)\/(\d+)\/(\d+)\.png$/);
      if (match && !file.dir) {
        const [, z, x, y] = match;
        const blob = await file.async('blob');
        tiles.push({
          z: parseInt(z),
          x: parseInt(x),
          y: parseInt(y),
          blob,
        });
      }
    }

    self.postMessage({ tiles });
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
