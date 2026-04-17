drop policy "anyone authed can create a couple" on public.couples;
create policy "authenticated user can create couple" on public.couples
  for insert to authenticated with check (auth.uid() is not null);