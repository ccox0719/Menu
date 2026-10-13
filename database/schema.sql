-- Isolated, additive Family Table v1. Original meals.* and other apps untouched.
begin;
create schema if not exists family_table_internal;
revoke all on schema family_table_internal from public;
grant usage on schema family_table_internal to authenticated;
create table public.family_table_households (
 id uuid primary key default gen_random_uuid(), name text not null default 'Our family', created_at timestamptz not null default now()
);
create table public.family_table_members (
 household_id uuid not null references public.family_table_households(id), user_id uuid not null references auth.users(id), primary key(household_id,user_id)
);
create index family_table_members_user on public.family_table_members(user_id);
create function family_table_internal.is_member(h uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.family_table_members where household_id=h and user_id=(select auth.uid()))
$$;
revoke all on function family_table_internal.is_member(uuid) from public;
grant execute on function family_table_internal.is_member(uuid) to authenticated;
create table public.family_table_meals (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.family_table_households(id),
 name text not null check(length(trim(name)) between 1 and 150), category text not null default 'Other', group_size text not null default 'Family',
 rating integer not null default 3 check(rating between 1 and 5), favorite boolean not null default false, priority boolean not null default false,
 base_servings integer not null default 4 check(base_servings between 1 and 100), archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(household_id,id)
);
create index family_table_meals_household on public.family_table_meals(household_id);
create table public.family_table_items (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.family_table_households(id),
 name text not null check(length(trim(name)) between 1 and 100), normalized_name text generated always as (lower(regexp_replace(trim(name),'[^a-zA-Z0-9]+',' ','g'))) stored,
 aisle text not null default 'Other' check(aisle in ('Produce','Meat & seafood','Dairy & eggs','Bakery','Pantry','Frozen','Household','Other')),
 staple boolean not null default false, quick_add boolean not null default false,
 unique(household_id,normalized_name), unique(household_id,id)
);
create table public.family_table_meal_items (
 household_id uuid not null, meal_id uuid not null, item_id uuid not null,
 quantity numeric check(quantity>0 and quantity<=10000), unit text not null default '' check(length(unit)<=30), needs_review boolean not null default false, notes text not null default '',
 primary key(meal_id,item_id), foreign key(household_id,meal_id) references public.family_table_meals(household_id,id), foreign key(household_id,item_id) references public.family_table_items(household_id,id)
);
create index family_table_meal_items_household on public.family_table_meal_items(household_id);
create index family_table_meal_items_item on public.family_table_meal_items(item_id);
create table public.family_table_plan (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.family_table_households(id), day date not null,
 meal_id uuid, kind text not null default 'meal' check(kind in ('meal','leftovers','out')),
 servings integer not null default 4 check(servings between 1 and 100), status text not null default 'planned' check(status in ('planned','cooked','skipped')),
 updated_at timestamptz not null default now(), unique(household_id,day), foreign key(household_id,meal_id) references public.family_table_meals(household_id,id),
 check((kind='meal' and meal_id is not null) or (kind<>'meal' and meal_id is null))
);
create index family_table_plan_meal on public.family_table_plan(meal_id);
create table public.family_table_manual (
 household_id uuid not null, week date not null check(extract(dow from week)=6), item_id uuid not null,
 unit text not null default '' check(length(unit)<=30), quantity numeric check(quantity>0 and quantity<=10000),
 primary key(household_id,week,item_id,unit), foreign key(household_id,item_id) references public.family_table_items(household_id,id)
);
create index family_table_manual_item on public.family_table_manual(item_id);
create table public.family_table_shopping_state (
 household_id uuid not null, week date not null check(extract(dow from week)=6), item_id uuid not null, unit text not null default '' check(length(unit)<=30),
 checked boolean not null default false, have_it boolean not null default false, quantity_override numeric check(quantity_override>0 and quantity_override<=10000),
 primary key(household_id,week,item_id,unit), foreign key(household_id,item_id) references public.family_table_items(household_id,id)
);
create index family_table_shopping_state_item on public.family_table_shopping_state(item_id);
create function family_table_internal.touch() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end$$;
create trigger family_table_meals_touch before update on public.family_table_meals for each row execute function family_table_internal.touch();
create trigger family_table_plan_touch before update on public.family_table_plan for each row execute function family_table_internal.touch();
-- Every exposed row is scoped to actual household membership. Clients cannot grant membership.
do $$declare t text;begin
 foreach t in array array['households','members','meals','items','meal_items','plan','manual','shopping_state'] loop
 execute format('alter table public.family_table_%I enable row level security',t);
 if t='households' then
 execute 'create policy family_table_member_read on public.family_table_households for select to authenticated using (family_table_internal.is_member(id))';
 elsif t='members' then
 execute 'create policy family_table_member_read on public.family_table_members for select to authenticated using (family_table_internal.is_member(household_id))';
 else
 execute format('create policy family_table_member_access on public.family_table_%I for all to authenticated using (family_table_internal.is_member(household_id)) with check (family_table_internal.is_member(household_id))',t);
 end if;
 execute format('grant select on public.family_table_%I to authenticated',t);
 if t not in ('members','households') then execute format('grant insert,update,delete on public.family_table_%I to authenticated',t);end if;
 end loop;
end$$;
-- Grocery needs are a view over source rows, never a destructive list regeneration.
create view public.family_table_groceries with(security_invoker=true) as
with needs as (
 select p.household_id, (p.day-((extract(dow from p.day)::integer+1)%7))::date week, mi.item_id,mi.unit,
 mi.quantity*p.servings/m.base_servings quantity, m.name source, mi.needs_review, false manual
 from public.family_table_plan p join public.family_table_meals m on m.id=p.meal_id
 join public.family_table_meal_items mi on mi.meal_id=p.meal_id join public.family_table_items i on i.id=mi.item_id
 where p.status<>'skipped' and not i.staple
 union all
 select household_id,week,item_id,unit,quantity,null,false,true from public.family_table_manual
), combined as (
 select household_id,week,item_id,unit,sum(quantity) quantity, bool_or(quantity is null) unknown_quantity,
 array_remove(array_agg(distinct source),null) sources, bool_or(manual) manual, bool_or(needs_review) needs_review
 from needs group by household_id,week,item_id,unit
)
select c.*,i.name,i.aisle,coalesce(s.checked,false) checked,coalesce(s.have_it,false) have_it,s.quantity_override
from combined c join public.family_table_items i on i.id=c.item_id
left join public.family_table_shopping_state s on s.household_id=c.household_id and s.week=c.week and s.item_id=c.item_id and s.unit=c.unit;
grant select on public.family_table_groceries to authenticated;
-- Column-specific upserts prevent checking an item from overwriting a partner's quantity edit.
create function public.family_table_set_state(h uuid,w date,i uuid,u text,field text,value jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 if field='checked' then
 insert into public.family_table_shopping_state(household_id,week,item_id,unit,checked) values(h,w,i,u,(value#>>'{}')::boolean)
 on conflict(household_id,week,item_id,unit) do update set checked=excluded.checked;
 elsif field='have_it' then
 insert into public.family_table_shopping_state(household_id,week,item_id,unit,have_it) values(h,w,i,u,(value#>>'{}')::boolean)
 on conflict(household_id,week,item_id,unit) do update set have_it=excluded.have_it;
 elsif field='quantity_override' then
 insert into public.family_table_shopping_state(household_id,week,item_id,unit,quantity_override) values(h,w,i,u,(value#>>'{}')::numeric)
 on conflict(household_id,week,item_id,unit) do update set quantity_override=excluded.quantity_override;
 else raise exception 'Unknown field';end if;
end$$;
revoke all on function public.family_table_set_state(uuid,date,uuid,text,text,jsonb) from public;
grant execute on function public.family_table_set_state(uuid,date,uuid,text,text,jsonb) to authenticated;
-- Atomic meal edit, including purchase needs. RLS applies to all writes.
create function public.family_table_save_meal(h uuid,mid uuid,details jsonb,purchases jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare saved uuid; purchase jsonb;begin
 if jsonb_array_length(purchases)>100 then raise exception 'Too many items';end if;
 insert into public.family_table_meals(id,household_id,name,category,group_size,rating,favorite,priority,base_servings)
 values(coalesce(mid,gen_random_uuid()),h,details->>'name',details->>'category',details->>'group_size',(details->>'rating')::integer,(details->>'favorite')::boolean,(details->>'priority')::boolean,(details->>'base_servings')::integer)
 on conflict(id) do update set name=excluded.name,category=excluded.category,group_size=excluded.group_size,rating=excluded.rating,favorite=excluded.favorite,priority=excluded.priority,base_servings=excluded.base_servings
 returning id into saved;
 delete from public.family_table_meal_items where meal_id=saved and household_id=h;
 for purchase in select * from jsonb_array_elements(purchases) loop
 insert into public.family_table_meal_items(household_id,meal_id,item_id,quantity,unit,needs_review,notes)
 values(h,saved,(purchase->>'item_id')::uuid,nullif(purchase->>'quantity','')::numeric,coalesce(purchase->>'unit',''),coalesce((purchase->>'needs_review')::boolean,false),coalesce(purchase->>'notes',''));
 end loop;return saved;
end$$;
revoke all on function public.family_table_save_meal(uuid,uuid,jsonb,jsonb) from public;
grant execute on function public.family_table_save_meal(uuid,uuid,jsonb,jsonb) to authenticated;
-- Non-destructive copy of the verified legacy library; preserve IDs and review metadata.
do $$declare h uuid;begin
 insert into public.family_table_households(name) values('Our family') returning id into h;
 insert into public.family_table_members select h,id from auth.users where email in ('cac5102008@gmail.com','acax84@gmail.com');
 insert into public.family_table_meals(id,household_id,name,category,group_size,rating,priority,archived)
 select id,h,name,coalesce(category,'Other'),coalesce(group_size,'Family'),greatest(1,least(5,coalesce(rating,3))),coalesce(prior,false),not is_active from meals.meals where household_code='public-meals';
 insert into public.family_table_items(id,household_id,name,aisle,staple)
 select id,h,name,case grocery_category when 'produce' then 'Produce' when 'meat' then 'Meat & seafood' when 'dairy' then 'Dairy & eggs' when 'bakery' then 'Bakery' when 'pantry' then 'Pantry' when 'frozen' then 'Frozen' else 'Other' end,
 lower(trim(name)) in ('salt','pepper','black pepper','cooking oil','oil','olive oil','flour','sugar','spices','baking powder','baking soda','cornstarch','water','garlic powder','onion powder','cumin','paprika','cinnamon','chili powder')
 from meals.ingredients;
 insert into public.family_table_meal_items(household_id,meal_id,item_id,needs_review,notes)
 select h,mi.meal_id,mi.ingredient_id,mi.needs_review,concat_ws(' · ',nullif(mi.notes,''),case when mi.source is not null then 'Imported: '||mi.source end)
 from meals.meal_ingredients mi join public.family_table_meals m on m.id=mi.meal_id;
 insert into public.family_table_items(household_id,name,aisle,quick_add) values
 (h,'milk','Dairy & eggs',true),(h,'eggs','Dairy & eggs',true),(h,'cucumbers','Produce',true),(h,'carrots','Produce',true),(h,'fruit','Produce',true),(h,'bread','Bakery',true),(h,'yogurt','Dairy & eggs',true),(h,'cereal','Pantry',true),(h,'paper towels','Household',true)
 on conflict(household_id,normalized_name) do update set quick_add=true,aisle=excluded.aisle;
 -- Fill obvious missing aisle labels without guessing ingredients or quantities.
 update public.family_table_items set aisle='Meat & seafood' where aisle='Other' and name ~* '(chicken|beef|pork|bacon|sausage|shrimp|fish|turkey|brat|hot dog|meatball)';
 update public.family_table_items set aisle='Dairy & eggs' where aisle='Other' and name ~* '(cheese|cream|butter|egg|milk|yogurt)';
end$$;
do $$declare t text;begin
 foreach t in array array['meals','items','meal_items','plan','manual','shopping_state'] loop
 execute format('alter publication supabase_realtime add table public.family_table_%I',t);
 end loop;
end$$;
commit;
