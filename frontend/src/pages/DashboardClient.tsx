import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { ClientCourseService } from '@/lib/clientCourseService'
import { ImageService } from '@/lib/imageService'
import MapboxGolfCourseMap from '@/components/MapboxGolfCourseMap'
import VectorLayerComparison from '@/components/VectorLayerComparison'
import ModelPredictionOverlay from '@/components/ModelPredictionOverlay'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, RefreshCw, Image as ImageIcon, Brain } from 'lucide-react'
import mapboxgl from 'mapbox-gl'

const DashboardClient = () => {
  const [images, setImages] = useState<Array<any>>([])
  const [golfClubId, setGolfClubId] = useState<string | null>(null)
  const [golfClubName, setGolfClubName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [hasMultipleCourses, setHasMultipleCourses] = useState(false)
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      // Get current user and their golf club
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if a course was selected (from course selection page or single-course login)
      const selectedCourseId = sessionStorage.getItem('selectedGolfCourseId')
      const selectedCourseName = sessionStorage.getItem('selectedGolfCourseName')

      if (selectedCourseId && selectedCourseName) {
        // Use the selected course
        setGolfClubId(selectedCourseId)
        setGolfClubName(selectedCourseName)
      } else {
        // Fallback: Get user's profile to find their club_id (legacy support)
        const { data: profile } = await supabase
          .from('users')
          .select('club_id, golf_clubs(id, name)')
          .eq('id', user.id)
          .single()

        if (profile?.club_id) {
          setGolfClubId(profile.club_id)
          // @ts-ignore - golf_clubs is joined data
          setGolfClubName(profile.golf_clubs?.name || '')
        }
      }

      // Check if user has multiple courses
      const courseCount = await ClientCourseService.getClientCourseCount(user.id)
      setHasMultipleCourses(courseCount > 1)

      // Fetch images - only show images uploaded by the current user
      // (clients shouldn't see other users' images)
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (!error && data) setImages(data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome to {golfClubName || 'Your Golf Course'}</h1>
          <p className="text-muted-foreground mt-1">
            View your course map and processed imagery
          </p>
        </div>
        {hasMultipleCourses && (
          <Button 
            variant="outline" 
            onClick={() => navigate('/select-course')}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Switch Course</span>
          </Button>
        )}
      </div>

      {/* Two Section Layout */}
      {golfClubId && mapboxToken ? (
        <>
          {/* Section 1: Main Golf Course Map with Raster, Health, and Vector Layers */}
          <div className="w-full">
            <MapboxGolfCourseMap
              golfClubId={golfClubId}
              mapboxAccessToken={mapboxToken}
              showControls={true}
              className="w-full"
              onMapReady={(map) => {
                console.log('[DashboardClient] Map ready, setting instance');
                setMapInstance(map);
              }}
            />
          </div>

          {/* Section 2: Vector Layer Comparison - Side by Side */}
          <VectorLayerComparison
            golfClubId={golfClubId}
            mapboxAccessToken={mapboxToken}
            className="w-full"
          />
        </>
      ) : (
        <Card>
          <CardContent className="p-8">
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                {!mapboxToken ? (
                  <>
                    <strong>Mapbox token not configured.</strong>
                    <br />
                    Please add VITE_MAPBOX_ACCESS_TOKEN to your .env file.
                  </>
                ) : (
                  <>
                    <strong>No golf course assigned.</strong>
                    <br />
                    Please contact your administrator to assign you to a golf course.
                  </>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* AI Predictions & Processed Imagery Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Model Predictions */}
        {golfClubId && (
          <ModelPredictionOverlay
            golfClubId={golfClubId}
            map={mapInstance}
          />
        )}

        {/* Processed Images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Processed Imagery
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading images...
              </div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {images.map((img) => (
                  <ClientImageTile key={img.id} image={img} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No processed images yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const ClientImageTile = ({ image }: { image: any }) => {
  const [url, setUrl] = useState('')
  useEffect(() => {
    (async () => {
      const u = await ImageService.getImageUrl(image)
      setUrl(u)
    })()
  }, [image])
  return (
    <div className="border rounded">
      {url ? (<img src={url} className="w-full h-auto" />) : <div className="p-6 text-sm text-muted-foreground">Loading...</div>}
    </div>
  )
}

export default DashboardClient


