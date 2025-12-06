import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

interface LayerComparisonSliderProps {
  map: mapboxgl.Map | null;
  enabled: boolean;
  topLayerId: string | null; // The layer to clip (top layer)
  orientation?: 'vertical' | 'horizontal';
}

export const LayerComparisonSlider = ({ 
  map, 
  enabled, 
  topLayerId,
  orientation = 'vertical' 
}: LayerComparisonSliderProps) => {
  const [sliderPosition, setSliderPosition] = useState(50); // Percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply clip to the top layer
  const applyLayerClip = useCallback((position: number) => {
    if (!map || !topLayerId) return;

    const layer = map.getLayer(topLayerId);
    if (!layer) {
      console.warn(`Layer ${topLayerId} not found`);
      return;
    }

    const container = map.getContainer();
    const rect = container.getBoundingClientRect();

    if (orientation === 'vertical') {
      // Vertical slider - clip horizontally
      const clipX = (position / 100) * rect.width;
      
      // Use Mapbox's setFilter with a spatial filter
      // For raster layers, we need to use a different approach
      if (layer.type === 'raster') {
        // Create a clip using CSS on the canvas overlay
        const clipValue = `inset(0 ${100 - position}% 0 0)`;
        
        // Find the specific layer's rendering and clip it
        // We'll use a custom property to track which layers to clip
        map.setPaintProperty(topLayerId, 'raster-opacity', 
          map.getPaintProperty(topLayerId, 'raster-opacity') || 0.7
        );
        
        // Store clip position for rendering
        (map as any)._layerClipPosition = {
          layerId: topLayerId,
          position: clipX,
          orientation: 'vertical'
        };
      }
    } else {
      // Horizontal slider - clip vertically
      const clipY = (position / 100) * rect.height;
      
      (map as any)._layerClipPosition = {
        layerId: topLayerId,
        position: clipY,
        orientation: 'horizontal'
      };
    }

    // Trigger a repaint
    map.triggerRepaint();
    
    console.log(`🎚️ Clipping ${topLayerId} at ${position}%`);
  }, [map, topLayerId, orientation]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enabled) return;
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !enabled) return;
    updatePosition(e.clientX, e.clientY);
  }, [isDragging, enabled]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    
    let percentage: number;
    if (orientation === 'vertical') {
      const x = clientX - rect.left;
      percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    } else {
      const y = clientY - rect.top;
      percentage = Math.max(0, Math.min(100, (y / rect.height) * 100));
    }
    
    setSliderPosition(percentage);
  };

  // Apply clip when position changes
  useEffect(() => {
    if (enabled && topLayerId) {
      applyLayerClip(sliderPosition);
    }
  }, [enabled, topLayerId, sliderPosition, applyLayerClip]);

  // Mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount or disable
  useEffect(() => {
    return () => {
      if (map && topLayerId) {
        delete (map as any)._layerClipPosition;
        map.triggerRepaint();
      }
    };
  }, [map, topLayerId]);

  if (!enabled || !topLayerId) return null;

  const isVertical = orientation === 'vertical';

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-[15]"
    >
      {/* Slider line */}
      <div
        className={`absolute bg-white shadow-lg pointer-events-auto ${
          isVertical 
            ? 'top-0 bottom-0 w-1 cursor-ew-resize' 
            : 'left-0 right-0 h-1 cursor-ns-resize'
        }`}
        style={isVertical 
          ? { left: `${sliderPosition}%`, transform: 'translateX(-50%)' }
          : { top: `${sliderPosition}%`, transform: 'translateY(-50%)' }
        }
        onMouseDown={handleMouseDown}
      >
        {/* Slider handle */}
        <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl flex items-center justify-center ${
          isVertical ? 'w-10 h-20' : 'w-20 h-10'
        }`}>
          <div className={`flex gap-1 ${isVertical ? 'flex-col' : 'flex-row'}`}>
            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full"></div>
          </div>
        </div>

        {/* Arrows */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {isVertical ? (
            <>
              <div className="absolute -left-8 text-white text-xs font-bold">◀</div>
              <div className="absolute -right-8 text-white text-xs font-bold">▶</div>
            </>
          ) : (
            <>
              <div className="absolute -top-8 text-white text-xs font-bold">▲</div>
              <div className="absolute -bottom-8 text-white text-xs font-bold">▼</div>
            </>
          )}
        </div>
      </div>

      {/* Position indicator */}
      <div
        className="absolute bg-white/95 px-3 py-1.5 rounded-lg shadow-lg text-xs font-semibold pointer-events-none border border-gray-200"
        style={isVertical
          ? { left: `${sliderPosition}%`, top: '20px', transform: 'translateX(-50%)' }
          : { top: `${sliderPosition}%`, left: '20px', transform: 'translateY(-50%)' }
        }
      >
        {Math.round(sliderPosition)}%
      </div>
    </div>
  );
};

export default LayerComparisonSlider;
