export interface Video {
  id: string;
  image_id: string;
  team_id: string;
  kie_task_id: string;
  video_url: string;
  thumbnail_url?: string;
  status: 'pending' | 'processing' | 'merging' | 'completed' | 'failed' | 'timeout';
  mode: 'packshot' | 'situation' | 'temoignage';
  prompt: string;
  aspect_ratio: '9:16' | '16:9';
  duration_seconds: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  timeout_at: string;
  seed?: number;
  logo_url?: string;
  additional_image_url?: string;
  generation_type: 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO';
  was_cropped?: boolean;
  target_duration_seconds: number;
  current_segment: number;
  segment_prompts: string[] | null;
}

export type VideoMode = 'packshot' | 'situation' | 'temoignage';
export type AspectRatio = '9:16' | '16:9';
export type GenerationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO' | 'REFERENCE_2_VIDEO';
export type PromptType = 'situation' | 'product' | 'testimonial';
export type VideoDuration = 8 | 16 | 24;
