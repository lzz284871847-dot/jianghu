import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {npcAt,npcWorldValid,makeNPCWorld,tickNPCs} from './npc-simulation.js';

test('NPC registry has stable identities and three-layer population representation',()=>{
 const s=fresh(),ids=Object.keys(s.npcWorld.individuals);
 assert.equal(ids.length,18);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(ids.filter(id=>s.npcWorld.individuals[id].level==='detailed').length,6);
 assert.equal(ids.filter(id=>s.npcWorld.individuals[id].level==='ordinary').length,12);
 assert.equal(s.npcWorld.background.county.population,1200);
 assert.ok(npcAt(s,'dock').some(x=>x.name==='阿旺'));
 assert.ok(npcWorldValid(s));
});
test('residents consume their own food and change state when world advances',()=>{
 const s=fresh(),p=s.npcWorld.individuals.farmhand01;
 const start={food:p.food,workDays:p.workDays,coins:p.coins};
 advance(s,1440-s.minute);
 assert.equal(s.day,2);assert.equal(p.food,start.food-1);
 assert.equal(p.workDays,start.workDays);
 assert.equal(p.lastDay,2);
 assert.equal(p.coins,start.coins);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('grain shortage affects an NPC without forcing player to trigger the event',()=>{
 const s=fresh(),p=s.npcWorld.individuals.farmhand01;
 s.commerce.stock.market.grain=0;
 for(let day=2;day<=8;day++){s.day=day;s.commerce.stock.market.grain=0;tickNPCs(s,day);}
 for(const node of Object.values(s.nodes))node.refreshDay=9;
 assert.ok(p.hunger>=60);
 assert.ok(p.history.some(t=>t.includes('缺粮')));
 assert.ok(npcWorldValid(s));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('old saves migrate on their current day, preserving player progress',()=>{
 const s=fresh();advance(s,1440*12);
 const day=s.day;delete s.npcWorld;
 const restored=restore(JSON.stringify(s));
 assert.equal(restored.day,day);
 assert.equal(restored.npcWorld.lastDay,day);
 assert.ok(Object.values(restored.npcWorld.individuals).every(p=>p.lastDay===day));
 assert.doesNotThrow(()=>restore(JSON.stringify(restored)));
});
test('forged NPC state is rejected and repeated ticks are idempotent',()=>{
 const s=fresh();s.day=2;
 const x=s.npcWorld.individuals.farmhand01;
 tickNPCs(s,2);const copy=JSON.stringify(s.npcWorld);
 tickNPCs(s,2);assert.equal(JSON.stringify(s.npcWorld),copy);
 x.coins=-1;
 assert.equal(npcWorldValid(s),false);
});
test('long-run personal histories remain bounded and resident identities persist',()=>{
 const s=fresh();const name=s.npcWorld.individuals.farmhand01.name;
 for(let i=0;i<120;i++)advance(s,1440);
 const p=s.npcWorld.individuals.farmhand01;
 assert.equal(p.name,name);
 assert.equal(p.lastDay,s.day);
 assert.ok(p.history.length<=8);
 assert.ok(s.news.length<=20);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('significant hardship promotes an ordinary resident without replacing their identity',()=>{
 const s=fresh(),p=s.npcWorld.individuals.farmhand01;
 const id=p.id,name=p.name;
 s.commerce.stock.market.grain=0;
 for(let day=2;day<=9;day++){s.day=day;tickNPCs(s,day);}
 for(const node of Object.values(s.nodes))node.refreshDay=11;
 assert.equal(p.id,id);assert.equal(p.name,name);
 assert.equal(p.level,'detailed');
 assert.ok(p.history.some(x=>x.includes('重要人物跟踪')));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('paid NPC labor transfers money from the employer instead of creating it',async()=>{
 const {npcWork}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;
 const initial={p:p.coins,b:s.commerce.budget.market,total:p.coins+s.commerce.budget.market};
 assert.equal(npcWork(s,p,2),true);
 assert.equal(p.coins,initial.p+4);
 assert.equal(s.commerce.budget.market,initial.b-4);
 assert.equal(p.coins+s.commerce.budget.market,initial.total);
 assert.equal(p.workDays,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('NPC grain purchase transfers exact dynamic price and one stocked unit',async()=>{
 const {npcBuyFood}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;
 p.food=0;s.commerce.stock.market.grain=2;
 const before={npc:p.coins,shop:s.commerce.budget.market,grain:s.commerce.stock.market.grain};
 assert.equal(npcBuyFood(s,p,2),true);
 assert.equal(p.coins,before.npc-3);
 assert.equal(s.commerce.budget.market,before.shop+3);
 assert.equal(s.commerce.stock.market.grain,before.grain-1);
 assert.equal(p.food,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('shop closure, employer poverty and out-of-stock block NPC economic actions',async()=>{
 const {npcWork,npcBuyFood}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;
 p.food=0;s.society.districts.market.closedUntil=1;
 const previous={coins:p.coins,budget:s.commerce.budget.market,stock:s.commerce.stock.market.grain};
 assert.equal(npcWork(s,p,1),false);assert.equal(npcBuyFood(s,p,1),false);
 assert.deepEqual({coins:p.coins,budget:s.commerce.budget.market,stock:s.commerce.stock.market.grain},previous);
 s.society.districts.market.closedUntil=0;s.commerce.budget.market=0;
 assert.equal(npcWork(s,p,1),false);
 s.commerce.stock.market.grain=0;
 assert.equal(npcBuyFood(s,p,1),false);
 assert.equal(p.food,0);
});
test('daily simulation pays employed NPCs but does not fake wages for others',()=>{
 const s=fresh(),employee=s.npcWorld.individuals.shopassistant,farmer=s.npcWorld.individuals.farmhand01;
 const budget=s.commerce.budget.market;
 advance(s,1440-s.minute);
 assert.equal(employee.workDays,1);
 assert.equal(employee.coins,34);
 assert.equal(farmer.workDays,0);
 assert.equal(farmer.coins,30);
 assert.equal(s.commerce.budget.market,budget-8-9+1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('individual fish, herbs and farm produce settle with merchant cash and stock',async()=>{
 const {npcProduce,npcSellProduce}=await import('./npc-economy.js');
 const s=fresh(),farmer=s.npcWorld.individuals.farmhand01;
 const shop=s.commerce.stock.market;
 const old={coins:farmer.coins,vegetable:shop.vegetable,budget:s.commerce.budget.market};
 assert.equal(npcProduce(s,farmer,3),true);
 assert.equal(farmer.cargo,1);
 assert.equal(npcSellProduce(s,farmer,3),true);
 assert.equal(shop.vegetable,old.vegetable+1);
 assert.equal(farmer.coins,old.coins+3);
 assert.equal(s.commerce.budget.market,old.budget-3);
 assert.equal(farmer.cargo,0);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('market insolvency and full shelves preserve an NPC producer cargo',async()=>{
 const {npcSellProduce}=await import('./npc-economy.js');
 const s=fresh(),fisher=s.npcWorld.individuals.fisher;
 fisher.cargo=1;
 s.commerce.stock.liuxi.fish=30;
 assert.equal(npcSellProduce(s,fisher,2),false);
 assert.equal(fisher.cargo,1);
 s.commerce.stock.liuxi.fish=0;s.commerce.budget.liuxi=0;
 assert.equal(npcSellProduce(s,fisher,2),false);
 assert.equal(fisher.cargo,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('transporters earn only by debiting a shop; shop closure blocks payment',async()=>{
 const {npcTransport}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 const before=s.commerce.budget.market;
 assert.equal(npcTransport(s,p,2),true);
 assert.equal(s.commerce.budget.market,before-3);
 assert.equal(p.coins,33);
 assert.equal(p.workDays,1);
 s.society.districts.market.closedUntil=1;
 assert.equal(npcTransport(s,p,1),false);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('legacy NPC saves without cargo get safe zero-inventory migration',()=>{
 const s=fresh();
 for(const p of Object.values(s.npcWorld.individuals))delete p.cargo;
 const migrated=restore(JSON.stringify(s));
 assert.ok(Object.values(migrated.npcWorld.individuals).every(p=>p.cargo===0));
 migrated.npcWorld.individuals.fisher.cargo=-1;
 assert.throws(()=>restore(JSON.stringify(migrated)),/NPC人生记录无效/);
});

test('unpaid ordinary NPC switches to funded carriage work after three missed days',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;
 s.society.districts.market.closedUntil=5;
 for(let day=2;day<=4;day++){s.day=day;npcCareerDay(s,p,day);}
 assert.equal(p.occupation,'carrier');
 assert.ok(p.history.some(x=>x.includes('改找运输短工')));
 s.day=6;s.society.districts.market.closedUntil=0;
 const budget=s.commerce.budget.market,coins=p.coins;
 assert.equal(npcCareerDay(s,p,6),true);
 assert.equal(s.commerce.budget.market,budget-3);
 assert.equal(p.coins,coins+3);
 for(const node of Object.values(s.nodes))node.refreshDay=7;
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('switching careers cannot manufacture wages from a broke shop',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;
 p.occupation='carrier';s.commerce.budget.market=0;
 const coins=p.coins;
 assert.equal(npcCareerDay(s,p,2),false);
 assert.equal(p.coins,coins);
 assert.equal(p.unemployedDays,1);
});
test('1.3.0 save migrates unemployment and profession fields',()=>{
 const s=fresh();for(const p of Object.values(s.npcWorld.individuals)){delete p.occupation;delete p.unemployedDays;}
 const migrated=restore(JSON.stringify(s));
 assert.equal(migrated.npcWorld.individuals.shopassistant.occupation,'original');
 assert.equal(migrated.npcWorld.individuals.shopassistant.unemployedDays,0);
 migrated.npcWorld.individuals.shopassistant.unemployedDays=-2;
 assert.throws(()=>restore(JSON.stringify(migrated)),/NPC人生记录无效/);
});

test('a vacant shop recruits exactly one ordinary applicant and pays wages from shop cash',async()=>{
 const {npcApplyShop,npcCareerDay,SHOP_CAPACITY}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.farmhand01;
 assert.equal(SHOP_CAPACITY.market,3);
 assert.equal(npcApplyShop(s,p,2),true);
 assert.equal(p.occupation,'shopworker');
 assert.equal(npcApplyShop(s,s.npcWorld.individuals.farmhand02,2),false);
 const old=s.commerce.budget.market,coins=p.coins;
 assert.equal(npcCareerDay(s,p,2),true);
 assert.equal(p.coins,coins+4);assert.equal(s.commerce.budget.market,old-4);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('insolvent or closed shops cannot recruit; non-existent openings never materialize',async()=>{
 const {npcApplyShop}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.farmhand01;
 s.commerce.budget.market=5;
 assert.equal(npcApplyShop(s,p,2),false);
 s.commerce.budget.market=150;s.society.districts.market.closedUntil=1;
 assert.equal(npcApplyShop(s,p,1),false);
 assert.equal(p.occupation,'original');
});
test('smith apprentice becomes craftsman only after twenty financed workdays',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.smithapprentice;
 s.commerce.budget.market=800;
 for(let day=2;day<=42&&p.occupation!=='craftsman';day++){s.day=day;p.energy=100;npcCareerDay(s,p,day);}
 assert.equal(p.workDays,20);assert.equal(p.careerSkills.craft,20);assert.equal(p.occupation,'craftsman');
 assert.ok(p.history.some(x=>x.includes('正式铁匠')));
 const budget=s.commerce.budget.market,coins=p.coins;
 s.day+=1; p.energy=100;
 assert.equal(npcCareerDay(s,p,s.day),true);
 assert.equal(p.coins,coins+6);assert.equal(s.commerce.budget.market,budget-6);
 for(const node of Object.values(s.nodes))node.refreshDay=s.day%2===0?s.day+1:s.day+2;
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('invalid career flags are rejected instead of being silently reset',()=>{
 const s=fresh();s.npcWorld.individuals.farmhand01.occupation='emperor';
 assert.throws(()=>restore(JSON.stringify(s)),/NPC人生记录无效/);
});

test('smith may fail craft assessment, exhausting energy without imaginary wages or proficiency',async()=>{
 const {npcWork}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.smithapprentice;
 const length=p.id.length;
 let failDay=2;while((failDay+length)%7!==0)failDay++;
 const old={coins:p.coins,skill:p.careerSkills.craft,budget:s.commerce.budget.market,days:p.workDays,energy:p.energy};
 assert.equal(npcWork(s,p,failDay),false);
 assert.equal(p.coins,old.coins);
 assert.equal(p.careerSkills.craft,old.skill);
 assert.equal(p.workDays,old.days);
 assert.equal(s.commerce.budget.market,old.budget);
 assert.ok(p.energy<old.energy);
 assert.ok(p.history.some(h=>h.includes('工序失误')));
});
test('successful work grows the correct professional skill and does not raise unrelated skills',async()=>{
 const {npcWork,npcTransport,npcProduce}=await import('./npc-economy.js');
 const s=fresh(),apprentice=s.npcWorld.individuals.smithapprentice,porter=s.npcWorld.individuals.dockhand01,farmer=s.npcWorld.individuals.farmhand01;
 assert.equal(npcWork(s,apprentice,2),true);
 assert.equal(apprentice.careerSkills.craft,1);
 assert.equal(apprentice.careerSkills.trade,0);
 assert.equal(npcTransport(s,porter,2),true);
 assert.equal(porter.careerSkills.carry,1);
 assert.equal(npcProduce(s,farmer,3),true);
 assert.equal(farmer.careerSkills.forage,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('older saves gain validated vocational experience without losing prior apprenticeship credit',()=>{
 const s=fresh(),p=s.npcWorld.individuals.smithapprentice;
 p.workDays=12;for(const person of Object.values(s.npcWorld.individuals))delete person.careerSkills;
 const restored=restore(JSON.stringify(s));
 assert.equal(restored.npcWorld.individuals.smithapprentice.careerSkills.craft,12);
 assert.equal(restored.npcWorld.individuals.shopassistant.careerSkills.craft,0);
 restored.npcWorld.individuals.smithapprentice.careerSkills.trade=-1;
 assert.throws(()=>restore(JSON.stringify(restored)),/NPC人生记录无效/);
});
