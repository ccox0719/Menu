export const demoMeals=[
 ['Tacos','Mexican',5,'Large Group',['ground beef','tortillas','tomatoes','lettuce','cheddar']],
 ['Burgers','Grill',5,'Large Group',['ground beef','buns','lettuce','tomatoes']],
 ['Stir Fry','Asian',5,'Family',['chicken','broccoli','bell peppers','rice']],
 ['Spaghetti','Italian',5,'Large Group',['ground beef','spaghetti','pasta sauce','parmesan']],
 ['Fajitas','Mexican',5,'Company',['chicken','bell peppers','onions','tortillas']],
 ['French Toast','Breakfast',5,'Family',['bread','eggs','milk']],
 ['Gyros','Mediterranean',5,'Company',['pita','ground beef','cucumbers','yogurt']],
 ['Lasagna Skillet','Italian',5,'Family',['ground beef','pasta sauce','lasagna noodles','mozzarella']],
 ['Grilled Cheese','Sandwich',4,'Family',['bread','cheddar']],
 ['Chicken Thighs','Grill/Chicken',3,'Family',['chicken thighs']],
 ['Rice Bowls','Asian/Fusion',5,'Large Group',['rice','chicken','avocado','carrots']],
 ['Quesadillas','Mexican',4,'Family',['tortillas','cheddar','chicken']]
].map(([name,category,rating,group_size,names],idx)=>({id:`demo-${idx}`,name,category,rating,group_size,base_servings:4,favorite:idx<3,priority:idx===6,names}));
export const demoItems=[...new Set([...demoMeals.flatMap(m=>m.names),'milk','eggs','cucumbers','carrots','fruit','bread','yogurt','cereal','paper towels'])].map((name,idx)=>({id:`item-${idx}`,name,staple:false,quick_add:['milk','eggs','cucumbers','carrots','fruit','bread','yogurt','cereal','paper towels'].includes(name)}));
export const demoLinks=demoMeals.flatMap(m=>m.names.map(name=>({meal_id:m.id,item_id:demoItems.find(i=>i.name===name).id,quantity:null,unit:'',needs_review:false})));
