create schema if not exists extensions;
create extension if not exists pg_jsonschema with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=100),
 language text not null default 'ko' check(language in ('ko','vi')),
 theme text not null default 'light' check(theme in ('light','dark')),
 created_at timestamptz not null default now()
);
create function public.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),100));return new;end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();
revoke execute on function public.new_profile() from public,anon,authenticated;

create table public.lessons (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 subject text not null,chapter text not null,title text not null,
 current_version integer not null default 1 check(current_version>0),content_hash text not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz,
 unique(id,user_id)
);
create unique index lessons_content_unique on public.lessons(user_id,content_hash) where deleted_at is null;
create index lessons_owner_updated on public.lessons(user_id,updated_at desc);
create table public.lesson_versions (
 id uuid primary key default gen_random_uuid(),lesson_id uuid not null,user_id uuid not null,
 version integer not null check(version>0),content jsonb not null,
 created_at timestamptz not null default now(),unique(lesson_id,version),unique(id,lesson_id,user_id),
 foreign key(lesson_id,user_id) references public.lessons(id,user_id) on delete cascade
);
-- Keys and explanations are in an unexposed schema, with no authenticated SELECT grant.
create table private.answer_keys (
 lesson_version_id uuid not null references public.lesson_versions(id) on delete cascade,
 question_id text not null,correct_option text not null check(correct_option in ('A','B','C','D')),
 explanation text not null,primary key(lesson_version_id,question_id)
);
create table public.study_progress (
 lesson_id uuid primary key,user_id uuid not null,completed_at timestamptz,last_studied_at timestamptz not null default now(),
 foreign key(lesson_id,user_id) references public.lessons(id,user_id) on delete cascade
);
create index study_progress_owner on public.study_progress(user_id);
create table public.quiz_attempts (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id uuid not null,lesson_version_id uuid not null,
 submission_id uuid not null,attempt_number integer not null check(attempt_number>0),
 score integer not null check(score between 0 and 100 and score%10=0),
 correct_count integer not null check(correct_count between 0 and 10 and score=correct_count*10),
 selected_answers jsonb not null,result jsonb not null,submitted_at timestamptz not null default now(),
 foreign key(lesson_version_id,lesson_id,user_id) references public.lesson_versions(id,lesson_id,user_id),
 unique(user_id,submission_id),unique(user_id,lesson_id,attempt_number)
);
create index attempts_owner_submitted on public.quiz_attempts(user_id,submitted_at desc);

alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_versions enable row level security;
alter table public.study_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table private.answer_keys enable row level security;
create policy own_profile_read on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy own_profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy own_lessons_read on public.lessons for select to authenticated using(user_id=(select auth.uid()));
create policy own_versions_read on public.lesson_versions for select to authenticated using(user_id=(select auth.uid()));
create policy own_progress on public.study_progress for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.lessons l where l.id=lesson_id and l.user_id=(select auth.uid()) and l.deleted_at is null));
create policy own_attempts_read on public.quiz_attempts for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.profiles,public.lessons,public.lesson_versions,public.study_progress,public.quiz_attempts from anon,authenticated;
grant select on public.profiles,public.lessons,public.lesson_versions,public.study_progress,public.quiz_attempts to authenticated;
grant update(display_name,language,theme) on public.profiles to authenticated;
grant insert,update on public.study_progress to authenticated;
grant all on public.profiles,public.lessons,public.lesson_versions,public.study_progress,public.quiz_attempts,private.answer_keys to service_role;

create function public.archive_lesson(p_lesson uuid) returns void language plpgsql security definer set search_path='' as $$
begin update public.lessons set deleted_at=now(),updated_at=now() where id=p_lesson and user_id=auth.uid() and deleted_at is null;if not found then raise exception 'lesson_not_found';end if;end $$;
revoke all on function public.archive_lesson(uuid) from public,anon;
grant execute on function public.archive_lesson(uuid) to authenticated;
