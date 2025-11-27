import { useState, useEffect } from 'react';
import { VideoIcon, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { Video } from '@/features/videos/types';
import type { Image } from '@/features/images/types';

interface VideoLoadingPlaceholderProps {
  image: Image;
  video: Video;
}

/**
 * Affiche un placeholder animé pendant la génération de vidéo
 * Gère l'affichage progressif des étapes pour les vidéos multi-segments
 */
export const VideoLoadingPlaceholder = ({ image, video }: VideoLoadingPlaceholderProps) => {
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
  
  // Calculer le nombre de segments nécessaires
  const segmentsNeeded = Math.ceil((video.target_duration_seconds || 8) / 8);
  const currentSegment = video.current_segment || 1;
  
  // Déterminer le texte à afficher selon l'étape
  const getProgressInfo = () => {
    if (video.status === 'pending') {
      return { 
        title: 'Préparation...', 
        subtitle: 'Initialisation de la génération'
      };
    }
    
    if (video.status === 'merging') {
      return { 
        title: 'Assemblage en cours', 
        subtitle: `Fusion ${segmentsNeeded === 2 ? 'des 2 morceaux' : 'des 3 morceaux'} de vidéo`
      };
    }
    
    // status === 'processing'
    if (segmentsNeeded === 1) {
      return { 
        title: 'Génération en cours', 
        subtitle: 'Création de votre vidéo'
      };
    }
    
    // Vidéo multi-segments
    const segmentLabel = currentSegment === 1 ? 'premier' : currentSegment === 2 ? 'deuxième' : 'troisième';
    return { 
      title: `Morceau ${currentSegment}/${segmentsNeeded}`, 
      subtitle: `Génération du ${segmentLabel} segment`
    };
  };
  
  const progressInfo = getProgressInfo();
  
  return (
    <div className="group relative overflow-hidden rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
      {/* Container avec aspect-video pour correspondre au VideoPlayer */}
      <div className="relative aspect-video flex items-center justify-center overflow-hidden">
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
          <div className="w-32 h-32 rounded-full bg-primary/20 blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
        </div>
        
        {/* Contenu central */}
        <div className="relative z-10 text-center space-y-3 p-6">
        {/* Icône animée avec effet de rotation et glow */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent opacity-20 blur-xl animate-pulse" />
          </div>
          <div className="relative">
            <VideoIcon 
              className="w-12 h-12 mx-auto text-primary animate-pulse" 
              strokeWidth={1.5}
            />
            <Sparkles 
              className="absolute -top-1 -right-1 w-5 h-5 text-accent animate-pulse" 
              style={{ animationDuration: '1.5s' }}
            />
          </div>
        </div>
        
        {/* Texte */}
        <div className="space-y-2">
          <h3 className="text-base font-bold bg-gradient-to-r from-primary via-foreground to-accent bg-clip-text text-transparent">
            {progressInfo.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {progressInfo.subtitle}
          </p>
          
          {/* Barre de progression animée */}
          <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary via-accent to-primary animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]"
              style={{
                animation: 'shimmer 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>
        
        {/* Points de chargement animés */}
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
        </div>
      </div>
      
      {/* Footer avec indicateurs d'étapes pour vidéos multi-segments */}
      <div className="p-3 space-y-2">
        {segmentsNeeded > 1 && (
          <div className="flex items-center justify-center gap-2">
            {/* Indicateurs visuels des étapes */}
            {Array.from({ length: segmentsNeeded + 1 }).map((_, i) => {
              const isSegmentStep = i < segmentsNeeded;
              const isMergeStep = i === segmentsNeeded;
              
              // Déterminer l'état de chaque étape
              let isCompleted = false;
              let isCurrent = false;
              
              if (video.status === 'merging') {
                // En fusion : tous les segments sont complétés, la fusion est en cours
                isCompleted = isSegmentStep;
                isCurrent = isMergeStep;
              } else {
                // En génération : les segments avant current_segment sont complétés
                isCompleted = isSegmentStep && i < currentSegment - 1;
                isCurrent = isSegmentStep && i === currentSegment - 1;
              }
              
              return (
                <div 
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    isCompleted && "bg-primary",
                    isCurrent && "bg-primary animate-pulse",
                    !isCompleted && !isCurrent && "bg-muted"
                  )}
                  title={
                    isMergeStep 
                      ? "Assemblage" 
                      : `Segment ${i + 1}`
                  }
                />
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center">
          {video.status === 'pending' && 'En attente de traitement...'}
          {video.status === 'processing' && segmentsNeeded === 1 && 'Génération en cours...'}
          {video.status === 'processing' && segmentsNeeded > 1 && `Segment ${currentSegment}/${segmentsNeeded}`}
          {video.status === 'merging' && 'Assemblage final...'}
        </p>
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
