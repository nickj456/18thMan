// Auto-generate this file with: npx supabase gen types typescript --local > src/lib/supabase/types.ts
// Run after migrations are applied to your local Supabase instance.
//
// Until generated, this file provides the basic shape for type safety.

export type UserRole = 'admin' | 'coach' | 'viewer'
export type ClubRole = 'admin' | 'member'
export type ConversationType = 'ai' | 'dm' | 'community'
export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type DrillVisibility = 'public' | 'club' | 'private'
export type ClubInviteStatus = 'pending' | 'accepted' | 'declined'
export type GroupInviteStatus = 'pending' | 'accepted' | 'declined'
export type SubscriptionTier = 'free' | 'coach' | 'club'
export type EffectiveTier = 'free' | 'trial' | 'coach' | 'club'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  club: string | null       // legacy text field — kept until fully migrated
  club_id: string | null    // FK to clubs.id
  club_role: ClubRole | null
  coaching_level: string | null
  role: UserRole
  subscription_tier: SubscriptionTier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  trial_ends_at: string | null
  trial_used: boolean
  created_at: string
  updated_at: string
}

export interface Club {
  id: string
  name: string
  slug: string
  created_by: string
  subscription_tier: SubscriptionTier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  max_members: number | null
  max_groups: number | null
  created_at: string
}

export interface FeatureOverride {
  id: string
  target_type: 'user' | 'club'
  target_id: string
  feature: string
  enabled: boolean
  expires_at: string | null
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

export interface GroupTrainingHistory {
  id: string
  group_id: string
  focus_area: string
  category: string
  suggestion: GameSenseSuggestion
  session_id: string | null
  used: boolean
  suggested_at: string
}

export interface GameSenseSuggestion {
  focus_area: string
  category: string
  rationale: string
  warm_up: { title: string; duration: string; description: string; setup: string }
  modified_game_1: { title: string; duration: string; setup: string; constraint: string; coaching_focus: string }
  reflect_questions: string[]
  modified_game_2: { title: string; duration: string; setup: string; progression: string }
  competition: { title: string; duration: string; setup: string; scoring_condition: string }
  review_points: string[]
}

export interface CoachingGroup {
  id: string
  name: string
  club_id: string
  created_by: string
  created_at: string
}

export interface GroupInvitation {
  id: string
  group_id: string
  user_id: string
  invited_by: string
  status: GroupInviteStatus
  created_at: string
  updated_at: string
}

export interface CoachingGroupWithMeta extends CoachingGroup {
  member_count: number
}

export interface GroupInvitationWithRelations extends GroupInvitation {
  group: Pick<CoachingGroup, 'id' | 'name'>
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

export type DrillApprovalStatus = 'pending' | 'approved' | 'rejected'

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
  club_id: string | null
  youtube_url: string | null
  youtube_channel_title: string | null
  youtube_channel_id: string | null
  tiktok_url: string | null
  facebook_url: string | null
  ai_guide: AiGuide | null
  approval_status: DrillApprovalStatus
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
  group_id: string | null
  scheduled_at: string | null
  locked_by: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
}

export interface SessionDrillItem {
  drill_id?: string      // absent for custom blocks
  custom_title?: string  // required when drill_id is absent
  custom_type?: string   // e.g. "Team Talk", "Game Plan", "Warm Up"
  duration_minutes: number
  notes?: string
}

// ── Squad / Players ────────────────────────────────────────────────────────

export type PlayerStatus = 'available' | 'injured' | 'unavailable'
export type MatchLocation = 'home' | 'away'
export type MatchResult = 'win' | 'loss' | 'draw'

export const RL_POSITIONS = [
  'Fullback',
  'Wing',
  'Centre',
  'Stand-off',
  'Half-back',
  'Hooker',
  'Prop',
  'Second Row',
  'Loose Forward',
  'Interchange',
] as const

export type RLPosition = typeof RL_POSITIONS[number]

export interface Player {
  id: string
  group_id: string
  created_by: string
  name: string
  positions: string[]
  dob: string | null
  avatar_url: string | null
  status: PlayerStatus
  created_at: string
  updated_at: string
}

export interface PlayerNote {
  id: string
  player_id: string
  created_by: string
  note: string
  created_at: string
}

export interface Match {
  id: string
  group_id: string
  created_by: string
  opponent: string
  match_date: string
  location: MatchLocation
  our_score: number | null
  opponent_score: number | null
  result: MatchResult | null
  created_at: string
  updated_at: string
}

export interface PlayerMatchRating {
  id: string
  player_id: string
  match_id: string
  created_by: string
  rating: number
  notes: string | null
  created_at: string
}

export interface PlayerSessionRating {
  id: string
  player_id: string
  session_plan_id: string
  created_by: string
  attended: boolean
  rating: number | null
  notes: string | null
  created_at: string
}

// Joined
export interface PlayerNoteWithAuthor extends PlayerNote {
  author: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
}

export interface PlayerMatchRatingWithMatch extends PlayerMatchRating {
  match: Pick<Match, 'id' | 'opponent' | 'match_date' | 'location' | 'result'>
}

export interface PlayerSessionRatingWithSession extends PlayerSessionRating {
  session_plan: Pick<SessionPlan, 'id' | 'title' | 'scheduled_at'>
}

export interface PlayerWithRatings extends Player {
  avg_match_rating: number | null
  avg_session_rating: number | null
  recent_notes: PlayerNoteWithAuthor[]
}

// ── Joined types ───────────────────────────────────────────────────────────

export interface DrillWithRelations extends Drill {
  category: DrillCategory | null
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
  drill_ratings?: { rating: number | null; comment: string | null }[]
}

export interface DrillRatingWithAuthor extends DrillRating {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

// Coaching Blocks
export type BlockStatus = 'active' | 'completed' | 'archived'
export type BlockSessionStatus = 'planned' | 'prepared' | 'completed'

export interface CoachingBlock {
  id: string
  group_id: string
  name: string
  total_sessions: number
  status: BlockStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface BlockSession {
  id: string
  block_id: string
  session_number: number
  focus_area: string
  category: string
  ai_plan: BlockSessionPlan | null
  scheduled_date: string | null
  session_plan_id: string | null
  status: BlockSessionStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BlockSessionPlan {
  warm_up: {
    title: string
    duration: string
    description: string
    setup: string
  }
  modified_game_1: {
    title: string
    duration: string
    setup: string
    constraint: string
    coaching_focus: string
  }
  reflect_questions: string[]
  modified_game_2: {
    title: string
    duration: string
    setup: string
    progression: string
  }
  competition: {
    title: string
    duration: string
    setup: string
    scoring_condition: string
  }
  review_points: string[]
  coaching_tips: string
}

export interface DrillFilters {
  q?: string
  category?: string
  difficulty?: DrillDifficulty
  age_group?: string
  min_rating?: string
}

export type GamePlanStatus = 'draft' | 'generated'
export type GamePlanDetailLevel = 'brief' | 'standard' | 'detailed'

export interface GamePlanAiSection {
  positions?: string
  role?: string
  points: string[]
}

export interface GamePlanAiPlan {
  teamFocus: {
    intro: string
    keyMessages: string[]
  }
  forwards: GamePlanAiSection
  backs: GamePlanAiSection
  halfBacks: GamePlanAiSection
  finalReminders: {
    closing: string
    points: string[]
    quote: string
  }
}

export interface GamePlan {
  id: string
  created_by: string
  opposition: string
  pitch: string | null
  kick_off_time: string | null
  home_logo_url: string | null
  away_logo_url: string | null
  defence: string | null
  attack: string | null
  structure: string | null
  aims: string | null
  backs: string | null
  forwards: string | null
  half_backs: string | null
  moves: string | null
  detail_level: GamePlanDetailLevel
  ai_plan: GamePlanAiPlan | null
  status: GamePlanStatus
  created_at: string
  updated_at: string
}

// ── Weekly Focus ──────────────────────────────────────────────────────────────

export interface WeeklyFocus {
  id: string
  club_id: string
  week_start: string
  topic: string
  description: string
  drill_ids: string[]
  next_topic: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface WeeklyFocusComment {
  id: string
  focus_id: string
  user_id: string
  content: string
  created_at: string
}

export const FOCUS_TOPICS = [
  { category: 'Attacking', label: 'Offloading' },
  { category: 'Attacking', label: 'Support Play' },
  { category: 'Attacking', label: 'Line Breaks & Edge Play' },
  { category: 'Attacking', label: 'Dummy Half Play' },
  { category: 'Defensive', label: 'Tackle Technique' },
  { category: 'Defensive', label: 'Line Speed & Drift Defence' },
  { category: 'Defensive', label: 'Marker Defence' },
  { category: 'Defensive', label: 'Goal Line Defence' },
  { category: 'Ball Handling', label: 'Pass Accuracy' },
  { category: 'Ball Handling', label: 'Handling Under Pressure' },
  { category: 'Ball Handling', label: 'Catching High Balls' },
  { category: 'Set Piece & Kicking', label: 'Kick-Off Receipts' },
  { category: 'Set Piece & Kicking', label: 'Grubber Kicks' },
  { category: 'Set Piece & Kicking', label: 'Bomb Kicks' },
  { category: 'Set Piece & Kicking', label: 'Scrum Technique' },
  { category: 'Fitness & Game Sense', label: 'Agility & Conditioning' },
  { category: 'Fitness & Game Sense', label: 'Decision Making' },
  { category: 'Fitness & Game Sense', label: 'Game Management' },
] as const

export type FocusTopic = typeof FOCUS_TOPICS[number]['label']

// ── Game Stats ────────────────────────────────────────────────────────────────

export type StatType = 'carry' | 'tackle' | 'set_completion' | 'try' | 'conversion' | 'opposition_try' | 'opposition_conversion' | 'penalty_won' | 'penalty_conceded'

export interface GameStatSession {
  id: string
  group_id: string
  match_id: string
  created_by: string
  created_at: string
  ended_at: string | null
}

export interface GameStatSessionWithMatch extends GameStatSession {
  match: Pick<Match, 'id' | 'opponent' | 'match_date' | 'location'>
}

export interface GameStatEvent {
  id: string
  session_id: string
  player_id: string | null
  stat_type: StatType
  half: 1 | 2
  completed: boolean | null
  created_by: string
  created_at: string
}

// ── Wellbeing ─────────────────────────────────────────────────────────────────

export type WellbeingResourceType = 'nutrition_plan' | 'nutrition_guide' | 'mental_health'

export interface WellbeingResource {
  id: string
  type: WellbeingResourceType
  title: string
  subtitle: string | null
  content: Record<string, unknown>
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}
