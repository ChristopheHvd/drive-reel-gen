export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: "owner" | "admin" | "member";
  invited_by: string;
  token: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  user_profiles?: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}
