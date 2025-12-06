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
 * Layer Swipe Control - Uses a clip mask approach
 * Creates a wrapper div over the map that clips the view
 */
export const LayerSwipe = ({ map, layerId, enabled, onToggle }: LayerSwipeProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const clipMaskRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  // Apply visual clip using an overlay mask
  const applyClip = useCallback((position: number) => {
    if (!map || !layerId || !enabled || !clipMaskRef.current) return;

    const layer = map.getLayer(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} not found for clipping`);
      return;
    }

    // Use a semi-transparent overlay to create the swipe effect
    // The overlay covers the right side of the map
    const clipPercentage = 100 - position;
    clipMaskRef.current.style.width = `${clipPercentage}%`;
    
    console.log(`🎚️ Clipping at ${position}%`);
  }, [map, layerId, enabled]);

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

      {/* Swipe Overlay - This creates the clip effect */}
      {enabled && layerId && (
        <>
          {/* Clip Mask - Semi-transparent overlay on the right side */}
          <div
            ref={clipMaskRef}
            className="fixed top-0 right-0 bottom-0 bg-black/30 pointer-events-none z-[24]"
            style={{
              width: `${100 - sliderPosition}%`,
            }}
          />

          {/* Slider Container */}
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
        </>
      )}
    </div>
  );
};

export default LayerSwipe;
