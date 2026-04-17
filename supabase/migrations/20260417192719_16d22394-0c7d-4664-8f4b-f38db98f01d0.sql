-- Atomic create_couple RPC: bypasses RLS limitations for anonymous auth users
-- Creates a couple + first member row in one secure transaction.
create or replace function public.create_couple(_code text, _display_name text, _pin text)
returns table(couple_id uuid, member_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c_id uuid;
  m_id uuid;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  insert into public.couples (code) values (upper(_code))
  returning id into c_id;

  insert into public.members (user_id, couple_id, display_name, pin, slot)
  values (uid, c_id, _display_name, _pin, 'a')
  returning id into m_id;

  return query select c_id, m_id, upper(_code);
end;
$$;

grant execute on function public.create_couple(text, text, text) to authenticated, anon;

-- Same idea for join: atomic claim of slot 'b'
create or replace function public.join_couple(_code text, _display_name text, _pin text)
returns table(couple_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c_id uuid;
  taken_a boolean;
  count_members int;
  m_id uuid;
  existing_member uuid;
  chosen_slot text;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select id into c_id from public.couples where upper(code) = upper(_code) limit 1;
  if c_id is null then
    raise exception 'COUPLE_NOT_FOUND';
  end if;

  select id into existing_member from public.members where couple_id = c_id and user_id = uid limit 1;
  if existing_member is not null then
    return query select c_id, existing_member;
    return;
  end if;

  select count(*) into count_members from public.members where couple_id = c_id;
  if count_members >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  select exists(select 1 from public.members where couple_id = c_id and slot = 'a') into taken_a;
  chosen_slot := case when taken_a then 'b' else 'a' end;

  insert into public.members (user_id, couple_id, display_name, pin, slot)
  values (uid, c_id, _display_name, _pin, chosen_slot)
  returning id into m_id;

  return query select c_id, m_id;
end;
$$;

grant execute on function public.join_couple(text, text, text) to authenticated, anon;