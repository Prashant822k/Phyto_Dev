"""
Phyto Golf Segmentation API
FastAPI server for golf course terrain segmentation.

Endpoints:
- POST /infer: Run inference on uploaded tiles
- GET /health: Health check
- GET /classes: Get class legend
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import os

from app.inference import run_inference_pipeline

# Load class legend
CLASS_LEGEND_PATH = os.path.join(os.path.dirname(__file__), "class_legend.json")
with open(CLASS_LEGEND_PATH, "r") as f:
    CLASS_LEGEND = json.load(f)

app = FastAPI(
    title="Phyto Golf Segmentation API",
    description="AI-powered golf course terrain segmentation",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Phyto Golf Segmentation API",
        "version": "1.0.0",
        "endpoints": {
            "infer": "POST /infer - Run segmentation inference",
            "health": "GET /health - Health check",
            "classes": "GET /classes - Get class legend"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "model_loaded": True}


@app.get("/classes")
async def get_classes():
    """Return class legend for frontend styling."""
    return CLASS_LEGEND


@app.post("/infer")
async def infer(
    metadata: UploadFile = File(..., description="JSON file with tile positions and geo info"),
    tiles: UploadFile = File(..., description="ZIP file containing PNG tiles")
):
    """
    Run segmentation inference on uploaded tiles.
    
    Accepts:
    - metadata: JSON file with structure:
        {
            "tile_positions": [{"name": "0_0.png", "x": 0, "y": 0}, ...],
            "pixel_size": 0.5,
            "origin_x": 642000.0,
            "origin_y": 6688000.0,
            "crs": "EPSG:32632"
        }
    - tiles: ZIP file containing 512x512 PNG tiles
    
    Returns:
    - GeoJSON FeatureCollection with segmented polygons
    """
    try:
        # Validate file types
        if not metadata.filename.endswith('.json'):
            raise HTTPException(status_code=400, detail="Metadata must be a JSON file")
        
        if not tiles.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="Tiles must be a ZIP file")
        
        # Read uploaded files
        metadata_bytes = await metadata.read()
        tiles_bytes = await tiles.read()
        
        # Run inference pipeline
        geojson_output = run_inference_pipeline(metadata_bytes, tiles_bytes)
        
        return JSONResponse(content=geojson_output)
    
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in metadata: {str(e)}")
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing required field in metadata: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")


@app.post("/infer-single")
async def infer_single(
    tile: UploadFile = File(..., description="Single PNG tile (512x512)")
):
    """
    Run inference on a single tile (for testing).
    Returns raw class probabilities.
    """
    try:
        from app.inference import predict_single_tile
        
        tile_bytes = await tile.read()
        result = predict_single_tile(tile_bytes)
        
        return JSONResponse(content=result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
