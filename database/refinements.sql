begin;
-- Purchase defaults for common staples. Manual additions remain allowed.
insert into public.family_table_items(household_id,name,aisle,staple)
select h.id,s.name,'Pantry',true from public.family_table_households h cross join unnest(array['salt','pepper','black pepper','cooking oil','olive oil','flour','sugar','basic spices','baking powder','baking soda','cornstarch','water','garlic powder','onion powder','cumin','paprika','cinnamon','chili powder']) as s(name)
on conflict(household_id,normalized_name) do nothing;
create function public.family_table_choose_meal(h uuid,d date,mid uuid,k text,people integer) returns void language sql security invoker set search_path='' as $$
 insert into public.family_table_plan(household_id,day,meal_id,kind,servings,status) values(h,d,mid,k,people,'planned')
 on conflict(household_id,day) do update set meal_id=excluded.meal_id,kind=excluded.kind,status='planned';
$$;
revoke all on function public.family_table_choose_meal(uuid,date,uuid,text,integer) from public;
grant execute on function public.family_table_choose_meal(uuid,date,uuid,text,integer) to authenticated;
commit;
