-- These RPCs are executable ONLY by service_role. Edge Functions authenticate and supply p_user.
create function public.import_private_lesson(p_user uuid,p_content jsonb,p_lesson uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare l public.lessons;v_id uuid;v_number integer;v_hash text;q jsonb;public_questions jsonb;position integer:=0;
begin
 if octet_length(p_content::text)>1000000 or not private.valid_lesson(p_content) then raise exception 'invalid_lesson_schema';end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(p_content->'questions'))<>10 then raise exception 'duplicate_question_ids';end if;
 for q in select value from jsonb_array_elements(p_content->'questions') loop
  position:=position+1;
  if q->>'category'<>(case when position<=5 then 'theory' else 'application' end) then raise exception 'invalid_question_order';end if;
  if (select count(distinct btrim(value)) from jsonb_each_text(q->'options'))<>4 or exists(select 1 from jsonb_each_text(q->'options') where btrim(value)='') then raise exception 'invalid_options';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,1));
 v_hash:=encode(pg_catalog.sha256(pg_catalog.convert_to(p_content::text,'UTF8')),'hex');
 select * into l from public.lessons where user_id=p_user and content_hash=v_hash and deleted_at is null;
 if found then return jsonb_build_object('lessonId',l.id,'duplicate',true);end if;
 if p_lesson is null then
  insert into public.lessons(user_id,subject,chapter,title,content_hash) values(p_user,p_content->>'subject',p_content->>'chapter',p_content->>'title',v_hash) returning * into l;
  v_number:=1;
 else
  select * into l from public.lessons where id=p_lesson and user_id=p_user and deleted_at is null for update;
  if not found then raise exception 'lesson_not_found';end if;
  v_number:=l.current_version+1;
  update public.lessons set subject=p_content->>'subject',chapter=p_content->>'chapter',title=p_content->>'title',current_version=v_number,content_hash=v_hash,updated_at=now() where id=l.id;
 end if;
 select jsonb_agg(value-'correctOption'-'explanation' order by ord) into public_questions from jsonb_array_elements(p_content->'questions') with ordinality t(value,ord);
 insert into public.lesson_versions(lesson_id,user_id,version,content) values(l.id,p_user,v_number,jsonb_set(p_content,'{questions}',public_questions)) returning id into v_id;
 insert into private.answer_keys(lesson_version_id,question_id,correct_option,explanation) select v_id,value->>'id',value->>'correctOption',value->>'explanation' from jsonb_array_elements(p_content->'questions');
 return jsonb_build_object('lessonId',l.id,'duplicate',false);
end $$;

create function public.creator_lesson(p_user uuid,p_lesson uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.lesson_versions;questions jsonb;
begin
 select lv.* into v from public.lesson_versions lv join public.lessons l on l.id=lv.lesson_id and l.current_version=lv.version where l.id=p_lesson and l.user_id=p_user and l.deleted_at is null;
 if not found then raise exception 'lesson_not_found';end if;
 select jsonb_agg(q.value||jsonb_build_object('correctOption',k.correct_option,'explanation',k.explanation) order by q.ord) into questions from jsonb_array_elements(v.content->'questions') with ordinality q(value,ord) join private.answer_keys k on k.lesson_version_id=v.id and k.question_id=q.value->>'id';
 return jsonb_set(v.content,'{questions}',questions);
end $$;

create function public.grade_private_quiz(p_user uuid,p_lesson uuid,p_version uuid,p_answers jsonb,p_submission uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.lesson_versions;old public.quiz_attempts;a_id uuid;num integer;count_correct integer;details jsonb;
begin
 if jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>10000 then raise exception 'invalid_answers';end if;
 -- Serialize submissions per owner and lesson, including concurrent retries.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_lesson::text,2));
 select * into old from public.quiz_attempts where user_id=p_user and submission_id=p_submission;
 if found then
  if old.lesson_id<>p_lesson or old.lesson_version_id<>p_version or old.selected_answers<>p_answers then raise exception 'submission_conflict';end if;
  return jsonb_build_object('attemptId',old.id);
 end if;
 select lv.* into v from public.lesson_versions lv join public.lessons l on l.id=lv.lesson_id where lv.id=p_version and lv.lesson_id=p_lesson and lv.user_id=p_user and l.user_id=p_user and l.deleted_at is null;
 if not found then raise exception 'lesson_not_found';end if;
 -- An existing immutable version may be submitted even if the lesson was edited in another tab.
 if exists(select 1 from jsonb_each_text(p_answers) a where a.value not in ('A','B','C','D') or not exists(select 1 from jsonb_array_elements(v.content->'questions') q where q->>'id'=a.key)) or exists(select 1 from jsonb_each(p_answers) where jsonb_typeof(value)<>'string') then raise exception 'invalid_answers';end if;
 select jsonb_agg(jsonb_build_object('questionId',q.value->>'id','questionText',q.value->>'questionText','options',q.value->'options','selected',p_answers->>(q.value->>'id'),'correctOption',k.correct_option,'explanation',k.explanation,'correct',coalesce(p_answers->>(q.value->>'id')=k.correct_option,false),'sourcePage',q.value->'sourcePage') order by q.ord),count(*) filter(where p_answers->>(q.value->>'id')=k.correct_option)
 into details,count_correct from jsonb_array_elements(v.content->'questions') with ordinality q(value,ord) join private.answer_keys k on k.lesson_version_id=v.id and k.question_id=q.value->>'id';
 if jsonb_array_length(details)<>10 then raise exception 'incomplete_answer_keys';end if;
 select coalesce(max(attempt_number),0)+1 into num from public.quiz_attempts where user_id=p_user and lesson_id=p_lesson;
 insert into public.quiz_attempts(user_id,lesson_id,lesson_version_id,submission_id,attempt_number,score,correct_count,selected_answers,result) values(p_user,p_lesson,p_version,p_submission,num,count_correct*10,count_correct,p_answers,jsonb_build_object('title',v.content->>'title','subject',v.content->>'subject','chapter',v.content->>'chapter','answers',details)) returning id into a_id;
 return jsonb_build_object('attemptId',a_id);
end $$;
revoke all on function public.import_private_lesson(uuid,jsonb,uuid),public.creator_lesson(uuid,uuid),public.grade_private_quiz(uuid,uuid,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.import_private_lesson(uuid,jsonb,uuid),public.creator_lesson(uuid,uuid),public.grade_private_quiz(uuid,uuid,uuid,jsonb,uuid) to service_role;
revoke all on function private.valid_lesson(jsonb) from public,anon,authenticated;
