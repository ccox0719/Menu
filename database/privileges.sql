begin;
-- Supabase default ACLs can grant anon explicitly in addition to PUBLIC.
revoke all on function public.family_table_set_state(uuid,date,uuid,text,text,jsonb) from anon;
revoke all on function public.family_table_save_meal(uuid,uuid,jsonb,jsonb) from anon;
revoke all on function public.family_table_choose_meal(uuid,date,uuid,text,integer) from anon;
revoke all on function family_table_internal.is_member(uuid) from anon;
revoke all on public.family_table_households,public.family_table_members,public.family_table_meals,public.family_table_items,public.family_table_meal_items,public.family_table_plan,public.family_table_manual,public.family_table_shopping_state,public.family_table_groceries from anon;
commit;
