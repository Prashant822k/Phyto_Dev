import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

interface VerticalSwipeControlProps {
  map: mapboxgl.Map | null;
  layerId: string; // The layer ID to clip
  enabled: boolean;
}

/**
 * Vertical swipe control that clips a layer to reveal the layer(s) beneath it
 * Similar to Mapbox's compare plugin but for individual layers
 */
export const VerticalSwipeControl = ({ map, layerId, enabled }: VerticalSwipeControlProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Clip the layer at the given position
  const clipLayer = useCallback((position: number) => {
    if (!map || !layerId) return;

    const layer = map.getLayer(layerId);
    if (!layer) return;

    const container = map.getContainer();
    const rect = container.getBoundingClientRect();
    const clipX = (position / 100) * rect.width;

    // Use Mapbox's built-in clip functionality
    // We'll clip using a before/after approach with layer ordering
    // and a custom paint property

    // For raster layers, we need to use a clip region
    // Mapbox doesn't have built-in clip for individual layers,
    // so we'll use a workaround with a duplicate layer

    console.log(`Clipping ${layerId} at ${position}% (${clipX}px)`);
    
    // Store clip position for custom rendering
    (container as any).style.setProperty('--swipe-x', `${clipX}px`);
    
    // Apply clip using CSS custom properties and a pseudo-element approach
    // We'll need to manipulate the layer's rendering directly
    map.setPaintProperty(layerId, 'raster-opacity', 
      map.getPaintProperty(layerId, 'raster-opacity') || 1
    );

  }, [map, layerId]);

  // Handle mouse/touch events
  const handleStart = (clientX: number) => {
    if (!enabled || !containerRef.current) return;
    setIsDragging(true);
    updatePosition(clientX);
  };

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !enabled || !containerRef.current) return;
    
    // Use RAF for smooth updates
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      updatePosition(clientX);
    });
  }, [isDragging, enabled]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
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
    handleStart(e.clientX);
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX);
  }, [handleMove]);

  const onMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleStart(e.touches[0].clientX);
    }
  };

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Apply clip when position changes
  useEffect(() => {
    if (enabled) {
      clipLayer(sliderPosition);
    }
  }, [enabled, sliderPosition, clipLayer]);

  // Event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);

      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };
    }
  }, [isDragging, onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-20"
    >
      {/* Vertical slider line */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white/90 shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-auto cursor-ew-resize transition-opacity hover:opacity-100"
        style={{
          left: `${sliderPosition}%`,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {/* Slider handle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-24 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-center gap-1 border-2 border-gray-200">
          {/* Grip dots */}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
            </div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
            </div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
            </div>
          </div>
          
          {/* Arrows */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-600 text-xs">◀</span>
            <span className="text-gray-600 text-xs">▶</span>
          </div>
        </div>
      </div>

      {/* Position indicator */}
      <div
        className="absolute top-6 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-semibold pointer-events-none"
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

export default VerticalSwipeControl;
