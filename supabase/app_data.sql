-- Storage for the Cloudflare Worker API in this repo.
-- It mirrors the previous Cloudflare KV "app-data.json" blob as one jsonb row.

create table if not exists public.app_data (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_data_set_updated_at on public.app_data;
create trigger app_data_set_updated_at
before update on public.app_data
for each row
execute function public.set_updated_at();

-- Optional: seed an empty row (the Worker will also auto-seed if missing).
insert into public.app_data (id, data)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;

