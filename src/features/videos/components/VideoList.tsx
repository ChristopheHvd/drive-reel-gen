import { VideoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Video } from "../types";
import { Image } from "@/features/images/types";
import { VideoPlaceholder } from "./VideoPlaceholder";
import { VideoLoadingPlaceholder } from "./VideoLoadingPlaceholder";
import { VideoPlayer } from "./VideoPlayer";
import { VideoErrorCard } from "./VideoErrorCard";

interface VideoListProps {
  imageId?: string;
  selectedImage?: Image;
  videos: Video[];
  loading: boolean;
  onGenerateVideo: () => void;
  onDeleteVideo: (videoId: string) => void;
  onSelectVideo?: (video: Video) => void;
  onRegenerateVideo?: (video: Video) => void;
}

/**
 * Liste des vidéos générées pour une image
 */
export const VideoList = ({ 
  imageId, 
  selectedImage,
  videos, 
  loading, 
  onGenerateVideo,
  onDeleteVideo,
  onSelectVideo,
  onRegenerateVideo,
}: VideoListProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (!imageId || !selectedImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
        <VideoIcon className="w-16 h-16 mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Sélectionnez une image pour voir ses vidéos</p>
      </div>
    );
  }

  // Filtrer les vidéos par statut
  const pendingVideo = videos.find(v => v.status === 'pending' || v.status === 'processing' || v.status === 'merging');
  const completedVideos = videos
    .filter(v => v.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const failedVideos = videos
    .filter(v => v.status === 'failed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  // Cas aucune vidéo → Placeholder avec bouton de génération
  if (videos.length === 0) {
    return (
      <VideoPlaceholder 
        image={selectedImage} 
        onGenerateVideo={onGenerateVideo} 
      />
    );
  }

  // Afficher les vidéos en grille (pending + completed + failed)
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Vidéo en cours de génération */}
      {pendingVideo && (
        <VideoLoadingPlaceholder 
          image={selectedImage}
          video={pendingVideo}
        />
      )}
      
      {/* Vidéos terminées */}
      {completedVideos.map(video => (
        <div 
          key={video.id}
          onClick={() => onSelectVideo?.(video)}
          className="cursor-pointer"
        >
          <VideoPlayer 
            video={video}
            onDelete={onDeleteVideo}
            onRegenerate={onRegenerateVideo}
          />
        </div>
      ))}
      
      {/* Vidéos en erreur */}
      {failedVideos.map(video => (
        <VideoErrorCard 
          key={video.id}
          video={video}
          image={selectedImage}
          onDelete={onDeleteVideo}
          onRegenerate={onRegenerateVideo}
        />
      ))}
    </div>
  );
};
