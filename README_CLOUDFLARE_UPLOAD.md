# 🚀 Cloudflare Large File Upload System

Seamless upload system for files up to 5GB using Cloudflare Workers and R2.

## ⚡ Quick Start

### 1. Deploy (2 minutes)
```bash
deploy-worker.bat
```

### 2. Configure
```bash
# Add to .env
VITE_WORKER_URL=https://phyto-large-upload.YOUR_SUBDOMAIN.workers.dev
```

### 3. Test
```bash
npm run dev
# Visit: http://localhost:5173/test-upload
```

## 📦 What's Included

- **Cloudflare Worker** - Handles multipart uploads
- **Upload Library** - Auto-chunking, progress tracking
- **React Component** - Drag & drop UI
- **Test Page** - Verify setup

## 🎯 Features

| Feature | Status |
|---------|--------|
| Files up to 5GB | ✅ |
| Progress tracking | ✅ |
| Speed indicator | ✅ |
| Parallel uploads (3x) | ✅ |
| Auto-chunking (100MB) | ✅ |
| Error recovery | ✅ |
| Direct R2 upload | ✅ |
| No terminal commands | ✅ |

## 📖 Usage

### Component
```tsx
import { LargeFileUpload } from '@/components/LargeFileUpload';

<LargeFileUpload />
```

### API
```tsx
import { uploadToR2 } from '@/lib/r2-upload';

const key = await uploadToR2(file, 'uploads/file.zip', (progress) => {
  console.log(`${progress.percentage}% - ${progress.speed} bytes/sec`);
});
```

## 🏗️ Architecture

**Small files (< 100MB)**: Presigned URL → Direct upload  
**Large files (> 100MB)**: Multipart → 100MB chunks → 3 parallel

```
Browser → Worker → R2
         (edge)   (storage)
```

## 📚 Documentation

- **[Quick Start](CLOUDFLARE_QUICK_START.md)** - 3-step setup
- **[Deployment](DEPLOYMENT_STEPS.md)** - Detailed guide
- **[API Reference](LARGE_FILE_UPLOAD_GUIDE.md)** - Full docs
- **[Architecture](UPLOAD_ARCHITECTURE.md)** - Visual diagrams
- **[Summary](CLOUDFLARE_SUMMARY.md)** - Complete overview

## 🔧 Configuration

### Chunk Size
`src/lib/r2-upload.ts`:
```ts
const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB
```

### Concurrency
`src/lib/r2-upload.ts`:
```ts
const concurrency = 3; // parallel uploads
```

### Max File Size
`workers/large-upload/wrangler.toml`:
```toml
[vars]
MAX_FILE_SIZE = 5368709120  # 5GB
```

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error | Check `VITE_WORKER_URL` in `.env` |
| Worker not found | Run `npx wrangler deploy` |
| TypeScript errors | Run `npm install` in worker dir |

## 💰 Cost

**Free tier**: 10GB storage, 100k requests/day  
**Paid (1000 users, 1GB files)**: ~$15/month

## 🎓 Dashboard Setup

1. **Create R2 Bucket**
   - Dashboard → R2 → Create bucket
   - Name: `phyto-uploads`

2. **Deploy Worker**
   - Run `deploy-worker.bat`
   - Copy Worker URL

3. **Configure Frontend**
   - Add Worker URL to `.env`
   - Restart dev server

## 📁 File Structure

```
workers/large-upload/     # Worker code
src/lib/r2-upload.ts      # Upload client
src/components/           # UI components
Documentation/            # Guides
```

## 🔐 Security (Production)

Add to Worker:
```ts
// Verify JWT token
const token = request.headers.get('Authorization');
const user = await verifyToken(token);

// Scope to user path
const key = `users/${user.id}/${body.key}`;
```

## 📊 Monitoring

**Worker Logs**: Dashboard → Workers → phyto-large-upload → Logs  
**R2 Metrics**: Dashboard → R2 → phyto-uploads → Metrics

## ✅ Production Checklist

- [ ] Custom domain
- [ ] Authentication
- [ ] Rate limiting
- [ ] File validation
- [ ] Monitoring
- [ ] Backups

## 🚀 Next Steps

1. Test with various file sizes
2. Add authentication
3. Configure rate limiting
4. Set up monitoring
5. Deploy to production

---

**System ready!** Upload files up to 5GB seamlessly from your browser.
