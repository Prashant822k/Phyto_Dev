import { useState, useEffect, useCallback } from 'react';
import { VectorLayer, VectorLayerWithFeatures, VectorLayerStyle, VectorLayerUpload } from '@/types/vectorLayer';
import { VectorLayerService } from '@/lib/vectorLayerService';

export const useVectorLayers = (golfCourseId: string) => {
  const [layers, setLayers] = useState<VectorLayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);

  // Load layers for the current golf course
  const loadLayers = useCallback(async () => {
    if (!golfCourseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await VectorLayerService.getLayersByGolfCourse(golfCourseId);
      setLayers(data);
      
      // Set initially active layers
      const initialActiveLayers = data
        .filter(layer => layer.is_active)
        .map(layer => layer.id);
      setActiveLayers(initialActiveLayers);
    } catch (err) {
      console.error('Failed to load vector layers:', err);
      setError('Failed to load vector layers');
    } finally {
      setIsLoading(false);
    }
  }, [golfCourseId]);

  // Toggle layer visibility
  const toggleLayer = useCallback(async (layerId: string) => {
    try {
      const isCurrentlyActive = activeLayers.includes(layerId);
      const success = await VectorLayerService.toggleLayerVisibility(
        layerId,
        !isCurrentlyActive
      );
      
      if (success) {
        setActiveLayers(prev => 
          isCurrentlyActive 
            ? prev.filter(id => id !== layerId)
            : [...prev, layerId]
        );
      }
    } catch (err) {
      console.error('Failed to toggle layer visibility:', err);
    }
  }, [activeLayers]);

  // Reorder layers
  const reorderLayers = useCallback(async (newOrder: {id: string, z_index: number}[]) => {
    try {
      const success = await VectorLayerService.updateLayerOrder(
        newOrder.map(item => ({
          layerId: item.id,
          z_index: item.z_index
        }))
      );
      
      if (success) {
        // Update local state
        setLayers(prevLayers => 
          newOrder.map(({id, z_index}) => {
            const layer = prevLayers.find(l => l.id === id);
            return layer ? { ...layer, z_index } : null;
          }).filter(Boolean) as VectorLayer[]
        );
      }
      
      return success;
    } catch (err) {
      console.error('Failed to reorder layers:', err);
      return false;
    }
  }, []);

  // Add a new layer
  const addLayer = useCallback(async (layerData: VectorLayerUpload) => {
    try {
      const newLayer = await VectorLayerService.createLayer(layerData);

      if (newLayer) {
        // Update local state
        setLayers(prev => [...prev, newLayer]);
        setActiveLayers(prev => [...prev, newLayer.id]);
        return newLayer;
      }
      return null;
    } catch (err) {
      console.error('Failed to add layer:', err);
      return null;
    }
  }, []);

  // Update a layer
  const updateLayer = useCallback(async (layerId: string, updates: Partial<VectorLayer>) => {
    try {
      const updatedLayer = await VectorLayerService.updateLayer(layerId, updates);
      if (updatedLayer) {
        setLayers(prev => 
          prev.map(layer => 
            layer.id === layerId ? { ...layer, ...updatedLayer } : layer
          )
        );
        return updatedLayer;
      }
      return null;
    } catch (err) {
      console.error('Failed to update layer:', err);
      return null;
    }
  }, []);

  // Delete a layer
  const deleteLayer = useCallback(async (layerId: string) => {
    try {
      const success = await VectorLayerService.deleteLayer(layerId);
      if (success) {
        setLayers(prev => prev.filter(layer => layer.id !== layerId));
        setActiveLayers(prev => prev.filter(id => id !== layerId));
      }
      return success;
    } catch (err) {
      console.error('Failed to delete layer:', err);
      return false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

  // Get active layers with their data
  const getActiveLayers = useCallback(() => {
    return layers
      .filter(layer => activeLayers.includes(layer.id))
      .sort((a, b) => a.z_index - b.z_index);
  }, [layers, activeLayers]);

  return {
    layers,
    activeLayers,
    isLoading,
    error,
    loadLayers,
    toggleLayer,
    reorderLayers,
    addLayer,
    updateLayer,
    deleteLayer,
    getActiveLayers,
    setActiveLayers
  };
};

export default useVectorLayers;
