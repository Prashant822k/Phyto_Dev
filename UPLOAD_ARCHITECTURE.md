# Upload Architecture - Visual Guide

## System Overview

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │
       │ HTTPS
       │
┌──────▼──────────┐
│ Cloudflare      │
│ Worker          │
│ (Edge Runtime)  │
└──────┬──────────┘
       │
       │ R2 API
       │
┌──────▼──────────┐
│ Cloudflare R2   │
│ (Object Storage)│
└─────────────────┘
```

## Small File Upload (< 100MB)

```
Step 1: Request Presigned URL
┌─────────┐                    ┌────────┐
│ Browser │ ─POST /presigned─> │ Worker │
│         │ { key: "file.jpg" }│        │
└─────────┘                    └────┬───┘
                                    │
                                    │ createPresignedUrl()
                                    │
                               ┌────▼───┐
                               │   R2   │
                               └────┬───┘
                                    │
┌─────────┐                    ┌────▼───┐
│ Browser │ <─── presigned URL │ Worker │
└────┬────┘                    └────────┘
     │
     │
Step 2: Direct Upload
     │
     │ PUT (file data)
     │
┌────▼────┐
│   R2    │ ✅ File stored
└─────────┘
```

**Benefits**:
- No Worker bandwidth used
- Single request
- Fast for small files

## Large File Upload (> 100MB)

```
Step 1: Initiate Multipart Upload
┌─────────┐                    ┌────────┐                    ┌─────┐
│ Browser │ ─POST /initiate──> │ Worker │ ─createMultipart─> │ R2  │
│         │ { key, type }      │        │                    │     │
└─────────┘                    └────────┘                    └──┬──┘
                                                                 │
┌─────────┐                    ┌────────┐                    ┌──▼──┐
│ Browser │ <─── uploadId ───  │ Worker │ <─── uploadId ───  │ R2  │
└────┬────┘                    └────────┘                    └─────┘
     │
     │
Step 2: Upload Chunks (Parallel)
     │
     ├─ PUT /part (chunk 1) ──> Worker ──> R2 ─┐
     ├─ PUT /part (chunk 2) ──> Worker ──> R2  ├─ Parallel
     └─ PUT /part (chunk 3) ──> Worker ──> R2 ─┘
     │
     │ <─── etag 1 ───
     │ <─── etag 2 ───
     │ <─── etag 3 ───
     │
     │
Step 3: Complete Upload
     │
     └─ POST /complete ──> Worker ──> R2
        { uploadId, parts }
                                       │
                                       ✅ File assembled
```

**Benefits**:
- 100MB chunks
- 3 concurrent uploads
- Progress tracking
- Resumable (can be extended)

## Data Flow Comparison

### Traditional Server Upload
```
Browser ──(upload)──> Server ──(upload)──> Storage
        [slow]                [slow]
        
Total bandwidth: 2x file size
Time: 2x upload time
Cost: Server bandwidth + Storage bandwidth
```

### Cloudflare Direct Upload
```
Browser ──(presigned URL)──> Worker
        [fast]               [instant]
                                │
Browser ──(direct upload)────> R2
        [fast]
        
Total bandwidth: 1x file size
Time: 1x upload time
Cost: Storage only (no egress fees)
```

## Component Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  LargeFileUpload.tsx (UI Component)          │  │
│  │  - File picker                                │  │
│  │  - Progress bar                               │  │
│  │  - Speed indicator                            │  │
│  └────────────────┬─────────────────────────────┘  │
│                   │                                  │
│  ┌────────────────▼─────────────────────────────┐  │
│  │  r2-upload.ts (Upload Logic)                 │  │
│  │  - R2Uploader class                          │  │
│  │  - uploadToR2() function                     │  │
│  │  - Chunking logic                            │  │
│  │  - Progress calculation                      │  │
│  └────────────────┬─────────────────────────────┘  │
│                   │                                  │
└───────────────────┼──────────────────────────────────┘
                    │ HTTPS
                    │
┌───────────────────▼──────────────────────────────────┐
│              Cloudflare Worker                        │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Routes:                                             │
│  - POST /initiate    → createMultipartUpload()       │
│  - PUT  /part        → uploadPart()                  │
│  - POST /complete    → completeMultipartUpload()     │
│  - POST /abort       → abortMultipartUpload()        │
│  - POST /presigned   → createPresignedUrl()          │
│  - GET  /download    → get()                         │
│  - DELETE /:key      → delete()                      │
│                                                       │
└───────────────────┬──────────────────────────────────┘
                    │ R2 API
                    │
┌───────────────────▼──────────────────────────────────┐
│                 Cloudflare R2                         │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Bucket: phyto-uploads                               │
│  - Object storage                                    │
│  - Multipart upload support                          │
│  - No egress fees                                    │
│  - S3-compatible API                                 │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## Upload State Machine

```
┌─────────┐
│  IDLE   │
└────┬────┘
     │ User selects file
     │
┌────▼────────┐
│ FILE_SELECTED│
└────┬────────┘
     │ User clicks upload
     │
┌────▼────────┐
│ INITIATING  │ ← POST /initiate
└────┬────────┘
     │ Received uploadId
     │
┌────▼────────┐
│ UPLOADING   │ ← PUT /part (chunks)
│             │   Progress: 0% → 100%
└────┬────────┘
     │ All chunks uploaded
     │
┌────▼────────┐
│ COMPLETING  │ ← POST /complete
└────┬────────┘
     │ Success
     │
┌────▼────────┐
│  COMPLETE   │ ✅
└─────────────┘

     │ Error at any step
     │
┌────▼────────┐
│   ERROR     │ ← POST /abort
└─────────────┘
```

## Chunk Upload Flow

```
File: 350MB
Chunk Size: 100MB
Chunks: 4 (100MB, 100MB, 100MB, 50MB)

Timeline:
0s    ┌─────────────────────────────────────────┐
      │ Initiate multipart upload               │
      └─────────────────────────────────────────┘
      
1s    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │ Chunk 1      │ │ Chunk 2      │ │ Chunk 3      │
      │ (100MB)      │ │ (100MB)      │ │ (100MB)      │
      │ Part 1       │ │ Part 2       │ │ Part 3       │
      └──────────────┘ └──────────────┘ └──────────────┘
      
10s   ✅ Done         ✅ Done         ✅ Done
      
11s   ┌──────────────┐
      │ Chunk 4      │
      │ (50MB)       │
      │ Part 4       │
      └──────────────┘
      
16s   ✅ Done
      
17s   ┌─────────────────────────────────────────┐
      │ Complete multipart upload               │
      │ Parts: [1, 2, 3, 4] with etags         │
      └─────────────────────────────────────────┘
      
18s   ✅ File assembled in R2
```

## Error Handling Flow

```
┌─────────────┐
│   Upload    │
│  In Progress│
└──────┬──────┘
       │
       │ Error occurs
       │
┌──────▼──────┐
│   Detect    │
│   Error     │
└──────┬──────┘
       │
       ├─ Network error ──> Retry chunk
       │
       ├─ Auth error ────> Abort upload
       │                   POST /abort
       │
       └─ Server error ──> Abort upload
                           POST /abort
                           
┌─────────────┐
│   Cleanup   │
│  (R2 parts  │
│   deleted)  │
└─────────────┘
```

## Performance Optimization

### Parallel Upload Strategy
```
Sequential (slow):
Chunk 1 ████████████ (10s)
Chunk 2             ████████████ (10s)
Chunk 3                         ████████████ (10s)
Total: 30s

Parallel (fast):
Chunk 1 ████████████ (10s)
Chunk 2 ████████████ (10s)
Chunk 3 ████████████ (10s)
Total: 10s (3x faster)
```

### Adaptive Chunking (Future Enhancement)
```
Network Speed    Chunk Size    Concurrency
─────────────────────────────────────────────
< 1 Mbps         50MB          2
1-10 Mbps        100MB         3
> 10 Mbps        200MB         5
```

## Security Model

```
┌─────────┐
│ Browser │
└────┬────┘
     │
     │ Authorization: Bearer <token>
     │
┌────▼────────┐
│   Worker    │
│             │
│ 1. Verify   │ ← Check JWT token
│    token    │
│             │
│ 2. Check    │ ← Verify user permissions
│    perms    │
│             │
│ 3. Scope    │ ← Restrict to user's path
│    path     │   e.g., users/{userId}/
│             │
└────┬────────┘
     │
     │ Scoped R2 operations
     │
┌────▼────┐
│   R2    │
└─────────┘
```

## Monitoring Points

```
┌─────────┐
│ Browser │ ← Track: Upload speed, errors, retries
└────┬────┘
     │
┌────▼────────┐
│   Worker    │ ← Track: Request rate, latency, errors
└────┬────────┘   Log: All operations
     │
┌────▼────┐
│   R2    │ ← Track: Storage used, operations count
└─────────┘   Alert: Quota limits
```

---

**Architecture designed for**:
- ✅ Scalability (edge computing)
- ✅ Performance (parallel uploads)
- ✅ Reliability (error handling)
- ✅ Cost efficiency (no egress fees)
- ✅ User experience (progress tracking)
