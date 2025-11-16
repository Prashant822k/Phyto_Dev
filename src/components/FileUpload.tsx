import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { VectorLayerUploader } from "@/components/admin/VectorLayerUploader";

interface FileUploadProps {
  onFileProcessed?: (imageId: string, imageUrl: string) => void;
  onMultipleFilesProcessed?: (results: Array<{imageId: string, imageUrl: string}>) => void;
}

const FileUpload = ({ onFileProcessed, onMultipleFilesProcessed }: FileUploadProps) => {
  const [golfClubs, setGolfClubs] = useState<Array<{id: string, name: string}>>([]);
  const [selectedGolfClubId, setSelectedGolfClubId] = useState<string>("");
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchGolfClubs = async () => {
      try {
        const { data, error } = await supabase
          .from('golf_clubs')
          .select('id, name')
          .order('name');
        
        if (error) throw error;
        
        setGolfClubs(data || []);
        if (data && data.length > 0) {
          setSelectedGolfClubId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching golf clubs:', error);
        toast({
          title: "Error Loading Golf Courses",
          description: "Failed to load golf courses. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingClubs(false);
      }
    };

    fetchGolfClubs();
  }, [toast]);

  const handleUploadSuccess = () => {
    toast({
      title: "Success",
      description: "Vector layer uploaded successfully",
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Upload Vector Layers
        </CardTitle>
        <CardDescription>
          Upload GeoJSON vector layers for golf courses. Layers will be stored in R2 and can be toggled on the map.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Golf Course Selection */}
        <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
          <Label htmlFor="golf-course" className="text-base font-semibold mb-2 block">
            Select Golf Course *
          </Label>
          <Select
            value={selectedGolfClubId}
            onValueChange={setSelectedGolfClubId}
            disabled={isLoadingClubs}
          >
            <SelectTrigger id="golf-course" className="w-full">
              <SelectValue placeholder="Choose a golf course" />
            </SelectTrigger>
            <SelectContent>
              {golfClubs.map((club) => (
                <SelectItem key={club.id} value={club.id}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            Layers will be stored in: <span className="font-mono text-primary">map-stats-tiles-prod/vector-layers/{'{golf_club_id}'}/{'{layer_id}'}/data.json</span>
          </p>
        </div>

        {/* Debug info */}
        <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
          Selected Golf Club ID: {selectedGolfClubId || '(none)'}
        </div>

        {/* Vector Layer Uploader */}
        {selectedGolfClubId ? (
          <VectorLayerUploader
            golfClubId={selectedGolfClubId}
            onUploadSuccess={handleUploadSuccess}
          />
        ) : !isLoadingClubs ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Please select a golf course to upload vector layers</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default FileUpload;