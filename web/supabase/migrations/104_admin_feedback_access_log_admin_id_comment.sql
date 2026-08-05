-- 104_admin_feedback_access_log_admin_id_comment.sql
-- Fix D (minor): admin_feedback_access_log.admin_id was made nullable in migration 095
-- to support ON DELETE SET NULL when an admin's account is deleted. There is no
-- INSERT policy on this table (service-role-write-only), so a hard CHECK
-- (admin_id is not null) cannot distinguish "was null at insert" from "nulled later by
-- the FK action" — both just see the current row state — and would break the very
-- SET NULL behaviour introduced by 095. Document the intent instead.

comment on column public.admin_feedback_access_log.admin_id is 'Nullable via ON DELETE SET NULL when the admin account is later deleted; must always be non-null on insert — enforced by the service-role write path, not a DB constraint, since a CHECK cannot distinguish insert-time from post-hoc nulling.';
