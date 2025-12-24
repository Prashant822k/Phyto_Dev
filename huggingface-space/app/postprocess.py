"""
Post-processing module for segmentation refinement.
Includes smoothing, small object removal, and polygonization.
"""

import numpy as np
import cv2
from typing import Dict, Any, Optional
from skimage.morphology import remove_small_objects
from rasterio.features import shapes
from shapely.geometry import shape, mapping


# ============================================================
# POST-PROCESSING CONFIGURATION - ADJUST AS NEEDED
# ============================================================
DEFAULT_GAUSS_KSIZE = 5
DEFAULT_BILATERAL_D = 7
DEFAULT_BILATERAL_SIGMA_COLOR = 0.1
DEFAULT_BILATERAL_SIGMA_SPACE = 7
DEFAULT_MIN_OBJECT_SIZE = 150
DEFAULT_SIMPLIFY_TOLERANCE = 1.0


def refine_probabilities(
    prob_map: np.ndarray,
    gauss_ksize: int = DEFAULT_GAUSS_KSIZE,
    bilateral_d: int = DEFAULT_BILATERAL_D,
    bilateral_sigma_color: float = DEFAULT_BILATERAL_SIGMA_COLOR,
    bilateral_sigma_space: int = DEFAULT_BILATERAL_SIGMA_SPACE,
    min_obj_size: int = DEFAULT_MIN_OBJECT_SIZE
) -> np.ndarray:
    """
    Apply CRF-like smoothing to probability map.
    
    Steps:
    1. Gaussian blur per class channel
    2. Bilateral filter for edge-aware smoothing
    3. Re-normalize probabilities
    4. Argmax to get class mask
    5. Remove small objects per class
    
    Args:
        prob_map: Softmax probabilities, shape (H, W, C)
        gauss_ksize: Gaussian kernel size (odd number)
        bilateral_d: Bilateral filter diameter
        bilateral_sigma_color: Bilateral color sigma
        bilateral_sigma_space: Bilateral space sigma
        min_obj_size: Minimum object size in pixels
    
    Returns:
        Refined mask, shape (H, W), uint8 with class IDs
    """
    H, W, C = prob_map.shape
    refined = np.zeros_like(prob_map, dtype=np.float32)
    
    # 1) Gaussian smoothing per class
    for c in range(C):
        refined[:, :, c] = cv2.GaussianBlur(
            prob_map[:, :, c],
            (gauss_ksize, gauss_ksize),
            0
        )
    
    # 2) Bilateral filter per class (edge-aware smoothing)
    for c in range(C):
        refined[:, :, c] = cv2.bilateralFilter(
            refined[:, :, c].astype(np.float32),
            d=bilateral_d,
            sigmaColor=bilateral_sigma_color,
            sigmaSpace=bilateral_sigma_space
        )
    
    # 3) Re-normalize probabilities
    refined_sum = np.clip(refined.sum(axis=-1, keepdims=True), 1e-8, None)
    refined /= refined_sum
    
    # 4) Argmax to get mask
    mask = np.argmax(refined, axis=-1).astype(np.uint8)
    
    # 5) Remove tiny speckles per class (except background)
    cleaned = np.zeros_like(mask, dtype=np.uint8)
    unique_classes = np.unique(mask)
    
    for c in unique_classes:
        binary = (mask == c)
        if c == 0:
            # Keep background as-is
            cleaned[binary] = 0
            continue
        # Remove small objects
        binary = remove_small_objects(binary, min_size=min_obj_size)
        cleaned[binary] = c
    
    return cleaned


def mask_to_polygons(
    full_mask: np.ndarray,
    transform,
    class_id_to_name: Dict[int, str],
    simplify_tolerance: float = DEFAULT_SIMPLIFY_TOLERANCE,
    crs: str = "EPSG:32632"
) -> Dict[str, Any]:
    """
    Convert raster mask to GeoJSON FeatureCollection.
    
    Args:
        full_mask: 2D array of class IDs (H, W)
        transform: Affine transform (pixel -> geo coordinates)
        class_id_to_name: Mapping from class_id to class_name
        simplify_tolerance: Polygon simplification tolerance
        crs: Coordinate reference system
    
    Returns:
        GeoJSON FeatureCollection
    """
    features = []
    
    # Class colors for styling
    CLASS_COLORS = {
        0: "#000000",  # background
        1: "#90EE90",  # fairway
        2: "#228B22",  # rough
        3: "#32CD32",  # green
        4: "#4169E1",  # water
        5: "#F4A460",  # bunker
        6: "#006400",  # tree
        7: "#8B4513",  # path
    }
    
    for geom, val in shapes(full_mask.astype(np.int16), transform=transform):
        class_id = int(val)
        
        # Skip background
        if class_id == 0:
            continue
        
        class_name = class_id_to_name.get(class_id, f"class_{class_id}")
        color = CLASS_COLORS.get(class_id, "#808080")
        
        try:
            poly = shape(geom)
            
            # Simplify polygon
            if simplify_tolerance and simplify_tolerance > 0:
                poly = poly.simplify(
                    tolerance=simplify_tolerance,
                    preserve_topology=True
                )
            
            # Skip invalid/empty geometries
            if poly.is_empty or not poly.is_valid:
                continue
            
            feat = {
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "class_id": class_id,
                    "class_name": class_name,
                    "color": color
                }
            }
            features.append(feat)
            
        except Exception as e:
            # Skip problematic geometries
            print(f"[WARNING] Skipping geometry: {e}")
            continue
    
    geojson = {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {"name": crs}
        },
        "features": features
    }
    
    return geojson


def refine_prediction_soft_crf_like(
    rgb_tile: np.ndarray,
    prob_map: np.ndarray,
    gauss_ksize: int = DEFAULT_GAUSS_KSIZE,
    bilateral_d: int = DEFAULT_BILATERAL_D,
    bilateral_sigma_color: float = DEFAULT_BILATERAL_SIGMA_COLOR,
    bilateral_sigma_space: int = DEFAULT_BILATERAL_SIGMA_SPACE,
    min_obj_size: int = DEFAULT_MIN_OBJECT_SIZE
) -> np.ndarray:
    """
    Alternative refinement using RGB tile for edge guidance.
    (Kept for compatibility with ML team's original code)
    """
    return refine_probabilities(
        prob_map,
        gauss_ksize=gauss_ksize,
        bilateral_d=bilateral_d,
        bilateral_sigma_color=bilateral_sigma_color,
        bilateral_sigma_space=bilateral_sigma_space,
        min_obj_size=min_obj_size
    )
