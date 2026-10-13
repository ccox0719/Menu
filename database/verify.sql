begin;
-- Everything in this verification is rolled back, including test data.
select set_config('request.jwt.claims','{"sub":"a2b045f5-dfc5-467d-81d5-ae749cc05c7e","role":"authenticated"}',true);
set local role authenticated;
do $$declare h uuid;mid uuid;mid2 uuid;i uuid;s uuid;v record;n int;begin
 select household_id into h from public.family_table_members where user_id=auth.uid();
 if h is null then raise exception 'Member cannot read household';end if;
 if (select count(*) from public.family_table_meals where household_id=h)<>90 then raise exception 'Library migration mismatch';end if;
 insert into public.family_table_items(household_id,name,aisle) values(h,'__verification tomatoes','Produce') returning id into i;
 insert into public.family_table_items(household_id,name,aisle,staple) values(h,'__verification salt','Pantry',true) returning id into s;
 mid:=public.family_table_save_meal(h,null,'{"name":"__verification tacos","category":"Test","group_size":"Family","rating":5,"favorite":false,"priority":false,"base_servings":4}',jsonb_build_array(jsonb_build_object('item_id',i,'quantity',2,'unit','each'),jsonb_build_object('item_id',s,'quantity',1,'unit','tsp')));
 mid2:=public.family_table_save_meal(h,null,'{"name":"__verification salad","category":"Test","group_size":"Family","rating":4,"favorite":false,"priority":false,"base_servings":2}',jsonb_build_array(jsonb_build_object('item_id',i,'quantity',3,'unit','each')));
 insert into public.family_table_plan(household_id,day,meal_id,servings) values(h,'2099-01-03',mid,4),(h,'2099-01-04',mid2,4);
 select * into v from public.family_table_groceries where household_id=h and week='2099-01-03' and item_id=i;
 if v.quantity<>8 or array_length(v.sources,1)<>2 then raise exception 'Merge or scaling failed: %',row_to_json(v);end if;
 if exists(select 1 from public.family_table_groceries where household_id=h and week='2099-01-03' and item_id=s) then raise exception 'Staple exclusion failed';end if;
 insert into public.family_table_manual(household_id,week,item_id,unit,quantity) values(h,'2099-01-03',i,'each',1);
 perform public.family_table_set_state(h,'2099-01-03',i,'each','quantity_override','10');
 perform public.family_table_set_state(h,'2099-01-03',i,'each','checked','true');
 select * into v from public.family_table_groceries where household_id=h and week='2099-01-03' and item_id=i;
 if not v.checked or v.quantity_override<>10 or v.quantity<>9 then raise exception 'Independent state updates failed';end if;
 update public.family_table_plan set status='skipped' where household_id=h and day='2099-01-04';
 if (select quantity from public.family_table_groceries where household_id=h and week='2099-01-03' and item_id=i)<>3 then raise exception 'Skipping failed';end if;
 delete from public.family_table_plan where household_id=h and day between '2099-01-03' and '2099-01-09';
 select * into v from public.family_table_groceries where household_id=h and week='2099-01-03' and item_id=i;
 if v.quantity<>1 or not v.manual or cardinality(v.sources)<>0 then raise exception 'Manual item did not survive meal removal';end if;
end$$;
-- Second member can see the same household. An unrelated signed-in user cannot.
select set_config('request.jwt.claims','{"sub":"66418adb-36ca-4bc9-bc28-7f0012901ed5","role":"authenticated"}',true);
do $$begin if (select count(*) from public.family_table_households)<>1 then raise exception 'Partner access failed';end if;end$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.family_table_meals) or exists(select 1 from public.family_table_households) or exists(select 1 from public.family_table_groceries) then raise exception 'Household isolation failed';end if;
 begin insert into public.family_table_meals(household_id,name) values((select id from public.family_table_households limit 1),'Unauthorized');raise exception 'Unauthorized insert succeeded';exception when insufficient_privilege or not_null_violation then null;end;
end$$;
reset role;
rollback;
select 'Passed: 90 meals, two members, grocery merging, serving scaling, staples, skipped meals, manual retention, independent state patches, and unrelated-user isolation. Test changes rolled back.' verification;
