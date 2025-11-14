const WORKER_URL = import.meta.env.VITE_TILE_WORKER_URL;

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface TileWithBlob extends TileCoord {
  blob: Blob;
}

export interface UploadProgress {
  uploaded: number;
  total: number;
  percentage: number;
  currentTile?: string;
}

export class TileUploader {
  private courseId: string;
  private abortController: AbortController | null = null;

  constructor(courseId: string) {
    this.courseId = courseId;
  }

  // Upload single tile (with optional compression)
  async uploadTile(z: number, x: number, y: number, blob: Blob, compress = false): Promise<void> {
    const { url } = await fetch(`${WORKER_URL}/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: this.courseId, z, x, y }),
    }).then(r => r.json());

    // Optional: compress if blob > 500KB (use CompressionStream API)
    let uploadBlob = blob;
    if (compress && blob.size > 500000 && 'CompressionStream' in window) {
      const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
      uploadBlob = await new Response(stream).blob();
    }

    await fetch(url, {
      method: 'PUT',
      body: uploadBlob,
      headers: { 
        'Content-Type': 'image/png',
        ...(compress && uploadBlob !== blob ? { 'Content-Encoding': 'gzip' } : {})
      },
    });
  }

  // Batch upload tiles (optimized)
  async uploadTiles(
    tiles: TileWithBlob[],
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    this.abortController = new AbortController();
    const coords = tiles.map(({ z, x, y }) => ({ z, x, y }));
    
    // Get presigned URLs in batch
    const response = await fetch(`${WORKER_URL}/batch-upload-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: this.courseId, tiles: coords }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Worker error: ${response.status} ${response.statusText}`);
    }

    const { urls } = await response.json();
    
    if (!urls || !Array.isArray(urls)) {
      throw new Error('Invalid response: missing urls array');
    }

    // Upload tiles in parallel (30 concurrent for faster upload)
    const concurrency = 30;
    let uploaded = 0;

    for (let i = 0; i < tiles.length; i += concurrency) {
      const batch = tiles.slice(i, i + concurrency);
      const urlBatch = urls.slice(i, i + concurrency);

      await Promise.all(
        batch.map((tile, idx) => {
          const tileInfo = urlBatch[idx];
          return fetch(tileInfo.url, {
            method: 'PUT',
            body: tile.blob,
            headers: { 'Content-Type': 'image/png' },
            signal: this.abortController!.signal,
          }).then(() => {
            uploaded++;
            onProgress?.({
              uploaded,
              total: tiles.length,
              percentage: (uploaded / tiles.length) * 100,
              currentTile: `${tile.z}/${tile.x}/${tile.y}`,
            });
          });
        })
      );
    }
  }

  // Check if tile exists
  async tileExists(z: number, x: number, y: number): Promise<boolean> {
    const { exists } = await fetch(`${WORKER_URL}/tile-exists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: this.courseId, z, x, y }),
    }).then(r => r.json());

    return exists;
  }

  // List all tiles for course
  async listTiles(prefix?: string): Promise<any[]> {
    const { tiles } = await fetch(`${WORKER_URL}/list-tiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: this.courseId, prefix }),
    }).then(r => r.json());

    return tiles;
  }

  // Get Mapbox tile URL
  getTileUrl(): string {
    return `${WORKER_URL}/tiles/${this.courseId}/{z}/{x}/{y}.png`;
  }

  // Abort upload
  abort() {
    this.abortController?.abort();
  }
}

// Helper: Extract tiles from ZIP file (optimized with Web Worker)
export async function extractTilesFromZip(
  zipFile: File
): Promise<TileWithBlob[]> {
  // Try Web Worker first (faster, non-blocking)
  if (typeof Worker !== 'undefined') {
    try {
      return await new Promise((resolve, reject) => {
        const worker = new Worker(
          new URL('../workers/zip-extractor.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        worker.onmessage = (e) => {
          if (e.data.error) {
            reject(new Error(e.data.error));
          } else {
            resolve(e.data.tiles);
          }
          worker.terminate();
        };
        
        worker.onerror = (err) => {
          reject(err);
          worker.terminate();
        };
        
        worker.postMessage({ zipFile });
      });
    } catch (err) {
      console.warn('Web Worker failed, falling back to main thread:', err);
    }
  }

  // Fallback: main thread extraction
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipFile);
  const tiles: TileWithBlob[] = [];

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

  return tiles;
}

// Helper: Extract tiles from directory structure (File API)
export async function extractTilesFromFiles(
  files: FileList
): Promise<TileWithBlob[]> {
  const tiles: TileWithBlob[] = [];

  for (const file of Array.from(files)) {
    // Match pattern in file path: z/x/y.png
    const match = file.webkitRelativePath.match(/(\d+)\/(\d+)\/(\d+)\.png$/);
    if (match) {
      const [, z, x, y] = match;
      tiles.push({
        z: parseInt(z),
        x: parseInt(x),
        y: parseInt(y),
        blob: file,
      });
    }
  }

  return tiles;
}

// Simplified API for direct use
export async function uploadTilesToR2(
  courseId: string,
  tiles: TileWithBlob[],
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const uploader = new TileUploader(courseId);
  await uploader.uploadTiles(tiles, onProgress);
  return uploader.getTileUrl();
}
