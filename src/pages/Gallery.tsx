import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageService } from "@/lib/imageService";
import type { Database } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";


type Image = Database['public']['Tables']['images']['Row'];

const Gallery = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await ImageService.getUserImages();
        setImages(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load images');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="p-6 text-red-600">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Images</h1>
        <p className="text-sm text-muted-foreground">Uploaded PNG tiles and processing statuses</p>
      </div>

      {images.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-muted-foreground">No images yet. Upload from the dashboard.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span className="truncate" title={img.original_filename || img.filename}>{img.original_filename || img.filename}</span>
                  <Badge
                    variant={img.status === 'processed' ? 'default' : img.status === 'processing' ? 'secondary' : 'outline'}
                    className="ml-2 text-xs"
                  >
                    {img.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="aspect-square bg-muted rounded border flex items-center justify-center overflow-hidden">
                  <img
                    src={`${// signed URL fetched on-demand; lightweight preview via get url endpoint
                      ''
                    }`}
                    alt={img.original_filename || 'image'}
                    className="w-full h-full object-cover hidden"
                  />
                  <div className="text-xs text-muted-foreground">Tile: {img.zoom_level ?? '-'} / {img.tile_x ?? '-'} / {img.tile_y ?? '-'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const url = await ImageService.getImageUrl(img);
                      navigate(`/dashboard`, { state: { imageId: img.id, imageUrl: url } });
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      try {
                        await ImageService.deleteImage(img.id);
                        setImages((prev) => prev.filter((i) => i.id !== img.id));
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Delete failed');
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
