# 🗺️ Complete Tile Upload System Setup Guide

## 📋 What You Have

### ✅ Cloudflare Worker for Tile Upload
- **Location**: `workers/tile-upload/`
- **Bucket**: `map-stats-tiles-prod`
- **Structure**: `{courseId}/{z}/{x}/{y}.png`
- **Features**: Batch upload, presigned URLs, public tile serving

### ✅ Frontend Upload System
- **Library**: `src/lib/tile-upload.ts`
- **Component**: `src/components/TileUploadComponent.tsx`
- **Page**: `src/pages/TileUploadPage.tsx`
- **Route**: `/tile-upload`

---

## 🚀 Complete Setup (5 Steps)

### Step 1: Install Frontend Dependencies

```bash
npm install jszip
```

This adds ZIP file handling for tile extraction.

---

### Step 2: Deploy Tile Worker

**Option A: Use batch script (Windows)**
```bash
deploy-tile-worker.bat
```

**Option B: Manual deployment**
```bash
cd workers/tile-upload
npm install
npx wrangler login
npx wrangler deploy
```

**Expected output:**
```
Published map-tiles-upload (0.XX sec)
  https://map-tiles-upload.abc123.workers.dev
```

**Copy this URL!** ⬆️

---

### Step 3: Configure R2 Bucket

#### Option A: Bucket Already Exists (`map-stats-tiles-prod`)
✅ Skip to Step 4

#### Option B: Create New Bucket
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2**
2. Click **Create bucket**
3. Name: `map-stats-tiles-prod`
4. Click **Create bucket**

---

### Step 4: Configure Frontend

Add Worker URL to `.env`:
```bash
VITE_TILE_WORKER_URL=https://map-tiles-upload.abc123.workers.dev
```

Replace `abc123` with your actual subdomain from Step 2.

---

### Step 5: Test Upload

```bash
# Restart dev server
npm run dev

# Visit
http://localhost:5173/tile-upload
```

---

## 🧪 Testing & Verification

### Test 1: Upload ZIP File

1. **Prepare test ZIP**:
   ```
   tiles.zip
   ├── 15/
   │   └── 5242/
   │       ├── 12663.png
   │       └── 12664.png
   └── 16/
       └── 10484/
           └── 25326.png
   ```

2. **Upload**:
   - Go to `/tile-upload`
   - Enter Course ID: `test-course`
   - Click "Select ZIP"
   - Choose your tiles.zip
   - Wait for upload (progress bar shows)

3. **Verify**:
   - ✅ Success message appears
   - ✅ Tile URL displayed
   - ✅ No errors in console

---

### Test 2: Verify Tiles in R2

**Dashboard Method:**
1. Go to Cloudflare Dashboard → R2 → `map-stats-tiles-prod`
2. Navigate to `test-course/15/5242/`
3. Should see `12663.png`, `12664.png`

**API Method:**
```bash
curl https://map-tiles-upload.abc123.workers.dev/tiles/test-course/15/5242/12663.png
```
Should return PNG image.

---

### Test 3: Mapbox Integration

```tsx
import mapboxgl from 'mapbox-gl';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-v9',
  center: [-122.4, 37.8],
  zoom: 15,
});

map.on('load', () => {
  map.addSource('test-tiles', {
    type: 'raster',
    tiles: ['https://map-tiles-upload.abc123.workers.dev/tiles/test-course/{z}/{x}/{y}.png'],
    tileSize: 256,
    maxzoom: 20,
  });

  map.addLayer({
    id: 'test-overlay',
    type: 'raster',
    source: 'test-tiles',
    paint: { 'raster-opacity': 0.8 },
  });
});
```

---

## 📦 Package Downloads & Installation

### Frontend Packages

```bash
# Required (if not already installed)
npm install jszip

# Optional (for development)
npm install @types/jszip --save-dev
```

### Worker Packages

```bash
cd workers/tile-upload
npm install
```

This installs:
- `wrangler` - Cloudflare CLI
- `@cloudflare/workers-types` - TypeScript types

---

## 🔍 Verification Checklist

### Worker Verification
- [ ] Worker deployed successfully
- [ ] Worker URL copied
- [ ] R2 bucket exists (`map-stats-tiles-prod`)
- [ ] R2 binding configured (auto-configured by wrangler)

### Frontend Verification
- [ ] `jszip` installed (`npm list jszip`)
- [ ] `VITE_TILE_WORKER_URL` in `.env`
- [ ] Dev server restarted
- [ ] `/tile-upload` page loads
- [ ] No console errors

### Upload Verification
- [ ] Can select ZIP file
- [ ] Can select folder
- [ ] Progress bar shows during upload
- [ ] Success message appears
- [ ] Tile URL displayed
- [ ] Tiles visible in R2 dashboard

### Integration Verification
- [ ] Tile URL works in browser
- [ ] Tiles load in Mapbox
- [ ] No CORS errors
- [ ] Tiles cached properly

---

## 🛠️ Troubleshooting

### Issue: "Cannot find module 'jszip'"
**Fix:**
```bash
npm install jszip
```

### Issue: "Worker not found"
**Fix:**
```bash
cd workers/tile-upload
npx wrangler deploy
```

### Issue: "CORS error"
**Fix:**
- Check `VITE_TILE_WORKER_URL` in `.env`
- Ensure no trailing slash
- Restart dev server

### Issue: "R2 bucket not found"
**Fix:**
- Verify bucket name in `workers/tile-upload/wrangler.toml`
- Check bucket exists in Cloudflare Dashboard
- Ensure R2 binding is correct

### Issue: "Tiles not appearing in Mapbox"
**Fix:**
- Check tile URL in browser directly
- Verify z/x/y coordinates are correct
- Check Mapbox console for errors
- Ensure tiles are PNG format

### Issue: "Upload fails silently"
**Fix:**
- Open browser console (F12)
- Check Network tab for failed requests
- Verify Worker logs in Cloudflare Dashboard
- Check file structure matches z/x/y.png

---

## 📁 File Structure

```
Phyto_Dev/
├── workers/
│   └── tile-upload/
│       ├── src/
│       │   └── index.ts          # Worker code
│       ├── wrangler.toml          # Worker config
│       ├── package.json           # Worker dependencies
│       └── tsconfig.json          # TypeScript config
│
├── src/
│   ├── lib/
│   │   └── tile-upload.ts         # Upload client
│   ├── components/
│   │   └── TileUploadComponent.tsx # UI component
│   └── pages/
│       └── TileUploadPage.tsx     # Upload page
│
├── .env                            # Environment variables
├── package.json                    # Frontend dependencies
└── deploy-tile-worker.bat          # Deployment script
```

---

## 🎯 Usage Examples

### Example 1: Upload from ZIP

```tsx
import { TileUploader, extractTilesFromZip } from '@/lib/tile-upload';

const zipFile = document.querySelector('input[type="file"]').files[0];
const uploader = new TileUploader('the-best-golf');

const tiles = await extractTilesFromZip(zipFile);
await uploader.uploadTiles(tiles, (progress) => {
  console.log(`${progress.percentage}% - ${progress.currentTile}`);
});

const tileUrl = uploader.getTileUrl();
console.log('Tile URL:', tileUrl);
```

### Example 2: Upload from Folder

```tsx
import { TileUploader, extractTilesFromFiles } from '@/lib/tile-upload';

const files = document.querySelector('input[webkitdirectory]').files;
const uploader = new TileUploader('the-best-golf');

const tiles = await extractTilesFromFiles(files);
await uploader.uploadTiles(tiles);
```

### Example 3: Check if Tile Exists

```tsx
const uploader = new TileUploader('the-best-golf');
const exists = await uploader.tileExists(15, 5242, 12663);
console.log('Tile exists:', exists);
```

### Example 4: List All Tiles

```tsx
const uploader = new TileUploader('the-best-golf');
const tiles = await uploader.listTiles();
console.log('Total tiles:', tiles.length);
```

---

## 🔐 Production Considerations

### 1. Authentication
Add JWT verification to Worker:
```ts
const token = request.headers.get('Authorization');
// Verify with Supabase or your auth provider
```

### 2. Rate Limiting
Configure in Cloudflare Dashboard:
- 100 uploads per minute per IP
- 1000 uploads per hour per user

### 3. File Validation
- Check file size (max 5MB per tile)
- Verify PNG format
- Validate z/x/y coordinates

### 4. Monitoring
- Set up Cloudflare alerts
- Monitor R2 storage usage
- Track upload success rate

### 5. Backup
- Enable R2 versioning
- Set up lifecycle rules
- Regular backups to S3

---

## 💰 Cost Estimate

**R2 Pricing:**
- Storage: $0.015/GB/month
- Class A (write): $4.50/million requests
- Class B (read): $0.36/million requests

**Example (10 golf courses, 10,000 tiles each):**
- Storage: 100,000 tiles × 100KB = 10GB × $0.015 = **$0.15/month**
- Uploads: 100,000 × $4.50/1M = **$0.45 one-time**
- Reads: 1M views × 10 tiles × $0.36/1M = **$3.60/month**
- **Total: ~$4/month**

**Workers Pricing:**
- Free: 100k requests/day
- Paid: $5/month + $0.50/million requests

---

## 📚 API Reference

### Worker Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/upload-url` | POST | Get presigned URL for single tile |
| `/batch-upload-urls` | POST | Get presigned URLs for multiple tiles |
| `/upload-tile` | PUT | Direct tile upload |
| `/tiles/{courseId}/{z}/{x}/{y}.png` | GET | Serve tile |
| `/tile-exists` | POST | Check if tile exists |
| `/list-tiles` | POST | List all tiles for course |
| `/delete-tile` | DELETE | Delete tile |

### Frontend API

```ts
// Create uploader
const uploader = new TileUploader(courseId);

// Upload tiles
await uploader.uploadTiles(tiles, onProgress);

// Get tile URL
const url = uploader.getTileUrl();

// Check existence
const exists = await uploader.tileExists(z, x, y);

// List tiles
const tiles = await uploader.listTiles();

// Abort upload
uploader.abort();
```

---

## ✅ Final Checklist

### Setup Complete When:
- [ ] Worker deployed
- [ ] `jszip` installed
- [ ] `.env` configured
- [ ] Dev server running
- [ ] Test upload successful
- [ ] Tiles visible in R2
- [ ] Tiles load in Mapbox
- [ ] No console errors

### Ready for Production When:
- [ ] Authentication added
- [ ] Rate limiting configured
- [ ] File validation implemented
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Custom domain configured
- [ ] CDN enabled

---

## 🎉 Success!

Your tile upload system is now ready. You can:

1. ✅ Upload tiles via ZIP or folder
2. ✅ Track upload progress in real-time
3. ✅ Serve tiles directly from Cloudflare R2
4. ✅ Integrate with Mapbox GL or Leaflet
5. ✅ Handle 100+ tiles efficiently

**Next Steps:**
- Upload your first golf course tiles
- Integrate with your Mapbox map
- Set up authentication for production
- Configure monitoring and alerts

---

**Need help?** Check Worker logs in Cloudflare Dashboard → Workers → map-tiles-upload → Logs
