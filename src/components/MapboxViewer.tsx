import { useEffect, useRef } from 'react'

import 'mapbox-gl/dist/mapbox-gl.css'

// Requirements:
// - npm i mapbox-gl
// - npm i -D @types/mapbox-gl
// - .env: VITE_MAPBOX_TOKEN

export interface RasterTileSource {
  id: string
  tile_url: string // supports {z}/{x}/{y} templated URLs
  minzoom?: number
  maxzoom?: number
  tileSize?: number // 256 or 512; default 512
}

interface MapboxViewerProps {
  style?: React.CSSProperties
  tiles?: RasterTileSource[]
  center?: [number, number]
  zoom?: number
  opacity?: number
  attribution?: string
}

const MapboxViewer = ({ style, tiles = [], center, zoom, opacity = 0.9, attribution }: MapboxViewerProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    let cleanup = () => {}

    ;(async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default
        const token = (import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) as string | undefined
        if (!token) {
          console.warn('VITE_MAPBOX_TOKEN is not set; Mapbox map will not load styles.')
        }
        mapboxgl.accessToken = token || ''

        if (!mapContainerRef.current) return

        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: center ?? [0, 0],
          zoom: zoom ?? 2,
        })

        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
        if (attribution) {
          mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true, customAttribution: attribution }))
        }

        mapRef.current.on('load', () => {
          // Add raster sources/layers for templated tile URLs
          tiles.forEach((t) => {
            if (!t.tile_url || !t.tile_url.includes('{z}') || !t.tile_url.includes('{x}') || !t.tile_url.includes('{y}')) {
              return
            }
            const sourceId = `raster-${t.id}`
            if (!mapRef.current.getSource(sourceId)) {
              mapRef.current.addSource(sourceId, {
                type: 'raster',
                tiles: [t.tile_url],
                tileSize: t.tileSize ?? 512,
                minzoom: t.minzoom ?? 0,
                maxzoom: t.maxzoom ?? 22,
              } as any)
              mapRef.current.addLayer({
                id: `${sourceId}-layer`,
                type: 'raster',
                source: sourceId,
                paint: { 'raster-opacity': opacity },
              })
            }
          })
        })

        cleanup = () => {
          if (mapRef.current) {
            mapRef.current.remove()
            mapRef.current = null
          }
        }
      } catch (e) {
        console.error('Failed to initialize Mapbox map:', e)
      }
    })()

    return () => cleanup()
  }, [tiles, center, zoom])

  // React to opacity changes
  useEffect(() => {
    if (!mapRef.current) return
    tiles.forEach((t) => {
      const layerId = `raster-${t.id}-layer`
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.setPaintProperty(layerId, 'raster-opacity', opacity)
      }
    })
  }, [opacity, tiles])

  return (
    <div
      ref={mapContainerRef}
      style={{ width: '100%', height: '60vh', borderRadius: 8, ...style }}
      className="overflow-hidden border"
    />
  )
}

export default MapboxViewer
