// Streaming upload: extract and upload tiles simultaneously
const WORKER_URL = import.meta.env.VITE_TILE_WORKER_URL;

export async function streamingUploadFromZip(
  courseId: string,
  zipFile: File,
  onProgress?: (uploaded: number, total: number) => void
): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipFile);
  
  // Get all tile paths first
  const tilePaths = Object.keys(zip.files).filter(path => 
    path.match(/(?:tiles\/)?(\d+)\/(\d+)\/(\d+)\.png$/) && !zip.files[path].dir
  );
  
  const total = tilePaths.length;
  let uploaded = 0;
  const concurrency = 30;

  // Process in batches
  for (let i = 0; i < tilePaths.length; i += concurrency) {
    const batch = tilePaths.slice(i, i + concurrency);
    
    // Extract and upload in parallel
    await Promise.all(
      batch.map(async (path) => {
        const match = path.match(/(?:tiles\/)?(\d+)\/(\d+)\/(\d+)\.png$/);
        if (!match) return;
        
        const [, z, x, y] = match;
        const file = zip.files[path];
        
        // Get presigned URL
        const { url } = await fetch(`${WORKER_URL}/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, z: parseInt(z), x: parseInt(x), y: parseInt(y) }),
        }).then(r => r.json());
        
        // Extract blob and upload immediately
        const blob = await file.async('blob');
        await fetch(url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/png' },
        });
        
        uploaded++;
        onProgress?.(uploaded, total);
      })
    );
  }
}
