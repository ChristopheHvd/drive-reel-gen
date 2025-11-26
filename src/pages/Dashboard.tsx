import { useState, useEffect } from "react";
import { ImageUploader, ImageGrid, useImages, Image } from "@/features/images";
import { VideoList, VideoConfigForm, useVideos, Video } from "@/features/videos";
import { Button } from "@/components/ui/button";
import { Upload, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/daft-funk-logo.png";
import { useSubscription, QuotaExceededDialog } from "@/features/subscription";

const Dashboard = () => {
  const { images, loading, deleteImage, fetchImages } = useImages();
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const { videos, loading: videosLoading, refetchVideos } = useVideos(selectedImage?.id);
  const { toast } = useToast();
  const { subscription, videosRemaining, isQuotaExceeded, nextResetDate, loading: subscriptionLoading } = useSubscription();

  // Sélectionner automatiquement la première image au chargement
  useEffect(() => {
    if (images.length > 0 && !selectedImage) {
      setSelectedImage(images[0]);
    }
  }, [images, selectedImage]);

  const handleGenerateVideo = async (config: {
    prompt: string;
    aspectRatio: string;
    logoFile?: File;
    additionalImageFile?: File;
    seed?: number;
    logoUrl?: string;           // Pour régénération avec logo existant
    additionalImageUrl?: string; // Pour régénération avec image existante
  }) => {
    if (!selectedImage) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }

    // Vérification instantanée du quota
    if (isQuotaExceeded) {
      setShowQuotaDialog(true);
      return;
    }
    
    try {
      // Upload logo si présent
      let logoUrl: string | undefined;
      if (config.logoFile) {
        const logoPath = `${selectedImage.team_id}/${Date.now()}_logo_${config.logoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('team-images')
          .upload(logoPath, config.logoFile, { contentType: config.logoFile.type });
        
        if (!uploadError) {
          logoUrl = logoPath;
        }
      }

      // Upload image additionnelle si présente
      let additionalImageUrl: string | undefined;
      if (config.additionalImageFile) {
        const additionalPath = `${selectedImage.team_id}/${Date.now()}_additional_${config.additionalImageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('team-images')
          .upload(additionalPath, config.additionalImageFile, { contentType: config.additionalImageFile.type });
        
        if (!uploadError) {
          additionalImageUrl = additionalPath;
        }
      }
      
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          imageId: selectedImage.id,
          prompt: config.prompt,
          aspectRatio: config.aspectRatio,
          // Priorité aux nouveaux fichiers uploadés, sinon utiliser les URLs existantes
          logoUrl: logoUrl || config.logoUrl,
          additionalImageUrl: additionalImageUrl || config.additionalImageUrl,
          seed: config.seed,
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
      
      toast({
        title: "Erreur",
        description: error.message || "Impossible de lancer la génération",
        variant: "destructive",
      });
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

    // Vérification instantanée du quota
    if (isQuotaExceeded) {
      setShowQuotaDialog(true);
      return;
    }
    
    setSelectedImage(image);
    
    // Utiliser le prompt par défaut
    const defaultPrompt = "Génère une vidéo sympa, très dynamique, respectant les codes d'Instagram";
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          imageId: image.id,
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
      
      toast({
        title: "Erreur",
        description: error.message || "Impossible de lancer la génération",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateVideo = (video: Video) => {
    // Régénérer avec les mêmes paramètres mais nouveau seed dans la plage valide Kie.ai
    const newSeed = Math.floor(Math.random() * 89999) + 10000;
    handleGenerateVideo({
      prompt: video.prompt,
      aspectRatio: video.aspect_ratio,
      seed: newSeed,
      // Passer logo et image additionnelle s'ils existent (peuvent être null/undefined)
      logoUrl: video.logo_url || undefined,
      additionalImageUrl: video.additional_image_url || undefined,
    });
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
            {!subscriptionLoading && subscription && (
              <span className="text-sm text-muted-foreground">
                <span className="font-medium capitalize">{subscription.plan_type}</span>
                {' • '}
                <span>{subscription.videos_generated_this_month}/{subscription.video_limit} vidéos</span>
              </span>
            )}
            {subscription?.plan_type === 'free' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="border-primary/20 hover:border-primary/40"
                onClick={() => setShowQuotaDialog(true)}
              >
                Passer à Pro
              </Button>
            )}
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
              onSelectVideo={setSelectedVideo}
              onRegenerateVideo={handleRegenerateVideo}
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
                initialPrompt={selectedVideo?.prompt}
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

      <QuotaExceededDialog
        open={showQuotaDialog}
        onOpenChange={setShowQuotaDialog}
        nextResetDate={nextResetDate}
        currentPlan={subscription?.plan_type || 'free'}
      />
    </div>
  );
};

export default Dashboard;
