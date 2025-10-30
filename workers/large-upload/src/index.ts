interface Env {
  R2_BUCKET: R2Bucket;
  MAX_FILE_SIZE: string;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const startTime = Date.now();
    
    try {
      // Route: POST /initiate - Start multipart upload
      if (url.pathname === '/initiate' && request.method === 'POST') {
        const { key, contentType } = await request.json() as { key: string; contentType?: string };
        
        const multipart = await env.R2_BUCKET.createMultipartUpload(key, {
          httpMetadata: contentType ? { contentType } : undefined,
        });

        return json({ uploadId: multipart.uploadId, key }, CORS);
      }

      // Route: PUT /part - Upload a part
      if (url.pathname === '/part' && request.method === 'PUT') {
        const key = request.headers.get('X-Key');
        const uploadId = request.headers.get('X-Upload-Id');
        const partNumber = parseInt(request.headers.get('X-Part-Number') || '0');

        if (!key || !uploadId || !partNumber) {
          return json({ error: 'Missing headers' }, CORS, 400);
        }

        const multipart = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);
        const part = await multipart.uploadPart(partNumber, request.body!);

        return json({ etag: part.etag, partNumber }, CORS);
      }

      // Route: POST /complete - Complete multipart upload
      if (url.pathname === '/complete' && request.method === 'POST') {
        const { key, uploadId, parts } = await request.json() as {
          key: string;
          uploadId: string;
          parts: { partNumber: number; etag: string }[];
        };

        const multipart = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);
        await multipart.complete(parts);

        return json({ success: true, key }, CORS);
      }

      // Route: POST /abort - Abort multipart upload
      if (url.pathname === '/abort' && request.method === 'POST') {
        const { key, uploadId } = await request.json() as { key: string; uploadId: string };
        
        const multipart = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);
        await multipart.abort();

        return json({ success: true }, CORS);
      }

      // Route: POST /presigned - Generate presigned URL for direct upload
      if (url.pathname === '/presigned' && request.method === 'POST') {
        const { key, expiresIn = 3600 } = await request.json() as { key: string; expiresIn?: number };
        
        // For files < 100MB, use presigned URL
        const presignedUrl = await env.R2_BUCKET.createPresignedUrl(key, {
          expiresIn,
          method: 'PUT',
        });

        return json({ url: presignedUrl, key }, CORS);
      }

      // Route: GET /download/:key - Download file
      if (url.pathname.startsWith('/download/') && request.method === 'GET') {
        const key = url.pathname.slice(10);
        const object = await env.R2_BUCKET.get(key);

        if (!object) {
          return json({ error: 'File not found' }, CORS, 404);
        }

        return new Response(object.body, {
          headers: {
            ...CORS,
            'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Length': object.size.toString(),
            'ETag': object.etag,
          },
        });
      }

      // Route: DELETE /:key - Delete file
      if (request.method === 'DELETE') {
        const key = url.pathname.slice(1);
        await env.R2_BUCKET.delete(key);
        return json({ success: true }, CORS);
      }

      return json({ error: 'Not found' }, CORS, 404);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Worker error:', {
        error: (error as Error).message,
        path: url.pathname,
        method: request.method,
        duration,
      });
      return json({ error: (error as Error).message }, CORS, 500);
    }
  },
};

function json(data: any, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
