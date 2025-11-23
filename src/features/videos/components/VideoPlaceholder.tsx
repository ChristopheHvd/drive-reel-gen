import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, VideoIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Image } from '@/features/images/types';

interface VideoPlaceholderProps {
  image: Image;
  onGenerateVideo: () => void;
}

export const VideoPlaceholder = ({ image, onGenerateVideo }: VideoPlaceholderProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const loadImageUrl = async () => {
      const { data } = await supabase.storage
        .from('team-images')
        .createSignedUrl(image.storage_path, 31536000); // 1 an
      
      if (data) setImageUrl(data.signedUrl);
    };
    
    loadImageUrl();
  }, [image]);
  
  return (
    <div className="relative h-full min-h-[500px] flex items-center justify-center overflow-hidden rounded-lg">
      {/* Background flouté */}
      {imageUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background/40" />
      
      {/* Contenu */}
      <div className="relative z-10 text-center space-y-6 p-8 max-w-md">
        <VideoIcon className="w-20 h-20 mx-auto text-primary" strokeWidth={1.5} />
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">Aucune vidéo générée</h3>
          <p className="text-muted-foreground">
            Créez votre première vidéo Instagram Reels à partir de cette image en quelques clics
          </p>
        </div>
        <Button size="lg" onClick={onGenerateVideo} className="gap-2">
          <Play className="w-5 h-5" />
          Générer une vidéo
        </Button>
      </div>
    </div>
  );
};
