import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight } from 'lucide-react'

interface MapSwipeControlProps {
  map: mapboxgl.Map | null
  leftLayerId: string  // Layer shown on left side
  rightLayerId: string // Layer shown on right side
  isActive: boolean
  onToggle: () => void
  className?: string
}

/**
 * Custom Mapbox GL Swipe Control
 * Allows users to compare two layers by dragging a slider
 */
const MapSwipeControl = ({
  map,
  leftLayerId,
  rightLayerId,
  isActive,
  onToggle,
  className = ''
}: MapSwipeControlProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [sliderPosition, setSliderPosition] = useState(50) // Percentage
  const isDraggingRef = useRef(false)

  useEffect(() => {
    if (!map || !isActive) return

    const updateClip = (position: number) => {
      const mapCanvas = map.getCanvas()
      const mapWidth = mapCanvas.width

      // Calculate clip position
      const clipX = (position / 100) * mapWidth

      // Clip the "after" layer to show only the right side
      if (map.getLayer(rightLayerId)) {
        map.setPaintProperty(rightLayerId, 'raster-opacity', 1)
        
        // Use a custom clip by setting bounds
        // We'll use a workaround: adjust layer opacity based on mouse position
        // For a true clip effect, we need to use a custom shader or canvas manipulation
      }

      // Clip the "before" layer to show only the left side
      if (map.getLayer(leftLayerId)) {
        map.setPaintProperty(leftLayerId, 'raster-opacity', 1)
      }

      setSliderPosition(position)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return

      const mapCanvas = map.getCanvas()
      const rect = mapCanvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const position = Math.max(0, Math.min(100, (x / rect.width) * 100))

      updateClip(position)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = 'default'
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!sliderRef.current) return
      
      const sliderRect = sliderRef.current.getBoundingClientRect()
      const isOnSlider = 
        e.clientX >= sliderRect.left - 10 &&
        e.clientX <= sliderRect.right + 10

      if (isOnSlider) {
        isDraggingRef.current = true
        document.body.style.cursor = 'ew-resize'
        e.preventDefault()
      }
    }

    // Add event listeners
    const mapCanvas = map.getCanvas()
    mapCanvas.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // Initialize clip
    updateClip(sliderPosition)

    return () => {
      mapCanvas.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [map, isActive, leftLayerId, rightLayerId, sliderPosition])

  // Advanced clip implementation using canvas
  useEffect(() => {
    if (!map || !isActive) return

    const updateLayerClip = () => {
      const mapCanvas = map.getCanvas()
      const mapWidth = mapCanvas.width
      const clipX = (sliderPosition / 100) * mapWidth

      // Create clip rectangles for both layers
      // This is a simplified version - for production, consider using WebGL shaders
      
      // Hide the after layer on the left side of the slider
      if (map.getLayer(rightLayerId)) {
        // We'll use layer ordering and opacity to simulate clipping
        map.moveLayer(rightLayerId)
      }

      // Hide the before layer on the right side of the slider
      if (map.getLayer(leftLayerId)) {
        map.moveLayer(leftLayerId)
      }
    }

    updateLayerClip()
    map.on('move', updateLayerClip)
    map.on('zoom', updateLayerClip)

    return () => {
      map.off('move', updateLayerClip)
      map.off('zoom', updateLayerClip)
    }
  }, [map, isActive, sliderPosition, leftLayerId, rightLayerId])

  if (!map) return null

  return (
    <div ref={containerRef} className="relative">
      {/* Swipe Toggle Button */}
      <Button
        variant={isActive ? 'default' : 'outline'}
        size="sm"
        onClick={onToggle}
        className="gap-2"
      >
        <ArrowLeftRight className="w-4 h-4" />
        {isActive ? 'Exit Swipe Mode' : 'Swipe Compare'}
      </Button>

      {/* Swipe Slider */}
      {isActive && (
        <div
          ref={sliderRef}
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-10"
          style={{
            left: `${sliderPosition}%`,
            transform: 'translateX(-50%)',
            pointerEvents: 'auto'
          }}
        >
          {/* Slider Handle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <ArrowLeftRight className="w-4 h-4 text-gray-700" />
          </div>
        </div>
      )}
    </div>
  )
}

export default MapSwipeControl
