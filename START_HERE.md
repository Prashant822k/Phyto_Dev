# 🚀 START HERE - Tile Upload System

## What You Need to Do Right Now

### 1. Install Package
```bash
npm install jszip
```

### 2. Deploy Worker
```bash
deploy-tile-worker.bat
```
**Copy the URL that appears!**

### 3. Add to .env
```bash
VITE_TILE_WORKER_URL=https://map-tiles-upload.YOUR_SUBDOMAIN.workers.dev
```

### 4. Restart & Test
```bash
npm run dev
```
Visit: `http://localhost:5173/tile-upload`

---

## ✅ That's It!

**Detailed steps:** See `SETUP_CHECKLIST.md`  
**Full guide:** See `TILE_UPLOAD_COMPLETE_GUIDE.md`  
**Quick reference:** See `QUICK_TILE_SETUP.md`

---

## 📋 What Was Created

### Workers
- `workers/tile-upload/` - Tile upload worker
- `workers/large-upload/` - Large file upload worker

### Frontend
- `src/lib/tile-upload.ts` - Tile upload library
- `src/lib/r2-upload.ts` - Large file upload library
- `src/components/TileUploadComponent.tsx` - Tile upload UI
- `src/components/LargeFileUpload.tsx` - File upload UI
- `src/pages/TileUploadPage.tsx` - Tile upload page
- `src/pages/TestUpload.tsx` - File upload test page

### Routes
- `/tile-upload` - Upload map tiles
- `/test-upload` - Test large file uploads

### Scripts
- `deploy-tile-worker.bat` - Deploy tile worker
- `deploy-worker.bat` - Deploy file upload worker

### Documentation
- `START_HERE.md` - This file
- `SETUP_CHECKLIST.md` - Step-by-step checklist
- `QUICK_TILE_SETUP.md` - 5-minute setup
- `TILE_UPLOAD_COMPLETE_GUIDE.md` - Complete tile guide
- `FINAL_SETUP_SUMMARY.md` - What to do now
- `CLOUDFLARE_QUICK_START.md` - Large file setup
- `LARGE_FILE_UPLOAD_GUIDE.md` - Large file guide
- `UPLOAD_ARCHITECTURE.md` - System architecture

---

## 🎯 Two Systems Available

### 1. Tile Upload System
**Purpose:** Upload map tiles for Mapbox  
**Bucket:** `map-stats-tiles-prod`  
**Structure:** `{courseId}/{z}/{x}/{y}.png`  
**Page:** `/tile-upload`  
**Deploy:** `deploy-tile-worker.bat`

### 2. Large File Upload System
**Purpose:** Upload files up to 5GB  
**Bucket:** `phyto-uploads`  
**Features:** Chunked, parallel, progress tracking  
**Page:** `/test-upload`  
**Deploy:** `deploy-worker.bat`

---

## 🔧 Environment Variables Needed

Add to `.env`:
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Mapbox
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1...

# Cloudflare Workers
VITE_WORKER_URL=https://phyto-large-upload.YOUR_SUBDOMAIN.workers.dev
VITE_TILE_WORKER_URL=https://map-tiles-upload.YOUR_SUBDOMAIN.workers.dev
```

---

## 📦 Packages to Install

```bash
# Required for tile upload
npm install jszip

# Already in package.json (no action needed)
# - @supabase/supabase-js
# - react, react-dom, react-router-dom
# - All UI components
```

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install jszip

# Deploy tile worker
deploy-tile-worker.bat

# Deploy file upload worker (optional)
deploy-worker.bat

# Start dev server
npm run dev

# Test tile upload
# Visit: http://localhost:5173/tile-upload

# Test file upload
# Visit: http://localhost:5173/test-upload
```

---

## ✅ Success Indicators

### Tile Upload Working:
- ✅ `/tile-upload` page loads
- ✅ Can upload ZIP with tiles
- ✅ Progress bar shows
- ✅ Success message with tile URL
- ✅ Tiles visible in R2 dashboard
- ✅ Tile URL works in browser

### Large File Upload Working:
- ✅ `/test-upload` page loads
- ✅ Can select large files
- ✅ Progress with speed indicator
- ✅ Upload completes successfully
- ✅ Files visible in R2 dashboard

---

## 🐛 Quick Troubleshooting

### "Cannot find module 'jszip'"
```bash
npm install jszip
```

### "Worker not found"
```bash
cd workers/tile-upload
npx wrangler deploy
```

### "CORS error"
- Check `.env` has correct Worker URLs
- Restart dev server

### "Page not found"
- Check routes in `src/App.tsx`
- Verify imports

---

## 📞 Need Help?

1. **Check setup:** `SETUP_CHECKLIST.md`
2. **Read guide:** `TILE_UPLOAD_COMPLETE_GUIDE.md`
3. **View logs:** Cloudflare Dashboard → Workers → Logs
4. **Browser console:** Press F12 to see errors

---

**Begin now:** Run `npm install jszip` then `deploy-tile-worker.bat`
