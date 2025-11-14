// Frontend upload client for Cloudflare Workers + R2

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://phyto-large-upload.YOUR_SUBDOMAIN.workers.dev';
const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
}

export class R2Uploader {
  private abortController: AbortController | null = null;

  async uploadLargeFile(
    file: File,
    key: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    this.abortController = new AbortController();

    // Small files: use presigned URL
    if (file.size < CHUNK_SIZE) {
      return this.uploadSmallFile(file, key, onProgress);
    }

    // Large files: multipart upload
    return this.uploadMultipart(file, key, onProgress);
  }

  private async uploadSmallFile(
    file: File,
    key: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const { url } = await fetch(`${WORKER_URL}/presigned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
      signal: this.abortController!.signal,
    }).then(r => r.json());

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: (e.loaded / e.total) * 100,
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(key);
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);

      this.abortController!.signal.addEventListener('abort', () => xhr.abort());
    });
  }

  private async uploadMultipart(
    file: File,
    key: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const startTime = Date.now();
    let uploadedBytes = 0;

    // 1. Initiate multipart upload
    const { uploadId } = await fetch(`${WORKER_URL}/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, contentType: file.type }),
      signal: this.abortController!.signal,
    }).then(r => r.json());

    const parts: { partNumber: number; etag: string }[] = [];
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);

    try {
      // 2. Upload parts in parallel (max 3 concurrent)
      const uploadPart = async (partNumber: number, start: number, end: number) => {
        const chunk = file.slice(start, end);

        const { etag } = await fetch(`${WORKER_URL}/part`, {
          method: 'PUT',
          body: chunk,
          headers: {
            'X-Upload-Id': uploadId,
            'X-Part-Number': partNumber.toString(),
            'X-Key': key,
          },
          signal: this.abortController!.signal,
        }).then(r => r.json());

        uploadedBytes += chunk.size;

        if (onProgress) {
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = uploadedBytes / elapsed;
          onProgress({
            loaded: uploadedBytes,
            total: file.size,
            percentage: (uploadedBytes / file.size) * 100,
            speed,
          });
        }

        return { partNumber, etag };
      };

      // Upload parts with concurrency limit
      const concurrency = 3;
      for (let i = 0; i < totalParts; i += concurrency) {
        const batch = [];
        for (let j = 0; j < concurrency && i + j < totalParts; j++) {
          const partNumber = i + j + 1;
          const start = (i + j) * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          batch.push(uploadPart(partNumber, start, end));
        }
        const batchResults = await Promise.all(batch);
        parts.push(...batchResults);
      }

      // 3. Complete multipart upload
      await fetch(`${WORKER_URL}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, uploadId, parts }),
        signal: this.abortController!.signal,
      });

      return key;
    } catch (error) {
      // Abort on error
      await fetch(`${WORKER_URL}/abort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, uploadId }),
      }).catch(() => {});
      
      throw error;
    }
  }

  abort() {
    this.abortController?.abort();
  }
}

// Simplified API for direct use
export async function uploadToR2(
  file: File,
  key: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const uploader = new R2Uploader();
  return uploader.uploadLargeFile(file, key, onProgress);
}
