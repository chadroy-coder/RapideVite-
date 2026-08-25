-- Phone-number sign-in/sign-up (SMS OTP via Supabase Auth phone provider).
-- Phone-auth users get their phone number in the native auth.users.phone
-- column, not in raw_user_meta_data like email signups - the profile
-- trigger needs to check both so profiles.phone gets populated either way.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'phone', new.phone),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
