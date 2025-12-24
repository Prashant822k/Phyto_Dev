# Phyto Golf Course Segmentation - Model Integration Plan

## Overview

This document outlines the complete plan for integrating the AI segmentation model with the Phyto golf course mapping platform. The model performs semantic segmentation on satellite/aerial imagery to identify golf course features (fairways, greens, bunkers, water, etc.).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Current System State](#2-current-system-state)
3. [HuggingFace Space Setup](#3-huggingface-space-setup)
4. [Data Flow Pipeline](#4-data-flow-pipeline)
5. [Input Data Requirements](#5-input-data-requirements)
6. [API Endpoints](#6-api-endpoints)
7. [Frontend Integration](#7-frontend-integration)
8. [Storage & Database Schema](#8-storage--database-schema)
9. [Implementation Steps](#9-implementation-steps)
10. [Testing Strategy](#10-testing-strategy)
11. [Production Considerations](#11-production-considerations)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ MapboxGolfCourse│  │ ModelPrediction │  │ RunInferenceButton          │  │
│  │ Map.tsx         │  │ Overlay.tsx     │  │ (triggers inference)        │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
│           │                    │                          │                  │
└───────────┼────────────────────┼──────────────────────────┼──────────────────┘
            │                    │                          │
            ▼                    ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE EDGE FUNCTIONS                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ tile-proxy      │  │ model-inference │  │ r2-sign                     │  │
│  │ (serves tiles)  │  │ (orchestrates)  │  │ (presigned URLs)            │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
│           │                    │                          │                  │
└───────────┼────────────────────┼──────────────────────────┼──────────────────┘
            │                    │                          │
            ▼                    ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ Cloudflare R2   │  │ HuggingFace     │  │ Supabase PostgreSQL         │  │
│  │ (tile storage)  │  │ Space (ML model)│  │ (metadata)                  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Current System State

### What's Already Built

| Component | Status | Location |
|-----------|--------|----------|
| HuggingFace Space | ✅ Deployed | `https://prashant822k-phyto-golf-segmentation.hf.space` |
| Model Inference API | ✅ Working | `/infer` endpoint on HF Space |
| Supabase Edge Function | ✅ Working | `supabase/functions/model-inference/index.ts` |
| Prediction Storage | ✅ Working | Cloudflare R2 + Supabase DB |
| Frontend Overlay | ✅ Working | `ModelPredictionOverlay.tsx` |
| Test Prediction | ✅ Working | Creates dummy GeoJSON for testing |

### What's Missing

| Component | Status | Description |
|-----------|--------|-------------|
| Tile Export | ❌ Not Built | Export tiles from R2 for inference |
| Metadata Generation | ❌ Not Built | Generate `metadata.json` from tileset bounds |
| Inference Trigger UI | ❌ Not Built | Button to start inference pipeline |
| Progress Tracking | ❌ Not Built | Show inference progress to user |
| Error Handling | ⚠️ Partial | Need better error messages |

---

## 3. HuggingFace Space Setup

### Space Details

- **URL**: `https://prashant822k-phyto-golf-segmentation.hf.space`
- **Runtime**: Python 3.10 with TensorFlow/Keras
- **Model**: U-Net based semantic segmentation (8 classes)

### Model Classes

| Class ID | Class Name | Color (Hex) | Description |
|----------|------------|-------------|-------------|
| 0 | background | `#000000` | Non-golf areas |
| 1 | fairway | `#90EE90` | Main playing area |
| 2 | rough | `#228B22` | Rough grass areas |
| 3 | green | `#32CD32` | Putting greens |
| 4 | water | `#4169E1` | Water hazards |
| 5 | bunker | `#F4A460` | Sand bunkers |
| 6 | tree | `#006400` | Trees/vegetation |
| 7 | path | `#8B4513` | Cart paths |

### Health Check

```bash
curl https://prashant822k-phyto-golf-segmentation.hf.space/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

---

## 4. Data Flow Pipeline

### Complete Inference Flow

```
1. USER TRIGGERS INFERENCE
   └── Click "Run AI Segmentation" button
   
2. FRONTEND PREPARES DATA
   ├── Fetch tileset metadata from Supabase
   ├── Calculate tile grid (X, Y coordinates)
   ├── Download tiles from R2 via tile-proxy
   └── Create ZIP file + metadata.json
   
3. SEND TO HUGGINGFACE SPACE
   ├── POST /infer with multipart form data
   │   ├── metadata.json (tile positions, geo info)
   │   └── tiles.zip (512x512 PNG images)
   └── Wait for response (may take 30s-5min)
   
4. HUGGINGFACE PROCESSES
   ├── Extract tiles from ZIP
   ├── Stitch into full canvas
   ├── Run model prediction
   ├── Post-process (Gaussian blur, bilateral filter)
   ├── Polygonize mask to GeoJSON
   └── Return FeatureCollection
   
5. STORE PREDICTION
   ├── Upload GeoJSON to R2
   └── Insert metadata to Supabase DB
   
6. DISPLAY ON MAP
   ├── Add GeoJSON source to Mapbox
   ├── Add fill + line layers
   └── User can toggle visibility
```

---

## 5. Input Data Requirements

### A. Metadata JSON Structure

```json
{
  "tile_positions": [
    {"name": "0_0.png", "x": 0, "y": 0},
    {"name": "1_0.png", "x": 1, "y": 0},
    {"name": "0_1.png", "x": 0, "y": 1},
    {"name": "1_1.png", "x": 1, "y": 1}
  ],
  "pixel_size": 0.5,
  "origin_x": 5.76,
  "origin_y": 51.37,
  "crs": "EPSG:4326",
  "bounds": {
    "min_lon": 5.75,
    "min_lat": 51.35,
    "max_lon": 5.78,
    "max_lat": 51.38
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tile_positions` | Array | List of tiles with grid positions |
| `tile_positions[].name` | String | Filename in ZIP (e.g., "0_0.png") |
| `tile_positions[].x` | Integer | Column index (0-based) |
| `tile_positions[].y` | Integer | Row index (0-based) |
| `pixel_size` | Float | Meters per pixel (depends on zoom) |
| `origin_x` | Float | Longitude of top-left corner |
| `origin_y` | Float | Latitude of top-left corner |
| `crs` | String | Coordinate reference system |
| `bounds` | Object | Bounding box of the area |

### B. Tiles ZIP Structure

```
tiles.zip
├── 0_0.png    (512x512 RGB)
├── 1_0.png    (512x512 RGB)
├── 0_1.png    (512x512 RGB)
├── 1_1.png    (512x512 RGB)
└── ...
```

### C. Tile Naming Convention

- Format: `{x}_{y}.png`
- `x` = column index (left to right)
- `y` = row index (top to bottom)
- All tiles must be 512x512 pixels

### D. Calculating Pixel Size from Zoom Level

```javascript
// Approximate meters per pixel at different zoom levels (at equator)
const METERS_PER_PIXEL = {
  14: 9.55,
  15: 4.77,
  16: 2.39,
  17: 1.19,
  18: 0.60,
  19: 0.30,
  20: 0.15
};

// Adjust for latitude
function getPixelSize(zoom, latitude) {
  const baseSize = METERS_PER_PIXEL[zoom] || 1.0;
  return baseSize * Math.cos(latitude * Math.PI / 180);
}
```

---

## 6. API Endpoints

### A. HuggingFace Space Endpoints

#### `GET /health`
Check if the model is loaded and ready.

**Response:**
```json
{"status": "healthy", "model_loaded": true}
```

#### `POST /infer`
Run inference on tiles.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `metadata`: JSON file with tile positions
  - `tiles`: ZIP file containing PNG tiles

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "class_id": 1,
        "class_name": "fairway",
        "color": "#90EE90"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lon1, lat1], [lon2, lat2], ...]]
      }
    }
  ]
}
```

### B. Supabase Edge Function Endpoints

#### `POST /model-inference` (action: runInference)
Orchestrate the full inference pipeline.

**Request:**
```json
{
  "action": "runInference",
  "courseId": "uuid",
  "tilesetId": "uuid"
}
```

#### `POST /model-inference` (action: storePrediction)
Store a prediction GeoJSON.

**Request:**
```json
{
  "action": "storePrediction",
  "courseId": "uuid",
  "geojson": { "type": "FeatureCollection", ... }
}
```

#### `POST /model-inference` (action: listPredictions)
List all predictions for a course.

**Request:**
```json
{
  "action": "listPredictions",
  "courseId": "uuid"
}
```

#### `POST /model-inference` (action: getPrediction)
Get a specific prediction GeoJSON.

**Request:**
```json
{
  "action": "getPrediction",
  "courseId": "uuid",
  "predictionId": "prediction_2025-01-01T00-00-00-000Z"
}
```

#### `POST /model-inference` (action: deletePrediction)
Delete a prediction.

**Request:**
```json
{
  "action": "deletePrediction",
  "courseId": "uuid",
  "predictionId": "prediction_2025-01-01T00-00-00-000Z"
}
```

---

## 7. Frontend Integration

### A. Component Structure

```
frontend/src/
├── components/
│   ├── ModelPredictionOverlay.tsx   # Main prediction UI
│   ├── RunInferenceButton.tsx       # Trigger inference (TO BUILD)
│   └── InferenceProgress.tsx        # Progress indicator (TO BUILD)
├── lib/
│   └── modelInferenceService.ts     # API client
└── pages/
    └── DashboardClient.tsx          # Integrates components
```

### B. ModelPredictionOverlay Features

| Feature | Status | Description |
|---------|--------|-------------|
| List predictions | ✅ Done | Shows all predictions with dates |
| Toggle visibility | ✅ Done | Switch to show/hide on map |
| Download GeoJSON | ✅ Done | Download prediction file |
| Delete prediction | ✅ Done | Remove from R2 and DB |
| Class legend | ✅ Done | Shows color codes |
| Run inference | ❌ TODO | Button to start new inference |

### C. Map Layer Management

```typescript
// Adding prediction to map
const sourceId = `prediction-source-${predictionId}`;
const fillLayerId = `prediction-fill-${predictionId}`;
const outlineLayerId = `prediction-outline-${predictionId}`;

// Add source
map.addSource(sourceId, {
  type: 'geojson',
  data: geojson
});

// Add fill layer
map.addLayer({
  id: fillLayerId,
  type: 'fill',
  source: sourceId,
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': 0.7
  }
});

// Add outline layer
map.addLayer({
  id: outlineLayerId,
  type: 'line',
  source: sourceId,
  paint: {
    'line-color': '#000000',
    'line-width': 2
  }
});
```

---

## 8. Storage & Database Schema

### A. Cloudflare R2 Storage

**Bucket**: `map-stats-tiles-prod`

**Prediction Storage Path**:
```
{courseId}/model_predictions/{predictionId}.geojson
```

**Example**:
```
8028430f-500a-4144-980a-bb82089f3b74/model_predictions/prediction_2025-12-10T11-19-47-449Z.geojson
```

### B. Supabase Database Schema

#### Table: `model_predictions`

```sql
CREATE TABLE model_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_club_id UUID NOT NULL REFERENCES golf_clubs(id),
  prediction_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  feature_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(golf_club_id, prediction_id)
);

-- RLS Policies
ALTER TABLE model_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view predictions for their club"
  ON model_predictions FOR SELECT
  USING (
    golf_club_id IN (
      SELECT club_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage predictions"
  ON model_predictions FOR ALL
  USING (auth.role() = 'service_role');
```

### C. Related Tables

#### `golf_course_tilesets`
Stores tileset metadata needed for inference.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| golf_club_id | UUID | Foreign key to golf_clubs |
| name | TEXT | Tileset name |
| min_lon, max_lon | FLOAT | Longitude bounds |
| min_lat, max_lat | FLOAT | Latitude bounds |
| center_lon, center_lat | FLOAT | Center coordinates |
| min_zoom, max_zoom | INT | Zoom range |
| default_zoom | INT | Default zoom level |
| tile_size | INT | Tile size (usually 256 or 512) |

---

## 9. Implementation Steps

### Phase 1: Backend Infrastructure (Priority: HIGH)

#### Step 1.1: Enhance model-inference Edge Function
- [ ] Add `runInference` action that:
  - Fetches tileset metadata
  - Calculates tile grid
  - Generates presigned URLs for tiles
  - Calls HuggingFace Space
  - Stores result

#### Step 1.2: Create Tile Export Utility
- [ ] Function to export tiles from R2 as ZIP
- [ ] Generate metadata.json from tileset bounds
- [ ] Handle large tilesets (pagination/chunking)

#### Step 1.3: Add Progress Tracking
- [ ] Store inference job status in DB
- [ ] WebSocket or polling for progress updates
- [ ] Handle timeouts and retries

### Phase 2: Frontend Integration (Priority: HIGH)

#### Step 2.1: Build RunInferenceButton Component
- [ ] UI button with loading state
- [ ] Progress bar during inference
- [ ] Error handling and retry

#### Step 2.2: Enhance ModelPredictionOverlay
- [ ] Add "Run Inference" button
- [ ] Show inference progress
- [ ] Auto-refresh after completion

#### Step 2.3: Improve Map Overlay
- [ ] Layer ordering (predictions on top)
- [ ] Opacity controls
- [ ] Click to identify feature class

### Phase 3: Optimization (Priority: MEDIUM)

#### Step 3.1: Performance
- [ ] Cache predictions locally
- [ ] Lazy load GeoJSON
- [ ] Simplify polygons for large predictions

#### Step 3.2: UX Improvements
- [ ] Inference time estimates
- [ ] Batch inference for multiple dates
- [ ] Compare predictions over time

### Phase 4: Production Hardening (Priority: LOW)

#### Step 4.1: Error Handling
- [ ] Retry failed inferences
- [ ] Graceful degradation
- [ ] User-friendly error messages

#### Step 4.2: Monitoring
- [ ] Log inference metrics
- [ ] Alert on failures
- [ ] Track model accuracy

---

## 10. Testing Strategy

### A. Unit Tests

```typescript
// Test metadata generation
describe('generateMetadata', () => {
  it('should calculate correct tile grid', () => {
    const tileset = {
      min_lon: 5.75, max_lon: 5.78,
      min_lat: 51.35, max_lat: 51.38,
      default_zoom: 17
    };
    const metadata = generateMetadata(tileset);
    expect(metadata.tile_positions.length).toBeGreaterThan(0);
  });
});
```

### B. Integration Tests

1. **Test Prediction Storage**
   - Upload GeoJSON to R2
   - Verify DB record created
   - Retrieve and verify content

2. **Test Map Overlay**
   - Load prediction on map
   - Toggle visibility
   - Verify layers exist

### C. End-to-End Tests

1. **Full Inference Pipeline**
   - Trigger inference from UI
   - Wait for completion
   - Verify overlay appears on map

### D. Manual Testing Checklist

- [ ] Create test prediction → appears in list
- [ ] Toggle prediction → shows on map
- [ ] Download prediction → valid GeoJSON
- [ ] Delete prediction → removed from list and map
- [ ] Run inference → generates real polygons
- [ ] Large tileset → handles gracefully

---

## 11. Production Considerations

### A. Performance

| Concern | Solution |
|---------|----------|
| Large tilesets | Process in chunks, show progress |
| Slow inference | Background job with status polling |
| Large GeoJSON | Simplify polygons, use vector tiles |
| Memory usage | Stream tiles instead of loading all |

### B. Cost

| Service | Cost Factor | Mitigation |
|---------|-------------|------------|
| HuggingFace | GPU time | Cache results, limit reruns |
| R2 Storage | Storage + egress | Compress GeoJSON |
| Supabase | DB queries | Index on golf_club_id |

### C. Security

- [ ] Validate courseId belongs to user
- [ ] Rate limit inference requests
- [ ] Sanitize GeoJSON before storage
- [ ] Use presigned URLs with expiry

### D. Monitoring

```javascript
// Log inference metrics
console.log({
  event: 'inference_complete',
  courseId,
  tileCount,
  featureCount: geojson.features.length,
  durationMs: Date.now() - startTime
});
```

---

## Appendix A: Environment Variables

### Frontend (.env)

```env
VITE_SUPABASE_URL=https://efnorpyrsfoxooufujnd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
VITE_HF_SPACE_URL=https://prashant822k-phyto-golf-segmentation.hf.space
```

### Supabase Edge Functions (.env)

```env
SUPABASE_URL=https://efnorpyrsfoxooufujnd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=map-stats-tiles-prod
HF_SPACE_URL=https://prashant822k-phyto-golf-segmentation.hf.space
```

---

## Appendix B: Useful Commands

### Test HuggingFace Space

```bash
# Health check
curl https://prashant822k-phyto-golf-segmentation.hf.space/health

# Run inference (with test files)
curl -X POST "https://prashant822k-phyto-golf-segmentation.hf.space/infer" \
  -F "metadata=@metadata.json" \
  -F "tiles=@tiles.zip" \
  -o prediction.geojson
```

### Deploy Supabase Functions

```bash
cd supabase
supabase functions deploy model-inference
```

### Check Prediction in Database

```sql
SELECT * FROM model_predictions 
WHERE golf_club_id = '8028430f-500a-4144-980a-bb82089f3b74'
ORDER BY created_at DESC;
```

---

## Appendix C: Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Model not loaded" | HF Space sleeping | Wait 30s for cold start |
| Empty GeoJSON | No features detected | Check tile quality |
| CORS errors | Missing headers | Verify Edge Function CORS |
| 403 on R2 | Invalid credentials | Check R2 env vars |
| Overlay not visible | Wrong coordinates | Verify origin_x/y in metadata |
| Slow inference | Large tileset | Reduce zoom or area |

---

*Document Version: 1.0*
*Last Updated: December 10, 2025*
*Author: Prashant Kumar*
