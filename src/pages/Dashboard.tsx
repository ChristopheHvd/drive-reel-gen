import { useState } from "react";
import { ImageUploader, ImageGrid, useImages, Image } from "@/features/images";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Video, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/daft-funk-logo.png";

const Dashboard = () => {
  const { images, loading, deleteImage, fetchImages } = useImages();
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-dark">
      <header className="border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Daft Funk" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">Daft Funk</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Free • 0/6 vidéos</span>
            <Button variant="outline" size="sm">Passer à Pro</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mes Images</CardTitle>
                <Button onClick={() => setShowUploader(!showUploader)} size="sm">
                  <Upload className="w-4 h-4 mr-2" />{showUploader ? "Masquer" : "Uploader"}
                </Button>
              </CardHeader>
              <CardContent>
                {showUploader && <><ImageUploader onUploadComplete={() => { fetchImages(); setShowUploader(false); }} /><Separator className="my-6" /></>}
                <ImageGrid images={images} loading={loading} onDeleteImage={deleteImage} onSelectImage={setSelectedImage} selectedImageId={selectedImage?.id} />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader><CardTitle>Génération Vidéo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {selectedImage ? (
                  <>
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <img src={selectedImage.storage_path} alt={selectedImage.file_name} className="w-full h-full object-cover" />
                    </div>
                    <div><p className="text-sm font-medium truncate">{selectedImage.file_name}</p></div>
                    <Separator />
                    <Button className="w-full" size="lg"><Video className="w-4 h-4 mr-2" />Générer une vidéo</Button>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground"><Video className="w-12 h-12 mx-auto mb-4 opacity-50" /><p className="text-sm">Sélectionnez une image</p></div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
