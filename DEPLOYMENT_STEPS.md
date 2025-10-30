# Deployment Steps - Cloudflare Large File Upload

## Prerequisites
- Cloudflare account (free tier works)
- Node.js installed
- Git (optional)

## Step-by-Step Deployment

### 1. Create R2 Bucket (1 minute)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **R2** in sidebar
3. Click **Create bucket**
4. Enter name: `phyto-uploads`
5. Click **Create bucket**

✅ Bucket created

### 2. Deploy Worker (2 minutes)

**Option A: Use batch script (Windows)**
```bash
deploy-worker.bat
```

**Option B: Use shell script (Mac/Linux)**
```bash
chmod +x deploy-worker.sh
./deploy-worker.sh
```

**Option C: Manual**
```bash
cd workers/large-upload
npm install
npx wrangler login
npx wrangler deploy
```

When prompted:
- Allow Wrangler to open browser
- Login to Cloudflare
- Authorize Wrangler

✅ Worker deployed

**Copy the Worker URL** from output:
```
Published phyto-large-upload (0.XX sec)
  https://phyto-large-upload.abc123.workers.dev
```

### 3. Configure Frontend (30 seconds)

Add Worker URL to `.env`:
```bash
VITE_WORKER_URL=https://phyto-large-upload.abc123.workers.dev
```

Replace `abc123` with your actual subdomain.

✅ Frontend configured

### 4. Verify R2 Binding (optional)

Usually automatic, but verify:

1. Dashboard → **Workers & Pages**
2. Click **phyto-large-upload**
3. Go to **Settings** → **Variables**
4. Under **R2 Bucket Bindings**, verify:
   - Variable name: `R2_BUCKET`
   - R2 bucket: `phyto-uploads`

If missing, add it manually.

✅ Binding verified

### 5. Test Upload (1 minute)

Restart dev server:
```bash
npm run dev
```

Navigate to:
```
http://localhost:5173/test-upload
```

Upload a test file:
- Small file (< 100MB) - tests presigned URL
- Large file (> 100MB) - tests multipart upload

✅ System working

## Troubleshooting

### "Worker not found" error
```bash
cd workers/large-upload
npx wrangler deploy
```

### "CORS error" in browser
- Check `.env` has correct Worker URL
- No trailing slash in URL
- Restart dev server after changing `.env`

### "R2 bucket not found"
- Verify bucket name in `workers/large-upload/wrangler.toml` matches dashboard
- Check R2 binding in Worker settings

### TypeScript errors in Worker
```bash
cd workers/large-upload
npm install
```

### Worker logs show errors
Dashboard → Workers & Pages → phyto-large-upload → Logs

## Production Deployment

### 1. Custom Domain (optional)
Dashboard → Workers → phyto-large-upload → Triggers → Add Custom Domain

### 2. Environment Variables
Update `.env.production`:
```bash
VITE_WORKER_URL=https://upload.yourdomain.com
```

### 3. Build Frontend
```bash
npm run build
```

### 4. Deploy Frontend
Deploy `dist/` folder to:
- Cloudflare Pages
- Vercel
- Netlify
- Any static host

## Security (Production)

### Add Authentication to Worker

Edit `workers/large-upload/src/index.ts`:

```ts
// Add before route handling
const authHeader = request.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return json({ error: 'Unauthorized' }, CORS, 401);
}

const token = authHeader.slice(7);
// Verify token with your auth provider (Supabase, Auth0, etc.)
const user = await verifyToken(token);
if (!user) {
  return json({ error: 'Invalid token' }, CORS, 401);
}
```

### Add Rate Limiting

Dashboard → Workers → phyto-large-upload → Settings → Rate Limiting

Recommended:
- 100 requests per minute per IP
- 1000 requests per hour per IP

### Add File Validation

Edit Worker to check:
- File size limits
- File type (MIME type)
- Filename sanitization

## Monitoring

### View Worker Metrics
Dashboard → Workers → phyto-large-upload → Metrics

Track:
- Requests per second
- Error rate
- CPU time
- Duration

### View R2 Metrics
Dashboard → R2 → phyto-uploads → Metrics

Track:
- Storage used
- Class A operations (writes)
- Class B operations (reads)

### Set Up Alerts
Dashboard → Notifications → Add

Alert on:
- High error rate
- High request volume
- Storage quota

## Cost Management

### Monitor Usage
Dashboard → R2 → phyto-uploads → Usage

### Set Limits
Dashboard → R2 → phyto-uploads → Settings → Lifecycle Rules

Example: Delete files older than 30 days
```
Prefix: temp/
Days: 30
Action: Delete
```

## Rollback

If issues occur:

### Rollback Worker
```bash
cd workers/large-upload
npx wrangler rollback
```

### Delete Deployment
Dashboard → Workers → phyto-large-upload → Deployments → Delete

## Next Steps

- [ ] Test with various file sizes
- [ ] Add authentication
- [ ] Set up monitoring
- [ ] Configure rate limiting
- [ ] Add file type validation
- [ ] Set up CDN for downloads
- [ ] Implement resumable uploads
- [ ] Add virus scanning

## Support Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- Project docs: `LARGE_FILE_UPLOAD_GUIDE.md`

---

**Deployment complete!** 🎉

System is ready for large file uploads up to 5GB.
