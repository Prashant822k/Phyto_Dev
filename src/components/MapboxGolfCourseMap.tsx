import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MapPin, Layers, ZoomIn, ZoomOut, Maximize2, AlertCircle, Activity, ArrowRight, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { TilesetService } from '@/lib/tilesetService';
import { supabase } from '@/lib/supabase';
import DateLayerDropdown from '@/components/DateLayerDropdown';
import MapSwipeControl from '@/components/MapSwipeControl';
import type { Database } from '@/lib/supabase';

type GolfCourseTileset = Database['public']['Tables']['golf_course_tilesets']['Row'];

interface MapboxGolfCourseMapProps {
  golfClubId: string;
  mapboxAccessToken: string;
  baseStyle?: string;
  showControls?: boolean;
  className?: string;
  // Map sync callback
  onMapReady?: (map: mapboxgl.Map) => void;
}

const MapboxGolfCourseMap = ({
  golfClubId,
  mapboxAccessToken,
  baseStyle = 'mapbox://styles/mapbox/satellite-streets-v12',
  showControls = true,
  className = '',
  onMapReady
}: MapboxGolfCourseMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [tilesets, setTilesets] = useState<GolfCourseTileset[]>([]);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [swipeMode, setSwipeMode] = useState(false);
  const [showHealthMaps, setShowHealthMaps] = useState(false);
  const [healthMapTilesets, setHealthMapTilesets] = useState<any[]>([]);
  const [selectedHealthMapId, setSelectedHealthMapId] = useState<string>('');
  const [containerReady, setContainerReady] = useState(false);
  const [healthMapLoaded, setHealthMapLoaded] = useState(false);
  const [healthMapOpacity, setHealthMapOpacity] = useState(0.7);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Set Mapbox access token
  mapboxgl.accessToken = mapboxAccessToken;

  // Ref callback to track when container is mounted
  const setMapContainerRef = (node: HTMLDivElement | null) => {
    if (node) {
      console.log('✅ Main map container mounted');
      mapContainer.current = node;
      setContainerReady(true);
    }
  };

  // Load all tilesets for the golf club
  useEffect(() => {
    const loadTilesets = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const tilesetsData = await TilesetService.getTilesetsForGolfClub(golfClubId);
        
        if (!tilesetsData || tilesetsData.length === 0) {
          setError('No tilesets found for this golf course');
          setIsLoading(false);
          return;
        }

        setTilesets(tilesetsData);
        // Auto-select the most recent tileset
        if (tilesetsData.length > 0) {
          setSelectedLayers([tilesetsData[0].id]);
        }

        // Load health map tilesets
        console.log('Loading health maps for golf_club_id:', golfClubId);
        const { data: healthMaps, error: healthError } = await supabase
          .from('health_map_tilesets')
          .select('*')
          .eq('golf_club_id', golfClubId)
          .eq('is_active', true)
          .order('analysis_date', { ascending: false })
          .order('analysis_time', { ascending: false });

        if (healthError) {
          console.error('Error loading health maps:', healthError);
        } else if (healthMaps) {
          console.log('Loaded health maps:', healthMaps);
          setHealthMapTilesets(healthMaps);
          if (healthMaps.length > 0) {
            setSelectedHealthMapId(healthMaps[0].id);
          }
        } else {
          console.log('No health maps found');
        }
      } catch (err) {
        console.error('Failed to load tilesets:', err);
        setError('Failed to load map data');
      } finally {
        setIsLoading(false);
      }
    };

    loadTilesets();
  }, [golfClubId]);

  // Initialize map
  useEffect(() => {
    console.log('🗺️ Map init check:', {
      hasContainer: !!mapContainer.current,
      tilesetsCount: tilesets.length,
      mapAlreadyExists: !!map.current
    });

    if (!mapContainer.current || tilesets.length === 0 || map.current) {
      console.log('⏸️ Skipping map init');
      return;
    }

    const primaryTileset = tilesets[0];
    console.log('✅ Initializing main map with tileset:', primaryTileset.name);

    try {
      // Initialize the map with primary tileset bounds
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: baseStyle,
        center: [primaryTileset.center_lon, primaryTileset.center_lat],
        zoom: primaryTileset.default_zoom,
        minZoom: primaryTileset.min_zoom,
        maxZoom: primaryTileset.max_zoom,
        bounds: [
          [primaryTileset.min_lon, primaryTileset.min_lat],
          [primaryTileset.max_lon, primaryTileset.max_lat]
        ],
        fitBoundsOptions: {
          padding: 50
        }
      });

      // Add navigation controls
      if (showControls) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      }

      // Track zoom changes
      map.current.on('zoom', () => {
        if (map.current) {
          setCurrentZoom(Math.round(map.current.getZoom()));
        }
      });

      // Map is ready
      map.current.on('load', async () => {
        console.log('Map loaded successfully');
        
        // Load PNG tiles for selected layers
        if (selectedLayers.length > 0 && map.current) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            
            selectedLayers.forEach((tilesetId) => {
              const tileset = tilesets.find(t => t.id === tilesetId);
              if (!tileset) return;

              const sourceId = `tileset-source-${tileset.id}`;
              const layerId = `tileset-layer-${tileset.id}`;
              const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy?tilesetId=${tileset.id}&z={z}&x={x}&y={y}&token=${session.access_token}`;

              console.log('Loading PNG tiles on main map:', tileset.name);

              if (!map.current!.getSource(sourceId)) {
                map.current!.addSource(sourceId, {
                  type: 'raster',
                  tiles: [tileUrlTemplate],
                  tileSize: tileset.tile_size || 256,
                  minzoom: tileset.min_zoom,
                  maxzoom: tileset.max_zoom,
                  bounds: [
                    tileset.min_lon,
                    tileset.min_lat,
                    tileset.max_lon,
                    tileset.max_lat
                  ]
                });

                map.current!.addLayer({
                  id: layerId,
                  type: 'raster',
                  source: sourceId,
                  paint: {
                    'raster-opacity': 0.85
                  }
                });

                console.log('✅ PNG tiles loaded on main map:', tileset.name);
              }
            });
          }
        }
        
        // Notify parent that map is ready for sync
        if (onMapReady && map.current) {
          onMapReady(map.current);
        }
      });

    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [tilesets, baseStyle, showControls, containerReady]);

  // Manage layers based on selectedLayers
  useEffect(() => {
    if (!map.current) {
      console.log('❌ Map not initialized yet');
      return;
    }

    const updateLayers = async () => {
      // Wait for map to be ready
      if (!map.current!.loaded()) {
        console.log('⏳ Waiting for map to load...');
        const handleLoad = () => {
          console.log('✅ Map loaded, updating layers');
          updateLayers();
        };
        map.current!.once('load', handleLoad);
        return;
      }

      console.log('🗺️ Updating layers...');
      console.log('  Selected layers:', selectedLayers);
      console.log('  Available tilesets:', tilesets.length);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session for tile loading');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      console.log('  Supabase URL:', supabaseUrl);

      // Remove all existing tileset layers
      tilesets.forEach(tileset => {
        const sourceId = `tileset-source-${tileset.id}`;
        const layerId = `tileset-layer-${tileset.id}`;
        
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
        if (map.current!.getSource(sourceId)) {
          map.current!.removeSource(sourceId);
        }
      });

      // Add selected layers
      console.log('  Adding', selectedLayers.length, 'layers...');
      
      selectedLayers.forEach((tilesetId, index) => {
        const tileset = tilesets.find(t => t.id === tilesetId);
        if (!tileset) {
          console.warn(`  ⚠️ Tileset not found for ID: ${tilesetId}`);
          return;
        }

        const sourceId = `tileset-source-${tileset.id}`;
        const layerId = `tileset-layer-${tileset.id}`;

        // Use tilesetId instead of courseId for new tile-proxy format
        const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy?tilesetId=${tileset.id}&z={z}&x={x}&y={y}&token=${session.access_token}`;

        console.log(`  ✅ Adding layer: ${tileset.name} (${tileset.flight_date || 'no date'})`);
        console.log(`     Source ID: ${sourceId}`);
        console.log(`     Layer ID: ${layerId}`);
        console.log(`     R2 Path: ${tileset.r2_folder_path}`);
        console.log(`     Tile URL: ${tileUrlTemplate.replace('{z}', '15').replace('{x}', '5242').replace('{y}', '12663')}`);
        console.log(`     Bounds: [${tileset.min_lon}, ${tileset.min_lat}, ${tileset.max_lon}, ${tileset.max_lat}]`);
        console.log(`     Zoom: ${tileset.min_zoom} - ${tileset.max_zoom}`);

        try {
          // Add source
          map.current!.addSource(sourceId, {
            type: 'raster',
            tiles: [tileUrlTemplate],
            tileSize: tileset.tile_size || 256,
            minzoom: tileset.min_zoom,
            maxzoom: tileset.max_zoom,
            bounds: [
              tileset.min_lon,
              tileset.min_lat,
              tileset.max_lon,
              tileset.max_lat
            ]
          });

          // Add layer
          map.current!.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': 0.85
            }
          });

          console.log(`     ✅ Layer added successfully`);
        } catch (error) {
          console.error(`     ❌ Error adding layer:`, error);
        }
      });

      console.log('✅ Layer update complete');
    };

    updateLayers();
  }, [selectedLayers, tilesets]);

  // Handle health map toggle (wait for PNG tiles to load first)
  useEffect(() => {
    if (!map.current) {
      console.log('⏸️ Map not ready for health maps - no map instance');
      return;
    }

    // If map is not loaded yet, wait for it
    if (!map.current.loaded()) {
      console.log('⏸️ Map not ready for health maps - waiting for load', {
        hasMap: true,
        isLoaded: false,
        showHealthMaps
      });
      
      // Only wait if health maps are actually toggled on
      if (!showHealthMaps) {
        return;
      }
      
      const handleMapLoad = () => {
        console.log('✅ Map loaded, will load health maps now');
        // Force re-render without toggling
        setContainerReady(prev => !prev);
      };
      
      map.current.once('idle', handleMapLoad);
      return () => {
        map.current?.off('idle', handleMapLoad);
      };
    }

    // Check if PNG tiles are loaded
    const pngLayerId = selectedLayers.length > 0 ? `tileset-layer-${selectedLayers[0]}` : null;
    if (pngLayerId && !map.current.getLayer(pngLayerId)) {
      console.log('⏸️ Waiting for PNG tiles to load before adding health maps', {
        pngLayerId,
        hasLayer: false
      });
      
      // Wait for tiles to render
      if (!showHealthMaps) {
        return;
      }
      
      const timer = setTimeout(() => {
        console.log('⏰ Retrying health map load after PNG tile delay');
        // Force re-render without toggling
        setContainerReady(prev => !prev);
      }, 2000);
      
      return () => clearTimeout(timer);
    }

    console.log('🔍 Health map effect triggered:', {
      showHealthMaps,
      selectedHealthMapId,
      healthMapCount: healthMapTilesets.length
    });

    const healthLayerId = 'health-map-layer';
    const healthSourceId = 'health-map-source';

    // If toggling off, just hide the layer instead of removing
    if (!showHealthMaps) {
      if (map.current.getLayer(healthLayerId)) {
        map.current.setLayoutProperty(healthLayerId, 'visibility', 'none');
        console.log('🙈 Health map layer hidden');
      }
      return;
    }

    // If toggling on and layer already exists, just show it
    if (showHealthMaps && map.current.getLayer(healthLayerId) && healthMapLoaded) {
      map.current.setLayoutProperty(healthLayerId, 'visibility', 'visible');
      console.log('👁️ Health map layer shown (cached)');
      return;
    }

    // Add health map layer if it doesn't exist yet
    if (showHealthMaps && selectedHealthMapId) {
      const healthMap = healthMapTilesets.find(h => h.id === selectedHealthMapId);
      if (!healthMap) {
        console.error('❌ Health map not found:', selectedHealthMapId);
        return;
      }

      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy?tilesetId=${healthMap.id}&type=health&z={z}&x={x}&y={y}&token=${session.access_token}`;

        console.log('Adding health map layer:', healthMap.id);
        console.log('Health map r2_folder_path:', healthMap.r2_folder_path);
        console.log('Health map tile URL:', tileUrlTemplate);

        try {
          map.current!.addSource(healthSourceId, {
            type: 'raster',
            tiles: [tileUrlTemplate],
            tileSize: 256,
            minzoom: healthMap.min_zoom,
            maxzoom: healthMap.max_zoom,
            bounds: [
              healthMap.min_lon,
              healthMap.min_lat,
              healthMap.max_lon,
              healthMap.max_lat
            ]
          });

          map.current!.addLayer({
            id: healthLayerId,
            type: 'raster',
            source: healthSourceId,
            paint: {
              'raster-opacity': 0.7
            }
          });

          console.log('✅ Health map layer added successfully');
          setHealthMapLoaded(true);
        } catch (error) {
          console.error('❌ Error adding health map layer:', error);
        }
      })();
    }
  }, [showHealthMaps, selectedHealthMapId, healthMapTilesets, selectedLayers, healthMapLoaded]);

  // Animated swipe functions
  const animateSwipe = (direction: 'horizontal' | 'vertical', reverse: boolean = false) => {
    if (isAnimating || !map.current || !map.current.getLayer('health-map-layer')) return;
    
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsAnimating(true);
    const startOpacity = reverse ? 1 : 0;
    const endOpacity = reverse ? 0 : 1;
    const duration = 2000; // 2 seconds for smooth animation
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeInOutCubic = (t: number) => 
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      const easedProgress = easeInOutCubic(progress);
      const currentOpacity = startOpacity + (endOpacity - startOpacity) * easedProgress;
      
      setHealthMapOpacity(currentOpacity);
      if (map.current && map.current.getLayer('health-map-layer')) {
        map.current.setPaintProperty('health-map-layer', 'raster-opacity', currentOpacity);
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        animationRef.current = null;
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const handleHorizontalSwipe = () => {
    // Swipe from left to right (0 to 100%)
    animateSwipe('horizontal', false);
  };

  const handleVerticalSwipe = () => {
    // Swipe from top to bottom (0 to 100%)
    animateSwipe('vertical', false);
  };

  const handleReverseHorizontalSwipe = () => {
    // Swipe from right to left (100% to 0)
    animateSwipe('horizontal', true);
  };

  const handleReverseVerticalSwipe = () => {
    // Swipe from bottom to top (100% to 0)
    animateSwipe('vertical', true);
  };

  // Handle layer change from dropdown
  const handleLayerChange = (leftLayerId: string, rightLayerId: string | null) => {
    if (rightLayerId) {
      setSelectedLayers([leftLayerId, rightLayerId]);
      setSwipeMode(true); // Auto-enable swipe when 2 layers selected
    } else {
      setSelectedLayers([leftLayerId]);
      setSwipeMode(false);
    }
  };

  // Zoom controls
  const zoomIn = () => {
    map.current?.zoomIn();
  };

  const zoomOut = () => {
    map.current?.zoomOut();
  };

  const resetView = () => {
    if (!map.current || tilesets.length === 0) return;
    
    const primaryTileset = tilesets[0];
    map.current.flyTo({
      center: [primaryTileset.center_lon, primaryTileset.center_lat],
      zoom: primaryTileset.default_zoom,
      essential: true
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="animate-spin w-16 h-16 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <h3 className="text-lg font-medium">Loading Map</h3>
            <p className="text-muted-foreground">Fetching golf course data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || tilesets.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">Map Not Available</h3>
            <p className="text-muted-foreground">
              {error || 'No map data found for this golf course'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const primaryTileset = tilesets[0];
  const canSwipe = selectedLayers.length === 2;

  return (
    <div className="space-y-4">
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Golf Course Map
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Zoom: {currentZoom}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedLayers.length} {selectedLayers.length === 1 ? 'Layer' : 'Layers'}
              </Badge>
            </div>
          </CardTitle>

          {/* Map Controls */}
          {showControls && (
            <div className="flex items-center justify-between pt-2">
              {/* Health Maps Toggle */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Health Maps</span>
                  <Switch
                    checked={showHealthMaps}
                    onCheckedChange={setShowHealthMaps}
                    disabled={healthMapTilesets.length === 0}
                  />
                </div>
                {healthMapTilesets.length > 0 && showHealthMaps && (
                  <>
                    <select
                      value={selectedHealthMapId}
                      onChange={(e) => setSelectedHealthMapId(e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {healthMapTilesets.map((hm) => (
                        <option key={hm.id} value={hm.id}>
                          {hm.analysis_type} - {hm.analysis_date} {hm.analysis_time}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Opacity:</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={healthMapOpacity * 100}
                        onChange={(e) => {
                          const opacity = parseInt(e.target.value) / 100
                          setHealthMapOpacity(opacity)
                          if (map.current && map.current.getLayer('health-map-layer')) {
                            map.current.setPaintProperty('health-map-layer', 'raster-opacity', opacity)
                          }
                        }}
                        className="w-24"
                      />
                      <span className="text-xs text-muted-foreground">{Math.round(healthMapOpacity * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleHorizontalSwipe}
                        disabled={isAnimating}
                        className="gap-1"
                        title="Swipe in from left"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-xs">Swipe →</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReverseHorizontalSwipe}
                        disabled={isAnimating}
                        className="gap-1"
                        title="Swipe out to left"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span className="text-xs">← Swipe</span>
                      </Button>
                    </div>
                  </>
                )}
                {healthMapTilesets.length === 0 && (
                  <span className="text-xs text-muted-foreground">(No health maps available)</span>
                )}
              </div>
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={zoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={zoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={resetView}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div 
            ref={setMapContainerRef} 
            className="w-full h-[600px] rounded-lg overflow-hidden border"
          />
        </CardContent>
      </Card>

      {/* Date Layer Dropdown */}
      <DateLayerDropdown
        tilesets={tilesets}
        selectedLayers={selectedLayers}
        onLayerChange={handleLayerChange}
      />

      {/* Swipe Control (shown when 2 layers selected OR health maps enabled) */}
      {map.current && map.current.loaded() && (
        <>
          {canSwipe && swipeMode && (
            <MapSwipeControl
              map={map.current}
              leftLayerId={`tileset-layer-${selectedLayers[0]}`}
              rightLayerId={`tileset-layer-${selectedLayers[1]}`}
              isActive={swipeMode}
              onToggle={() => setSwipeMode(!swipeMode)}
            />
          )}
          {showHealthMaps && selectedHealthMapId && map.current.getLayer('health-map-layer') && (
            <MapSwipeControl
              map={map.current}
              leftLayerId={`tileset-layer-${selectedLayers[0]}`}
              rightLayerId='health-map-layer'
              isActive={true}
              onToggle={() => setShowHealthMaps(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MapboxGolfCourseMap;