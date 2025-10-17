import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Action = 'getPutUrl' | 'getGetUrl' | 'deleteObject' | 'listObjects' | 'uploadFile';

interface SignedUrlRequest {
  action: Action;
  key?: string;
  contentType?: string;
  expiresInSeconds?: number;
  prefix?: string;
  fileData?: string; // base64 encoded
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
          const basePrefix = `club/${me.club_id}/`;
          if (!body.key.startsWith(basePrefix)) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
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
        // If not admin and has club_id, restrict to club's path
        const allowedPrefix = me.role === 'admin' ? prefix : (me.club_id ? `club/${me.club_id}/` : `user/${me.id}/`);
        
        const url = await createAWS4Url('GET', bucket, accountId, '', accessKeyId, secretAccessKey, region, 60, '');
        const resp = await fetch(url);
        const xmlText = await resp.text();
        // Simple parse: list <Key> elements (R2 returns XML)
        const items = [...xmlText.matchAll(/<Key>(.*?)<\/Key>/g)].map(m => m[1]).filter(k => k.startsWith(allowedPrefix));
        return new Response(JSON.stringify({ items, prefix: allowedPrefix }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
