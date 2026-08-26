-- Migration 125 gave admins insert/update on announcements but not delete --
-- needed so an admin can remove a past announcement from the admin page.
create policy "Admins can delete announcements"
  on public.announcements for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
