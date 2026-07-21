-- ── Fix: admin user deletion blocked by email_sends FK ──────────────────────
-- email_sends.user_id had no ON DELETE action (defaults to NO ACTION), so
-- deleting a user who had ever received a transactional/direct email failed
-- with a foreign key violation. This is a delivery log, not a required
-- relation, so orphan the row (set user_id null) on user deletion — matching
-- the existing pattern already used for notification_id on this same table.

alter table public.email_sends
  drop constraint email_sends_user_id_fkey,
  add constraint email_sends_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete set null;
