# Model Integration Guide

## Overview

The golf course segmentation model is hosted on **HuggingFace Spaces** using FastAPI + Docker. The frontend communicates with it via REST API.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   Frontend  │────▶│  R2 Storage  │────▶│  HuggingFace Space  │
│  (React)    │     │  (Tiles)     │     │  (FastAPI + TF)     │
└─────────────┘     └──────────────┘     └─────────────────────┘
       │                                           │
       │                                           ▼
       │                                  ┌─────────────────┐
       │                                  │  GeoJSON Output │
       │                                  └────────┬────────┘
       │                                           │
       ▼                                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    R2: model_predictions/                    │
│                    (Stored GeoJSON results)                  │
└─────────────────────────────────────────────────────────────┘
```

## File Locations

| Component | Location |
|-----------|----------|
| HuggingFace Space files | `huggingface-space/` |
| Frontend inference service | `frontend/src/lib/modelInferenceService.ts` |
| R2 prediction endpoints | `workers/tile-upload/src/index.ts` |

## Environment Variables

Add to `.env`:

```env
# HuggingFace Space URL (after deployment)
VITE_HF_SPACE_URL=https://<username>-phyto-golf-segmentation.hf.space
```

---

## How to Deploy the Model

### Step 1: Create HuggingFace Space

1. Go to https://huggingface.co/spaces
2. Click **Create Space**
3. Settings:
   - **SDK**: Docker
   - **Hardware**: CPU (free tier)
   - **Visibility**: Private
   - **Name**: `phyto-golf-segmentation`

### Step 2: Upload Files

Upload the contents of `huggingface-space/` folder:

```
huggingface-space/
├── Dockerfile
├── requirements.txt
├── README.md
└── app/
    ├── __init__.py
    ├── main.py
    ├── inference.py
    ├── postprocess.py
    ├── class_legend.json
    └── model/
        └── full_model.h5   ← ADD YOUR MODEL HERE
```

### Step 3: Add Model File

Upload `full_model.h5` to `app/model/` folder.

### Step 4: Push & Deploy

```bash
git add .
git commit -m "Deploy model"
git push
```

HuggingFace will auto-build (~5-10 minutes).

### Step 5: Update Frontend

Add to `.env`:

```env
VITE_HF_SPACE_URL=https://<username>-phyto-golf-segmentation.hf.space
```

---

## How to Swap Models

### Quick Swap (Same Architecture)

If the new model has the **same input/output shape**:

1. Replace `app/model/full_model.h5` with new model
2. Push to HuggingFace
3. Wait for rebuild (~5 min)
4. Done!

### Full Swap (Different Architecture)

If the model has **different input shape, classes, or preprocessing**:

#### 1. Update `inference.py`

```python
# ============================================================
# MODEL CONFIGURATION - UPDATE THESE WHEN SWAPPING MODELS
# ============================================================
MODEL_PATH = "app/model/full_model.h5"
TILE_SIZE = 512          # ← Change if different
NUM_CLASSES = 8          # ← Change if different
INPUT_SHAPE = (512, 512, 3)
NORMALIZATION = "divide_255"  # Options: "divide_255", "imagenet", "none"

# Class ID to name mapping
CLASS_ID_TO_NAME = {
    0: "background",
    1: "fairway",
    # ... update if classes changed
}
```

#### 2. Update `class_legend.json`

```json
{
  "classes": [
    {"class_id": 0, "class_name": "background", "color": "#000000"},
    {"class_id": 1, "class_name": "fairway", "color": "#90EE90"}
    // ... add/remove classes
  ],
  "num_classes": 8,
  "model_input_shape": [512, 512, 3]
}
```

#### 3. Update `postprocess.py` (if needed)

```python
DEFAULT_GAUSS_KSIZE = 5
DEFAULT_MIN_OBJECT_SIZE = 150
# ... adjust smoothing parameters
```

#### 4. Push & Rebuild

```bash
git add .
git commit -m "Update model configuration"
git push
```

---

## API Reference

### `POST /infer`

Run segmentation inference.

**Request:**
```
Content-Type: multipart/form-data

metadata: JSON file
tiles: ZIP file
```

**Metadata format:**
```json
{
  "tile_positions": [
    {"name": "0_0.png", "x": 0, "y": 0},
    {"name": "1_0.png", "x": 1, "y": 0}
  ],
  "pixel_size": 0.5,
  "origin_x": 642000.0,
  "origin_y": 6688000.0,
  "crs": "EPSG:32632"
}
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Polygon", "coordinates": [...] },
      "properties": {
        "class_id": 4,
        "class_name": "water",
        "color": "#4169E1"
      }
    }
  ]
}
```

### `GET /health`

Health check.

**Response:**
```json
{"status": "healthy", "model_loaded": true}
```

### `GET /classes`

Get class legend.

**Response:**
```json
{
  "classes": [...],
  "num_classes": 8
}
```

---

## Frontend Usage

```typescript
import { modelInferenceService } from '@/lib/modelInferenceService';

// Run inference
const result = await modelInferenceService.runInference(
  metadata,
  tilesZipFile,
  courseId,
  (status) => console.log(status)
);

// Result contains:
// - geojson: GeoJSON FeatureCollection
// - predictionId: Unique ID
// - storedUrl: R2 URL for the stored prediction

// Load prediction on Mapbox
map.addSource('prediction', {
  type: 'geojson',
  data: result.geojson
});

map.addLayer({
  id: 'prediction-fill',
  type: 'fill',
  source: 'prediction',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': 0.6
  }
});
```

---

## R2 Storage Structure

Predictions are stored in R2 under each course:

```
{courseId}/
├── tiles/
│   └── {z}/{x}/{y}.png
└── model_predictions/
    ├── prediction_2025-12-10T14-30-00.geojson
    └── prediction_2025-12-10T15-45-00.geojson
```

---

## Troubleshooting

### Model not loading

Check HuggingFace Space logs:
1. Go to your Space
2. Click "Logs" tab
3. Look for errors during startup

### Inference timeout

- HuggingFace free tier has 60s timeout
- For large areas, split into smaller batches
- Consider upgrading to GPU tier

### Wrong predictions

1. Verify preprocessing matches training:
   - Normalization method
   - Channel order (RGB vs BGR)
   - Input size
2. Check class mapping matches model output order

### CORS errors

The FastAPI app includes CORS middleware. If issues persist:
1. Check `VITE_HF_SPACE_URL` is correct
2. Ensure Space is running (not sleeping)
