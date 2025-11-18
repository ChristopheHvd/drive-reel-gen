-- Create table for Google Drive folder configuration
CREATE TABLE public.drive_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  folder_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  watch_channel_id TEXT,
  watch_resource_id TEXT,
  watch_expiration TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for synchronized images from Google Drive
CREATE TABLE public.drive_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  drive_file_id TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  thumbnail_link TEXT,
  web_content_link TEXT,
  size BIGINT,
  created_time TIMESTAMP WITH TIME ZONE,
  modified_time TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store Google Drive refresh tokens securely
CREATE TABLE public.drive_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  refresh_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drive_folders
CREATE POLICY "Users can view their own drive folders"
ON public.drive_folders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drive folders"
ON public.drive_folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drive folders"
ON public.drive_folders FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drive folders"
ON public.drive_folders FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for drive_images
CREATE POLICY "Users can view their own drive images"
ON public.drive_images FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drive images"
ON public.drive_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drive images"
ON public.drive_images FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drive images"
ON public.drive_images FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for drive_tokens (only service role can access)
CREATE POLICY "Service role can manage drive tokens"
ON public.drive_tokens FOR ALL
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_drive_folders_updated_at
BEFORE UPDATE ON public.drive_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drive_images_updated_at
BEFORE UPDATE ON public.drive_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drive_tokens_updated_at
BEFORE UPDATE ON public.drive_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();