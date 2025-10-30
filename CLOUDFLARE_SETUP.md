# Cloudflare Workers + R2 Large File Upload Setup

## Dashboard Configuration

### 1. Create R2 Bucket
1. Go to **Cloudflare Dashboard** → **R2**
2. Click **Create bucket**
3. Name: `phyto-uploads`
4. Click **Create bucket**

### 2. Create API Token
1. Go to **R2** → **Manage R2 API Tokens**
2. Click **Create API token**
3. Permissions: **Object Read & Write**
4. Click **Create API Token**
5. Save: `Access Key ID` and `Secret Access Key`

### 3. Deploy Worker
```bash
cd workers/large-upload
npm install
npx wrangler login
npx wrangler deploy
```

### 4. Bind R2 to Worker (if not auto-bound)
1. Go to **Workers & Pages** → **phyto-large-upload**
2. **Settings** → **Variables**
3. **R2 Bucket Bindings** → Add binding
   - Variable name: `R2_BUCKET`
   - R2 bucket: `phyto-uploads`

### 5. Configure Frontend
Add to `.env`:
```
VITE_WORKER_URL=https://phyto-large-upload.YOUR_SUBDOMAIN.workers.dev
```

Replace `YOUR_SUBDOMAIN` with your Cloudflare account subdomain.

## Usage

```tsx
import { LargeFileUpload } from '@/components/LargeFileUpload';

function App() {
  return <LargeFileUpload />;
}
```

## Features
- ✅ Files up to 5GB
- ✅ Automatic chunking (100MB chunks)
- ✅ Parallel upload (3 concurrent)
- ✅ Progress tracking with speed
- ✅ Resumable uploads
- ✅ Direct R2 upload (no Worker bandwidth)

## Architecture
- **< 100MB**: Presigned URL → Direct upload
- **> 100MB**: Multipart upload → Chunked parallel upload
