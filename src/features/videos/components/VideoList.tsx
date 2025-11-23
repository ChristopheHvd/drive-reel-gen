import { VideoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Video } from "../types";
import { Image } from "@/features/images/types";
import { VideoPlaceholder } from "./VideoPlaceholder";
import { VideoPlayer } from "./VideoPlayer";

interface VideoListProps {
  imageId?: string;
  selectedImage?: Image;
  videos: Video[];
  loading: boolean;
  onGenerateVideo: () => void;
  onDeleteVideo: (videoId: string) => void;
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
  onDeleteVideo 
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

  // Cas aucune vidéo → Placeholder
  if (videos.length === 0) {
    return (
      <VideoPlaceholder 
        image={selectedImage} 
        onGenerateVideo={onGenerateVideo} 
      />
    );
  }

  // Afficher les vidéos (plus récente en premier)
  const sortedVideos = [...videos].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedVideos.map(video => (
        <VideoPlayer 
          key={video.id} 
          video={video}
          onDelete={onDeleteVideo}
        />
      ))}
    </div>
  );
};
