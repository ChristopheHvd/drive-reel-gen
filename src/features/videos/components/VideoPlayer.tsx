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
            className="w-full max-h-[300px] object-contain bg-black"
            poster={video.thumbnail_url}
          >
            Votre navigateur ne supporte pas la vidéo.
          </video>
        </div>
      ) : (
        <div className="h-[200px] bg-muted flex flex-col items-center justify-center p-4 text-center">
          {video.status === 'pending' && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-xs font-medium">Génération en attente...</p>
            </>
          )}
          {video.status === 'processing' && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-xs font-medium">Génération en cours...</p>
            </>
          )}
          {video.status === 'failed' && (
            <>
              <AlertCircle className="w-8 h-8 text-destructive mb-2" />
              <p className="text-xs font-medium text-destructive">Échec de la génération</p>
              <p className="text-[10px] text-muted-foreground mt-1">{video.error_message || 'Erreur inconnue'}</p>
            </>
          )}
          {video.status === 'timeout' && (
            <>
              <AlertCircle className="w-8 h-8 text-orange-500 mb-2" />
              <p className="text-xs font-medium text-orange-500">Délai dépassé</p>
            </>
          )}
        </div>
      )}
      
      {/* Metadata - Plus compact */}
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={video.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
            {video.status === 'completed' && <CheckCircle className="w-2.5 h-2.5 mr-0.5" />}
            {video.status === 'completed' ? 'Terminée' : 
             video.status === 'processing' ? 'En cours' :
             video.status === 'pending' ? 'En attente' :
             video.status === 'timeout' ? 'Timeout' : 'Échec'}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{video.mode}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{video.aspect_ratio}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{video.duration_seconds}s</Badge>
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2">
          {video.prompt}
        </p>
        
        <p className="text-[10px] text-muted-foreground">
          {new Date(video.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
        
        {/* Actions */}
        {video.status === 'completed' && (
          <div className="flex gap-2 pt-1">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleDownload}
              className="flex-1 h-8 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Télécharger
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 px-2"
            >
              <Trash2 className="w-3 h-3" />
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
            className="w-full h-8 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Supprimer
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
