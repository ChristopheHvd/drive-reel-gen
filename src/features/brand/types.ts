export interface BrandProfile {
  id: string;
  team_id: string;
  company_name: string;
  website_url?: string | null;
  instagram_url?: string | null;
  business_description?: string | null;
  target_audience?: string | null;
  tone_of_voice?: string | null;
  brand_values?: string[] | null;
  visual_identity?: VisualIdentity | null;
  analyzed_at?: string | null;
  analysis_status?: 'todo' | 'pending' | 'completed' | 'failed' | null;
  created_at: string;
  updated_at: string;
}

export interface VisualIdentity {
  colors: string[];
  style: string;
  imagery: string;
  logo?: string;
}

export interface CreateBrandDto {
  company_name: string;
  website_url?: string;
  instagram_url?: string;
  business_description?: string;
  target_audience?: string;
}

export interface UpdateBrandDto extends Partial<CreateBrandDto> {
  tone_of_voice?: string;
  brand_values?: string[];
  visual_identity?: VisualIdentity;
}

export interface BrandFormData {
  companyName: string;
  websiteUrl?: string;
  instagramUrl?: string;
  businessDescription?: string;
  targetAudience?: string;
}
