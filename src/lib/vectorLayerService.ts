import { supabase } from './supabase'

export const VectorLayerService = {
  // Upload a new vector layer
  async uploadLayer(file: File, golfClubId: string, name: string, description = '') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('golf_club_id', golfClubId)
    formData.append('name', name)
    formData.append('description', description)

    const { data, error } = await supabase.functions.invoke('upload-vector-layer', {
      body: formData,
    })

    if (error) throw error
    return data
  },

  // Get all layers for a golf club
  async getLayers(golfClubId: string) {
    const { data, error } = await supabase.functions.invoke('get-vector-layers', {
      body: { golf_club_id: golfClubId },
    })

    if (error) throw error
    return data
  },

  // Update layer properties
  async updateLayer(layerId: string, updates: any) {
    const { data, error } = await supabase
      .from('vector_layers')
      .update(updates)
      .eq('id', layerId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete a layer
  async deleteLayer(layerId: string) {
    // First get the layer to delete the file
    const { data: layer, error: fetchError } = await supabase
      .from('vector_layers')
      .select('*')
      .eq('id', layerId)
      .single()

    if (fetchError) throw fetchError

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('map-stats-tiles-prod')
      .remove([layer.r2_key])

    if (deleteError) console.error('Error deleting file:', deleteError)

    // Delete from database
    const { error } = await supabase
      .from('vector_layers')
      .delete()
      .eq('id', layerId)

    if (error) throw error
    return true
  }
}