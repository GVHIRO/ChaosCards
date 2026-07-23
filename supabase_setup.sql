-- Chaos Cards: online battle requirements
-- Run this in Supabase SQL Editor.

create unique index if not exists matches_room_id_unique
  on public.matches (room_id);

create unique index if not exists turns_match_turn_role_unique
  on public.turns (match_id, turn_number, player_role);

alter table public.matches enable row level security;

drop policy if exists "Players can read matches" on public.matches;
create policy "Players can read matches"
on public.matches
for select
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    where r.id = matches.room_id
      and (r.host_id = auth.uid()::text or r.guest_id = auth.uid()::text)
  )
);

drop policy if exists "Players can create matches" on public.matches;
create policy "Players can create matches"
on public.matches
for insert
to authenticated
with check (
  exists (
    select 1
    from public.rooms r
    where r.id = matches.room_id
      and (r.host_id = auth.uid()::text or r.guest_id = auth.uid()::text)
  )
);

drop policy if exists "Players can update matches" on public.matches;
create policy "Players can update matches"
on public.matches
for update
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    where r.id = matches.room_id
      and (r.host_id = auth.uid()::text or r.guest_id = auth.uid()::text)
  )
)
with check (
  exists (
    select 1
    from public.rooms r
    where r.id = matches.room_id
      and (r.host_id = auth.uid()::text or r.guest_id = auth.uid()::text)
  )
);

-- Keep the first-time guest join policy.
drop policy if exists "Authenticated users can join waiting rooms" on public.rooms;
create policy "Authenticated users can join waiting rooms"
on public.rooms
for update
to authenticated
using (
  status = 'waiting'
  and guest_id is null
  and auth.uid()::text <> host_id
)
with check (
  guest_id = auth.uid()::text
  and auth.uid()::text <> host_id
  and status in ('ready', 'waiting')
);
