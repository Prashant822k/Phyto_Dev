import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

interface MapLayerSliderProps {
  map: mapboxgl.Map | null;
  enabled: boolean;
  layerIds: string[]; // Array of layer IDs in order from top to bottom
}

export const MapLayerSlider = ({ map, enabled, layerIds }: MapLayerSliderProps) => {
  const [sliderPosition, setSliderPosition] = useState(50); // Percentage from left
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!map || !enabled || layerIds.length < 2) return;

    console.log('🎚️ Layer slider enabled with layers:', layerIds);

    // Apply clip to top layer based on slider position
    const applyClip = (position: number) => {
      const topLayerId = layerIds[0]; // First layer is on top
      
      if (!map.getLayer(topLayerId)) {
        console.warn(`Layer ${topLayerId} not found on map`);
        return;
      }

      // Get map container dimensions
      const mapContainer = map.getContainer();
      const bounds = map.getBounds();
      const nw = bounds.getNorthWest();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const se = bounds.getSouthEast();

      // Calculate the longitude at the slider position
      const lngRange = ne.lng - nw.lng;
      const clipLng = nw.lng + (lngRange * position / 100);

      console.log(`🎚️ Clipping ${topLayerId} at ${position}% (lng: ${clipLng})`);

      // Create a filter that only shows the layer to the left of the slider
      // For raster layers, we need to use a different approach
      const layerType = map.getLayer(topLayerId)?.type;
      
      if (layerType === 'raster') {
        // For raster layers, we'll use a clip region
        // Create a polygon that covers the left side of the map
        const clipPolygon: [number, number][][] = [[
          [nw.lng, nw.lat],
          [clipLng, ne.lat],
          [clipLng, se.lat],
          [sw.lng, sw.lat],
          [nw.lng, nw.lat]
        ]];

        // We'll need to add a mask layer approach
        // For now, use CSS clip-path on the specific layer's canvas
        const canvases = mapContainer.querySelectorAll('canvas');
        canvases.forEach((canvas) => {
          const clipPercentage = position;
          (canvas as HTMLCanvasElement).style.clipPath = `inset(0 ${100 - clipPercentage}% 0 0)`;
        });
      } else {
        // For vector layers, we can use filters
        // This will be implemented when we support vector layer dragging
      }
    };

    applyClip(sliderPosition);

    return () => {
      // Reset clip when disabled
      const mapContainer = map.getContainer();
      const canvases = mapContainer.querySelectorAll('canvas');
      canvases.forEach((canvas) => {
        (canvas as HTMLCanvasElement).style.clipPath = '';
      });
    };
  }, [map, enabled, layerIds, sliderPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enabled) return;
    setIsDragging(true);
    updateSliderPosition(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !enabled) return;
    updateSliderPosition(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateSliderPosition = (clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    setSliderPosition(percentage);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ cursor: isDragging ? 'ew-resize' : 'default' }}
    >
      {/* Vertical slider line */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-auto cursor-ew-resize"
        style={{
          left: `${sliderPosition}%`,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Slider handle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-16 bg-white rounded-lg shadow-xl flex items-center justify-center">
          <div className="flex flex-col gap-1">
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Position indicator */}
      <div
        className="absolute top-4 bg-white/90 px-3 py-1 rounded-lg shadow-lg text-sm font-medium pointer-events-none"
        style={{
          left: `${sliderPosition}%`,
          transform: 'translateX(-50%)',
        }}
      >
        {Math.round(sliderPosition)}%
      </div>
    </div>
  );
};

export default MapLayerSlider;
