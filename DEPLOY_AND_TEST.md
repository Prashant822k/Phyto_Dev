# 🚀 Deploy and Test - Quick Guide

## The Problem

Edge function logs are from 10 minutes ago = **Edge function not being called**

This means the issue is in the **frontend**, not the backend.

---

## Step 1: Deploy Edge Function (Just to be sure)

```bash
cd "c:\Users\PRASHANT KUMAR\Desktop\new\Phyto_Dev"
npx supabase functions deploy r2-sign
```

Wait for:
```
✓ Deployed r2-sign function
```

---

## Step 2: Open Browser DevTools

### **Press F12**

### **Go to Network Tab**

### **Filter: tile-proxy**

### **Clear existing logs** (trash icon)

---

## Step 3: Load Map Page

### **Go to your map page**

### **Select golf course: test20**

### **Watch Network Tab**

---

## What to Look For

### **Scenario A: NO tile-proxy requests**

```
Network tab shows: (empty)
```

**This means:** Mapbox isn't requesting tiles

**Possible causes:**
1. Map not initialized
2. Layers not added
3. Map bounds don't match tileset
4. Zoom level outside range

**Check Console tab for:**
```
"Adding layer: test20..."
```

**If you DON'T see this log:**
- Layers aren't being added
- Check selectedLayers state
- Check tilesets array

---

### **Scenario B: tile-proxy requests appear**

```
Network tab shows:
tile-proxy?tilesetId=...&z=15&x=5242&y=12663
Status: 200
Size: 67 B  ← SMALL = transparent PNG
```

**This means:** Edge function IS called but returns fallback

**Check:**
1. Click on request
2. Go to Response tab
3. If tiny transparent PNG → Tile not found in R2

---

### **Scenario C: tile-proxy requests with errors**

```
Status: 401 → Not authenticated
Status: 403 → Access denied
Status: 404 → Tileset not found
Status: 500 → Server error
```

**Click on request → Response tab** to see error message

---

## Step 4: Check Console Logs

### **Console Tab (F12)**

### **Look for:**

```javascript
// Should see:
"Adding layer: test20 - Nov 5 (2024-11-05)"

// If you see this, layers are being added ✓
```

### **If you DON'T see this:**

```javascript
// Check these logs:
console.log('Tilesets:', tilesets);
console.log('Selected layers:', selectedLayers);
console.log('Map:', map.current);
```

---

## Step 5: Quick Test - Add Debug Logs

### **Open: MapboxGolfCourseMap.tsx**

### **Find line ~164** (where tile URL is created)

### **Add these logs:**

```typescript
const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy?tilesetId=${tileset.id}&z={z}&x={x}&y={y}&token=${session.access_token}`;

// ADD THIS:
console.log('🔧 TILE DEBUG:');
console.log('  Tileset ID:', tileset.id);
console.log('  R2 path:', tileset.r2_folder_path);
console.log('  Tile URL:', tileUrlTemplate.replace('{z}', '15').replace('{x}', '5242').replace('{y}', '12663'));
console.log('  Map zoom:', map.current?.getZoom());
console.log('  Map center:', map.current?.getCenter());
```

### **Save, refresh browser**

### **Check console** - you should see these logs

---

## Step 6: Check Map Bounds

### **Paste this in browser console:**

```javascript
// Get Mapbox map instance
const mapboxMap = document.querySelector('.mapboxgl-map')?.__mapboxgl__;

if (mapboxMap) {
  console.log('Map center:', mapboxMap.getCenter());
  console.log('Map zoom:', mapboxMap.getZoom());
  console.log('Map bounds:', mapboxMap.getBounds());
  
  // Check sources
  const style = mapboxMap.getStyle();
  console.log('Sources:', Object.keys(style.sources));
  console.log('Layers:', style.layers.map(l => l.id));
} else {
  console.log('Map not found!');
}
```

### **Check output:**

```
Map center: {lng: 5.767493, lat: 51.366951}  ← Should be near Netherlands
Map zoom: 16  ← Should be between 14-20
```

**If map is far from Netherlands:** That's the problem!

---

## Most Likely Issue: Map Bounds

### **Your tileset bounds (Netherlands):**
```
Longitude: 5.755898 to 5.779088
Latitude: 51.361755 to 51.372146
```

### **If map is showing:**
```
Longitude: -74.0 (New York)
Latitude: 40.7 (New York)
```

**Tiles won't load because map is looking at wrong location!**

---

## Solution: Verify Map Initialization

### **Check MapboxGolfCourseMap.tsx line ~82:**

```typescript
map.current = new mapboxgl.Map({
  container: mapContainer.current,
  style: baseStyle,
  center: [primaryTileset.center_lon, primaryTileset.center_lat],  ← Should be [5.767, 51.367]
  zoom: primaryTileset.default_zoom,  ← Should be 16
  bounds: [
    [primaryTileset.min_lon, primaryTileset.min_lat],  ← Should be [5.755, 51.361]
    [primaryTileset.max_lon, primaryTileset.max_lat]   ← Should be [5.779, 51.372]
  ],
});
```

### **Add debug log:**

```typescript
console.log('🗺️ MAP INIT:');
console.log('  Center:', [primaryTileset.center_lon, primaryTileset.center_lat]);
console.log('  Zoom:', primaryTileset.default_zoom);
console.log('  Bounds:', [
  [primaryTileset.min_lon, primaryTileset.min_lat],
  [primaryTileset.max_lon, primaryTileset.max_lat]
]);
```

---

## Tell Me What You See

### **After following steps above, tell me:**

1. **Network Tab:**
   - [ ] Do you see tile-proxy requests?
   - [ ] How many?
   - [ ] What status codes?
   - [ ] What sizes?

2. **Console Tab:**
   - [ ] Do you see "Adding layer" logs?
   - [ ] Do you see "TILE DEBUG" logs?
   - [ ] Do you see "MAP INIT" logs?
   - [ ] Any errors?

3. **Map:**
   - [ ] What location is the map showing?
   - [ ] What zoom level?
   - [ ] Can you see the golf course area?

---

## Quick Checklist

- [ ] Deploy edge function: `npx supabase functions deploy r2-sign`
- [ ] Open browser DevTools (F12)
- [ ] Go to Network tab
- [ ] Filter: tile-proxy
- [ ] Clear logs
- [ ] Refresh page (Ctrl+Shift+R)
- [ ] Select test20 golf course
- [ ] Watch Network tab - any requests?
- [ ] Check Console tab - any logs?
- [ ] Check map location - correct area?

**Share what you find!** 🔍
