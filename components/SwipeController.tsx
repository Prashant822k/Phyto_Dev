import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';

type Props = {
  enabled: boolean;
  position: number; // 0..1
  onPositionChange: (x: number) => void;
  onExit: () => void;
};

// Placeholder swipe UI with draggable vertical divider and keyboard support.
// Integration with mapbox-gl-compare or layer masking is left for the next step.
export default function SwipeController({ enabled, position, onPositionChange, onExit }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPositionChange(Math.max(0, position - 0.02));
      if (e.key === 'ArrowRight') onPositionChange(Math.min(1, position + 0.02));
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, onExit, position, onPositionChange]);

  if (!enabled) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const move = (clientX: number) => onPositionChange(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
    move(e.clientX);
    const onMove = (ev: PointerEvent) => move(ev.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div ref={trackRef} className="pointer-events-none absolute inset-0 z-20">
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        onPointerDown={onPointerDown}
        style={{ left: `${position * 100}%`, transform: 'translateX(-50%)' }}
        className="pointer-events-auto absolute top-0 h-full w-1 bg-white/70 shadow"
      >
        <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-16 bg-black/60 text-white rounded flex items-center justify-center cursor-col-resize">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>
      <div className="absolute top-3 right-3 pointer-events-auto">
        <Button size="sm" variant="secondary" onClick={onExit}>
          <X className="w-4 h-4 mr-1" /> Exit Swipe
        </Button>
      </div>
    </div>
  );
}
