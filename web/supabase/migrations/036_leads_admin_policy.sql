-- Allow admins to read all leads
create policy "Admins can read leads"
  on public.leads
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
