-- Private saved races. Run in your Supabase project's SQL editor / migrations.
create table if not exists public.racing_season_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  race_id text not null check (char_length(race_id) between 1 and 180),
  season_year integer not null check (season_year between 2020 and 2100),
  saved_at timestamptz not null default now(),
  primary key (user_id, race_id)
);
create index if not exists racing_season_entries_user_year_idx
  on public.racing_season_entries (user_id, season_year, saved_at);
alter table public.racing_season_entries enable row level security;
revoke all on public.racing_season_entries from anon;
grant select, insert, delete on public.racing_season_entries to authenticated;
create policy "Read only own racing season" on public.racing_season_entries
  for select to authenticated using (auth.uid() = user_id);
create policy "Save only to own racing season" on public.racing_season_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Remove only from own racing season" on public.racing_season_entries
  for delete to authenticated using (auth.uid() = user_id);
-- Email addresses are handled by Supabase Auth, not copied into this public table.
