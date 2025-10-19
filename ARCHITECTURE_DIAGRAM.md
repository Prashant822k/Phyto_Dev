# Golf Course Upload System - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADMIN INTERFACE                          │
│                      (React Frontend)                            │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 1. Load golf courses
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  golf_clubs table                                        │   │
│  │  ├─ Pine Valley Golf Club                               │   │
│  │  ├─ Augusta National                                    │   │
│  │  └─ St. Andrews                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 2. Admin selects "Pine Valley Golf Club"
                                 │ 3. Admin uploads file.png
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND PROCESSING                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  FileUpload.tsx                                          │   │
│  │  └─ metadata = {                                        │   │
│  │       golfCourseName: "Pine Valley Golf Club"          │   │
│  │     }                                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  imageService.ts                                         │   │
│  │  └─ sanitizeGolfCourseName()                           │   │
│  │     "Pine Valley Golf Club" → "pine-valley-golf-club"  │   │
│  │  └─ key = "pine-valley-golf-club/1234_file.png"       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 4. Upload request with key
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION (r2-sign)                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. Verify admin authentication                          │   │
│  │  2. Validate request                                     │   │
│  │  3. Generate AWS4 signed URL                            │   │
│  │  4. Return signed URL to frontend                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 5. Upload via signed URL
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE R2 BUCKET                           │
│              (map-stats-tiles-prod)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  pine-valley-golf-club/                                  │   │
│  │  ├─ 1234567890_tile1.png                                │   │
│  │  ├─ 1234567891_tile2.png                                │   │
│  │  └─ 1234567892_file.png  ← NEW FILE                    │   │
│  │                                                           │   │
│  │  augusta-national/                                       │   │
│  │  ├─ 1234567893_image1.png                               │   │
│  │  └─ 1234567894_image2.png                               │   │
│  │                                                           │   │
│  │  st-andrews/                                             │   │
│  │  └─ 1234567895_photo.png                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ 6. Record metadata
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  images table                                            │   │
│  │  ├─ id: uuid                                            │   │
│  │  ├─ filename: "1234567892_file.png"                    │   │
│  │  ├─ path: "pine-valley-golf-club/1234567892_file.png" │   │
│  │  ├─ user_id: admin_uuid                                │   │
│  │  ├─ status: "uploaded"                                 │   │
│  │  └─ created_at: timestamp                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────┐    select     ┌──────────────┐
│  Admin   │──────────────▶│ Golf Course  │
└──────────┘    course     └──────────────┘
     │                            │
     │ upload                     │
     │ PNG file                   │
     ▼                            ▼
┌──────────────────────────────────────────┐
│           FileUpload.tsx                  │
│  ┌────────────────────────────────────┐  │
│  │ Metadata:                          │  │
│  │  - golfCourseName: "Pine Valley"  │  │
│  │  - lat: 40.0                      │  │
│  │  - lon: -75.0                     │  │
│  │  - file: file.png                 │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────┐
│        imageService.uploadTile()         │
│  ┌────────────────────────────────────┐  │
│  │ 1. Sanitize name                   │  │
│  │    "Pine Valley" → "pine-valley"  │  │
│  │ 2. Generate key                    │  │
│  │    "pine-valley/123_file.png"     │  │
│  │ 3. Call R2Service.uploadFile()    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────┐
│            r2Service.ts                   │
│  ┌────────────────────────────────────┐  │
│  │ Call Edge Function:                │  │
│  │  POST /functions/v1/r2-sign       │  │
│  │  Body: {                          │  │
│  │    action: "uploadFile",          │  │
│  │    key: "pine-valley/123_file.png"│  │
│  │    contentType: "image/png",      │  │
│  │    fileData: base64...            │  │
│  │  }                                │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────┐
│    Supabase Edge Function (r2-sign)      │
│  ┌────────────────────────────────────┐  │
│  │ 1. Validate JWT token             │  │
│  │ 2. Check user.role === 'admin'    │  │
│  │ 3. Generate AWS4 signed URL       │  │
│  │ 4. Upload to R2                   │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────┐
│         Cloudflare R2 Bucket             │
│     map-stats-tiles-prod                 │
│  ┌────────────────────────────────────┐  │
│  │ File stored at:                    │  │
│  │ pine-valley/123_file.png          │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
     │
     │ success response
     ▼
┌──────────────────────────────────────────┐
│      imageService.uploadTile()           │
│  ┌────────────────────────────────────┐  │
│  │ Save to database:                  │  │
│  │  INSERT INTO images (              │  │
│  │    path: "pine-valley/123_file.png"│  │
│  │    ...                             │  │
│  │  )                                 │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
     │
     ▼
┌──────────────┐
│   SUCCESS!   │
│  File ready  │
└──────────────┘
```

## Component Interaction

```
FileUpload.tsx
    │
    ├─ useState(golfClubs)        ← Fetch from Supabase
    ├─ useState(selectedGolfClub) ← User selection
    │
    └─ handleFileUpload()
           │
           └─ ImageService.uploadTile(file, {
                  golfCourseName: selectedGolfClub
              })
                  │
                  ├─ sanitizeGolfCourseName() ← utils.ts
                  │     │
                  │     └─ "Pine Valley" → "pine-valley"
                  │
                  ├─ Generate key: "pine-valley/timestamp_file.png"
                  │
                  └─ R2Service.uploadFile(key, file)
                         │
                         └─ Edge Function: r2-sign
                                │
                                ├─ Auth check ✓
                                ├─ Admin check ✓
                                ├─ Generate signed URL
                                └─ Upload to R2
                                       │
                                       └─ R2: map-stats-tiles-prod/
                                              pine-valley/
                                              timestamp_file.png
```

## Folder Structure in R2

```
map-stats-tiles-prod/              ← Your R2 Bucket
│
├── pine-valley-golf-club/         ← Golf Course Folder
│   ├── 1697123456789_tile1.png   ← Timestamped files
│   ├── 1697123456790_tile2.png
│   └── 1697123456791_tile3.png
│
├── augusta-national/              ← Another Golf Course
│   ├── 1697123456792_image1.png
│   └── 1697123456793_image2.png
│
├── st-andrews/                    ← Another Golf Course
│   └── 1697123456794_photo.png
│
└── green-hills-club-123/          ← Sanitized name
    └── 1697123456795_tile.png
```

## Name Sanitization Flow

```
User Input                Sanitization            R2 Folder Name
─────────────────────────────────────────────────────────────────
"Pine Valley Golf Club" → lowercase           → "pine valley golf club"
                        → replace spaces       → "pine-valley-golf-club"
                        → remove specials      → "pine-valley-golf-club"
                        → trim hyphens         → "pine-valley-golf-club"

"St. Andrews (Old)"     → lowercase           → "st. andrews (old)"
                        → replace spaces       → "st.-andrews-(old)"
                        → remove specials      → "st-andrews-old"
                        → trim hyphens         → "st-andrews-old"

"The Best Golf!!!"      → lowercase           → "the best golf!!!"
                        → replace spaces       → "the-best-golf!!!"
                        → remove specials      → "the-best-golf"
                        → trim hyphens         → "the-best-golf"
```

## Security Model

```
┌──────────┐
│  Client  │ (role: 'client', club_id: 123)
└──────────┘
     │
     ├─ Upload?        → ❌ DENIED (admin only)
     ├─ View own club? → ✅ ALLOWED
     └─ View all?      → ❌ DENIED
     
┌──────────┐
│  Admin   │ (role: 'admin')
└──────────┘
     │
     ├─ Upload?        → ✅ ALLOWED (any golf course)
     ├─ View own club? → ✅ ALLOWED
     └─ View all?      → ✅ ALLOWED
```

## Environment Variables Flow

```
┌─────────────────────────────────────────┐
│         Frontend (.env)                  │
│  VITE_SUPABASE_URL                      │
│  VITE_SUPABASE_ANON_KEY                 │
└─────────────────────────────────────────┘
     │
     │ Used by: supabase.ts (client connection)
     │ Access: Browser (public, safe keys)
     │
     ▼
┌─────────────────────────────────────────┐
│    Backend (supabase/functions/.env)    │
│  SUPABASE_URL                           │
│  SUPABASE_SERVICE_ROLE_KEY              │
│  CLOUDFLARE_R2_ACCOUNT_ID               │
│  CLOUDFLARE_R2_ACCESS_KEY_ID            │
│  CLOUDFLARE_R2_SECRET_ACCESS_KEY        │
│  CLOUDFLARE_R2_BUCKET_NAME              │
└─────────────────────────────────────────┘
     │
     │ Used by: Edge Functions (server-side)
     │ Access: Server only (sensitive keys)
     │ Security: Never exposed to browser
```

## Summary

✅ **Simple**: Select course → Upload file → Organized automatically
✅ **Secure**: Admin-only uploads, validated paths
✅ **Scalable**: Add courses easily, grows with your needs
✅ **Clean**: Sanitized names, consistent structure
✅ **Flexible**: Each course gets its own folder

