-- coach_profiles.ai_summary already caches the self-assessment AI write-up;
-- this adds the equivalent cache for the feedback-summary AI write-up (Coach
-- DNA full-breakdown feature, feedback layer) so viewing the on-screen
-- feedback breakdown or downloading the feedback PDF doesn't trigger a
-- fresh Groq call on every request.
alter table public.coach_profiles
  add column ai_feedback_summary jsonb,
  add column ai_feedback_summary_generated_at timestamptz;
