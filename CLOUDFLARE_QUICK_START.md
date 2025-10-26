# Cloudflare Large File Upload - Quick Start

## 3-Step Setup

### Step 1: Create R2 Bucket (2 min)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2**
2. Click **Create bucket**
3. Name: `phyto-uploads`
4. Click **Create bucket**

### Step 2: Deploy Worker (2 min)
Run from project root:
```bash
deploy-worker.bat
```

Or manually:
```bash
cd workers/large-upload
npm install
npx wrangler login
npx wrangler deploy
```

Copy the deployed URL (e.g., `https://phyto-large-upload.abc123.workers.dev`)

### Step 3: Configure Frontend (1 min)
Add to `.env`:
```
VITE_WORKER_URL=https://phyto-large-upload.abc123.workers.dev
```

Restart dev server:
```bash
npm run dev
```

## Test Upload

Navigate to: `http://localhost:5173/test-upload`

Or use the component:
```tsx
import { LargeFileUpload } from '@/components/LargeFileUpload';

<LargeFileUpload />
```

## Architecture

```
Frontend (React)
    ↓ (initiate)
Worker (Cloudflare)
    ↓ (createMultipartUpload)
R2 (Storage)
    ↓ (uploadId)
Worker
    ↓ (uploadId)
Frontend
    ↓ (upload chunks in parallel)
Worker (streams to R2)
    ↓ (etags)
Frontend
    ↓ (complete with etags)
Worker
    ↓ (completeMultipartUpload)
R2 ✅
```

## File Size Handling

| Size | Method | Chunks | Speed |
|------|--------|--------|-------|
| < 100MB | Presigned URL | 1 | Fast |
| 100MB - 1GB | Multipart | 10-100 | Fast |
| 1GB - 5GB | Multipart | 100-500 | Moderate |

## Features

✅ **No terminal commands** - Pure web upload  
✅ **Progress tracking** - Real-time percentage & speed  
✅ **Parallel uploads** - 3 concurrent chunks  
✅ **Auto-chunking** - 100MB chunks  
✅ **Error recovery** - Abort on failure  
✅ **Direct R2** - No Worker bandwidth for small files  

## Customization

### Change Chunk Size
`src/lib/r2-upload.ts`:
```ts
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
```

### Change Concurrency
`src/lib/r2-upload.ts`:
```ts
const concurrency = 5; // 5 parallel uploads
```

### Change Max File Size
`workers/large-upload/wrangler.toml`:
```toml
[vars]
MAX_FILE_SIZE = 10737418240  # 10GB
```

## Troubleshooting

### "Worker URL not configured"
Add `VITE_WORKER_URL` to `.env` and restart dev server.

### "CORS error"
Worker sets CORS automatically. Check:
1. Worker deployed successfully
2. URL in `.env` is correct (no trailing slash)
3. Browser console for specific error

### "Upload failed"
Check Worker logs:
1. Dashboard → Workers & Pages → phyto-large-upload
2. Click **Logs** tab
3. Look for errors

### R2 binding not found
1. Dashboard → Workers & Pages → phyto-large-upload
2. Settings → Variables → R2 Bucket Bindings
3. Add binding: `R2_BUCKET` → `phyto-uploads`

## Cost (Estimate)

**Free Tier:**
- R2: 10GB storage, 1M Class A, 10M Class B/month
- Workers: 100k requests/day

**Paid (1000 users, 1GB files each):**
- Storage: 1000GB × $0.015 = **$15/month**
- Uploads: ~$0.05/month
- Workers: Free (under 100k/day)
- **Total: ~$15/month**

## Next Steps

1. ✅ Deploy worker
2. ✅ Test with small file (< 100MB)
3. ✅ Test with large file (> 1GB)
4. Add authentication (see `LARGE_FILE_UPLOAD_GUIDE.md`)
5. Add file type validation
6. Set up CDN for downloads
7. Implement resumable uploads

## Support

- Full docs: `LARGE_FILE_UPLOAD_GUIDE.md`
- Worker code: `workers/large-upload/src/index.ts`
- Frontend code: `src/lib/r2-upload.ts`
- Component: `src/components/LargeFileUpload.tsx`
