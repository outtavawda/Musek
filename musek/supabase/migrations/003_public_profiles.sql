
-- MUSEK: Allow visitors to view public profiles only.

drop policy if exists "Anyone can view public profiles"
on public.user_profiles;

create policy "Anyone can view public profiles"
on public.user_profiles
for select
to anon, authenticated
using (is_public = true);

grant select on public.user_profiles to anon;
