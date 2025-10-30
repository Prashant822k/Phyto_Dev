# ✅ Setup Checklist - Do This Now

## 🎯 Complete These Steps in Order

### ☐ Step 1: Install jszip
```bash
npm install jszip
```
**Verify:** Run `npm list jszip` - should show version number

---

### ☐ Step 2: Deploy Tile Worker
```bash
deploy-tile-worker.bat
```
**Verify:** Should see "Published map-tiles-upload" with URL

**📋 Copy Worker URL:** `_________________________________`

---

### ☐ Step 3: Update .env
Add this line to `.env`:
```bash
VITE_TILE_WORKER_URL=https://map-tiles-upload.YOUR_SUBDOMAIN.workers.dev
```
**Verify:** File `.env` contains `VITE_TILE_WORKER_URL`

---

### ☐ Step 4: Restart Dev Server
```bash
npm run dev
```
**Verify:** Server starts without errors

---

### ☐ Step 5: Test Upload Page
Visit: `http://localhost:5173/tile-upload`

**Verify:** Page loads, no console errors

---

### ☐ Step 6: Test Upload
1. Enter Course ID: `test-course`
2. Upload a ZIP with tiles
3. Wait for success message

**Verify:** Success message shows tile URL

**📋 Copy Tile URL:** `_________________________________`

---

### ☐ Step 7: Verify in R2
Go to Cloudflare Dashboard → R2 → `map-stats-tiles-prod`

**Verify:** See folder `test-course` with tiles

---

### ☐ Step 8: Test Tile URL
Open in browser:
```
https://map-tiles-upload.YOUR_SUBDOMAIN.workers.dev/tiles/test-course/15/5242/12663.png
```
**Verify:** PNG image displays

---

## ✅ All Done!

When all boxes are checked, your system is ready.

**Next:** Upload real golf course tiles and integrate with Mapbox

---

## 🐛 If Something Fails

- **Step 1 fails:** Check internet connection, try `npm cache clean --force`
- **Step 2 fails:** Run `cd workers/tile-upload && npm install` first
- **Step 3 fails:** Make sure `.env` file exists in project root
- **Step 4 fails:** Check for port conflicts, try different port
- **Step 5 fails:** Check browser console (F12) for errors
- **Step 6 fails:** Verify Worker URL is correct in `.env`
- **Step 7 fails:** Check Cloudflare Dashboard login
- **Step 8 fails:** Verify tiles were uploaded in Step 6

---

**Full guide:** `TILE_UPLOAD_COMPLETE_GUIDE.md`  
**Quick start:** `QUICK_TILE_SETUP.md`  
**Summary:** `FINAL_SETUP_SUMMARY.md`
