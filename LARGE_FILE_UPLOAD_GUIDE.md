# Large File Upload System (Cloudflare Workers + R2)

## Quick Setup (5 minutes)

### 1. Cloudflare Dashboard

**Create R2 Bucket:**
- Dashboard → R2 → Create bucket
- Name: `phyto-uploads`
- Location: Automatic
- Click Create

**Get Account ID:**
- Dashboard → Workers & Pages → right sidebar
- Copy Account ID

### 2. Deploy Worker

```bash
cd workers/large-upload
npm install
npx wrangler login
npx wrangler deploy
```

**Update wrangler.toml** if bucket name differs:
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "phyto-uploads"  # Your bucket name
```

### 3. Configure Frontend

Create/update `.env`:
```bash
VITE_WORKER_URL=https://phyto-large-upload.YOUR_SUBDOMAIN.workers.dev
```

Get YOUR_SUBDOMAIN from deploy output or Dashboard → Workers → phyto-large-upload → URL.

### 4. Test Upload

```tsx
import { LargeFileUpload } from '@/components/LargeFileUpload';

<LargeFileUpload />
```

## How It Works

### Small Files (< 100MB)
1. Frontend requests presigned URL from Worker
2. Worker generates R2 presigned URL (valid 1 hour)
3. Frontend uploads directly to R2 via presigned URL
4. No Worker bandwidth used

### Large Files (> 100MB)
1. Frontend initiates multipart upload → Worker → R2
2. File split into 100MB chunks
3. Chunks uploaded in parallel (3 concurrent) via Worker
4. Worker streams chunks to R2 (no buffering)
5. Frontend completes multipart upload → Worker → R2

## API Reference

### POST /initiate
Start multipart upload
```json
{
  "key": "uploads/file.zip",
  "contentType": "application/zip"
}
```
Response:
```json
{
  "uploadId": "abc123",
  "key": "uploads/file.zip"
}
```

### PUT /part
Upload chunk (send binary in body)
```
Headers:
  X-Key: uploads/file.zip
  X-Upload-Id: abc123
  X-Part-Number: 1
Body: <binary chunk>
```
Response:
```json
{
  "etag": "xyz789",
  "partNumber": 1
}
```

### POST /complete
Finish upload
```json
{
  "key": "uploads/file.zip",
  "uploadId": "abc123",
  "parts": [
    { "partNumber": 1, "etag": "xyz789" },
    { "partNumber": 2, "etag": "def456" }
  ]
}
```

### POST /abort
Cancel upload
```json
{
  "key": "uploads/file.zip",
  "uploadId": "abc123"
}
```

### POST /presigned
Get presigned URL (small files)
```json
{
  "key": "uploads/small.jpg",
  "expiresIn": 3600
}
```

### GET /download/:key
Download file

### DELETE /:key
Delete file

## Frontend Usage

### Basic Upload
```tsx
import { uploadToR2 } from '@/lib/r2-upload';

const file = document.querySelector('input[type="file"]').files[0];
const key = await uploadToR2(file, 'uploads/myfile.zip');
console.log('Uploaded:', key);
```

### With Progress
```tsx
import { uploadToR2 } from '@/lib/r2-upload';

await uploadToR2(file, 'uploads/myfile.zip', (progress) => {
  console.log(`${progress.percentage.toFixed(1)}%`);
  console.log(`Speed: ${progress.speed} bytes/sec`);
});
```

### Advanced (Class API)
```tsx
import { R2Uploader } from '@/lib/r2-upload';

const uploader = new R2Uploader();

try {
  const key = await uploader.uploadLargeFile(file, 'uploads/file.zip', (p) => {
    setProgress(p);
  });
} catch (error) {
  console.error('Upload failed:', error);
}

// Cancel upload
uploader.abort();
```

## Configuration

### Chunk Size
Edit `src/lib/r2-upload.ts`:
```ts
const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB
```

### Concurrency
Edit `src/lib/r2-upload.ts`:
```ts
const concurrency = 3; // Parallel uploads
```

### Max File Size
Edit `workers/large-upload/wrangler.toml`:
```toml
[vars]
MAX_FILE_SIZE = 5368709120  # 5GB
```

## Troubleshooting

### CORS Errors
Worker automatically sets CORS headers. If issues persist:
- Check browser console for specific error
- Verify Worker URL in `.env`
- Test Worker directly: `curl https://your-worker.workers.dev/`

### Upload Fails
- Check R2 bucket exists and name matches `wrangler.toml`
- Verify R2 binding: Dashboard → Worker → Settings → Variables → R2 Bucket Bindings
- Check Worker logs: Dashboard → Worker → Logs

### Slow Uploads
- Reduce concurrency (network bandwidth limited)
- Increase chunk size (fewer requests, but less granular progress)
- Check network speed: `speedtest-cli`

## Production Checklist

- [ ] Custom domain for Worker
- [ ] R2 bucket in production mode
- [ ] Rate limiting (Cloudflare WAF)
- [ ] Authentication (add JWT validation to Worker)
- [ ] File type validation
- [ ] Virus scanning (integrate ClamAV or similar)
- [ ] CDN for downloads (R2 → Cloudflare CDN)

## Cost Estimate

**R2 Pricing:**
- Storage: $0.015/GB/month
- Class A (write): $4.50/million requests
- Class B (read): $0.36/million requests

**Workers Pricing:**
- Free: 100k requests/day
- Paid: $5/month + $0.50/million requests

**Example (1000 users, 1GB files):**
- Storage: 1000 GB × $0.015 = $15/month
- Uploads: 1000 × 10 parts × $4.50/1M = $0.045
- Downloads: 1000 × $0.36/1M = $0.0004
- **Total: ~$15/month**

## Advanced: Resumable Uploads

Store `uploadId` and `parts` in localStorage:
```ts
localStorage.setItem('upload_state', JSON.stringify({
  uploadId,
  key,
  parts: completedParts,
  file: { name: file.name, size: file.size }
}));

// Resume later
const state = JSON.parse(localStorage.getItem('upload_state'));
// Continue from last completed part
```

## Security

**Add authentication to Worker:**
```ts
// In worker src/index.ts
const authHeader = request.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return json({ error: 'Unauthorized' }, CORS, 401);
}

// Verify JWT with your auth provider
const token = authHeader.slice(7);
const user = await verifyToken(token);
if (!user) {
  return json({ error: 'Invalid token' }, CORS, 401);
}

// Scope uploads to user
const key = `users/${user.id}/${body.key}`;
```
