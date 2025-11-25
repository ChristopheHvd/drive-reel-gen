import { useState } from "react";
import { ImageUploader, ImageGrid, useImages, Image } from "@/features/images";
import { VideoList, VideoConfigForm, useVideos } from "@/features/videos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Upload, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/daft-funk-logo.png";

const Dashboard = () => {
  const { images, loading, deleteImage, fetchImages } = useImages();
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const { videos, loading: videosLoading, refetchVideos } = useVideos(selectedImage?.id);
  const { toast } = useToast();

  const handleGenerateVideo = async (config: {
    mode: string;
    prompt: string;
    aspectRatio: string;
  }) => {
    if (!selectedImage) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          imageId: selectedImage.id,
          mode: config.mode,
          prompt: config.prompt,
          aspectRatio: config.aspectRatio,
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "✅ Génération lancée",
        description: `Votre vidéo sera prête dans ~2 minutes`,
      });
      
      // Refetch videos immédiatement pour voir le statut 'pending'
      refetchVideos();
      
    } catch (error: any) {
      console.error('Video generation error:', error);
      
      if (error.message?.includes('Quota')) {
        toast({
          title: "Quota dépassé",
          description: "Vous avez atteint votre limite mensuelle de vidéos",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message || "Impossible de lancer la génération",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);
      
      if (error) throw error;
      
      // Refetch
      refetchVideos();
    } catch (error) {
      console.error('Delete video error:', error);
      throw error;
    }
  };

  const scrollToGeneration = () => {
    // Scroll vers le panneau de génération sur mobile
    document.getElementById("video-config")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGenerateVideoFromImage = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return;
    
    setSelectedImage(image);
    
    // Utiliser le prompt par défaut et le mode packshot (valeur autorisée par la contrainte DB)
    const defaultPrompt = "Génère une vidéo sympa, très dynamique, respectant les codes d'Instagram";
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          imageId: image.id,
          mode: 'packshot',
          prompt: defaultPrompt,
          aspectRatio: '9:16',
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "✅ Génération lancée",
        description: `Votre vidéo sera prête dans ~2 minutes`,
      });
      
      // Refetch videos immédiatement pour voir le statut 'pending'
      refetchVideos();
      
    } catch (error: any) {
      console.error('Video generation error:', error);
      
      if (error.message?.includes('Quota')) {
        toast({
          title: "Quota dépassé",
          description: "Vous avez atteint votre limite mensuelle de vidéos",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message || "Impossible de lancer la génération",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <header className="border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Daft Funk" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              Daft Funk
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Free • 0/6 vidéos</span>
            <Button variant="outline" size="sm">
              Passer à Pro
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT PANEL: Images */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Mes Images</CardTitle>
                <Button
                  onClick={() => setShowUploader(!showUploader)}
                  size="sm"
                  variant="ghost"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {showUploader ? "Masquer" : "Upload"}
                </Button>
              </CardHeader>
              <CardContent>
                {showUploader && (
                  <>
                    <ImageUploader
                      onUploadComplete={() => {
                        fetchImages();
                        setShowUploader(false);
                      }}
                    />
                    <Separator className="my-6" />
                  </>
                )}
                <ImageGrid
                  images={images}
                  loading={loading}
                  onDeleteImage={deleteImage}
                  onSelectImage={(image) => {
                    setSelectedImage(image);
                    // Sur mobile, scroll automatiquement vers les vidéos
                    if (window.innerWidth < 1024) {
                      setTimeout(() => {
                        document.getElementById("video-list")?.scrollIntoView({ 
                          behavior: "smooth" 
                        });
                      }, 100);
                    }
                  }}
                  selectedImageId={selectedImage?.id}
                  onGenerateVideo={handleGenerateVideoFromImage}
                />
              </CardContent>
            </Card>
          </div>

          {/* CENTER PANEL: Vidéos générées */}
          <div className="lg:col-span-5" id="video-list">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Vidéos générées</CardTitle>
                {selectedImage && videos.length > 0 && (
                  <Button
                    onClick={scrollToGeneration}
                    size="sm"
                    variant="ghost"
                    className="lg:hidden"
                  >
                    Générer
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <VideoList
                  imageId={selectedImage?.id}
                  selectedImage={selectedImage || undefined}
                  videos={videos}
                  loading={videosLoading}
                  onGenerateVideo={scrollToGeneration}
                  onDeleteVideo={handleDeleteVideo}
                />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL: Configuration génération */}
          <div className="lg:col-span-4" id="video-config">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Génération Vidéo IA</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configurez les paramètres pour générer une nouvelle variation de vidéo
                </p>
              </CardHeader>
              <CardContent>
                {selectedImage ? (
                  <VideoConfigForm
                    selectedImageId={selectedImage.id}
                    onGenerate={handleGenerateVideo}
                    disabled={!selectedImage}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">Sélectionnez une image pour configurer la génération</p>
                  </div>
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
