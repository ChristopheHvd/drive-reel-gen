import { useState } from "react";
import { ImageUploader, ImageGrid, useImages, Image } from "@/features/images";
import { VideoList, VideoConfigForm, useVideos } from "@/features/videos";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col h-screen bg-background">
      {/* Header fixe */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Daft Funk" className="h-8 w-8" />
            <span className="text-xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              Daft Funk
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Free • 0/6 vidéos</span>
            <Button variant="outline" size="sm" className="border-primary/20 hover:border-primary/40">
              Passer à Pro
            </Button>
          </div>
        </div>
      </header>

      {/* Layout 3 colonnes full-height */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT: Galerie d'images */}
        <div className="lg:col-span-3 border-r border-border/40 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <h2 className="text-lg font-semibold">Mes Images</h2>
            <Button
              onClick={() => setShowUploader(!showUploader)}
              size="sm"
              variant="ghost"
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {showUploader && (
              <div className="mb-4">
                <ImageUploader
                  onUploadComplete={() => {
                    fetchImages();
                    setShowUploader(false);
                  }}
                />
              </div>
            )}
            <ImageGrid
              images={images}
              loading={loading}
              onDeleteImage={deleteImage}
              onSelectImage={(image) => {
                setSelectedImage(image);
                if (window.innerWidth < 1024) {
                  setTimeout(() => {
                    document.getElementById("video-section")?.scrollIntoView({ 
                      behavior: "smooth" 
                    });
                  }, 100);
                }
              }}
              selectedImageId={selectedImage?.id}
              onGenerateVideo={handleGenerateVideoFromImage}
            />
          </div>
        </div>

        {/* CENTER: Galerie de vidéos */}
        <div className="lg:col-span-6 border-r border-border/40 flex flex-col overflow-hidden" id="video-section">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <h2 className="text-lg font-semibold">Vidéos générées</h2>
            {selectedImage && videos.length > 0 && (
              <Button
                onClick={scrollToGeneration}
                size="sm"
                variant="ghost"
                className="lg:hidden gap-1"
              >
                Générer
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <VideoList
              imageId={selectedImage?.id}
              selectedImage={selectedImage || undefined}
              videos={videos}
              loading={videosLoading}
              onGenerateVideo={scrollToGeneration}
              onDeleteVideo={handleDeleteVideo}
            />
          </div>
        </div>

        {/* RIGHT: Configuration */}
        <div className="lg:col-span-3 flex flex-col overflow-hidden" id="video-config">
          <div className="px-6 py-4 border-b border-border/40">
            <h2 className="text-lg font-semibold">Génération Vidéo IA</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Configurez les paramètres pour générer une nouvelle variation de vidéo
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedImage ? (
              <VideoConfigForm
                selectedImageId={selectedImage.id}
                onGenerate={handleGenerateVideo}
                disabled={!selectedImage}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <p className="text-sm text-muted-foreground">
                  Sélectionnez une image pour configurer la génération
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
