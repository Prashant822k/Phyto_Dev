import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useVectorLayers } from '@/hooks/useVectorLayers';
import { VectorLayerManager } from '@/components/VectorLayerManager';
import { MapSwipeComparison } from '@/components/MapSwipeComparison';
import { Button } from '@/components/ui/button';
import { Layers, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VectorLayerComparisonView() {
  const { golfCourseId } = useParams<{ golfCourseId: string }>();
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [leftLayerId, setLeftLayerId] = useState<string | null>(null);
  const [rightLayerId, setRightLayerId] = useState<string | null>(null);
  
  const {
    layers,
    activeLayers,
    isLoading,
    toggleLayer,
    reorderLayers,
  } = useVectorLayers(golfCourseId || '');

  // Get the selected layer objects
  const leftLayer = leftLayerId ? layers.find(l => l.id === leftLayerId) || null : null;
  const rightLayer = rightLayerId ? layers.find(l => l.id === rightLayerId) || null : null;

  // Toggle layer selection for comparison
  const handleLayerSelect = (layerId: string) => {
    if (!leftLayerId) {
      setLeftLayerId(layerId);
    } else if (!rightLayerId) {
      setRightLayerId(layerId);
    } else {
      // If both sides have layers, replace the right one
      setRightLayerId(layerId);
    }
  };

  // Clear a side
  const clearSide = (side: 'left' | 'right') => {
    if (side === 'left') {
      setLeftLayerId(null);
    } else {
      setRightLayerId(null);
    }
  };

  return (
    <div className="relative w-full h-screen flex">
      {/* Layer Panel */}
      <div
        className={cn(
          'absolute top-4 left-4 z-10 transition-all duration-300',
          showLayerPanel ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <VectorLayerManager
          golfCourseId={golfCourseId || ''}
          onLayerToggle={toggleLayer}
          onLayerSelect={handleLayerSelect}
          selectedLayerId={leftLayerId || rightLayerId}
          className="w-80 max-h-[calc(100vh-2rem)]"
        />
      </div>

      {/* Toggle Panel Button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 left-4 z-20"
        onClick={() => setShowLayerPanel(!showLayerPanel)}
      >
        <Layers className="w-5 h-5" />
      </Button>

      {/* Main Content */}
      <div className="flex-1">
        {leftLayer || rightLayer ? (
          <MapSwipeComparison
            leftLayer={leftLayer}
            rightLayer={rightLayer}
            allLayers={layers}
            activeLayers={activeLayers}
            onLayerToggle={toggleLayer}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 bg-background/80 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Swipe Comparison</h2>
              <p className="mb-6">Select layers to compare by clicking on them in the layers panel</p>
              <Button
                variant="outline"
                onClick={() => setShowLayerPanel(true)}
              >
                <Layers className="w-4 h-4 mr-2" />
                Show Layers
              </Button>
            </div>
          </div>
        )}

        {/* Layer Selection Indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
          {/* Left Layer Indicator */}
          <div className="bg-background/80 backdrop-blur-sm p-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
              <span className="font-medium">
                {leftLayer?.name || 'No layer selected'}
              </span>
              {leftLayer && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => clearSide('left')}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Right Layer Indicator */}
          <div className="bg-background/80 backdrop-blur-sm p-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span className="font-medium">
                {rightLayer?.name || 'No layer selected'}
              </span>
              {rightLayer && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => clearSide('right')}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VectorLayerComparisonView;
