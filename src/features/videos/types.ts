export interface Video {
  id: string;
  image_id: string;
  team_id: string;
  kie_task_id: string;
  video_url: string;
  thumbnail_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  mode: 'packshot' | 'situation' | 'temoignage';
  prompt: string;
  aspect_ratio: '9:16' | '16:9';
  duration_seconds: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  timeout_at: string;
}

export type VideoMode = 'packshot' | 'situation' | 'temoignage';
export type AspectRatio = '9:16' | '16:9';
