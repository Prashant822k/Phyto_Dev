import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Button } from '@/components/ui/button';
import { MoveHorizontal, X } from 'lucide-react';

interface LayerSwipeProps {
  map: mapboxgl.Map | null;
  layerId: string | null;
  enabled: boolean;
  onToggle: () => void;
}

/**
 * Layer Swipe Control - Uses Mapbox's clip functionality
 * Actually removes the top layer to reveal layers beneath
 */
export const LayerSwipe = ({ map, layerId, enabled, onToggle }: LayerSwipeProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const clipLayerIdRef = useRef<string | null>(null);

  // Apply opacity-based reveal (simpler approach)
  const applyClip = useCallback((position: number) => {
    if (!map || !layerId || !enabled) return;

    const layer = map.getLayer(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found for clipping`);
      return;
    }

    // Simple approach: adjust opacity based on position
    // At 0%: layer is invisible (fully revealed beneath)
    // At 100%: layer is fully visible (nothing revealed)
    const opacity = position / 100;
    
    const layerType = layer.type;
    
    if (layerType === 'raster') {
      map.setPaintProperty(layerId, 'raster-opacity', opacity);
      console.log(`🎚️ Layer opacity: ${Math.round(opacity * 100)}%`);
    } else if (layerType === 'fill') {
      map.setPaintProperty(layerId, 'fill-opacity', opacity);
    } else if (layerType === 'line') {
      map.setPaintProperty(layerId, 'line-opacity', opacity);
    } else if (layerType === 'circle') {
      map.setPaintProperty(layerId, 'circle-opacity', opacity);
    }

  }, [map, layerId, enabled]);

  // Don't update on map move - causes flickering
  // Only update when slider position changes

  // Handle drag
  const handleDragStart = (clientX: number) => {
    if (!enabled) return;
    setIsDragging(true);
    updatePosition(clientX);
  };

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !enabled) return;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      updatePosition(clientX);
    });
  }, [isDragging, enabled]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const updatePosition = (clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    setSliderPosition(percentage);
  };

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX);
  }, [handleDragMove]);

  const onMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      handleDragStart(e.touches[0].clientX);
    }
  };

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      e.preventDefault();
      handleDragMove(e.touches[0].clientX);
    }
  }, [handleDragMove]);

  const onTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Apply clip when position changes
  useEffect(() => {
    applyClip(sliderPosition);
  }, [sliderPosition, applyClip]);

  // Event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);

      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };
    }
  }, [isDragging, onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  // Cleanup on disable - restore full opacity
  useEffect(() => {
    if (!enabled && map && layerId) {
      const layer = map.getLayer(layerId);
      if (!layer) return;
      
      const layerType = layer.type;
      
      // Restore full opacity
      if (layerType === 'raster') {
        map.setPaintProperty(layerId, 'raster-opacity', 1);
      } else if (layerType === 'fill') {
        map.setPaintProperty(layerId, 'fill-opacity', 1);
      } else if (layerType === 'line') {
        map.setPaintProperty(layerId, 'line-opacity', 1);
      } else if (layerType === 'circle') {
        map.setPaintProperty(layerId, 'circle-opacity', 1);
      }
    }
  }, [enabled, map, layerId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (map && layerId) {
        const layer = map.getLayer(layerId);
        if (!layer) return;
        
        const layerType = layer.type;
        
        // Restore full opacity
        if (layerType === 'raster') {
          map.setPaintProperty(layerId, 'raster-opacity', 1);
        } else if (layerType === 'fill') {
          map.setPaintProperty(layerId, 'fill-opacity', 1);
        } else if (layerType === 'line') {
          map.setPaintProperty(layerId, 'line-opacity', 1);
        } else if (layerType === 'circle') {
          map.setPaintProperty(layerId, 'circle-opacity', 1);
        }
      }
    };
  }, [map, layerId]);

  if (!map) return null;

  return (
    <div className="relative">
      {/* Toggle Button */}
      <Button
        variant={enabled ? 'default' : 'outline'}
        size="sm"
        onClick={onToggle}
        className="gap-2"
      >
        {enabled ? (
          <>
            <X className="w-4 h-4" />
            Exit Swipe
          </>
        ) : (
          <>
            <MoveHorizontal className="w-4 h-4" />
            Swipe Mode
          </>
        )}
      </Button>

      {/* Swipe Slider */}
      {enabled && layerId && (
        <div
          ref={containerRef}
          className="fixed inset-0 pointer-events-none z-[25]"
        >
          {/* Vertical slider line */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white/90 shadow-[0_0_15px_rgba(0,0,0,0.6)] pointer-events-auto cursor-ew-resize"
            style={{
              left: `${sliderPosition}%`,
              transform: 'translateX(-50%)',
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            {/* Slider handle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-28 bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-2 border-2 border-gray-300">
              {/* Grip dots */}
              <div className="flex flex-col gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  </div>
                ))}
              </div>
              
              {/* Arrows */}
              <div className="flex items-center gap-1 text-gray-600 text-sm font-bold">
                <span>◀</span>
                <span>▶</span>
              </div>
            </div>
          </div>

          {/* Position indicator */}
          <div
            className="absolute top-8 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg shadow-xl text-sm font-bold pointer-events-none border border-blue-400"
            style={{
              left: `${sliderPosition}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {Math.round(sliderPosition)}%
          </div>

          {/* Instructions */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-6 py-3 rounded-lg shadow-xl text-sm pointer-events-none">
            <div className="flex items-center gap-2">
              <MoveHorizontal className="w-4 h-4" />
              <span>Drag slider to reveal layers beneath</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayerSwipe;
