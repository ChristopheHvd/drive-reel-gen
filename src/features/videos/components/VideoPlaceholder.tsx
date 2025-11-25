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
    <div className="relative h-[250px] flex items-center justify-center overflow-hidden rounded-lg">
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
      <div className="relative z-10 text-center space-y-3 p-6">
        <VideoIcon className="w-12 h-12 mx-auto text-primary" strokeWidth={1.5} />
        <div className="space-y-1">
          <h3 className="text-base font-bold">Aucune vidéo générée</h3>
          <p className="text-xs text-muted-foreground">
            Créez votre première vidéo Instagram Reels
          </p>
        </div>
        <Button size="sm" onClick={onGenerateVideo} className="gap-2">
          <Play className="w-4 h-4" />
          Générer une vidéo
        </Button>
      </div>
    </div>
  );
};
