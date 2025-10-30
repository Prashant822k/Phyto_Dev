# ⚡ Quick Tile Upload Setup (5 Minutes)

## Step 1: Install Package (30 seconds)
```bash
npm install jszip
```

## Step 2: Deploy Worker (2 minutes)
```bash
deploy-tile-worker.bat
```
**Copy the Worker URL that appears!**

## Step 3: Configure (30 seconds)
Add to `.env`:
```bash
VITE_TILE_WORKER_URL=https://map-tiles-upload.YOUR_SUBDOMAIN.workers.dev
```

## Step 4: Restart Dev Server (30 seconds)
```bash
npm run dev
```

## Step 5: Test Upload (1 minute)
1. Visit: `http://localhost:5173/tile-upload`
2. Enter Course ID: `test-course`
3. Upload a ZIP with tiles in `z/x/y.png` structure
4. Copy the tile URL

## ✅ Done!

Use tile URL in Mapbox:
```js
map.addSource('golf-tiles', {
  type: 'raster',
  tiles: ['YOUR_TILE_URL'],
  tileSize: 256
});
```

---

**Full guide:** `TILE_UPLOAD_COMPLETE_GUIDE.md`
