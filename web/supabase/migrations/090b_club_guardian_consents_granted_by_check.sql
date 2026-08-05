drop policy "Club admins can grant consent for their club" on public.club_guardian_consents;

create policy "Club admins can grant consent for their club"
  on public.club_guardian_consents for insert
  with check (
    (
      exists (
        select 1 from public.profiles
        where id = auth.uid()
          and club_id = club_guardian_consents.club_id
          and club_role = 'admin'
      )
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
    and granted_by = auth.uid()
  );
