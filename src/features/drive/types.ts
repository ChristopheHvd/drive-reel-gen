export interface DriveImage {
  id: string;
  user_id: string;
  drive_file_id: string;
  file_name: string;
  mime_type: string;
  thumbnail_link?: string;
  web_content_link?: string;
  size?: number;
  created_time?: string;
  modified_time?: string;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface DriveFolder {
  id: string;
  user_id: string;
  folder_id: string;
  folder_name: string;
  watch_channel_id?: string;
  watch_resource_id?: string;
  watch_expiration?: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectFolderDto {
  folderId: string;
  folderName: string;
}

export interface SyncDriveResponse {
  success: boolean;
  imagesCount?: number;
  error?: string;
}
