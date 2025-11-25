import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, Loader2, AlertCircle, CheckCircle, MoreVertical, Video as VideoIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Video } from '../types';
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VideoPlayerProps {
  video: Video;
  onDelete: (videoId: string) => void;
}

export const VideoPlayer = ({ video, onDelete }: VideoPlayerProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Charger signed URL de la vidéo
  useEffect(() => {
    const loadVideoUrl = async () => {
      if (video.status !== 'completed' || !video.video_url) return;
      
      const { data, error } = await supabase.storage
        .from('team-videos')
        .createSignedUrl(video.video_url, 31536000); // 1 an
      
      if (error) {
        console.error('Error loading video URL:', error);
        return;
      }
      
      if (data) setVideoUrl(data.signedUrl);
    };
    
    loadVideoUrl();
  }, [video]);
  
  const handleDownload = async () => {
    if (!videoUrl) return;
    
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Téléchargement démarré");
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Erreur lors du téléchargement");
    }
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(video.id);
      toast.success("Vidéo supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'timeout': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'processing': return 'En cours';
      case 'pending': return 'En attente';
      case 'failed': return 'Échec';
      case 'timeout': return 'Timeout';
      default: return status;
    }
  };
  
  return (
    <>
      <div className="group relative overflow-hidden rounded-lg bg-card/50 backdrop-blur-sm border border-border/50">
        {/* Vidéo */}
        <div className="relative aspect-video bg-black">
          {video.video_url && videoUrl ? (
            <video 
              controls 
              className="w-full h-full object-contain"
              poster={video.thumbnail_url || undefined}
            >
              <source src={videoUrl} type="video/mp4" />
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center space-y-2">
                <VideoIcon className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Vidéo non disponible</p>
              </div>
            </div>
          )}

          {/* Badge statut */}
          <div className="absolute top-2 left-2">
            <Badge variant={getStatusVariant(video.status)} className="text-xs">
              {getStatusLabel(video.status)}
            </Badge>
          </div>

          {/* Menu actions */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7 bg-background/90 hover:bg-background"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {videoUrl && (
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Télécharger
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Footer avec date et prompt */}
        <div className="p-2 space-y-1">
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(video.created_at), { 
              addSuffix: true,
              locale: fr 
            })}
          </p>
          {video.prompt && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {video.prompt}
            </p>
          )}
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette vidéo ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La vidéo sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
