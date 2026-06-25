-- Ensure the auth profile trigger resolves objects from the intended schema.
-- This preserves the existing insert behavior while hardening the SECURITY DEFINER
-- function against search_path manipulation.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at)
  values (new.id, new.email, now())
  on conflict (id) do nothing;
  return new;
end;
$$;
