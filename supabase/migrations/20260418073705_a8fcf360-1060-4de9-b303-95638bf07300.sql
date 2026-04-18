CREATE OR REPLACE FUNCTION public.join_couple(_code text, _display_name text, _pin text)
 RETURNS TABLE(couple_id uuid, member_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  select c.id into c_id from public.couples c where upper(c.code) = upper(_code) limit 1;
  if c_id is null then
    raise exception 'COUPLE_NOT_FOUND';
  end if;

  select m.id into existing_member from public.members m where m.couple_id = c_id and m.user_id = uid limit 1;
  if existing_member is not null then
    couple_id := c_id;
    member_id := existing_member;
    return next;
    return;
  end if;

  select count(*) into count_members from public.members m where m.couple_id = c_id;
  if count_members >= 2 then
    raise exception 'COUPLE_FULL';
  end if;

  select exists(select 1 from public.members m where m.couple_id = c_id and m.slot = 'a') into taken_a;
  chosen_slot := case when taken_a then 'b' else 'a' end;

  insert into public.members (user_id, couple_id, display_name, pin, slot)
  values (uid, c_id, _display_name, _pin, chosen_slot)
  returning id into m_id;

  couple_id := c_id;
  member_id := m_id;
  return next;
end;
$function$;