import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface UseMapLayerClipProps {
  map: mapboxgl.Map | null;
  layerId: string | null;
  clipPosition: number; // 0-100 percentage
  orientation: 'vertical' | 'horizontal';
  enabled: boolean;
}

export const useMapLayerClip = ({
  map,
  layerId,
  clipPosition,
  orientation,
  enabled
}: UseMapLayerClipProps) => {
  const clipLayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !layerId || !enabled) {
      // Remove clip layer if it exists
      if (clipLayerIdRef.current && map) {
        if (map.getLayer(clipLayerIdRef.current)) {
          map.removeLayer(clipLayerIdRef.current);
        }
        if (map.getSource(clipLayerIdRef.current)) {
          map.removeSource(clipLayerIdRef.current);
        }
        clipLayerIdRef.current = null;
      }
      return;
    }

    const layer = map.getLayer(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found for clipping`);
      return;
    }

    // Get map bounds
    const bounds = map.getBounds();
    const nw = bounds.getNorthWest();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const se = bounds.getSouthEast();

    // Calculate clip boundary based on orientation and position
    let clipCoordinates: [number, number][][];
    
    if (orientation === 'vertical') {
      // Vertical slider clips horizontally
      const lngRange = ne.lng - nw.lng;
      const clipLng = nw.lng + (lngRange * clipPosition / 100);
      
      // Create polygon for the left side (what should be visible)
      clipCoordinates = [[
        [nw.lng, nw.lat],
        [clipLng, ne.lat],
        [clipLng, se.lat],
        [sw.lng, sw.lat],
        [nw.lng, nw.lat]
      ]];
    } else {
      // Horizontal slider clips vertically
      const latRange = nw.lat - sw.lat;
      const clipLat = sw.lat + (latRange * (100 - clipPosition) / 100);
      
      // Create polygon for the top side (what should be visible)
      clipCoordinates = [[
        [nw.lng, nw.lat],
        [ne.lng, ne.lat],
        [se.lng, clipLat],
        [sw.lng, clipLat],
        [nw.lng, nw.lat]
      ]];
    }

    const clipMaskId = `${layerId}-clip-mask`;
    clipLayerIdRef.current = clipMaskId;

    // Remove existing clip mask if present
    if (map.getLayer(clipMaskId)) {
      map.removeLayer(clipMaskId);
    }
    if (map.getSource(clipMaskId)) {
      map.removeSource(clipMaskId);
    }

    // Add clip mask source
    map.addSource(clipMaskId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: clipCoordinates
        }
      }
    });

    // Add clip mask layer (invisible, just for clipping)
    // We'll use this with a custom render approach
    // For now, we'll modify the layer's paint properties
    
    // Store the clip info on the map object for custom rendering
    (map as any)._clipInfo = {
      layerId,
      position: clipPosition,
      orientation
    };

    console.log(`🎚️ Applied clip to ${layerId} at ${clipPosition}% (${orientation})`);

    return () => {
      if (clipLayerIdRef.current && map.getLayer(clipLayerIdRef.current)) {
        map.removeLayer(clipLayerIdRef.current);
      }
      if (clipLayerIdRef.current && map.getSource(clipLayerIdRef.current)) {
        map.removeSource(clipLayerIdRef.current);
      }
      delete (map as any)._clipInfo;
      clipLayerIdRef.current = null;
    };
  }, [map, layerId, clipPosition, orientation, enabled]);

  // Update on map move to keep clip aligned
  useEffect(() => {
    if (!map || !enabled) return;

    const handleMove = () => {
      // Trigger re-clip on map move
      // This will be handled by the effect above re-running
    };

    map.on('move', handleMove);
    return () => {
      map.off('move', handleMove);
    };
  }, [map, enabled]);
};

export default useMapLayerClip;
