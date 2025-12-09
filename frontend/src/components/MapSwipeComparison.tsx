import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { VectorLayer } from '@/types/vectorLayer';
import { VectorLayerMap } from './VectorLayerMap';

interface MapSwipeComparisonProps {
  leftLayer: VectorLayer | null;
  rightLayer: VectorLayer | null;
  allLayers: VectorLayer[];
  activeLayers: string[];
  onLayerToggle: (layerId: string, isActive: boolean) => void;
  mapboxAccessToken: string;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
}

export function MapSwipeComparison({
  leftLayer,
  rightLayer,
  allLayers,
  activeLayers,
  onLayerToggle,
  mapboxAccessToken,
  initialViewState = {
    longitude: -100,
    latitude: 40,
    zoom: 3,
  },
}: MapSwipeComparisonProps) {
  const leftMapContainer = useRef<HTMLDivElement>(null);
  const rightMapContainer = useRef<HTMLDivElement>(null);
  const [leftMap, setLeftMap] = useState<mapboxgl.Map | null>(null);
  const [rightMap, setRightMap] = useState<mapboxgl.Map | null>(null);
  const [swipePosition, setSwipePosition] = useState(50);

  // Initialize maps
  useEffect(() => {
    if (!leftMapContainer.current || !rightMapContainer.current) return;

    // Initialize left map
    const leftMapInstance = new mapboxgl.Map({
      container: leftMapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      accessToken: mapboxAccessToken,
    });

    // Initialize right map
    const rightMapInstance = new mapboxgl.Map({
      container: rightMapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      accessToken: mapboxAccessToken,
    });

    // Sync map movements
    const syncMaps = (sourceMap: mapboxgl.Map, targetMap: mapboxgl.Map) => {
      return () => {
        const center = sourceMap.getCenter();
        const zoom = sourceMap.getZoom();
        const pitch = sourceMap.getPitch();
        const bearing = sourceMap.getBearing();

        targetMap.jumpTo({
          center,
          zoom,
          pitch,
          bearing,
        });
      };
    };

    // Set up event listeners for syncing
    const syncRight = syncMaps(leftMapInstance, rightMapInstance);
    const syncLeft = syncMaps(rightMapInstance, leftMapInstance);

    leftMapInstance.on('move', syncRight);
    rightMapInstance.on('move', syncLeft);

    setLeftMap(leftMapInstance);
    setRightMap(rightMapInstance);

    // Cleanup
    return () => {
      leftMapInstance.off('move', syncRight);
      rightMapInstance.off('move', syncLeft);
      leftMapInstance.remove();
      rightMapInstance.remove();
    };
  }, [mapboxAccessToken, initialViewState]);

  // Update swipe position
  const handleSwipeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSwipePosition(parseInt(e.target.value, 10));
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex">
        {/* Left Map */}
        <div
          className="h-full"
          style={{ width: `${swipePosition}%` }}
        >
          <div
            ref={leftMapContainer}
            className="w-full h-full"
          />
          {leftMap && (
            <VectorLayerMap
              map={leftMap}
              layers={allLayers}
              activeLayers={leftLayer ? [leftLayer.id] : []}
              onLayerClick={(layerId, feature) => {
                console.log('Left map click:', { layerId, feature });
              }}
            />
          )}
        </div>

        {/* Right Map */}
        <div
          className="h-full"
          style={{ width: `${100 - swipePosition}%` }}
        >
          <div
            ref={rightMapContainer}
            className="w-full h-full"
          />
          {rightMap && (
            <VectorLayerMap
              map={rightMap}
              layers={allLayers}
              activeLayers={rightLayer ? [rightLayer.id] : []}
              onLayerClick={(layerId, feature) => {
                console.log('Right map click:', { layerId, feature });
              }}
            />
          )}
        </div>

        {/* Swipe Control */}
        <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
            style={{
              left: `${swipePosition}%`,
              transform: 'translateX(-50%)',
            }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={swipePosition}
            onChange={handleSwipeChange}
            className="absolute top-0 bottom-0 left-0 right-0 w-full h-full opacity-0 cursor-ew-resize"
          />
        </div>
      </div>
    </div>
  );
}

export default MapSwipeComparison;
