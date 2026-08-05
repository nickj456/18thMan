-- 105_response_disputes_raised_by_null_uniqueness_comment.sql
-- Fix E (minor): response_disputes has unique (feedback_response_id, raised_by). Now
-- that raised_by is nullable (095), Postgres treats NULLs as distinct under standard
-- unique semantics, so multiple disputes with raised_by = null could accumulate against
-- the same feedback_response_id after the raising accounts are deleted. This is
-- low-impact (historical/orphaned data, not an active exploit) — a partial unique index
-- excluding nulls would work but adds complexity for a cosmetic issue, so we document
-- the tradeoff instead of changing the constraint.

comment on constraint response_disputes_feedback_response_id_raised_by_key on public.response_disputes is 'raised_by may become NULL via ON DELETE SET NULL after the fix in migration 095; NULLs are not deduplicated by this constraint, which is acceptable since it only affects already-deleted accounts.';
