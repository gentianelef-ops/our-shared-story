-- Couples
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now()
);

-- Members (auth.users → couple)
create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  display_name text not null,
  pin text not null,
  slot text not null check (slot in ('a','b')),
  created_at timestamptz not null default now(),
  unique (user_id),
  unique (couple_id, slot)
);

-- Helper: is current user member of couple ?
create or replace function public.is_couple_member(_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where couple_id = _couple_id and user_id = auth.uid()
  )
$$;

create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.members where user_id = auth.uid() limit 1
$$;

-- Pact rules
create table public.pact_rules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  text text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Entries (private journal)
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  tag text not null check (tag in ('positif','pacte','emotion')),
  raw text not null,
  reformulated text,
  will_share boolean not null default false,
  shared_at timestamptz,
  created_at timestamptz not null default now()
);

-- Friday rituals
create table public.friday_rituals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  week_key text not null, -- e.g. '2025-W16'
  question text not null,
  unique (couple_id, week_key)
);

create table public.friday_answers (
  id uuid primary key default gen_random_uuid(),
  ritual_id uuid not null references public.friday_rituals(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  question_answer text not null,
  gratitude text not null,
  submitted_at timestamptz not null default now(),
  unique (ritual_id, author_id)
);

-- Memory moments (timeline NOUS)
create table public.memory_moments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  kind text not null check (kind in ('positive','ritual','milestone')),
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

-- Tree events (drives growth)
create table public.tree_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  kind text not null check (kind in ('flower','branch','milestone')),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.couples enable row level security;
alter table public.members enable row level security;
alter table public.pact_rules enable row level security;
alter table public.entries enable row level security;
alter table public.friday_rituals enable row level security;
alter table public.friday_answers enable row level security;
alter table public.memory_moments enable row level security;
alter table public.tree_events enable row level security;

-- Couples : member can read; anyone can read by exact code (for join lookup) is needed
-- We allow reading row only if member, and we use a security-definer RPC for code lookup.
create policy "couples readable to members" on public.couples
  for select to authenticated using (public.is_couple_member(id));

create policy "anyone authed can create a couple" on public.couples
  for insert to authenticated with check (true);

-- Members : a user sees members of their own couple
create policy "members visible to couple" on public.members
  for select to authenticated using (public.is_couple_member(couple_id));

create policy "user can insert own member row" on public.members
  for insert to authenticated with check (user_id = auth.uid());

create policy "user can update own member row" on public.members
  for update to authenticated using (user_id = auth.uid());

-- Pact rules : visible/editable by couple members
create policy "pact readable by couple" on public.pact_rules
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "pact insert by couple" on public.pact_rules
  for insert to authenticated with check (public.is_couple_member(couple_id));
create policy "pact delete by author" on public.pact_rules
  for delete to authenticated using (created_by = auth.uid() and public.is_couple_member(couple_id));

-- Entries : author sees own entries; partner only sees entries with shared_at not null
create policy "entries author read" on public.entries
  for select to authenticated using (author_id = auth.uid());
create policy "entries shared read by partner" on public.entries
  for select to authenticated using (shared_at is not null and public.is_couple_member(couple_id));
create policy "entries author insert" on public.entries
  for insert to authenticated with check (author_id = auth.uid() and public.is_couple_member(couple_id));
create policy "entries author update" on public.entries
  for update to authenticated using (author_id = auth.uid());
create policy "entries author delete" on public.entries
  for delete to authenticated using (author_id = auth.uid());

-- Friday rituals : couple-wide
create policy "rituals read" on public.friday_rituals
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "rituals insert" on public.friday_rituals
  for insert to authenticated with check (public.is_couple_member(couple_id));

-- Friday answers : author can always read own; partner can read only when both have submitted
create or replace function public.both_answered(_ritual_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (select count(*) from public.friday_answers where ritual_id = _ritual_id) >= 2
$$;

create policy "answers read own" on public.friday_answers
  for select to authenticated using (author_id = auth.uid());
create policy "answers read partner when both" on public.friday_answers
  for select to authenticated using (
    public.both_answered(ritual_id)
    and exists (
      select 1 from public.friday_rituals r
      where r.id = ritual_id and public.is_couple_member(r.couple_id)
    )
  );
create policy "answers insert own" on public.friday_answers
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.friday_rituals r
      where r.id = ritual_id and public.is_couple_member(r.couple_id)
    )
  );

-- Memory moments : couple-wide
create policy "moments read" on public.memory_moments
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "moments insert" on public.memory_moments
  for insert to authenticated with check (public.is_couple_member(couple_id));

-- Tree events : couple-wide
create policy "tree read" on public.tree_events
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "tree insert" on public.tree_events
  for insert to authenticated with check (public.is_couple_member(couple_id));

-- RPC: join couple by code (security definer to bypass RLS for the lookup)
create or replace function public.join_couple_by_code(_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c_id uuid;
begin
  select id into c_id from public.couples where upper(code) = upper(_code) limit 1;
  if c_id is null then
    raise exception 'COUPLE_NOT_FOUND';
  end if;
  return c_id;
end;
$$;

grant execute on function public.join_couple_by_code(text) to authenticated;