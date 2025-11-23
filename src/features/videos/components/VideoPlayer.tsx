import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Video } from '../types';
import { toast } from 'sonner';

interface VideoPlayerProps {
  video: Video;
  onDelete: (videoId: string) => void;
}

export const VideoPlayer = ({ video, onDelete }: VideoPlayerProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
    }
  };
  
  return (
    <Card className="overflow-hidden">
      {/* Video player ou status */}
      {video.status === 'completed' && videoUrl ? (
        <div className="relative">
          <video 
            src={videoUrl} 
            controls 
            className="w-full aspect-video bg-black"
            poster={video.thumbnail_url}
          >
            Votre navigateur ne supporte pas la vidéo.
          </video>
        </div>
      ) : (
        <div className="aspect-video bg-muted flex flex-col items-center justify-center p-6 text-center">
          {video.status === 'pending' && (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Génération en attente...</p>
              <p className="text-xs text-muted-foreground mt-1">La vidéo sera prête dans quelques minutes</p>
            </>
          )}
          {video.status === 'processing' && (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Génération en cours...</p>
              <p className="text-xs text-muted-foreground mt-1">Veuillez patienter</p>
            </>
          )}
          {video.status === 'failed' && (
            <>
              <AlertCircle className="w-10 h-10 text-destructive mb-3" />
              <p className="text-sm font-medium text-destructive">Échec de la génération</p>
              <p className="text-xs text-muted-foreground mt-1">{video.error_message || 'Erreur inconnue'}</p>
            </>
          )}
          {video.status === 'timeout' && (
            <>
              <AlertCircle className="w-10 h-10 text-orange-500 mb-3" />
              <p className="text-sm font-medium text-orange-500">Délai d'attente dépassé</p>
              <p className="text-xs text-muted-foreground mt-1">La génération a pris trop de temps</p>
            </>
          )}
        </div>
      )}
      
      {/* Metadata */}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={video.status === 'completed' ? 'default' : 'secondary'}>
            {video.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
            {video.status === 'completed' ? 'Terminée' : 
             video.status === 'processing' ? 'En cours' :
             video.status === 'pending' ? 'En attente' :
             video.status === 'timeout' ? 'Timeout' : 'Échec'}
          </Badge>
          <Badge variant="outline">{video.mode}</Badge>
          <Badge variant="outline">{video.aspect_ratio}</Badge>
          <Badge variant="outline">{video.duration_seconds}s</Badge>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2">
          {video.prompt}
        </p>
        
        <p className="text-xs text-muted-foreground">
          Créée le {new Date(video.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
        
        {/* Actions */}
        {video.status === 'completed' && (
          <div className="flex gap-2 pt-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {/* Actions pour statuts échec */}
        {(video.status === 'failed' || video.status === 'timeout') && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer cette tentative
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
