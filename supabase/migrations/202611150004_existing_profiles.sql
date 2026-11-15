-- Include accounts created before this application's profile trigger existed.
insert into public.profiles(id,display_name)
select id,left(coalesce(raw_user_meta_data->>'display_name',''),100)
from auth.users
on conflict (id) do nothing;
