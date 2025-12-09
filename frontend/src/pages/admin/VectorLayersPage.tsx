import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import VectorLayerUploader from '@/components/admin/VectorLayerUploader';
import VectorLayerManager from '@/components/VectorLayerManager';

export default function VectorLayersPage() {
  const { golfCourseId } = useParams<{ golfCourseId: string }>();
  const [showUploader, setShowUploader] = useState(false);

  if (!golfCourseId) {
    return <div>No golf course selected</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vector Layers</h1>
        <Button onClick={() => setShowUploader(!showUploader)}>
          <Plus className="w-4 h-4 mr-2" />
          {showUploader ? 'Hide Uploader' : 'Upload New Layer'}
        </Button>
      </div>

      {showUploader && (
        <div className="mb-8 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Upload Vector Layer</h2>
          <VectorLayerUploader 
            golfCourseId={golfCourseId} 
            onUploadSuccess={() => setShowUploader(false)}
          />
        </div>
      )}

      <Tabs defaultValue="manage" className="w-full">
        <TabsList>
          <TabsTrigger value="manage">Manage Layers</TabsTrigger>
          <TabsTrigger value="styles">Layer Styles</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manage" className="pt-4">
          <VectorLayerManager 
            golfCourseId={golfCourseId}
            isAdmin={true}
            className="w-full"
          />
        </TabsContent>
        
        <TabsContent value="styles" className="pt-4">
          <div className="p-4 border rounded-lg">
            <p>Customize layer styles and appearance here.</p>
            {/* Add style customization components here */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
