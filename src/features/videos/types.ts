export interface Video {
  id: string;
  image_id: string;
  video_url: string;
  thumbnail_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  mode: 'packshot' | 'situation' | 'temoignage';
  prompt?: string;
  aspect_ratio: '9:16' | '16:9';
  created_at: string;
  updated_at: string;
}

export type VideoMode = 'packshot' | 'situation' | 'temoignage';
export type AspectRatio = '9:16' | '16:9';
