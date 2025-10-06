import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Maximize2, Activity, BarChart3, Layers, ZoomIn, ZoomOut, RotateCcw, AlertCircle } from "lucide-react";
import { ImageService } from "@/lib/imageService";
import type { Database } from "@/lib/supabase";

type Image = Database['public']['Tables']['images']['Row'];

interface MapStatistics {
  totalArea: number;
  healthyArea: number;
  moderateArea: number;
  poorArea: number;
  averageHealth: number;
  terrainTypes: {
    cropland: number;
    grassland: number;
    woodland: number;
    water: number;
  };
}

interface InteractiveMapProps {
  imageId?: string;
  imageUrl?: string;
}

const InteractiveMap = ({ imageId, imageUrl }: InteractiveMapProps) => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [mapView, setMapView] = useState<"satellite" | "terrain" | "hybrid">("terrain");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [imageData, setImageData] = useState<Image | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("uploaded");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch image data when imageId changes
  useEffect(() => {
    if (imageId) {
      setIsLoading(true);
      ImageService.getImageById(imageId)
        .then((image) => {
          if (image) {
            setImageData(image);
            setProcessingStatus(image.status);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch image data:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [imageId]);

  // Set up real-time subscriptions for processing updates
  useEffect(() => {
    if (!imageId) return;

    const imageSubscription = ImageService.subscribeToImageUpdates(imageId, (payload) => {
      if (payload.new) {
        setImageData(payload.new as Image);
        setProcessingStatus(payload.new.status);
      }
    });

    const jobSubscription = ImageService.subscribeToJobUpdates(imageId, (payload) => {
      // Handle job status updates
      console.log('Job update:', payload);
    });

    return () => {
      imageSubscription.unsubscribe();
      jobSubscription.unsubscribe();
    };
  }, [imageId]);
  
  // Dummy statistics
  const stats: MapStatistics = {
    totalArea: 245.7,
    healthyArea: 156.3,
    moderateArea: 67.2,
    poorArea: 22.2,
    averageHealth: 78.5,
    terrainTypes: {
      cropland: 189.4,
      grassland: 34.6,
      woodland: 18.3,
      water: 3.4,
    }
  };

  const zones = [
    { id: "zone1", name: "North Field", health: "healthy", x: 25, y: 20, area: 45.3, crop: "Wheat", ndvi: 0.82 },
    { id: "zone2", name: "South Field", health: "moderate", x: 60, y: 70, area: 32.7, crop: "Corn", ndvi: 0.65 },
    { id: "zone3", name: "East Pasture", health: "poor", x: 80, y: 35, area: 18.9, crop: "Grass", ndvi: 0.42 },
    { id: "zone4", name: "West Creek", health: "healthy", x: 15, y: 60, area: 12.4, crop: "Soybeans", ndvi: 0.78 },
    { id: "zone5", name: "Central Plot", health: "healthy", x: 50, y: 45, area: 28.6, crop: "Barley", ndvi: 0.75 },
    { id: "zone6", name: "South Ridge", health: "moderate", x: 35, y: 80, area: 22.1, crop: "Oats", ndvi: 0.58 },
    { id: "zone7", name: "North Creek", health: "poor", x: 70, y: 15, area: 15.3, crop: "Fallow", ndvi: 0.35 },
    { id: "zone8", name: "West Field", health: "healthy", x: 20, y: 40, area: 38.2, crop: "Wheat", ndvi: 0.79 },
  ];

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy": return "bg-terrain-healthy";
      case "moderate": return "bg-terrain-moderate";
      case "poor": return "bg-terrain-poor";
      default: return "bg-gray-500";
    }
  };

  if (!imageId || !imageUrl) {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No PNG Tile Available</h3>
            <p className="text-muted-foreground">
              Upload a PNG tile to view terrain analysis and interactive map statistics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <div className="space-y-4">
            <div className="animate-spin w-16 h-16 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <h3 className="text-lg font-medium">Loading Image Data</h3>
            <p className="text-muted-foreground">
              Fetching image information and processing status...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map Area */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Terrain Analysis Map
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {imageData?.original_filename || 'PNG Tile'}
                </Badge>
                <Badge 
                  variant={processingStatus === 'processed' ? 'default' : 
                          processingStatus === 'processing' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {processingStatus}
                </Badge>
                <Maximize2 className="w-4 h-4" />
              </div>
            </CardTitle>
            
            {/* Map Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={mapView === "terrain" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMapView("terrain")}
                >
                  <Layers className="w-4 h-4 mr-1" />
                  Terrain
                </Button>
                <Button
                  variant={mapView === "satellite" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMapView("satellite")}
                >
                  Satellite
                </Button>
                <Button
                  variant={mapView === "hybrid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMapView("hybrid")}
                >
                  Hybrid
                </Button>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                  disabled={zoomLevel <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                  disabled={zoomLevel >= 2}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setZoomLevel(1);
                    setSelectedZone(null);
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-square rounded-lg overflow-hidden border">
              <img 
                src={imageUrl} 
                alt={`PNG tile: ${imageData?.original_filename || 'Unknown'}`}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  mapView === "satellite" ? "brightness-110 contrast-110" :
                  mapView === "hybrid" ? "sepia-25" : ""
                }`}
                style={{ 
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center"
                }}
                onError={(e) => {
                  console.error('Failed to load image:', imageUrl);
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
                }}
              />
              
              {/* Processing status overlay */}
              {processingStatus === 'processing' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm">Processing PNG tile...</p>
                  </div>
                </div>
              )}
              
              {processingStatus === 'failed' && (
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                  <div className="text-center text-red-700">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Processing failed</p>
                  </div>
                </div>
              )}
              
              {/* Interactive zones */}
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  className={`absolute rounded-full border-2 border-white shadow-lg cursor-pointer transition-all duration-200 ${
                    getHealthColor(zone.health)
                  } ${
                    hoveredZone === zone.id || selectedZone === zone.id 
                      ? "w-6 h-6 scale-125 ring-4 ring-white/50" 
                      : "w-4 h-4 hover:scale-110"
                  }`}
                  style={{ 
                    left: `${zone.x}%`, 
                    top: `${zone.y}%`,
                    transform: `translate(-50%, -50%) scale(${zoomLevel})`
                  }}
                  onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                />
              ))}
              
              {/* Zone info popup */}
              {selectedZone && (
                <div className="absolute top-4 left-4 bg-card p-4 rounded-lg shadow-xl border min-w-48 animate-in slide-in-from-top-2">
                  {(() => {
                    const zone = zones.find(z => z.id === selectedZone);
                    return zone ? (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg">{zone.name}</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Health:</span>
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded ${getHealthColor(zone.health)}`} />
                              <span className="capitalize font-medium">{zone.health}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Area:</span>
                            <p className="font-medium">{zone.area} ha</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Crop:</span>
                            <p className="font-medium">{zone.crop}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">NDVI:</span>
                            <p className="font-medium">{zone.ndvi}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setSelectedZone(null)}
                          >
                            Close Details
                          </Button>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              
              {/* Hover tooltip */}
              {hoveredZone && hoveredZone !== selectedZone && (
                <div className="absolute top-4 right-4 bg-card/90 p-2 rounded shadow-lg border text-sm animate-in fade-in">
                  <p className="font-medium">{zones.find(z => z.id === hoveredZone)?.name}</p>
                  <p className="text-muted-foreground capitalize">
                    {zones.find(z => z.id === hoveredZone)?.health} - {zones.find(z => z.id === hoveredZone)?.area} ha
                  </p>
                </div>
              )}
              
              {/* Legend */}
              <div className="absolute bottom-4 right-4 bg-card/95 p-3 rounded-lg shadow-xl border backdrop-blur-sm">
                <h5 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  Vegetation Health
                </h5>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-terrain-healthy"></div>
                    <span>Healthy (64%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-terrain-moderate"></div>
                    <span>Moderate (25%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-terrain-poor"></div>
                    <span>Poor (11%)</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  Click zones for details
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Statistics Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Area Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-primary">{stats.totalArea}</p>
                <p className="text-xs text-muted-foreground">Total Hectares</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-terrain-healthy">{stats.averageHealth}%</p>
                <p className="text-xs text-muted-foreground">Avg. Health</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Healthy</span>
                <span className="text-sm font-medium">{stats.healthyArea} ha</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-terrain-healthy h-2 rounded-full" 
                  style={{ width: `${(stats.healthyArea / stats.totalArea) * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Moderate</span>
                <span className="text-sm font-medium">{stats.moderateArea} ha</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-terrain-moderate h-2 rounded-full" 
                  style={{ width: `${(stats.moderateArea / stats.totalArea) * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Poor</span>
                <span className="text-sm font-medium">{stats.poorArea} ha</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-terrain-poor h-2 rounded-full" 
                  style={{ width: `${(stats.poorArea / stats.totalArea) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Terrain Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.terrainTypes).map(([type, area]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm capitalize">{type}</span>
                <Badge variant="outline">{area} ha</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InteractiveMap;