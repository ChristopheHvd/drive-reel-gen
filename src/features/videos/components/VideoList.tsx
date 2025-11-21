import { Video as VideoIcon, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Video } from "../types";

interface VideoListProps {
  imageId?: string;
  videos: Video[];
  loading: boolean;
  onGenerateVideo: () => void;
}

/**
 * Liste des vidéos générées pour une image
 */
export const VideoList = ({ imageId, videos, loading, onGenerateVideo }: VideoListProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!imageId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <VideoIcon className="w-16 h-16 mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-2">Aucune image sélectionnée</p>
        <p className="text-sm text-muted-foreground">
          Sélectionnez une image pour voir ses vidéos
        </p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <VideoIcon className="w-16 h-16 mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-4">
          Aucune vidéo générée pour cette image
        </p>
        <Button onClick={onGenerateVideo} size="lg" className="gap-2">
          <Play className="w-4 h-4" />
          Générer une vidéo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative aspect-video w-32 bg-muted rounded-lg overflow-hidden">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                {video.status === 'completed' && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {video.mode}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {video.aspect_ratio}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {video.prompt || "Aucun prompt"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(video.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                {video.status === 'completed' && (
                  <Button size="sm" variant="outline">
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                {video.status === 'processing' && (
                  <span className="text-xs text-muted-foreground">En cours...</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
