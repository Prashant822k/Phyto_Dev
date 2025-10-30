# Cloudflare Worker - Large File Upload

Handles multipart uploads to R2 for files > 1GB.

## Deploy

```bash
npm install
npx wrangler login
npx wrangler deploy
```

Or use the batch script from project root:
```bash
deploy-worker.bat
```

## Local Development

```bash
npm run dev
```

Worker runs at `http://localhost:8787`

## Configuration

Edit `wrangler.toml`:
- `bucket_name`: Your R2 bucket name
- `MAX_FILE_SIZE`: Maximum file size in bytes

## Endpoints

- `POST /initiate` - Start multipart upload
- `PUT /part` - Upload chunk
- `POST /complete` - Finish upload
- `POST /abort` - Cancel upload
- `POST /presigned` - Get presigned URL (small files)
- `GET /download/:key` - Download file
- `DELETE /:key` - Delete file

See `LARGE_FILE_UPLOAD_GUIDE.md` for full API documentation.
