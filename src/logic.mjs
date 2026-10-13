export const AISLES=['Produce','Meat & seafood','Dairy & eggs','Bakery','Pantry','Frozen','Household','Other'];
export function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function parseDate(s){return new Date(`${s}T12:00:00`);}
export function weekStart(d=new Date()){const n=new Date(d);n.setHours(12,0,0,0);n.setDate(n.getDate()-((n.getDay()+1)%7));return dateKey(n);}
export function addDays(s,n){const d=parseDate(s);d.setDate(d.getDate()+n);return dateKey(d);}
export function normalize(s){return s.trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');}
export function suggest(meals,history,chosen=[],group='All',random=Math.random){
 const now=Date.now();const used=new Set(chosen);return meals.filter(m=>!m.archived&&!used.has(m.id)&&(group==='All'||m.group_size===group)).map(m=>{
 const cooked=history.filter(p=>p.meal_id===m.id&&p.status==='cooked');
 const recent=history.filter(p=>p.meal_id===m.id&&p.status!=='skipped');
 const last=recent.reduce((v,p)=>Math.max(v,parseDate(p.day).getTime()),0);
 const days=last?Math.max(0,(now-last)/86400000):120;
 return {meal:m,score:Math.min(days,60)/8+m.rating+(m.favorite?2:0)+(m.priority?5:0)+random()*5,reason:m.priority?'On your shortlist':days<14?'A familiar favorite':cooked.length?'Time for a comeback':'Something you love'};
 }).sort((a,b)=>b.score-a.score);
}
export function deriveGroceries(plan,meals,links,items,manual,states,week){
 const rows=new Map();const byItem=new Map(items.map(i=>[i.id,i]));const byMeal=new Map(meals.map(m=>[m.id,m]));
 function add(id,unit,qty,source,review,isManual){const item=byItem.get(id);if(!item)return;const key=`${id}|${unit||''}`;let r=rows.get(key);if(!r){r={...item,item_id:id,unit:unit||'',week,quantity:null,unknown_quantity:false,sources:[],manual:false,needs_review:false,checked:false,have_it:false};rows.set(key,r);}if(qty==null)r.unknown_quantity=true;else r.quantity=(r.quantity||0)+Number(qty);if(source&&!r.sources.includes(source))r.sources.push(source);r.manual||=isManual;r.needs_review||=review;}
 for(const p of plan.filter(p=>p.day>=week&&p.day<=addDays(week,6)&&p.status!=='skipped')){const m=byMeal.get(p.meal_id);if(!m)continue;for(const l of links.filter(l=>l.meal_id===m.id)){if(byItem.get(l.item_id)?.staple)continue;add(l.item_id,l.unit,l.quantity==null?null:l.quantity*p.servings/m.base_servings,m.name,l.needs_review,false);}}
 for(const r of manual.filter(r=>r.week===week))add(r.item_id,r.unit,r.quantity,null,false,true);
 return [...rows.values()].map(r=>({...r,...states.find(s=>s.week===week&&s.item_id===r.item_id&&s.unit===r.unit)}));
}
export function quantityLabel(r){if(r.quantity_override!=null)return `${Number(r.quantity_override)} ${r.unit}`.trim();if(r.quantity!=null)return `${Number(Number(r.quantity).toFixed(2))} ${r.unit}${r.unknown_quantity?' + check amount':''}`.trim();return r.unit||'';}
export function aisleFor(name){const n=name.toLowerCase();if(/milk|egg|cheese|yogurt|butter|cream/.test(n))return 'Dairy & eggs';if(/chicken|beef|pork|fish|shrimp|bacon|sausage|turkey/.test(n))return 'Meat & seafood';if(/tomato|cucumber|carrot|fruit|apple|banana|lettuce|onion|pepper|broccoli|potato|avocado/.test(n))return 'Produce';if(/bread|bun|bagel|baguette/.test(n))return 'Bakery';if(/paper|soap|detergent|trash|shampoo/.test(n))return 'Household';if(/frozen|ice cream/.test(n))return 'Frozen';return 'Pantry';}
