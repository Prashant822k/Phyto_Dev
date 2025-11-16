import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Action = 'getPutUrl' | 'getGetUrl' | 'deleteObject' | 'listObjects' | 'uploadFile' | 'getSignedTileUrl' | 'getTile' | 'getBatchPutUrls';

interface SignedUrlRequest {
  action: Action;
  key?: string;
  contentType?: string;
  expiresInSeconds?: number;
  prefix?: string;
  fileData?: string; // base64 encoded
  // For batch tile uploads
  tiles?: Array<{ z: number; x: number; y: number }>;
  courseId?: string;
  flightDate?: string; // YYYY-MM-DD
  flightTime?: string; // HH:MM
}

// --- AWS4 / Crypto helpers ---

async function hmacSha256Binary(key: Uint8Array, data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Create a new ArrayBuffer to avoid SharedArrayBuffer issues
  const keyBuffer = new ArrayBuffer(key.length);
  new Uint8Array(keyBuffer).set(key);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  return new Uint8Array(signature);
}


async function sha256Hex(data: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secretKey: string, date: string, region: string, service: string) {
  const kDate = await hmacSha256Binary(new TextEncoder().encode(`AWS4${secretKey}`), date);
  const kRegion = await hmacSha256Binary(kDate, region);
  const kService = await hmacSha256Binary(kRegion, service);
  return await hmacSha256Binary(kService, 'aws4_request');
}

async function createAWS4Url(
  method: string,
  bucket: string,
  accountId: string,
  key: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  expiresIn: number,
  payload: string
) {
  const endpoint = `https://${bucket}.${accountId}.r2.cloudflarestorage.com`;
  const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const date = timestamp.substr(0, 8);

  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${date}/${region}/s3/aws4_request`,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host'
  };

  const headers: Record<string, string> = { host: `${bucket}.${accountId}.r2.cloudflarestorage.com` };
  const canonicalQuery = Object.keys(queryParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const canonicalRequest = [
    method,
    `/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
    canonicalQuery,
    Object.keys(headers).sort().map(k => `${k.toLowerCase()}:${headers[k]}`).join('\n') + '\n',
    Object.keys(headers).sort().map(k => k.toLowerCase()).join(';'),
    // For presigned S3/R2 URLs, use the literal 'UNSIGNED-PAYLOAD' when requested.
    // Otherwise, hash the actual payload (empty string for GET/DELETE).
    payload === 'UNSIGNED-PAYLOAD' ? 'UNSIGNED-PAYLOAD' : await sha256Hex(payload || '')
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    `${date}/${region}/s3/aws4_request`,
    await sha256Hex(canonicalRequest)
  ].join('\n');

  const signatureKey = await getSigningKey(secretAccessKey, date, region, 's3');
  const signature = Array.from(await hmacSha256Binary(signatureKey, stringToSign)).map(b => b.toString(16).padStart(2, '0')).join('');

  const qs = Object.entries(queryParams).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return `${endpoint}/${encodeURIComponent(key).replace(/%2F/g, '/')}?${qs}&X-Amz-Signature=${signature}`;
}

// --- Serve function ---
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return new Response(JSON.stringify({ error: 'Missing Authorization' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });

    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });

    const { data: me, error: meErr } = await supabase.from('users').select('id, role, club_id').eq('id', user.id).single();
    if (meErr || !me) return new Response(JSON.stringify({ error: 'User not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });

    const body: SignedUrlRequest = await req.json();
    const expiresIn = Math.min(Math.max(body.expiresInSeconds ?? 900, 60), 3600);

    const accountId = Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID')!;
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')!;
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!;
    const bucket = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')!;
    const region = 'auto';

    // --- Helper to enforce admin role ---
    const requireAdmin = () => { if (me.role !== 'admin') throw new Error('Forbidden'); };

    switch(body.action) {
      case 'getPutUrl':
      case 'getGetUrl': {
        if (body.action === 'getPutUrl') requireAdmin();
        if (!body.key) return new Response(JSON.stringify({ error: 'Missing key' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        
        // Admin can access any path, clients can only access their club's path
        if (me.role !== 'admin' && me.club_id) {
          // Check if it's a tile path (golf-course-name/tiles/z/x/y.png)
          if (body.key.includes('/tiles/')) {
            // Extract course name from key (e.g., "golf-course-name" from "golf-course-name/tiles/15/5242/12663.png")
            const courseName = body.key.split('/tiles/')[0];
            
            // Verify this course belongs to user's club
            // r2_folder_path is stored as "golf-course-name/tiles"
            const { data: tileset, error: tilesetErr } = await supabase
              .from('golf_course_tilesets')
              .select('golf_club_id, r2_folder_path')
              .eq('r2_folder_path', `${courseName}/tiles`)
              .single();
            
            console.log('Tileset lookup:', { courseName, tileset, tilesetErr, userClubId: me.club_id });
            
            if (tilesetErr || !tileset || tileset.golf_club_id !== me.club_id) {
              return new Response(JSON.stringify({ 
                error: 'Forbidden - Course not in your club',
                debug: { courseName, found: !!tileset, userClubId: me.club_id, tilesetClubId: tileset?.golf_club_id }
              }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
            }
          } else {
            // For non-tile paths, check multiple valid path patterns
            const basePrefix = `club/${me.club_id}/`;
            const userPrefix = `user/${me.id}/`;
            
            // Check if path starts with valid club prefix or user prefix
            if (!body.key.startsWith(basePrefix) && !body.key.startsWith(userPrefix)) {
              // Path doesn't use club or user prefix, check other patterns
              const segments = body.key.split('/');
              const firstSegment = segments[0];
              
              // Check if first segment is the user's ID (UUID format paths)
              if (firstSegment === me.id) {
                // User can access their own files
                console.log('Access granted: user owns this file');
              } else if (segments.length >= 2) {
                // Try to find if it's a golf course image
                const potentialCourseName = firstSegment;
                
                // Check if there's a tileset with this course name belonging to user's club
                const { data: tileset } = await supabase
                  .from('golf_course_tilesets')
                  .select('golf_club_id')
                  .eq('r2_folder_path', `${potentialCourseName}/tiles`)
                  .single();
                
                // If tileset found and belongs to user's club, grant access
                if (tileset && tileset.golf_club_id === me.club_id) {
                  console.log('Access granted: golf course belongs to user club');
                } else {
                  // Check if this file belongs to the user by looking up in images table
                  const { data: imageRecord } = await supabase
                    .from('images')
                    .select('user_id, id')
                    .eq('path', body.key)
                    .single();
                  
                  if (imageRecord && imageRecord.user_id === me.id) {
                    // User owns this image
                    console.log('Access granted: user owns this image via images table');
                  } else {
                    return new Response(JSON.stringify({ 
                      error: 'Forbidden - Invalid path',
                      debug: { key: body.key, userClubId: me.club_id }
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
                  }
                }
              } else {
                // Invalid path structure
                return new Response(JSON.stringify({ error: 'Forbidden - Invalid path' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
              }
            }
          }
        }
        const url = await createAWS4Url(body.action === 'getPutUrl' ? 'PUT' : 'GET', bucket, accountId, body.key, accessKeyId, secretAccessKey, region, expiresIn, body.action === 'getPutUrl' ? 'UNSIGNED-PAYLOAD' : '');
        return new Response(JSON.stringify({ url, key: body.key, method: body.action === 'getPutUrl' ? 'PUT' : 'GET' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'uploadFile': {
        requireAdmin();
        if (!body.key || !body.fileData || !body.contentType) return new Response(JSON.stringify({ error: 'Missing key, fileData, or contentType' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        const fileBuffer = Uint8Array.from(atob(body.fileData), c => c.charCodeAt(0));
        const uploadUrl = await createAWS4Url('PUT', bucket, accountId, body.key, accessKeyId, secretAccessKey, region, 900, 'UNSIGNED-PAYLOAD');
        const resp = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': body.contentType, 'Content-Length': fileBuffer.length.toString() }, body: fileBuffer });
        if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
        return new Response(JSON.stringify({ success: true, key: body.key, url: uploadUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'deleteObject': {
        requireAdmin();
        if (!body.key) return new Response(JSON.stringify({ error: 'Missing key' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        const url = await createAWS4Url('DELETE', bucket, accountId, body.key, accessKeyId, secretAccessKey, region, 60, '');
        const resp = await fetch(url, { method: 'DELETE' });
        if (!resp.ok) throw new Error(`Delete failed: ${resp.status}`);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'listObjects': {
        const prefix = body.prefix || '';
        let allowedPrefix = prefix;
        
        // If not admin, validate the requested prefix
        if (me.role !== 'admin') {
          // Check if requesting a golf course tile path
          if (prefix.includes('/tiles/') || prefix.endsWith('/tiles')) {
            const courseName = prefix.split('/tiles')[0];
            
            // Verify this course belongs to user's club
            const { data: tileset } = await supabase
              .from('golf_course_tilesets')
              .select('golf_club_id')
              .eq('r2_folder_path', `${courseName}/tiles`)
              .single();
            
            if (!tileset || tileset.golf_club_id !== me.club_id) {
              // User doesn't have access to this course, return empty list
              return new Response(JSON.stringify({ items: [], prefix: '' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            // Access granted - use the requested prefix
          } else if (!prefix.startsWith(`club/${me.club_id}/`) && !prefix.startsWith(`user/${me.id}/`) && prefix !== '') {
            // Invalid prefix, restrict to user's club
            allowedPrefix = me.club_id ? `club/${me.club_id}/` : `user/${me.id}/`;
          }
        }
        
        const url = await createAWS4Url('GET', bucket, accountId, '', accessKeyId, secretAccessKey, region, 60, '');
        const resp = await fetch(url);
        const xmlText = await resp.text();
        // Simple parse: list <Key> elements (R2 returns XML)
        const items = [...xmlText.matchAll(/<Key>(.*?)<\/Key>/g)].map(m => m[1]).filter(k => k.startsWith(allowedPrefix));
        return new Response(JSON.stringify({ items, prefix: allowedPrefix }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'getSignedTileUrl': {
        // Get signed URL for a specific tile with club-level access control
        if (!body.key) return new Response(JSON.stringify({ error: 'Missing key' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        
        // Extract course ID from key (format: courseId/tiles/z/x/y.png)
        const courseId = body.key.split('/')[0];
        
        // Verify user has access to this tileset
        const { data: tileset, error: tilesetErr } = await supabase
          .from('golf_course_tilesets')
          .select('golf_club_id')
          .eq('r2_folder_path', `${courseId}/tiles`)
          .single();
        
        if (tilesetErr || !tileset) {
          return new Response(JSON.stringify({ error: 'Tileset not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
        }
        
        // Check access: admin OR same club
        if (me.role !== 'admin' && tileset.golf_club_id !== me.club_id) {
          return new Response(JSON.stringify({ error: 'Access denied to this tileset' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
        }
        
        // Generate signed URL
        const signedUrl = await createAWS4Url('GET', bucket, accountId, body.key, accessKeyId, secretAccessKey, region, expiresIn, '');
        return new Response(JSON.stringify({ url: signedUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'getTile': {
        // Direct tile serving with authentication (for Mapbox tile URLs)
        if (!body.key) return new Response(JSON.stringify({ error: 'Missing key' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        
        // Extract r2_folder_path from key
        // Key format: "course/2024-11-05/14-30/tiles/15/5242/12663.png" or "course/tiles/15/5242/12663.png"
        // We need to extract everything before the z/x/y.png part
        const keyParts = body.key.split('/');
        let r2FolderPath = '';
        
        // Find the "tiles" folder and extract path up to and including it
        const tilesIndex = keyParts.indexOf('tiles');
        if (tilesIndex !== -1) {
          r2FolderPath = keyParts.slice(0, tilesIndex + 1).join('/');
        } else {
          // Fallback: assume last 3 parts are z/x/y.png
          r2FolderPath = keyParts.slice(0, -3).join('/');
        }
        
        console.log('getTile - key:', body.key, 'r2FolderPath:', r2FolderPath);
        
        // Verify access - find tileset by r2_folder_path
        const { data: tileset, error: tilesetErr } = await supabase
          .from('golf_course_tilesets')
          .select('golf_club_id')
          .eq('r2_folder_path', r2FolderPath)
          .single();
        
        console.log('getTile - tileset:', tileset, 'error:', tilesetErr, 'userClubId:', me.club_id);
        
        if (tilesetErr || !tileset) {
          console.error('getTile - Tileset not found for r2_folder_path:', r2FolderPath);
          console.error('getTile - Error details:', JSON.stringify(tilesetErr));
          return new Response(JSON.stringify({ 
            error: 'Tileset not found', 
            r2_folder_path: r2FolderPath,
            key: body.key 
          }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        if (me.role !== 'admin' && tileset.golf_club_id !== me.club_id) {
          console.error('getTile - Access denied. User club:', me.club_id, 'Tileset club:', tileset.golf_club_id);
          return new Response(JSON.stringify({ error: 'Access denied' }), { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Fetch tile from R2 using public R2.dev URL
        // The authentication happens at the edge function level, not via AWS4 signatures
        const r2PublicDomain = Deno.env.get('CLOUDFLARE_R2_PUBLIC_DOMAIN') || 'pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev';
        const tileUrl = `https://${r2PublicDomain}/${body.key}`;
        
        console.log('getTile - Fetching from R2, key:', body.key);
        console.log('getTile - Using public R2 URL:', tileUrl);
        
        const tileResp = await fetch(tileUrl);
        
        console.log('getTile - R2 response status:', tileResp.status, 'ok:', tileResp.ok);
        
        if (!tileResp.ok) {
          const errorText = await tileResp.text();
          console.error('getTile - R2 error response:', errorText);
          console.error('getTile - Tile not found in R2:', body.key, 'status:', tileResp.status);
          return new Response(JSON.stringify({ 
            error: 'Tile not found in R2', 
            status: tileResp.status,
            key: body.key,
            url: tileUrl
          }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const tileData = await tileResp.arrayBuffer();
        console.log('getTile - Successfully fetched tile, size:', tileData.byteLength, 'bytes');
        
        return new Response(tileData, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }

      case 'getBatchPutUrls': {
        // Generate presigned PUT URLs for batch tile uploads
        requireAdmin();
        
        if (!body.tiles || !body.courseId) {
          return new Response(JSON.stringify({ error: 'Missing tiles or courseId' }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          });
        }

        // Construct R2 path based on whether date/time is provided
        let basePath: string;
        if (body.flightDate && body.flightTime) {
          // New format: courseId/YYYY-MM-DD/HH-MM/tiles/z/x/y.png
          const formattedTime = body.flightTime.replace(':', '-');
          basePath = `${body.courseId}/${body.flightDate}/${formattedTime}/tiles`;
        } else {
          // Legacy format: courseId/tiles/z/x/y.png
          basePath = `${body.courseId}/tiles`;
        }

        // Generate presigned URLs for each tile
        const urls = await Promise.all(
          body.tiles.map(async (tile) => {
            const key = `${basePath}/${tile.z}/${tile.x}/${tile.y}.png`;
            const url = await createAWS4Url(
              'PUT',
              bucket,
              accountId,
              key,
              accessKeyId,
              secretAccessKey,
              region,
              expiresIn,
              'UNSIGNED-PAYLOAD'
            );
            return { z: tile.z, x: tile.x, y: tile.y, url, key };
          })
        );

        return new Response(JSON.stringify({ urls, basePath }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

  } catch (err) {
    const error = err as Error;
    const status = error.message === 'Forbidden' ? 403 : 500;
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status });
  }
});
