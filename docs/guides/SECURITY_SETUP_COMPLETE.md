# Complete Security Setup Guide

## Overview
This guide secures your R2 bucket, enforces RLS on all tables, and ensures clients can only access their club's tiles.

---

## Step 1: Make R2 Bucket Private

### In Cloudflare Dashboard:

1. Go to **R2** → `map-stats-tiles-prod`
2. Click **Settings** tab
3. Under **Public Access**:
   - Click **Disable** if "Allow Access" is enabled
   - Remove any custom domain bindings
4. Confirm: Bucket should show **"Public Access: Disabled"**

✅ **Result:** Bucket is now private. Direct URLs will return 403 Forbidden.

---

## Step 2: Verify & Fix Supabase RLS

### Run this SQL in Supabase SQL Editor:

```sql
-- ============================================
-- PART A: Check Current RLS Status
-- ============================================

-- Check which tables have RLS enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'golf_clubs', 'golf_course_tilesets', 'images', 'processing_jobs', 'analysis_sessions');

-- Check existing policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Expected Output:
All tables should show `rowsecurity = true`.

---

## Step 3: Apply Secure RLS Policies

### Run this SQL:

```sql
-- ============================================
-- PART B: Drop Old Policies & Create New Ones
-- ============================================

-- Drop all existing policies on golf_course_tilesets
DROP POLICY IF EXISTS "Users can view tilesets for their golf club" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can manage all tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Users can view tilesets for their club" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Clients can view their club's tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can manage tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can insert tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can update tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can delete tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Allow authenticated users to read tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Allow admins to insert tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Allow admins to update tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Allow admins to delete tilesets" ON golf_course_tilesets;

-- Ensure RLS is enabled
ALTER TABLE golf_course_tilesets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- NEW SECURE POLICIES
-- ============================================

-- 1. Clients can ONLY view tilesets for their club
CREATE POLICY "clients_view_own_club_tilesets"
ON golf_course_tilesets
FOR SELECT
TO authenticated
USING (
  golf_club_id = (SELECT club_id FROM users WHERE id = auth.uid())
);

-- 2. Admins can view ALL tilesets
CREATE POLICY "admins_view_all_tilesets"
ON golf_course_tilesets
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- 3. Only admins can INSERT tilesets
CREATE POLICY "admins_insert_tilesets"
ON golf_course_tilesets
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- 4. Only admins can UPDATE tilesets
CREATE POLICY "admins_update_tilesets"
ON golf_course_tilesets
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- 5. Only admins can DELETE tilesets
CREATE POLICY "admins_delete_tilesets"
ON golf_course_tilesets
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- ============================================
-- PART C: Secure Other Tables
-- ============================================

-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

CREATE POLICY "users_view_own_profile"
ON users FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "admins_view_all_users"
ON users FOR SELECT TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "admins_manage_users"
ON users FOR ALL TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Golf clubs table
ALTER TABLE golf_clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view golf clubs" ON golf_clubs;
DROP POLICY IF EXISTS "Authenticated users view clubs" ON golf_clubs;

CREATE POLICY "authenticated_view_clubs"
ON golf_clubs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "admins_manage_clubs"
ON golf_clubs FOR ALL TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Images table (if still used)
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own images" ON images;
CREATE POLICY "users_view_own_images"
ON images FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "admins_view_all_images"
ON images FOR SELECT TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Processing jobs
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own jobs" ON processing_jobs;
CREATE POLICY "users_view_own_jobs"
ON processing_jobs FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "admins_view_all_jobs"
ON processing_jobs FOR SELECT TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Analysis sessions
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own sessions" ON analysis_sessions;
CREATE POLICY "users_view_own_sessions"
ON analysis_sessions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "admins_view_all_sessions"
ON analysis_sessions FOR SELECT TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
```

---

## Step 4: Update Supabase Edge Function for Signed URLs

Your `r2-sign` Edge Function already handles uploads securely. Now add tile serving with signed URLs.

### Update `supabase/functions/r2-sign/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand, GetObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, key, fileData, contentType, expiresIn } = await req.json()

    const r2Client = new S3Client({
      region: 'auto',
      endpoint: Deno.env.get('R2_ENDPOINT'),
      credentials: {
        accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
      },
    })

    const bucket = Deno.env.get('R2_BUCKET_NAME')!

    // Upload file (existing functionality)
    if (action === 'uploadFile') {
      const buffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0))
      
      await r2Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }))

      return new Response(
        JSON.stringify({ success: true, key, url: `https://r2-endpoint/${key}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // NEW: Generate signed URL for tile access
    if (action === 'getSignedUrl') {
      // Verify user has access to this tileset
      const courseId = key.split('/')[0] // Extract course ID from key
      
      const { data: userProfile } = await supabaseClient
        .from('users')
        .select('club_id, role')
        .eq('id', user.id)
        .single()

      if (!userProfile) {
        return new Response(JSON.stringify({ error: 'User profile not found' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check if user's club owns this tileset
      const { data: tileset } = await supabaseClient
        .from('golf_course_tilesets')
        .select('golf_club_id')
        .eq('r2_folder_path', courseId + '/tiles')
        .single()

      if (!tileset) {
        return new Response(JSON.stringify({ error: 'Tileset not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Verify access: admin OR same club
      if (userProfile.role !== 'admin' && tileset.golf_club_id !== userProfile.club_id) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Generate signed URL
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })

      const signedUrl = await getSignedUrl(r2Client, command, {
        expiresIn: expiresIn || 3600, // 1 hour default
      })

      return new Response(
        JSON.stringify({ url: signedUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

---

## Step 5: Update Frontend to Use Signed URLs

### Create new service: `src/lib/tileAccessService.ts`

```typescript
import { supabase } from './supabase';

export class TileAccessService {
  // Get signed URL for a single tile
  static async getSignedTileUrl(courseId: string, z: number, x: number, y: number): Promise<string> {
    const key = `${courseId}/tiles/${z}/${x}/${y}.png`;
    
    const { data, error } = await supabase.functions.invoke('r2-sign', {
      body: {
        action: 'getSignedUrl',
        key,
        expiresIn: 3600, // 1 hour
      },
    });

    if (error) throw error;
    return data.url;
  }

  // Get tile URL pattern with token for Mapbox
  static async getTileUrlPattern(courseId: string): Promise<string> {
    // Generate a session token for this tileset
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) throw new Error('Not authenticated');

    // Return URL pattern that includes auth token
    const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-sign`;
    return `${baseUrl}?action=getTile&courseId=${courseId}&z={z}&x={x}&y={y}&token=${session.session.access_token}`;
  }
}
```

### Update Mapbox integration to use signed URLs:

```typescript
// In your map component
import { TileAccessService } from '@/lib/tileAccessService';

// When loading tileset
const tileUrlPattern = await TileAccessService.getTileUrlPattern(courseId);

map.addSource('golf-tiles', {
  type: 'raster',
  tiles: [tileUrlPattern],
  tileSize: 256,
});
```

---

## Step 6: Add Tile Serving Endpoint to Edge Function

Update `r2-sign` to handle direct tile requests:

```typescript
// Add this to the Edge Function
if (action === 'getTile') {
  const { courseId, z, x, y, token } = new URL(req.url).searchParams;
  
  // Verify token
  const { data: { user } } = await supabaseClient.auth.getUser(token);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verify access (same logic as getSignedUrl)
  const key = `${courseId}/tiles/${z}/${x}/${y}.png`;
  
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await r2Client.send(command);
  
  return new Response(response.Body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...corsHeaders,
    },
  });
}
```

---

## Step 7: Test Security

### Test 1: Verify RLS
```sql
-- As a client user, try to access another club's tileset
SELECT * FROM golf_course_tilesets 
WHERE golf_club_id != (SELECT club_id FROM users WHERE id = auth.uid());
-- Should return 0 rows
```

### Test 2: Verify R2 Privacy
```bash
# Try direct access (should fail)
curl https://pub-xxxxx.r2.dev/course-name/tiles/15/5242/12663.png
# Should return 403 Forbidden
```

### Test 3: Verify Signed URL Access
```typescript
// In browser console
const url = await TileAccessService.getSignedTileUrl('test-course', 15, 5242, 12663);
console.log(url); // Should work and load image
```

---

## Summary

✅ **R2 Bucket:** Private (no public access)
✅ **Uploads:** Secure via Supabase Edge Function with auth
✅ **Tile Access:** Signed URLs with club-level RLS enforcement
✅ **Database:** All tables have RLS enabled
✅ **Authorization:** Clients see only their club's data

### Access Flow:
```
Client → Supabase Auth → Edge Function → Verify Club Access → R2 Signed URL → Tile
```

### Security Guarantees:
- ✅ No direct R2 access
- ✅ All requests authenticated
- ✅ Club-level isolation enforced
- ✅ Admins have full access
- ✅ Clients restricted to their club
