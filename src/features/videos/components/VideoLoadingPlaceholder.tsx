import { useState, useEffect } from 'react';
import { VideoIcon, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Image } from '@/features/images/types';

interface VideoLoadingPlaceholderProps {
  image: Image;
  status: 'pending' | 'processing';
}

export const VideoLoadingPlaceholder = ({ image, status }: VideoLoadingPlaceholderProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const loadImageUrl = async () => {
      const { data } = await supabase.storage
        .from('team-images')
        .createSignedUrl(image.storage_path, 31536000);
      
      if (data) setImageUrl(data.signedUrl);
    };
    
    loadImageUrl();
  }, [image]);
  
  return (
    <div className="relative h-full min-h-[500px] flex items-center justify-center overflow-hidden rounded-lg border border-border/50">
      {/* Background flouté avec l'image */}
      {imageUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-10 animate-pulse"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      
      {/* Overlay gradient animé */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 animate-pulse" />
      
      {/* Cercles de glow animés */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 rounded-full bg-primary/20 blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute w-48 h-48 rounded-full bg-accent/20 blur-3xl animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
      </div>
      
      {/* Contenu central */}
      <div className="relative z-10 text-center space-y-6 p-8 max-w-md">
        {/* Icône animée avec effet de rotation et glow */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary to-accent opacity-20 blur-xl animate-pulse" />
          </div>
          <div className="relative">
            <VideoIcon 
              className="w-20 h-20 mx-auto text-primary animate-pulse" 
              strokeWidth={1.5}
            />
            <Sparkles 
              className="absolute -top-2 -right-2 w-8 h-8 text-accent animate-pulse" 
              style={{ animationDuration: '1.5s' }}
            />
          </div>
        </div>
        
        {/* Texte */}
        <div className="space-y-3">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary via-foreground to-accent bg-clip-text text-transparent">
            {status === 'pending' ? 'Préparation...' : 'Génération en cours'}
          </h3>
          <p className="text-muted-foreground">
            Votre vidéo Instagram Reels est en cours de création. Cela peut prendre quelques minutes.
          </p>
          
          {/* Barre de progression animée */}
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary via-accent to-primary animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]"
              style={{
                animation: 'shimmer 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
        
        {/* Points de chargement animés */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};
