# 🧪 Test Now - With Debug Logs

## What I Added

Added comprehensive logging to MapboxGolfCourseMap to show exactly what's happening:

```
✅ Map style loaded
🗺️ Updating layers...
  Selected layers: [...]
  Available tilesets: 1
  Supabase URL: https://...
  Adding 1 layers...
  ✅ Adding layer: test20 - Nov 5 (2024-11-05)
     Source ID: tileset-source-...
     Layer ID: tileset-layer-...
     R2 Path: test20/2024-11-05/14-30/tiles
     Tile URL: https://.../tile-proxy?tilesetId=...&z=15&x=5242&y=12663&token=...
     Bounds: [5.755, 51.361, 5.779, 51.372]
     Zoom: 14 - 20
     ✅ Layer added successfully
✅ Layer update complete
```

---

## Test Steps

### **1. Refresh Browser**
```
Ctrl+Shift+R (hard refresh)
```

### **2. Open DevTools**
```
Press F12
Go to Console tab
```

### **3. Load Map Page**
```
Navigate to your map page
Select golf course: test20
```

### **4. Watch Console**

You should see logs like above. Look for:

#### **✅ GOOD - If you see:**
```
✅ Map style loaded
🗺️ Updating layers...
  Adding 1 layers...
  ✅ Adding layer: test20...
     Tile URL: https://...tile-proxy?...
  ✅ Layer added successfully
✅ Layer update complete
```

**Then check Network tab** - you should NOW see tile-proxy requests!

---

#### **❌ BAD - If you see:**
```
❌ Map not initialized yet
```
**Problem:** Map not created. Check tilesets array is not empty.

---

#### **⏳ If you see:**
```
⏳ Waiting for map style to load...
✅ Map style loaded, retrying layer update
```
**This is normal** - wait for second attempt.

---

#### **⚠️ If you see:**
```
⚠️ Tileset not found for ID: ...
```
**Problem:** selectedLayers has wrong ID. Check database.

---

#### **❌ If you see:**
```
❌ No active session for tile loading
```
**Problem:** Not logged in. Log in first.

---

#### **❌ If you see:**
```
❌ Error adding layer: ...
```
**Problem:** Mapbox error. Check error message.

---

## After Seeing Logs

### **If layers added successfully:**

1. **Check Network tab** (F12 → Network → Filter: tile-proxy)
2. **You should see requests** like:
   ```
   tile-proxy?tilesetId=...&z=15&x=5242&y=12663&token=...
   Status: 200
   Size: 10-50 KB (actual tile)
   ```

3. **If you see requests:**
   - Click on one
   - Go to Preview tab
   - You should see a PNG image!

4. **If requests return small size (67 B):**
   - That's transparent PNG
   - Means tile not found in R2
   - Check R2 path matches exactly

---

## What to Share

After refreshing and checking console, tell me:

1. **Console logs:**
   - Do you see "✅ Map style loaded"?
   - Do you see "🗺️ Updating layers"?
   - Do you see "✅ Adding layer"?
   - Do you see the Tile URL log?
   - Any errors?

2. **Network tab:**
   - After seeing console logs, do tile-proxy requests appear?
   - How many requests?
   - What sizes?

3. **Copy/paste:**
   - The Tile URL from console
   - Any error messages

---

## Quick Checklist

- [ ] Save MapboxGolfCourseMap.tsx (already saved)
- [ ] Refresh browser (Ctrl+Shift+R)
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Load map page
- [ ] Select test20
- [ ] See console logs?
- [ ] Check Network tab
- [ ] See tile-proxy requests?

**Do this now and tell me what you see!** 🔍
