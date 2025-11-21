export interface BrandProfile {
  id: string;
  team_id: string;
  company_name: string;
  website_url?: string;
  instagram_url?: string;
  business_description?: string;
  target_audience?: string;
  tone_of_voice?: string;
  brand_values?: string[];
  visual_identity?: VisualIdentity;
  analyzed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VisualIdentity {
  colors: string[];
  style: string;
  imagery: string;
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
