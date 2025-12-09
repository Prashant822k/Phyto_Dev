# Vector Layer System - Integration Guide

## Overview

This guide shows you how to integrate the vector layer system into your existing golf course map views.

## 🎯 Two Integration Options

### Option 1: Standalone Comparison View (Already Implemented)
- Separate route: `/vector-layers/:golfCourseId`
- Full-screen swipe comparison
- Dedicated layer management interface

### Option 2: Integrate into Main Map View (Recommended)
- Add layer panel to existing map
- Keep all existing functionality
- Add vector layer overlay capability

---

## 🔧 Option 2: Main Map Integration

### Step 1: Update Your Map Component

Find your main golf course map component (likely `MapboxGolfCourseMap` or similar) and add the vector layer manager:

```tsx
import { useState } from 'react'
import { VectorLayerManager } from '@/components/VectorLayerManager'
import { useVectorLayers } from '@/hooks/useVectorLayers'
import { Button } from '@/components/ui/button'
import { Layers } from 'lucide-react'

function GolfCourseMapView({ golfClubId }) {
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const { layers, activeLayers, toggleLayer } = useVectorLayers(golfClubId)

  return (
    <div className="relative w-full h-full">
      {/* Your existing map component */}
      <MapboxGolfCourseMap
        golfClubId={golfClubId}
        // ... other props
      />

      {/* Layer Panel Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 right-4 z-10"
        onClick={() => setShowLayerPanel(!showLayerPanel)}
      >
        <Layers className="w-5 h-5" />
      </Button>

      {/* Layer Manager Panel */}
      {showLayerPanel && (
        <div className="absolute top-16 right-4 z-10">
          <VectorLayerManager
            golfCourseId={golfClubId}
            onLayerToggle={toggleLayer}
            className="w-80 max-h-[calc(100vh-5rem)] overflow-auto"
          />
        </div>
      )}

      {/* Render active vector layers on the map */}
      {/* This will be handled by VectorLayerMap component */}
    </div>
  )
}
```

### Step 2: Add Vector Layer Rendering

Create a new component to render vector layers on your existing map:

```tsx
// src/components/MapVectorLayerOverlay.tsx
import { useEffect } from 'react'
import mapboxgl from 'mapbox-gl'

interface MapVectorLayerOverlayProps {
  map: mapboxgl.Map | null
  layers: VectorLayer[]
  activeLayers: string[]
}

export function MapVectorLayerOverlay({
  map,
  layers,
  activeLayers
}: MapVectorLayerOverlayProps) {
  useEffect(() => {
    if (!map) return

    // Remove all existing vector layer sources and layers
    layers.forEach(layer => {
      const sourceId = `vector-layer-${layer.id}`
      const layerId = `vector-layer-${layer.id}`
      
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId)
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId)
      }
    })

    // Add active layers
    const activeLayerData = layers
      .filter(layer => activeLayers.includes(layer.id))
      .sort((a, b) => a.z_index - b.z_index)

    activeLayerData.forEach(async (layer) => {
      try {
        // Fetch GeoJSON from R2
        const response = await fetch(layer.url || layer.urlWithCache)
        const geojson = await response.json()

        const sourceId = `vector-layer-${layer.id}`
        const layerId = `vector-layer-${layer.id}`

        // Add source
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        })

        // Determine layer type based on geometry
        const geometryType = geojson.features[0]?.geometry?.type

        if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
          // Add fill layer
          map.addLayer({
            id: `${layerId}-fill`,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': layer.style?.fillColor || '#3F51B5',
              'fill-opacity': layer.style?.fillOpacity || 0.5
            }
          })

          // Add outline layer
          map.addLayer({
            id: `${layerId}-outline`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': layer.style?.strokeColor || '#1A237E',
              'line-width': layer.style?.strokeWidth || 2
            }
          })
        } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
          // Add line layer
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': layer.style?.strokeColor || '#1A237E',
              'line-width': layer.style?.strokeWidth || 2
            }
          })
        } else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
          // Add circle layer
          map.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': layer.style?.circleRadius || 6,
              'circle-color': layer.style?.fillColor || '#3F51B5',
              'circle-stroke-color': layer.style?.strokeColor || '#1A237E',
              'circle-stroke-width': layer.style?.strokeWidth || 2
            }
          })
        }
      } catch (error) {
        console.error(`Failed to load layer ${layer.name}:`, error)
      }
    })

    // Cleanup
    return () => {
      layers.forEach(layer => {
        const sourceId = `vector-layer-${layer.id}`
        const layerId = `vector-layer-${layer.id}`
        
        if (map.getLayer(`${layerId}-fill`)) map.removeLayer(`${layerId}-fill`)
        if (map.getLayer(`${layerId}-outline`)) map.removeLayer(`${layerId}-outline`)
        if (map.getLayer(layerId)) map.removeLayer(layerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      })
    }
  }, [map, layers, activeLayers])

  return null
}
```

### Step 3: Use the Overlay Component

Add the overlay to your map component:

```tsx
import { MapVectorLayerOverlay } from '@/components/MapVectorLayerOverlay'

function GolfCourseMapView({ golfClubId }) {
  const [map, setMap] = useState<mapboxgl.Map | null>(null)
  const { layers, activeLayers, toggleLayer } = useVectorLayers(golfClubId)

  return (
    <div className="relative w-full h-full">
      <MapboxGolfCourseMap
        golfClubId={golfClubId}
        onMapLoad={setMap}  // Pass the map instance up
      />

      {/* Render vector layers */}
      <MapVectorLayerOverlay
        map={map}
        layers={layers}
        activeLayers={activeLayers}
      />

      {/* Layer panel */}
      {showLayerPanel && (
        <VectorLayerManager
          golfCourseId={golfClubId}
          onLayerToggle={toggleLayer}
        />
      )}
    </div>
  )
}
```

---

## 🎨 Styling Options

### Customize Layer Panel Position

```tsx
// Top-left
<div className="absolute top-4 left-4 z-10">
  <VectorLayerManager ... />
</div>

// Bottom-right
<div className="absolute bottom-4 right-4 z-10">
  <VectorLayerManager ... />
</div>

// Full-height sidebar
<div className="absolute top-0 left-0 h-full w-80 z-10">
  <VectorLayerManager ... />
</div>
```

### Customize Button Style

```tsx
// Floating action button
<Button
  className="absolute bottom-8 right-8 rounded-full w-14 h-14 shadow-lg"
  onClick={() => setShowLayerPanel(!showLayerPanel)}
>
  <Layers className="w-6 h-6" />
</Button>

// Toolbar button
<div className="absolute top-4 right-4 flex gap-2">
  <Button variant="outline">Zoom In</Button>
  <Button variant="outline">Zoom Out</Button>
  <Button variant="outline" onClick={() => setShowLayerPanel(!showLayerPanel)}>
    <Layers className="w-4 h-4 mr-2" />
    Layers
  </Button>
</div>
```

---

## 🔗 Navigation Links

### Add to Admin Dashboard

```tsx
// In your admin dashboard
<nav>
  <Link to="/admin/golf-clubs">Golf Clubs</Link>
  <Link to="/admin/users">Users</Link>
  <Link to="/admin/vector-layers">Vector Layers</Link>  {/* Add this */}
</nav>
```

### Add to Golf Course View

```tsx
// In your golf course detail view
<div className="flex gap-2">
  <Button onClick={() => navigate(`/golf-course/${id}`)}>
    Map View
  </Button>
  <Button onClick={() => navigate(`/vector-layers/${id}`)}>
    Layer Comparison
  </Button>
</div>
```

---

## 📱 Responsive Design

### Mobile-Friendly Layer Panel

```tsx
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

function MobileLayerPanel({ golfClubId }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Layers className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-80">
        <VectorLayerManager
          golfCourseId={golfClubId}
          onLayerToggle={toggleLayer}
        />
      </SheetContent>
    </Sheet>
  )
}
```

---

## 🎯 Advanced Features

### Add Layer Opacity Control

```tsx
import { Slider } from '@/components/ui/slider'

function LayerWithOpacity({ layer, map }) {
  const [opacity, setOpacity] = useState(layer.style?.fillOpacity || 0.5)

  useEffect(() => {
    if (map && map.getLayer(`vector-layer-${layer.id}-fill`)) {
      map.setPaintProperty(
        `vector-layer-${layer.id}-fill`,
        'fill-opacity',
        opacity
      )
    }
  }, [opacity, map, layer.id])

  return (
    <div>
      <span>{layer.name}</span>
      <Slider
        value={[opacity * 100]}
        onValueChange={(value) => setOpacity(value[0] / 100)}
        max={100}
        step={1}
      />
    </div>
  )
}
```

### Add Layer Filtering

```tsx
import { Input } from '@/components/ui/input'

function FilterableLayers({ layers }) {
  const [filter, setFilter] = useState('')

  const filteredLayers = layers.filter(layer =>
    layer.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      <Input
        placeholder="Search layers..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {filteredLayers.map(layer => (
        <LayerItem key={layer.id} layer={layer} />
      ))}
    </div>
  )
}
```

---

## 🚀 Quick Start Checklist

- [ ] Deploy edge functions (`deploy-vector-functions.bat`)
- [ ] Add VectorLayerManager to your map view
- [ ] Create MapVectorLayerOverlay component
- [ ] Test layer upload as admin
- [ ] Test layer visibility toggle
- [ ] Test layer reordering
- [ ] Test swipe comparison view
- [ ] Add navigation links
- [ ] Test on mobile devices

---

## 📚 Component Reference

### VectorLayerManager Props
```tsx
interface VectorLayerManagerProps {
  golfCourseId: string          // Required: Golf course ID
  onLayerToggle?: (layerId: string, isActive: boolean) => void
  onLayerSelect?: (layerId: string) => void
  selectedLayerId?: string | null
  className?: string
  isAdmin?: boolean             // Shows admin controls
}
```

### useVectorLayers Hook
```tsx
const {
  layers,          // All layers for the golf course
  activeLayers,    // IDs of visible layers
  isLoading,       // Loading state
  error,           // Error message
  toggleLayer,     // Toggle layer visibility
  reorderLayers,   // Update layer order
  addLayer,        // Add new layer
  updateLayer,     // Update layer metadata
  deleteLayer,     // Delete layer
  getActiveLayers  // Get sorted active layers
} = useVectorLayers(golfCourseId)
```

---

## 🎉 You're Ready!

The vector layer system is fully implemented and ready to use. Just deploy the edge functions and start uploading layers!

For questions or issues, check:
- `VECTOR_LAYER_SYSTEM_STATUS.md` - Complete feature list
- `DEPLOYMENT_SUMMARY.md` - Deployment status
- `QUICK_DEPLOY_STEPS.md` - Quick reference
