"""
Inference module for golf course segmentation.
Handles model loading, tile stitching, prediction, and GeoJSON output.
"""

import io
import zipfile
import json
import numpy as np
import cv2
import tensorflow as tf
import os

from rasterio.transform import from_origin
from app.postprocess import refine_probabilities, mask_to_polygons

# ============================================================
# MODEL CONFIGURATION - UPDATE THESE WHEN SWAPPING MODELS
# ============================================================
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "full_model.h5")
TILE_SIZE = 512
NUM_CLASSES = 8
INPUT_SHAPE = (512, 512, 3)
NORMALIZATION = "divide_255"  # Options: "divide_255", "imagenet", "none"

# Class ID to name mapping (must match model training)
CLASS_ID_TO_NAME = {
    0: "background",
    1: "fairway",
    2: "rough",
    3: "green",
    4: "water",
    5: "bunker",
    6: "tree",
    7: "path"
}

# ============================================================
# MODEL LOADING
# ============================================================
print(f"[INFO] Loading model from: {MODEL_PATH}")
print(f"[INFO] TensorFlow version: {tf.__version__}")

# Check if model exists and load
if os.path.exists(MODEL_PATH):
    try:
        model = tf.keras.models.load_model(MODEL_PATH, compile=False)
        print(f"[INFO] Model loaded successfully. Input shape: {model.input_shape}")
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}")
        model = None
else:
    print(f"[WARNING] Model not found at {MODEL_PATH}. Using mock predictions.")
    model = None


def preprocess_tile(img: np.ndarray) -> np.ndarray:
    """
    Preprocess a tile for model input.
    
    Args:
        img: BGR image from cv2.imread, shape (H, W, 3)
    
    Returns:
        Preprocessed image ready for model, shape (1, H, W, 3)
    """
    # Convert BGR to RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Resize if needed
    if img.shape[:2] != (TILE_SIZE, TILE_SIZE):
        img = cv2.resize(img, (TILE_SIZE, TILE_SIZE))
    
    # Normalize based on configuration
    img = img.astype(np.float32)
    
    if NORMALIZATION == "divide_255":
        img = img / 255.0
    elif NORMALIZATION == "imagenet":
        # ImageNet mean subtraction
        img[:, :, 0] -= 103.939
        img[:, :, 1] -= 116.779
        img[:, :, 2] -= 123.68
    # else: no normalization
    
    # Add batch dimension
    return np.expand_dims(img, axis=0)


def load_tiles_from_zip(zip_bytes: bytes) -> dict:
    """
    Extract PNG tiles from uploaded ZIP file.
    
    Args:
        zip_bytes: Raw bytes of ZIP file
    
    Returns:
        Dictionary mapping tile names to numpy arrays {name: np.ndarray}
    """
    tile_dict = {}
    zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    
    for name in zf.namelist():
        if name.lower().endswith(".png"):
            img_data = zf.read(name)
            img_array = cv2.imdecode(
                np.frombuffer(img_data, np.uint8), 
                cv2.IMREAD_COLOR
            )
            if img_array is not None:
                # Use just the filename, not full path
                tile_name = os.path.basename(name)
                tile_dict[tile_name] = img_array
    
    print(f"[INFO] Loaded {len(tile_dict)} tiles from ZIP")
    return tile_dict


def predict_single_tile(tile_bytes: bytes) -> dict:
    """
    Run inference on a single tile (for testing).
    
    Args:
        tile_bytes: Raw PNG bytes
    
    Returns:
        Dictionary with class probabilities
    """
    img_array = cv2.imdecode(
        np.frombuffer(tile_bytes, np.uint8),
        cv2.IMREAD_COLOR
    )
    
    inp = preprocess_tile(img_array)
    
    if model is not None:
        probs = model.predict(inp, verbose=0)[0]
    else:
        # Mock prediction
        probs = np.random.rand(TILE_SIZE, TILE_SIZE, NUM_CLASSES)
        probs = probs / probs.sum(axis=-1, keepdims=True)
    
    # Get class distribution
    mask = np.argmax(probs, axis=-1)
    unique, counts = np.unique(mask, return_counts=True)
    total_pixels = mask.size
    
    class_distribution = {}
    for cls_id, count in zip(unique, counts):
        class_name = CLASS_ID_TO_NAME.get(int(cls_id), f"class_{cls_id}")
        class_distribution[class_name] = {
            "class_id": int(cls_id),
            "pixel_count": int(count),
            "percentage": round(count / total_pixels * 100, 2)
        }
    
    return {
        "tile_size": [TILE_SIZE, TILE_SIZE],
        "num_classes": NUM_CLASSES,
        "class_distribution": class_distribution
    }


def run_inference_pipeline(metadata_bytes: bytes, tiles_bytes: bytes) -> dict:
    """
    Full end-to-end inference pipeline.
    
    Steps:
    1. Parse metadata JSON
    2. Load tiles from ZIP
    3. Stitch tiles into full canvas
    4. Run model prediction on each tile
    5. Apply post-processing (smoothing, small object removal)
    6. Convert to GeoJSON polygons
    
    Args:
        metadata_bytes: JSON bytes with tile positions and geo info
        tiles_bytes: ZIP bytes containing PNG tiles
    
    Returns:
        GeoJSON FeatureCollection
    """
    # ---- 1. Load metadata ----
    metadata = json.loads(metadata_bytes.decode("utf-8"))
    tile_positions = metadata["tile_positions"]
    pixel_size = metadata.get("pixel_size", 0.5)
    origin_x = metadata.get("origin_x", 0)
    origin_y = metadata.get("origin_y", 0)
    crs = metadata.get("crs", "EPSG:32632")
    
    print(f"[INFO] Metadata: {len(tile_positions)} tiles, pixel_size={pixel_size}, origin=({origin_x}, {origin_y})")
    
    # ---- 2. Load tiles from ZIP ----
    tiles = load_tiles_from_zip(tiles_bytes)
    
    if len(tiles) == 0:
        raise ValueError("No valid PNG tiles found in ZIP file")
    
    # ---- 3. Determine canvas size ----
    max_x = max([pos["x"] for pos in tile_positions])
    max_y = max([pos["y"] for pos in tile_positions])
    
    full_w = (max_x + 1) * TILE_SIZE
    full_h = (max_y + 1) * TILE_SIZE
    
    print(f"[INFO] Canvas size: {full_w}x{full_h} pixels")
    
    # ---- 4. Build probability canvas ----
    full_prob = np.zeros((full_h, full_w, NUM_CLASSES), dtype=np.float32)
    
    # ---- 5. Predict each tile ----
    for pos in tile_positions:
        tile_name = pos["name"]
        x, y = pos["x"], pos["y"]
        
        # Find tile in loaded tiles
        if tile_name not in tiles:
            # Try without path
            base_name = os.path.basename(tile_name)
            if base_name not in tiles:
                print(f"[WARNING] Tile not found: {tile_name}")
                continue
            tile_name = base_name
        
        img = tiles[tile_name]
        inp = preprocess_tile(img)
        
        # Run prediction
        if model is not None:
            probs = model.predict(inp, verbose=0)[0]  # (512, 512, 8)
        else:
            # Mock prediction for testing
            probs = np.random.rand(TILE_SIZE, TILE_SIZE, NUM_CLASSES).astype(np.float32)
            probs = probs / probs.sum(axis=-1, keepdims=True)
        
        # Place into canvas
        y0 = y * TILE_SIZE
        x0 = x * TILE_SIZE
        full_prob[y0:y0+TILE_SIZE, x0:x0+TILE_SIZE, :] = probs
    
    print(f"[INFO] Prediction complete. Running post-processing...")
    
    # ---- 6. Post-processing ----
    refined_mask = refine_probabilities(full_prob)
    
    # ---- 7. Polygonization ----
    transform = from_origin(origin_x, origin_y, pixel_size, pixel_size)
    geojson_output = mask_to_polygons(
        refined_mask, 
        transform, 
        CLASS_ID_TO_NAME,
        crs=crs
    )
    
    print(f"[INFO] Generated {len(geojson_output.get('features', []))} polygons")
    
    return geojson_output
