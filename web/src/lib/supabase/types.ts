// Auto-generate this file with: npx supabase gen types typescript --local > src/lib/supabase/types.ts
// Run after migrations are applied to your local Supabase instance.
//
// Until generated, this file provides the basic shape for type safety.

export type UserRole = 'admin' | 'coach' | 'viewer'
export type ConversationType = 'ai' | 'dm' | 'community'
export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type ClubInviteStatus = 'pending' | 'accepted' | 'declined'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  club: string | null       // legacy text field — kept until fully migrated
  club_id: string | null    // FK to clubs.id
  coaching_level: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Club {
  id: string
  name: string
  slug: string
  created_by: string
  created_at: string
}

export interface ClubInvitation {
  id: string
  club_id: string
  user_id: string
  invited_by: string
  status: ClubInviteStatus
  created_at: string
  updated_at: string
}

// Joined
export interface ClubWithMeta extends Club {
  member_count: number
  pending_count: number
}

export interface ClubInvitationWithRelations extends ClubInvitation {
  club: Pick<Club, 'id' | 'name'>
  inviter: Pick<Profile, 'id' | 'display_name' | 'username'>
}

export interface DrillCategory {
  id: string
  name: string
  slug: string
  sort_order: number
  created_by: string | null
  created_at: string
}

export interface AiGuide {
  overview: string
  how_to_perform: string[]
  coaching_points: string[]
  key_cues: string[]
  variations: string[]
  equipment: string[]
}

export interface Drill {
  id: string
  title: string
  description: string | null
  category_id: string | null
  canvas_json: Record<string, unknown> | null
  preview_image_url: string | null
  canvas_preview_url: string | null
  author_id: string
  difficulty: DrillDifficulty | null
  age_group: string | null
  player_count: string | null
  is_public: boolean
  youtube_url: string | null
  tiktok_url: string | null
  facebook_url: string | null
  ai_guide: AiGuide | null
  created_at: string
  updated_at: string
}

export interface DrillRating {
  id: string
  drill_id: string
  user_id: string
  rating: number | null
  comment: string | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  title: string | null
  type: ConversationType
  created_by: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string | null  // null = AI
  content: string
  created_at: string
}

export interface SessionPlan {
  id: string
  title: string
  coach_id: string
  drills_order: SessionDrillItem[]
  total_duration: number | null
  is_shared: boolean
  created_at: string
  updated_at: string
}

export interface SessionDrillItem {
  drill_id: string
  duration_minutes: number
  notes?: string
}

// Joined types
export interface DrillWithRelations extends Drill {
  category: DrillCategory | null
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

export interface DrillRatingWithAuthor extends DrillRating {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

export interface DrillFilters {
  q?: string
  category?: string
  difficulty?: DrillDifficulty
  age_group?: string
  min_rating?: string
}
