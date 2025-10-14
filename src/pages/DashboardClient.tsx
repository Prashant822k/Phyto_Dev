import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ImageService } from '@/lib/imageService'

const DashboardClient = () => {
  const [images, setImages] = useState<Array<any>>([])

  const load = async () => {
    // Client can only see their club's images due to RLS; we fetch own images here
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('images').select('*').order('created_at', { ascending: false })
    if (!error && data) setImages(data)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Processed Outputs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img) => (
              <ClientImageTile key={img.id} image={img} />
            ))}
          </div>
        </CardContent>
      </Card>
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


