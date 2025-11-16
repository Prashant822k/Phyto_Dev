import { useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import { VectorLayer } from '@/types/vectorLayer'

interface MapVectorLayerOverlayProps {
  map: mapboxgl.Map | null
  layers: VectorLayer[]
  activeLayers: string[]
}

/**
 * Component that renders vector layers on a Mapbox map
 * Automatically fetches GeoJSON from R2 and adds layers to the map
 */
export function MapVectorLayerOverlay({
  map,
  layers,
  activeLayers
}: MapVectorLayerOverlayProps) {
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return

    // Get active layer data sorted by z-index
    const activeLayerData = layers
      .filter(layer => activeLayers.includes(layer.id))
      .sort((a, b) => a.z_index - b.z_index)

    // Remove all existing vector layer sources and layers
    layers.forEach(layer => {
      const sourceId = `vector-layer-${layer.id}`
      const fillLayerId = `${sourceId}-fill`
      const outlineLayerId = `${sourceId}-outline`
      const lineLayerId = sourceId
      const circleLayerId = sourceId
      
      // Remove all possible layer types
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId)
      if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId)
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId)
      if (map.getLayer(circleLayerId)) map.removeLayer(circleLayerId)
      
      // Remove source
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    })

    // Add active layers
    activeLayerData.forEach(async (layer) => {
      try {
        // Fetch GeoJSON from R2
        const url = (layer as any).urlWithCache || (layer as any).url
        if (!url) {
          console.warn(`No URL found for layer ${layer.name}`)
          return
        }

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch layer: ${response.statusText}`)
        }
        
        const geojson = await response.json()

        const sourceId = `vector-layer-${layer.id}`

        // Add source
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        })

        // Determine layer type based on first feature's geometry
        const geometryType = geojson.features?.[0]?.geometry?.type

        if (!geometryType) {
          console.warn(`No geometry type found for layer ${layer.name}`)
          return
        }

        // Add layers based on geometry type
        if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
          // Add fill layer
          map.addLayer({
            id: `${sourceId}-fill`,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': layer.style?.fillColor || '#3F51B5',
              'fill-opacity': layer.style?.fillOpacity || 0.5
            }
          })

          // Add outline layer
          map.addLayer({
            id: `${sourceId}-outline`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': layer.style?.strokeColor || '#1A237E',
              'line-width': layer.style?.strokeWidth || 2,
              'line-opacity': layer.style?.strokeOpacity || 1
            }
          })
        } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
          // Add line layer
          map.addLayer({
            id: sourceId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': layer.style?.strokeColor || '#1A237E',
              'line-width': layer.style?.strokeWidth || 2,
              'line-opacity': layer.style?.strokeOpacity || 1
            }
          })
        } else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
          // Add circle layer
          map.addLayer({
            id: sourceId,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': layer.style?.circleRadius || 6,
              'circle-color': layer.style?.fillColor || '#3F51B5',
              'circle-opacity': layer.style?.fillOpacity || 1,
              'circle-stroke-color': layer.style?.strokeColor || '#1A237E',
              'circle-stroke-width': layer.style?.strokeWidth || 2
            }
          })
        }

        console.log(`✓ Loaded layer: ${layer.name}`)
      } catch (error) {
        console.error(`Failed to load layer ${layer.name}:`, error)
      }
    })

    // Cleanup function
    return () => {
      layers.forEach(layer => {
        const sourceId = `vector-layer-${layer.id}`
        const fillLayerId = `${sourceId}-fill`
        const outlineLayerId = `${sourceId}-outline`
        
        try {
          if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId)
          if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId)
          if (map.getLayer(sourceId)) map.removeLayer(sourceId)
          if (map.getSource(sourceId)) map.removeSource(sourceId)
        } catch (error) {
          // Ignore errors during cleanup
        }
      })
    }
  }, [map, layers, activeLayers])

  // This component doesn't render anything
  return null
}

export default MapVectorLayerOverlay
