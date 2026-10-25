-- Coach/rider roles, explicit rider-approved links and separate coach suggestions.
-- Existing private saved races remain rider-owned: a coach can SEE a linked rider's
-- personal picks but cannot silently edit their choices.
create table public.peloton_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('coach','rider')),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  created_at timestamptz not null default now()
);

create table public.coach_rider_links (
  coach_id uuid not null references public.peloton_profiles(user_id) on delete cascade,
  rider_id uuid not null references public.peloton_profiles(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (coach_id, rider_id),
  check (coach_id <> rider_id)
);
create index coach_rider_links_rider_idx on public.coach_rider_links (rider_id);

create table public.coach_invites (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.peloton_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  check (expires_at > created_at and expires_at <= created_at + interval '14 days')
);
create index coach_invites_coach_idx on public.coach_invites (coach_id, expires_at);

create table public.coach_race_suggestions (
  coach_id uuid not null,
  rider_id uuid not null,
  race_id text not null check (char_length(race_id) between 1 and 180),
  suggested_at timestamptz not null default now(),
  primary key (coach_id, rider_id, race_id),
  foreign key (coach_id, rider_id) references public.coach_rider_links(coach_id, rider_id) on delete cascade
);
create index coach_suggestions_rider_idx on public.coach_race_suggestions(rider_id);

alter table public.peloton_profiles enable row level security;
alter table public.coach_rider_links enable row level security;
alter table public.coach_invites enable row level security;
alter table public.coach_race_suggestions enable row level security;

revoke all on public.peloton_profiles, public.coach_rider_links, public.coach_invites, public.coach_race_suggestions from anon;
grant select, insert on public.peloton_profiles to authenticated;
grant select, delete on public.coach_rider_links to authenticated;
grant select, insert, delete on public.coach_invites to authenticated;
grant select, insert, delete on public.coach_race_suggestions to authenticated;

-- Role is selected once: no UPDATE privilege or UPDATE policy on profiles.
create policy "Create only own role" on public.peloton_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "See own or directly connected identity" on public.peloton_profiles for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.coach_rider_links l
      where (l.coach_id = (select auth.uid()) and l.rider_id = user_id)
         or (l.rider_id = (select auth.uid()) and l.coach_id = user_id)
    )
  );

create policy "Only linked users see link" on public.coach_rider_links for select to authenticated
  using (coach_id = (select auth.uid()) or rider_id = (select auth.uid()));
-- Both parties can revoke permission. No direct INSERT grant; only vetted RPC.
create policy "Either party can disconnect" on public.coach_rider_links for delete to authenticated
  using (coach_id = (select auth.uid()) or rider_id = (select auth.uid()));

create policy "Only own coach invitations are visible" on public.coach_invites for select to authenticated
  using (coach_id = (select auth.uid()));
create policy "Coaches create only own invitations" on public.coach_invites for insert to authenticated
  with check (
    coach_id = (select auth.uid()) and exists(
      select 1 from public.peloton_profiles p
      where p.user_id = (select auth.uid()) and p.role = 'coach'
    )
  );
create policy "Coaches revoke only own invitations" on public.coach_invites for delete to authenticated
  using (coach_id = (select auth.uid()));

create policy "Suggestions visible only while linked" on public.coach_race_suggestions for select to authenticated
  using (
    (coach_id = (select auth.uid()) or rider_id = (select auth.uid()))
    and exists (
      select 1 from public.coach_rider_links l
      where l.coach_id = coach_race_suggestions.coach_id
        and l.rider_id = coach_race_suggestions.rider_id
    )
  );
create policy "Connected coach can suggest" on public.coach_race_suggestions for insert to authenticated
  with check (
    coach_id = (select auth.uid())
    and exists (
      select 1 from public.coach_rider_links l
      where l.coach_id = coach_race_suggestions.coach_id
        and l.rider_id = coach_race_suggestions.rider_id
    )
  );
create policy "Coach removes only own suggestions" on public.coach_race_suggestions for delete to authenticated
  using (coach_id = (select auth.uid()));

-- Rider-approved coach gets read-only access to the rider's own saved entries.
-- Preserve existing owner-only write permissions.
create policy "Linked coach can read riders own picks" on public.racing_season_entries
  for select to authenticated using (
    exists (
      select 1 from public.coach_rider_links l
      where l.coach_id = (select auth.uid()) and l.rider_id = racing_season_entries.user_id
    )
  );

-- An invite token is a random UUID valid for up to 14 days. Only the invited,
-- signed-in rider decides whether to link. No PII is exposed by the invite.
create function public.preview_coach_invite(p_invite_id uuid)
returns table(coach_name text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to preview this invitation';
  end if;
  return query
    select p.display_name, i.expires_at
    from public.coach_invites i join public.peloton_profiles p on p.user_id = i.coach_id
    where i.id = p_invite_id and i.expires_at > now() and p.role = 'coach';
end;
$$;
revoke all on function public.preview_coach_invite(uuid) from public, anon;
grant execute on function public.preview_coach_invite(uuid) to authenticated;

create function public.accept_coach_invite(p_invite_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invited_coach uuid;
begin
  if current_user_id is null then raise exception 'Sign in first'; end if;
  if not exists (
    select 1 from public.peloton_profiles p
    where p.user_id = current_user_id and p.role = 'rider'
  ) then raise exception 'Only a rider can accept an invitation'; end if;

  select i.coach_id into invited_coach
  from public.coach_invites i join public.peloton_profiles p on p.user_id = i.coach_id
  where i.id = p_invite_id and i.expires_at > now() and p.role = 'coach';
  if invited_coach is null then raise exception 'Invitation expired or was revoked'; end if;

  insert into public.coach_rider_links(coach_id,rider_id)
  values (invited_coach,current_user_id)
  on conflict (coach_id,rider_id) do nothing;
  return invited_coach;
end;
$$;
revoke all on function public.accept_coach_invite(uuid) from public, anon;
grant execute on function public.accept_coach_invite(uuid) to authenticated;
