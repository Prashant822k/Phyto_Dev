import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Layers, Calendar, Clock, X } from 'lucide-react'
import type { Database } from '@/lib/supabase'

type GolfCourseTileset = Database['public']['Tables']['golf_course_tilesets']['Row']

interface LayerSelectorProps {
  tilesets: GolfCourseTileset[]
  selectedLayers: string[] // Array of tileset IDs
  onLayerToggle: (tilesetId: string, enabled: boolean) => void
  onClose?: () => void
  maxLayers?: number
}

const LayerSelector = ({
  tilesets,
  selectedLayers,
  onLayerToggle,
  onClose,
  maxLayers = 2
}: LayerSelectorProps) => {
  const [expandedTileset, setExpandedTileset] = useState<string | null>(null)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    // timeStr is in format "HH:MM:SS"
    return timeStr.substring(0, 5) // Return "HH:MM"
  }

  const handleToggle = (tilesetId: string, currentlyEnabled: boolean) => {
    if (!currentlyEnabled && selectedLayers.length >= maxLayers) {
      // Cannot enable more layers
      return
    }
    onLayerToggle(tilesetId, !currentlyEnabled)
  }

  // Group tilesets by base name (without date/time)
  const groupedTilesets = tilesets.reduce((acc, tileset) => {
    const baseName = tileset.name
    if (!acc[baseName]) {
      acc[baseName] = []
    }
    acc[baseName].push(tileset)
    return acc
  }, {} as Record<string, GolfCourseTileset[]>)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Map Overlays
            <Badge variant="secondary" className="ml-2">
              {selectedLayers.length}/{maxLayers}
            </Badge>
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(groupedTilesets).length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No map overlays available</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedTilesets).map(([baseName, layerTilesets]) => (
              <div key={baseName} className="space-y-2">
                {layerTilesets.length === 1 ? (
                  // Single tileset - simple toggle
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium">{layerTilesets[0].name}</div>
                      {layerTilesets[0].description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {layerTilesets[0].description}
                        </div>
                      )}
                      {(layerTilesets[0].flight_date || layerTilesets[0].flight_time) && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {layerTilesets[0].flight_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(layerTilesets[0].flight_date)}
                            </div>
                          )}
                          {layerTilesets[0].flight_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(layerTilesets[0].flight_time)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Switch
                      checked={selectedLayers.includes(layerTilesets[0].id)}
                      onCheckedChange={(checked) => handleToggle(layerTilesets[0].id, selectedLayers.includes(layerTilesets[0].id))}
                      disabled={!selectedLayers.includes(layerTilesets[0].id) && selectedLayers.length >= maxLayers}
                    />
                  </div>
                ) : (
                  // Multiple tilesets - grouped by date
                  <div className="space-y-2">
                    <div className="font-medium text-sm px-2">{baseName}</div>
                    {layerTilesets
                      .sort((a, b) => {
                        // Sort by flight_datetime descending (newest first)
                        const dateA = a.flight_datetime || a.created_at
                        const dateB = b.flight_datetime || b.created_at
                        return new Date(dateB).getTime() - new Date(dateA).getTime()
                      })
                      .map((tileset) => (
                        <div
                          key={tileset.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors ml-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {tileset.flight_date && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(tileset.flight_date)}
                                </div>
                              )}
                              {tileset.flight_time && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(tileset.flight_time)}
                                </div>
                              )}
                              {!tileset.flight_date && !tileset.flight_time && (
                                <div className="text-sm text-muted-foreground">
                                  {new Date(tileset.created_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            {tileset.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {tileset.description}
                              </div>
                            )}
                          </div>
                          <Switch
                            checked={selectedLayers.includes(tileset.id)}
                            onCheckedChange={(checked) => handleToggle(tileset.id, selectedLayers.includes(tileset.id))}
                            disabled={!selectedLayers.includes(tileset.id) && selectedLayers.length >= maxLayers}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}

            {selectedLayers.length >= maxLayers && (
              <div className="text-xs text-muted-foreground text-center p-2 bg-muted rounded">
                Maximum {maxLayers} layers selected. Disable a layer to select another.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default LayerSelector
