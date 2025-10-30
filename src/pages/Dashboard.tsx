import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import Navigation from "@/components/Navigation";
import FileUpload from "@/components/FileUpload";
import InteractiveMap from "@/components/InteractiveMap";

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const [processedImageId, setProcessedImageId] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Navigation isLoggedIn={true} onLogout={onLogout} />
      
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Agricultural Analysis Dashboard
          </h1>
          <p className="text-muted-foreground">
            Upload and analyze your agricultural data with advanced terrain insights
          </p>
        </div>
        
        <FileUpload onFileProcessed={(imageId, imageUrl) => {
          setProcessedImageId(imageId);
          setProcessedImageUrl(imageUrl);
        }} />
        
        {processedImageId && processedImageUrl ? (
          <InteractiveMap imageId={processedImageId} imageUrl={processedImageUrl} />
        ) : (
          <Card className="p-12 text-center">
            <CardContent>
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <MapPin className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-medium mb-2">Ready for Analysis</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Upload your agricultural data above to unlock interactive terrain analysis, 
                    vegetation health mapping, and detailed area statistics.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;