# R2 Upload Verification & Required Changes

## Current Situation

### ❌ **Problem: Frontend tile uploads will NOT go to the correct R2 path**

Your current tile upload flow uses a **Cloudflare Worker** that constructs paths as:
```
{courseId}/tiles/{z}/{x}/{y}.png
```

But the new structure requires:
```
{courseId}/{YYYY-MM-DD}/{HH-MM}/tiles/{z}/{x}/{y}.png
```

## What Needs to Change

### 1. **Cloudflare Worker** (tile-upload worker)

**Location:** `workers/tile-upload/` (your Cloudflare Worker)

The worker needs to be updated to accept `date` and `time` parameters and construct the new path format.

**Current Worker Code** (assumed):
```typescript
// In your worker
const path = `${courseId}/tiles/${z}/${x}/${y}.png`;
```

**Required Change:**
```typescript
// Updated worker code
const path = date && time 
  ? `${courseId}/${date}/${time}/tiles/${z}/${x}/${y}.png`
  : `${courseId}/tiles/${z}/${x}/${y}.png`; // Legacy fallback
```

### 2. **Frontend TileUploader Class**

**File:** `src/lib/tile-upload.ts`

**Current:**
```typescript
export class TileUploader {
  private courseId: string;

  constructor(courseId: string) {
    this.courseId = courseId;
  }
}
```

**Required:**
```typescript
export class TileUploader {
  private courseId: string;
  private flightDate?: string;
  private flightTime?: string;

  constructor(courseId: string, flightDate?: string, flightTime?: string) {
    this.courseId = courseId;
    this.flightDate = flightDate;
    this.flightTime = flightTime;
  }

  // Update methods to pass date/time to worker
  async uploadTile(z: number, x: number, y: number, blob: Blob): Promise<void> {
    const { url } = await fetch(`${WORKER_URL}/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        courseId: this.courseId, 
        z, x, y,
        date: this.flightDate,
        time: this.flightTime
      }),
    }).then(r => r.json());
    // ... rest of code
  }
}
```

### 3. **TileUploadComponent**

**File:** `src/components/TileUploadComponent.tsx`

**Add date/time inputs:**
```typescript
const [flightDate, setFlightDate] = useState('');
const [flightTime, setFlightTime] = useState('');

// Update uploader initialization
const uploader = new TileUploader(courseId, flightDate, flightTime);
```

## Complete Solution

I'll create the updated files for you:

### Option A: Use Edge Functions Instead of Worker

Since you're already using Supabase Edge Functions (`r2-sign`), you could:

1. **Create a new edge function** for tile uploads that uses the same R2 credentials
2. **Bypass the Cloudflare Worker** entirely
3. **Use the edge function** to generate presigned URLs with the correct date/time path

**Advantages:**
- Consistent with your existing architecture
- No need to update Cloudflare Worker
- Centralized R2 access control

### Option B: Update Cloudflare Worker

Update your existing worker to support date/time parameters.

## Recommended Approach

**I recommend Option A** - using Supabase Edge Functions for consistency.

Here's what I'll create for you:

1. **New Edge Function:** `tile-upload` (generates presigned upload URLs)
2. **Updated TileUploader:** Modified to use edge function instead of worker
3. **Updated TileUploadComponent:** Add date/time inputs

Would you like me to implement this now?

## Quick Fix for Testing

If you want to test the metadata upload first (without tile uploads), you can:

1. **Manually upload tiles** to R2 using the correct structure:
   ```
   test15/2024-11-03/14-30/tiles/15/5242/12663.png
   ```

2. **Use the TilesetMetadataUploader** to create the tileset record

3. **View the map** with the LayerSelector

This way you can test the layer selection and swipe functionality while we fix the tile upload flow.

## Summary

**Current State:**
- ✅ Database schema supports date/time
- ✅ TilesetMetadataUploader has date/time inputs
- ✅ Edge functions support new path structure
- ✅ LayerSelector and SwipeControl ready
- ✅ MapboxGolfCourseMap integrated
- ❌ **Tile upload flow needs updating**

**What Works Now:**
- Creating tilesets with date/time via metadata uploader
- Viewing maps with multiple layers
- Layer selection and swipe comparison
- **IF tiles are already in R2 with correct structure**

**What Doesn't Work:**
- Frontend tile upload (will use wrong R2 path)
- Needs worker update OR edge function replacement

## Next Steps

1. **Choose approach:** Edge function (recommended) or Worker update
2. **I'll implement the chosen approach**
3. **Test with real tiles**

Let me know which approach you prefer!
