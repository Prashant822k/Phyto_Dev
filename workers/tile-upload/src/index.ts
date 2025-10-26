interface Env {
  TILES_BUCKET: R2Bucket;
  ALLOWED_ORIGINS: string;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Course-Id, X-Z, X-X, X-Y',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    try {
      // Generate upload URL for single tile (returns Worker endpoint)
      if (url.pathname === '/upload-url' && request.method === 'POST') {
        const { courseId, z, x, y } = await request.json() as {
          courseId: string;
          z: number;
          x: number;
          y: number;
        };

        const key = `${courseId}/tiles/${z}/${x}/${y}.png`;
        // Return Worker endpoint for direct upload
        const uploadUrl = `${url.origin}/direct-upload?key=${encodeURIComponent(key)}`;

        return Response.json({ url: uploadUrl, key }, { headers: CORS });
      }

      // Batch upload URLs for multiple tiles
      if (url.pathname === '/batch-upload-urls' && request.method === 'POST') {
        const { courseId, tiles } = await request.json() as {
          courseId: string;
          tiles: Array<{ z: number; x: number; y: number }>;
        };

        const urls = tiles.map(({ z, x, y }) => {
          const key = `${courseId}/tiles/${z}/${x}/${y}.png`;
          // Return Worker endpoint for direct upload
          const uploadUrl = `${url.origin}/direct-upload?key=${encodeURIComponent(key)}`;
          return { z, x, y, url: uploadUrl, key };
        });

        return Response.json({ urls }, { headers: CORS });
      }

      // Direct upload endpoint via query param
      if (url.pathname === '/direct-upload' && request.method === 'PUT') {
        const key = url.searchParams.get('key');
        
        if (!key) {
          return Response.json({ error: 'Missing key parameter' }, { status: 400, headers: CORS });
        }

        await env.TILES_BUCKET.put(key, request.body, {
          httpMetadata: { contentType: 'image/png' },
        });

        return Response.json({ success: true, key }, { headers: CORS });
      }

      // Direct upload endpoint (alternative with headers)
      if (url.pathname === '/upload-tile' && request.method === 'PUT') {
        const courseId = request.headers.get('X-Course-Id');
        const z = request.headers.get('X-Z');
        const x = request.headers.get('X-X');
        const y = request.headers.get('X-Y');

        if (!courseId || !z || !x || !y) {
          return Response.json({ error: 'Missing headers' }, { status: 400, headers: CORS });
        }

        const key = `${courseId}/tiles/${z}/${x}/${y}.png`;
        await env.TILES_BUCKET.put(key, request.body, {
          httpMetadata: { contentType: 'image/png' },
        });

        return Response.json({ success: true, key }, { headers: CORS });
      }

      // Serve tile (public access)
      if (url.pathname.match(/^\/tiles\/[\w-]+\/\d+\/\d+\/\d+\.png$/)) {
        const key = url.pathname.replace('/tiles/', '');
        const object = await env.TILES_BUCKET.get(key);

        if (!object) {
          return new Response('Tile not found', { status: 404, headers: CORS });
        }

        return new Response(object.body, {
          headers: {
            ...CORS,
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'ETag': object.etag,
          },
        });
      }

      // Check if tile exists
      if (url.pathname === '/tile-exists' && request.method === 'POST') {
        const { courseId, z, x, y } = await request.json() as {
          courseId: string;
          z: number;
          x: number;
          y: number;
        };

        const key = `${courseId}/tiles/${z}/${x}/${y}.png`;
        const object = await env.TILES_BUCKET.head(key);

        return Response.json({ exists: !!object, key }, { headers: CORS });
      }

      // List tiles for a course
      if (url.pathname === '/list-tiles' && request.method === 'POST') {
        const { courseId, prefix } = await request.json() as {
          courseId: string;
          prefix?: string;
        };

        const listPrefix = prefix ? `${courseId}/${prefix}` : courseId;
        const listed = await env.TILES_BUCKET.list({ prefix: listPrefix, limit: 1000 });

        const tiles = listed.objects.map(obj => {
          const match = obj.key.match(/^([\w-]+)\/(\d+)\/(\d+)\/(\d+)\.png$/);
          if (match) {
            return {
              courseId: match[1],
              z: parseInt(match[2]),
              x: parseInt(match[3]),
              y: parseInt(match[4]),
              size: obj.size,
              uploaded: obj.uploaded,
            };
          }
          return null;
        }).filter(Boolean);

        return Response.json({ tiles, truncated: listed.truncated }, { headers: CORS });
      }

      // Delete tile
      if (url.pathname === '/delete-tile' && request.method === 'DELETE') {
        const { courseId, z, x, y } = await request.json() as {
          courseId: string;
          z: number;
          x: number;
          y: number;
        };

        const key = `${courseId}/tiles/${z}/${x}/${y}.png`;
        await env.TILES_BUCKET.delete(key);

        return Response.json({ success: true, key }, { headers: CORS });
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: CORS });
    } catch (error) {
      console.error('Worker error:', error);
      return Response.json(
        { error: (error as Error).message },
        { status: 500, headers: CORS }
      );
    }
  },
};
