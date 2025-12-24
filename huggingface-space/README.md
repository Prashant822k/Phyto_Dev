---
title: Phyto Golf Segmentation
emoji: 🏌️
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
---

# Phyto Golf Segmentation API

AI-powered golf course terrain segmentation using semantic segmentation.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 7860
```

### Docker

```bash
docker build -t phyto-golf-segmentation .
docker run -p 7860:7860 phyto-golf-segmentation
```

## 📡 API Endpoints

### `POST /infer`
Run segmentation on uploaded tiles.

**Request:**
- `metadata`: JSON file with tile positions
- `tiles`: ZIP file with PNG tiles

**Response:** GeoJSON FeatureCollection

### `GET /health`
Health check endpoint.

### `GET /classes`
Get class legend with colors.

## 📁 File Structure

```
app/
├── main.py           # FastAPI server
├── inference.py      # Model loading & prediction
├── postprocess.py    # Smoothing & polygonization
├── class_legend.json # Class definitions
└── model/
    └── full_model.h5 # Trained model (add this!)
```

## 🔄 Model Swap Instructions

To replace the model:

1. **Upload new model:**
   ```
   app/model/full_model.h5
   ```

2. **Update configuration in `inference.py`:**
   ```python
   TILE_SIZE = 512          # Change if different
   NUM_CLASSES = 8          # Change if different
   INPUT_SHAPE = (512, 512, 3)
   NORMALIZATION = "divide_255"  # or "imagenet" or "none"
   ```

3. **Update `CLASS_ID_TO_NAME` mapping** if classes changed

4. **Push to HuggingFace** - auto-rebuilds in ~5 minutes

## 📊 Metadata Format

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

## 🎨 Class Legend

| ID | Name | Color |
|----|------|-------|
| 0 | background | #000000 |
| 1 | fairway | #90EE90 |
| 2 | rough | #228B22 |
| 3 | green | #32CD32 |
| 4 | water | #4169E1 |
| 5 | bunker | #F4A460 |
| 6 | tree | #006400 |
| 7 | path | #8B4513 |

## 🔧 Post-processing Parameters

Adjust in `postprocess.py`:

```python
DEFAULT_GAUSS_KSIZE = 5
DEFAULT_BILATERAL_D = 7
DEFAULT_BILATERAL_SIGMA_COLOR = 0.1
DEFAULT_BILATERAL_SIGMA_SPACE = 7
DEFAULT_MIN_OBJECT_SIZE = 150
DEFAULT_SIMPLIFY_TOLERANCE = 1.0
```

## 📝 License

Proprietary - PhytoMaps
