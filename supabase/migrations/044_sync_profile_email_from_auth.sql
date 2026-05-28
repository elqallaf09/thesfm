alter table public.profiles
  add column if not exists email text;

create or replace function public.sync_profile_email_from_auth()
returns trigger as $$
begin
  if new.email is not null and new.email_confirmed_at is not null then
    update public.profiles
      set email = lower(new.email),
          updated_at = now()
      where id = new.id
        and email is distinct from lower(new.email);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.sync_profile_email_from_auth();
