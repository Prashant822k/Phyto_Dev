# 🔍 Debug Tile Display - Step by Step

## Issue

- Tiles uploaded correctly to R2 ✓
- No console errors ✓
- But tiles not displaying ✗
- r2-sign logs from 10 minutes ago (edge function not being called) ✗

---

## Root Cause Analysis

If the edge function isn't being called, the issue is in the **frontend** tile URL construction or Mapbox configuration.

---

## Step 1: Check Browser Network Tab

### **Open Browser DevTools:**
```
Press F12 → Network Tab → Filter: tile-proxy
```

### **Reload Map Page**

### **Look for tile-proxy requests:**

#### **Scenario A: NO tile-proxy requests**
```
Problem: Mapbox isn't requesting tiles at all
Possible causes:
- Map not initialized
- No layers added
- Tileset data not loaded
```

#### **Scenario B: tile-proxy requests with errors**
```
Problem: Requests failing
Check:
- Status code (401, 403, 404, 500?)
- Response body
- Request URL format
```

#### **Scenario C: tile-proxy requests return 200 but small size**
```
Problem: Returning transparent 1x1 PNG
Means: Edge function is called but returns fallback
```

---

## Step 2: Check Browser Console Logs

### **Open Console Tab (F12)**

### **Look for these logs:**

#### **From MapboxGolfCourseMap:**
```javascript
// Should see:
"Adding layer: test20 - Nov 5 (2024-11-05)"
"Tile URL: https://...supabase.co/functions/v1/tile-proxy?tilesetId=...&z={z}&x={x}&y={y}&token=..."
```

#### **If you DON'T see these:**
```
Problem: Layers not being added to map
Check: selectedLayers state, tilesets array
```

---

## Step 3: Manual Test - Check Tile URL

### **Get a Tile URL from Network Tab:**

Example:
```
https://your-project.supabase.co/functions/v1/tile-proxy?tilesetId=abc-123&z=15&x=5242&y=12663&token=eyJ...
```

### **Copy and paste in new browser tab**

#### **Expected: PNG image displays**
#### **If 404/403/500: Edge function issue**
#### **If transparent 1x1: Authentication or path issue**

---

## Step 4: Check Database

### **Open Supabase Dashboard → SQL Editor**

### **Run this query:**

```sql
SELECT 
  id,
  name,
  golf_club_id,
  r2_folder_path,
  flight_date,
  flight_time,
  is_active
FROM golf_course_tilesets
WHERE name LIKE '%test20%'
ORDER BY created_at DESC;
```

### **Verify:**
```
✓ r2_folder_path = "test20/2024-11-05/14-30/tiles"
✓ is_active = true
✓ golf_club_id matches your user's club
```

---

## Step 5: Check R2 Bucket

### **Go to Cloudflare Dashboard → R2**

### **Navigate to your bucket**

### **Check path exists:**
```
test20/
  2024-11-05/
    14-30/
      tiles/
        15/
          5242/
            12663.png  ← Files should be here
```

### **Click on a PNG file**

### **Get public URL and test:**
```
https://pub-xxxxx.r2.dev/test20/2024-11-05/14-30/tiles/15/5242/12663.png
```

#### **If this works:** R2 is fine, issue is in edge function
#### **If this fails:** Files not uploaded correctly

---

## Step 6: Add Debug Logging

### **Update MapboxGolfCourseMap.tsx:**

Add this after line 164:

```typescript
const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy?tilesetId=${tileset.id}&z={z}&x={x}&y={y}&token=${session.access_token}`;

// ADD THESE DEBUG LOGS:
console.log('=== TILE DEBUG ===');
console.log('Tileset ID:', tileset.id);
console.log('Tileset name:', tileset.name);
console.log('R2 folder path:', tileset.r2_folder_path);
console.log('Flight date:', tileset.flight_date);
console.log('Supabase URL:', supabaseUrl);
console.log('Tile URL template:', tileUrlTemplate);
console.log('Sample tile URL:', tileUrlTemplate.replace('{z}', '15').replace('{x}', '5242').replace('{y}', '12663'));
console.log('==================');
```

### **Reload page and check console**

---

## Step 7: Test Edge Function Directly

### **Open terminal and run:**

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/tile-proxy?tilesetId=YOUR_TILESET_ID&z=15&x=5242&y=12663&token=YOUR_TOKEN" -v
```

Replace:
- `your-project` with your Supabase project ref
- `YOUR_TILESET_ID` with actual tileset ID from database
- `YOUR_TOKEN` with your auth token

### **Expected response:**
```
< HTTP/2 200
< content-type: image/png
< content-length: 12345

[PNG binary data]
```

---

## Step 8: Check Mapbox Map Initialization

### **Add to MapboxGolfCourseMap.tsx after map initialization:**

```typescript
map.current.on('load', () => {
  console.log('Map loaded successfully');
  console.log('Map style:', map.current.getStyle());
  console.log('Map sources:', Object.keys(map.current.getStyle().sources));
  console.log('Map layers:', map.current.getStyle().layers.map(l => l.id));
});

map.current.on('error', (e) => {
  console.error('Map error:', e);
});

map.current.on('sourcedataloading', (e) => {
  console.log('Source data loading:', e.sourceId);
});

map.current.on('sourcedata', (e) => {
  console.log('Source data loaded:', e.sourceId, e.isSourceLoaded);
});
```

---

## Common Issues & Solutions

### **Issue 1: No tile-proxy requests in Network tab**

**Cause:** Layers not added to map

**Solution:**
```typescript
// Check in console:
console.log('Selected layers:', selectedLayers);
console.log('Tilesets:', tilesets);

// Verify selectedLayers is not empty
// Verify tilesets array has data
```

---

### **Issue 2: tile-proxy returns 401 Unauthorized**

**Cause:** Invalid or expired token

**Solution:**
```typescript
// Check token in console:
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Token:', session?.access_token);

// If no session, user not logged in
```

---

### **Issue 3: tile-proxy returns 404**

**Cause:** Tileset not found in database

**Solution:**
```sql
-- Check tileset exists:
SELECT * FROM golf_course_tilesets WHERE id = 'YOUR_TILESET_ID';

-- Check is_active:
UPDATE golf_course_tilesets SET is_active = true WHERE id = 'YOUR_TILESET_ID';
```

---

### **Issue 4: tile-proxy returns transparent 1x1 PNG**

**Cause:** Tile not found in R2 or path mismatch

**Solution:**
```
1. Check r2_folder_path in database matches R2 structure
2. Check tile exists in R2 at exact path
3. Check edge function logs for "Tile not found in R2"
```

---

### **Issue 5: Edge function not being called at all**

**Cause:** Map not requesting tiles

**Possible reasons:**
1. Map bounds don't intersect tileset bounds
2. Zoom level outside min/max zoom
3. Layer not visible
4. Source not added correctly

**Solution:**
```typescript
// Check map bounds:
console.log('Map bounds:', map.current.getBounds());
console.log('Map zoom:', map.current.getZoom());

// Check tileset bounds:
console.log('Tileset bounds:', [
  tileset.min_lon, tileset.min_lat,
  tileset.max_lon, tileset.max_lat
]);

// Check zoom levels:
console.log('Tileset zoom:', tileset.min_zoom, '-', tileset.max_zoom);
```

---

## Quick Diagnostic Script

### **Paste this in browser console:**

```javascript
// Get map instance
const mapInstance = window.map || document.querySelector('.mapboxgl-map')?.__mapboxgl__;

if (mapInstance) {
  console.log('=== MAP DIAGNOSTIC ===');
  console.log('Map center:', mapInstance.getCenter());
  console.log('Map zoom:', mapInstance.getZoom());
  console.log('Map bounds:', mapInstance.getBounds());
  
  const style = mapInstance.getStyle();
  console.log('Sources:', Object.keys(style.sources));
  console.log('Layers:', style.layers.map(l => ({
    id: l.id,
    type: l.type,
    source: l.source
  })));
  
  // Check for tileset sources
  const tilesetSources = Object.keys(style.sources).filter(s => s.startsWith('tileset-source-'));
  console.log('Tileset sources:', tilesetSources);
  
  tilesetSources.forEach(sourceId => {
    const source = style.sources[sourceId];
    console.log(`Source ${sourceId}:`, source);
  });
  
  console.log('=====================');
} else {
  console.error('Map instance not found!');
}
```

---

## Step-by-Step Checklist

Run through this checklist:

- [ ] **Deploy edge function:** `npx supabase functions deploy r2-sign`
- [ ] **Refresh browser:** Ctrl+Shift+R
- [ ] **Open DevTools:** F12
- [ ] **Go to Network tab**
- [ ] **Filter:** tile-proxy
- [ ] **Load map page**
- [ ] **Select golf course:** test20
- [ ] **Check:** Do you see tile-proxy requests?
  - [ ] **YES:** Check status code and response
  - [ ] **NO:** Check console for layer addition logs
- [ ] **Check Console tab**
- [ ] **Look for:** "Adding layer" logs
- [ ] **Look for:** Tile URL logs
- [ ] **Check:** Any errors?
- [ ] **Run diagnostic script** (above)
- [ ] **Check map bounds** vs tileset bounds
- [ ] **Check zoom level** vs tileset min/max zoom

---

## Most Likely Issues

### **1. Edge Function Not Deployed**

```bash
# Deploy it:
npx supabase functions deploy r2-sign

# Verify:
npx supabase functions list
```

### **2. Map Bounds Don't Match Tileset**

```
Map is looking at: USA
Tileset is in: Netherlands

Solution: Fly to tileset bounds on load
```

### **3. Zoom Level Outside Range**

```
Map zoom: 10
Tileset min_zoom: 14
Tileset max_zoom: 20

Solution: Set map zoom to 16 (within range)
```

---

## Next Steps

1. **Open browser DevTools (F12)**
2. **Go to Network tab**
3. **Filter: tile-proxy**
4. **Reload map page**
5. **Tell me what you see:**
   - How many tile-proxy requests?
   - What status codes?
   - What response sizes?
   - Any errors in Console tab?

**Share screenshots if possible!** 📸
