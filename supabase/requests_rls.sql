-- Final requests RLS for the current Helped auth setup.
--
-- The agency portal uses custom auth (`agency_admins` + `agency_admin_sessions`),
-- not direct Supabase Auth sessions. Because of that, `auth.uid()`-based request
-- policies are not reliable for the current app and can silently return empty
-- arrays.
--
-- Keep the policy broad until the whole system is migrated to true Supabase Auth.

alter table public.requests enable row level security;

create or replace function public.debug_uid()
returns text
language sql
stable
as $$
  select auth.uid()::text;
$$;

grant execute on function public.debug_uid() to authenticated;

drop policy if exists "debug_allow_all" on public.requests;
drop policy if exists "allow_all_authenticated" on public.requests;
drop policy if exists "clients can insert own requests" on public.requests;
drop policy if exists "clients can read own requests" on public.requests;
drop policy if exists "agency admins can read agency requests" on public.requests;
drop policy if exists "agency can read requests" on public.requests;

create policy "allow_all_authenticated"
on public.requests
for all
to authenticated
using (true)
with check (true);
