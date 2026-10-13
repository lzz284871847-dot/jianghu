import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {npcAt,npcWorldValid,makeNPCWorld,tickNPCs} from './npc-simulation.js';

test('NPC registry has stable identities and three-layer population representation',()=>{
 const s=fresh(),ids=Object.keys(s.npcWorld.individuals);
 assert.equal(ids.length,25);
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(ids.filter(id=>s.npcWorld.individuals[id].level==='detailed').length,13);
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

test('porter injury interrupts further labor and recovers by world days',async()=>{
 const {npcTransport}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 let injuryDay=2;while((injuryDay+p.id.length)%17!==0)injuryDay++;
 assert.equal(npcTransport(s,p,injuryDay),true);
 assert.equal(p.injuryDays,3);
 const old={cash:s.commerce.budget.market,coins:p.coins,days:p.workDays};
 assert.equal(npcTransport(s,p,injuryDay+1),false);
 assert.deepEqual({cash:s.commerce.budget.market,coins:p.coins,days:p.workDays},old);
 const {tickNPCs}=await import('./npc-simulation.js');
 s.day=injuryDay; s.npcWorld.lastDay=injuryDay-1;p.lastDay=injuryDay-1;
 for(const resident of Object.values(s.npcWorld.individuals))if(resident!==p)resident.lastDay=injuryDay;
 tickNPCs(s,injuryDay);
 assert.equal(p.injuryDays,2);
 assert.doesNotThrow(()=>restore(JSON.stringify({...s,nodes:Object.fromEntries(Object.entries(s.nodes).map(([k,n])=>[k,{...n,refreshDay:injuryDay%2===0?injuryDay+1:injuryDay+2}]))})));
});
test('mentor transmits skill by spending actual materials and energy',async()=>{
 const {npcMentor}=await import('./npc-economy.js');
 const s=fresh(),master=s.npcWorld.individuals.smith,learner=s.npcWorld.individuals.smithapprentice;
 const old={cash:s.commerce.budget.market,skill:learner.careerSkills.craft,energy:master.energy};
 assert.equal(npcMentor(s,master,4),true);
 assert.equal(s.commerce.budget.market,old.cash-2);
 assert.equal(learner.careerSkills.craft,old.skill+1);
 assert.equal(master.energy,old.energy-10);
 s.society.districts.market.closedUntil=4;
 assert.equal(npcMentor(s,master,4),false);
 assert.equal(learner.careerSkills.craft,old.skill+1);
});
test('injured master and insolvent workshop cannot transmit free skill',async()=>{
 const {npcMentor,npcWork}=await import('./npc-economy.js');
 const s=fresh(),master=s.npcWorld.individuals.smith,apprentice=s.npcWorld.individuals.smithapprentice;
 master.injuryDays=2;assert.equal(npcMentor(s,master,4),false);
 master.injuryDays=0;s.commerce.budget.market=0;
 assert.equal(npcMentor(s,master,4),false);
 apprentice.injuryDays=2;
 assert.equal(npcWork(s,apprentice,2),false);
 assert.equal(apprentice.careerSkills.craft,0);
});
test('injury records migrate older saves and reject corrupted duration',()=>{
 const s=fresh();for(const p of Object.values(s.npcWorld.individuals))delete p.injuryDays;
 const restored=restore(JSON.stringify(s));
 assert.ok(Object.values(restored.npcWorld.individuals).every(p=>p.injuryDays===0));
 restored.npcWorld.individuals.dockhand01.injuryDays=-1;
 assert.throws(()=>restore(JSON.stringify(restored)),/NPC人生记录无效/);
});

test('1.7.0 save migrates zero-value households without altering NPC money',()=>{
 const s=fresh(),before=s.npcWorld.individuals.farmhand01.coins;
 delete s.npcWorld.households;
 const x=restore(JSON.stringify(s));
 assert.equal(x.npcWorld.households.chen.coins,0);
 assert.equal(x.npcWorld.households.chen.food,0);
 assert.equal(x.npcWorld.individuals.farmhand01.coins,before);
 x.npcWorld.households.chen.food=-1;
 assert.throws(()=>restore(JSON.stringify(x)),/NPC人生记录无效/);
});
test('daily family aid is not multiplied by repeated same-day ticks',()=>{
 const s=fresh(),p=s.npcWorld.individuals.farmhand01;
 p.coins=60;p.food=5;s.day=2;
 tickNPCs(s,2);const snapshot=JSON.stringify(s.npcWorld);
 tickNPCs(s,2);
 assert.equal(JSON.stringify(s.npcWorld),snapshot);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('1.8.0 household saves migrate relationship fields safely',()=>{
 const s=fresh();
 for(const h of Object.values(s.npcWorld.households)){delete h.trust;delete h.hardshipDays;}
 const restored=restore(JSON.stringify(s));
 assert.equal(restored.npcWorld.households.chen.trust,50);
 assert.equal(restored.npcWorld.households.chen.hardshipDays,0);
 restored.npcWorld.households.chen.trust=150;
 assert.throws(()=>restore(JSON.stringify(restored)),/NPC人生记录无效/);
});

test('friend support moves real money, changes trust and records history',async()=>{
 const {socialDay}=await import('./npc-social.js');
 const s=fresh(),poor=s.npcWorld.individuals.farmhand01,friend=s.npcWorld.individuals.shopassistant;
 poor.coins=1;poor.hunger=60;friend.coins=30;s.day=2;
 const before=poor.coins+friend.coins,trust=s.npcWorld.social.bonds['farmhand01:shopassistant'].trust;
 const news=socialDay(s,2);
 assert.equal(poor.coins,4);assert.equal(friend.coins,27);
 assert.equal(poor.coins+friend.coins,before);
 assert.equal(s.npcWorld.social.bonds['farmhand01:shopassistant'].trust,trust+3);
 assert.ok(news.some(n=>n.includes('救济')));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('same day social simulation is idempotent and unwilling friend cannot mint aid',async()=>{
 const {socialDay}=await import('./npc-social.js');
 const s=fresh(),poor=s.npcWorld.individuals.farmhand01,friend=s.npcWorld.individuals.shopassistant;
 poor.coins=1;poor.hunger=80;friend.coins=3;s.day=2;
 socialDay(s,2);const snap=JSON.stringify(s.npcWorld);
 socialDay(s,2);assert.equal(JSON.stringify(s.npcWorld),snap);
 assert.equal(poor.coins,1);
});
test('competition under unemployment alters personal trust without fake money',async()=>{
 const {socialDay}=await import('./npc-social.js');
 const s=fresh(),worker=s.npcWorld.individuals.dockhand01,rival=s.npcWorld.individuals.carter;
 worker.workDays=2;rival.unemployedDays=4;s.day=3;
 const coins=worker.coins+rival.coins;
 socialDay(s,3);
 const bond=s.npcWorld.social.bonds['dockhand01:carter'];
 assert.equal(bond.resentment,22);assert.equal(bond.trust,34);
 assert.equal(worker.coins+rival.coins,coins);
});
test('social bonds migrate older saves, reject tampering, and influence recruitment',async()=>{
 const {npcApplyShop}=await import('./npc-economy.js');
 const s=fresh();delete s.npcWorld.social;
 const migrated=restore(JSON.stringify(s));const bond=migrated.npcWorld.social.bonds['merchant:shopassistant'];
 assert.equal(bond.trust,55);bond.trust=20;
 const applicant=migrated.npcWorld.individuals.shopassistant;applicant.occupation='carrier';
 assert.equal(npcApplyShop(migrated,applicant,2),false);
 bond.trust=101;
 assert.throws(()=>restore(JSON.stringify(migrated)),/NPC人生记录无效/);
});

test('without household hardship an unemployed NPC still waits three days',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;
 s.society.districts.market.closedUntil=4;
 s.day=2;npcCareerDay(s,p,2);
 assert.equal(p.occupation,'original');
 assert.equal(p.unemployedDays,1);
 s.day=3;npcCareerDay(s,p,3);
 assert.equal(p.occupation,'original');
 assert.equal(p.unemployedDays,2);
});

test('a friend with low trust refuses aid without moving any money',async()=>{
 const {socialDay}=await import('./npc-social.js');
 const s=fresh(),bond=s.npcWorld.social.bonds['farmhand01:shopassistant'];
 const needy=s.npcWorld.individuals.farmhand01,friend=s.npcWorld.individuals.shopassistant;
 needy.coins=1;needy.hunger=70;friend.coins=30;bond.trust=39;
 const total=needy.coins+friend.coins;
 s.day=3;
 for(const node of Object.values(s.nodes))node.refreshDay=5;
 const notes=socialDay(s,3);
 assert.equal(needy.coins+friend.coins,total);
 assert.equal(needy.coins,1);
 assert.equal(bond.resentment,1);
 assert.ok(notes.some(x=>x.includes('求助未果')));
 const copy=JSON.stringify(s.npcWorld.social);
 socialDay(s,3);
 assert.equal(JSON.stringify(s.npcWorld.social),copy);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('long unemployment damages the persistent employer relationship',async()=>{
 const {socialDay}=await import('./npc-social.js');
 const s=fresh(),bond=s.npcWorld.social.bonds['merchant:shopassistant'];
 const worker=s.npcWorld.individuals.shopassistant;
 worker.unemployedDays=4;
 const trust=bond.trust,resentment=bond.resentment;
 s.day=4;for(const node of Object.values(s.nodes))node.refreshDay=5;
 socialDay(s,4);
 assert.equal(bond.trust,trust-2);
 assert.equal(bond.resentment,resentment+1);
 assert.ok(bond.history.some(x=>x.includes('连续停工')));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('broken master-apprentice trust prevents training costs and skill gains',async()=>{
 const {npcMentor}=await import('./npc-economy.js');
 const s=fresh(),bond=s.npcWorld.social.bonds['smith:smithapprentice'];
 const apprentice=s.npcWorld.individuals.smithapprentice,master=s.npcWorld.individuals.smith;
 const funds=s.commerce.budget.market,skill=apprentice.careerSkills.craft,energy=master.energy;
 bond.trust=29;
 assert.equal(npcMentor(s,master,4),false);
 assert.equal(s.commerce.budget.market,funds);
 assert.equal(apprentice.careerSkills.craft,skill);
 assert.equal(master.energy,energy);
 bond.trust=55;
 assert.equal(npcMentor(s,master,4),true);
 assert.equal(s.commerce.budget.market,funds-2);
 assert.equal(apprentice.careerSkills.craft,skill+1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('employer resentment prevents hiring even when trust is high',async()=>{
 const {npcApplyShop}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;
 const bond=s.npcWorld.social.bonds['merchant:shopassistant'];
 p.occupation='carrier';p.level='ordinary';bond.trust=80;bond.resentment=70;
 assert.equal(npcApplyShop(s,p,2),false);
 assert.equal(p.occupation,'carrier');
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('stable employment gradually repairs a strained employer relationship',async()=>{
 const {socialDay}=await import('./npc-social.js');
 const s=fresh(),bond=s.npcWorld.social.bonds['merchant:shopassistant'];
 const worker=s.npcWorld.individuals.shopassistant;
 worker.unemployedDays=0;bond.trust=35;bond.resentment=72;
 s.day=6;for(const node of Object.values(s.nodes))node.refreshDay=7;
 socialDay(s,6);
 assert.equal(bond.trust,36);assert.equal(bond.resentment,70);
 assert.ok(bond.history.some(x=>x.includes('消除旧怨')));
 const snapshot=JSON.stringify(s.npcWorld.social);
 socialDay(s,6);assert.equal(JSON.stringify(s.npcWorld.social),snapshot);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('skilled apprentice can rebuild mentor trust through demonstrated craft',async()=>{
 const {socialDay}=await import('./npc-social.js');
 const s=fresh(),bond=s.npcWorld.social.bonds['smith:smithapprentice'];
 const apprentice=s.npcWorld.individuals.smithapprentice;
 bond.trust=28;bond.resentment=6;apprentice.careerSkills.craft=40;
 s.day=8;for(const node of Object.values(s.nodes))node.refreshDay=9;
 socialDay(s,8);
 assert.equal(bond.trust,30);assert.equal(bond.resentment,5);
 assert.ok(bond.history.some(x=>x.includes('重新赢得师傅认可')));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('friends reconcile after recovery without creating money or food',async()=>{
 const {socialDay}=await import('./npc-social.js');
 const s=fresh(),bond=s.npcWorld.social.bonds['farmhand01:shopassistant'];
 const left=s.npcWorld.individuals.farmhand01,right=s.npcWorld.individuals.shopassistant;
 left.coins=8;left.hunger=20;bond.trust=35;bond.resentment=4;
 const before=[left.coins,right.coins,left.food,right.food];
 s.day=7;for(const node of Object.values(s.nodes))node.refreshDay=9;
 socialDay(s,7);
 assert.equal(bond.trust,36);assert.equal(bond.resentment,3);
 assert.deepEqual([left.coins,right.coins,left.food,right.food],before);
 const snapshot=JSON.stringify(s.npcWorld.social);
 socialDay(s,7);assert.equal(JSON.stringify(s.npcWorld.social),snapshot);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('employed competitors gradually reconcile without transferring resources',async()=>{
 const {socialDay}=await import('./npc-social.js');
 const s=fresh(),bond=s.npcWorld.social.bonds['dockhand01:carter'];
 const left=s.npcWorld.individuals.dockhand01,right=s.npcWorld.individuals.carter;
 left.unemployedDays=0;right.unemployedDays=0;bond.trust=42;bond.resentment=9;
 const before=[left.coins,right.coins,left.food,right.food];
 s.day=6;for(const node of Object.values(s.nodes))node.refreshDay=7;
 socialDay(s,6);
 assert.equal(bond.trust,43);assert.equal(bond.resentment,8);
 assert.ok(bond.history.some(x=>x.includes('谋生竞争暂时缓和')));
 assert.deepEqual([left.coins,right.coins,left.food,right.food],before);
 const snapshot=JSON.stringify(s.npcWorld.social);
 socialDay(s,6);assert.equal(JSON.stringify(s.npcWorld.social),snapshot);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('bitter rival carriers decline an otherwise payable shift without consuming payroll',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 const bond=s.npcWorld.social.bonds['dockhand01:carter'];
 p.occupation='carrier';p.energy=90;p.hunger=0;p.injuryDays=0;
 bond.resentment=70;
 const shop=p.home==='liuxi'?'liuxi':'market';
 s.commerce.budget[shop]=100;
 const before=[p.coins,p.workDays,s.commerce.budget[shop]];
 npcCareerDay(s,p,2);
 assert.deepEqual([p.coins,p.workDays,s.commerce.budget[shop]],before);
 assert.ok(p.history.some(x=>x.includes('避开共同搬运')));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('prolonged unemployed carrier reconsiders trade without invented wages',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 p.occupation='carrier';p.level='ordinary';p.unemployedDays=7;p.coins=10;p.energy=10;p.hunger=90;
 const shop=p.home==='liuxi'?'liuxi':'market',budget=s.commerce.budget[shop];
 npcCareerDay(s,p,3);
 assert.equal(p.occupation,'original');
 assert.equal(p.coins,10);assert.equal(s.commerce.budget[shop],budget);
 assert.ok(p.history.some(x=>x.includes('重新尝试本行')));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('career reconsideration prevents an immediate return to hauling',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 p.occupation='original';p.level='ordinary';p.unemployedDays=7;p.coins=10;p.energy=70;p.hunger=90;
 p.history.unshift('第3日搬运短工长期无着，重新尝试本行与其他谋生门路。');
 npcCareerDay(s,p,4);
 assert.equal(p.occupation,'original');
 assert.ok(p.unemployedDays>=8);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('trusted households speed job seeking without guaranteeing employment',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 p.occupation='original';p.level='ordinary';p.unemployedDays=0;p.coins=10;p.energy=10;p.hunger=90;
 s.npcWorld.households.dock.trust=80;s.npcWorld.households.dock.hardshipDays=0;
 npcCareerDay(s,p,2);
 assert.ok(p.unemployedDays>=1);
 assert.equal(p.coins,10);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('injured long-term unemployed NPC seeks real jobs without guaranteed income',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 p.occupation='original';p.level='ordinary';p.unemployedDays=2;p.injuryDays=3;
 p.coins=10;p.energy=10;p.hunger=90;
 s.npcWorld.households.dock.trust=50;s.npcWorld.households.dock.hardshipDays=0;
 npcCareerDay(s,p,2);
 assert.equal(p.coins,10);
 assert.ok(p.unemployedDays>=3);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('experienced carrier saves effort but receives only merchant-funded pay',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 p.occupation='carrier';p.injuryDays=0;p.hunger=0;p.energy=21;p.careerSkills.carry=20;
 const budget=s.commerce.budget.market,coins=p.coins;
 npcCareerDay(s,p,3);
 assert.equal(p.energy,1);assert.equal(p.coins,coins+3);
 assert.equal(s.commerce.budget.market,budget-3);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('experienced forager conserves effort without producing extra cargo',async()=>{
 const {npcProduce}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.farmhand01;
 p.injuryDays=0;p.hunger=0;p.energy=17;p.cargo=0;p.careerSkills.forage=20;
 const worked=npcProduce(s,p,3);
 assert.equal(worked,true);
 assert.equal(p.energy,1);assert.equal(p.cargo,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('experienced shopworker saves effort without raising merchant-funded wages',async()=>{
 const {npcWork}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;
 p.occupation='original';p.injuryDays=0;p.energy=30;p.hunger=0;p.careerSkills.trade=20;
 const budget=s.commerce.budget.market,coins=p.coins;
 assert.equal(npcWork(s,p,3),true);
 assert.equal(p.energy,17);assert.equal(p.coins,coins+4);
 assert.equal(s.commerce.budget.market,budget-4);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('experienced emergency transporter works with conserved effort and funded wages',async()=>{
 const {npcTransport}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 p.injuryDays=0;p.energy=21;p.hunger=0;p.careerSkills.carry=20;
 const budget=s.commerce.budget.market,coins=p.coins;
 assert.equal(npcTransport(s,p,3),true);
 assert.equal(p.energy,1);assert.equal(p.coins,coins+3);
 assert.equal(s.commerce.budget.market,budget-3);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('craft experience prevents a novice failure while retaining funded wages',async()=>{
 const {npcWork}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.smithapprentice;
 p.occupation='original';p.injuryDays=0;p.energy=60;p.hunger=0;
 p.careerSkills.craft=0;
 const noviceBudget=s.commerce.budget.market,noviceCoins=p.coins;
 const day=Array.from({length:63},(_,i)=>i+1).find(d=>(d+p.id.length)%7===0&&(d+p.id.length)%9!==0);
 assert.equal(npcWork(s,p,day),false);
 assert.equal(p.coins,noviceCoins);assert.equal(s.commerce.budget.market,noviceBudget);
 p.careerSkills.craft=40;p.energy=60;
 assert.equal(npcWork(s,p,day),true);
 assert.equal(p.coins,noviceCoins+5);assert.equal(s.commerce.budget.market,noviceBudget-5);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('experienced carrier avoids a novice injury but risk remains on other days',async()=>{
 const {npcTransport}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 p.injuryDays=0;p.hunger=0;p.energy=100;p.careerSkills.carry=39;
 const noviceDay=Array.from({length:100},(_,i)=>i+1).find(d=>(d+p.id.length)%17===0&&(d+p.id.length)%23!==0);
 assert.equal(npcTransport(s,p,noviceDay),true);
 assert.equal(p.injuryDays,3);
 p.injuryDays=0;p.energy=100;p.careerSkills.carry=40;
 assert.equal(npcTransport(s,p,noviceDay),true);
 assert.equal(p.injuryDays,0);
 const skilledRiskDay=Array.from({length:100},(_,i)=>i+1).find(d=>(d+p.id.length)%23===0);
 p.energy=100;
 assert.equal(npcTransport(s,p,skilledRiskDay),true);
 assert.equal(p.injuryDays,3);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('injured unemployed worker waits for recovery before changing to carrier',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 p.occupation='original';p.level='ordinary';p.unemployedDays=3;
 s.commerce.budget.market=0; // No funded shop vacancy should preempt the career decision.
 p.injuryDays=2;p.energy=80;p.hunger=90;p.coins=10;
 npcCareerDay(s,p,5);
 assert.equal(p.occupation,'original');
 p.injuryDays=0;p.hunger=0;p.energy=80;
 npcCareerDay(s,p,7);
 assert.equal(p.occupation,'carrier');
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('injured worker searches for a real shop vacancy sooner without minting wages',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 p.occupation='original';p.level='ordinary';p.injuryDays=2;p.unemployedDays=1;
 p.hunger=0;p.energy=70;p.coins=10;
 const budget=s.commerce.budget.market,coins=p.coins;
 npcCareerDay(s,p,1);
 assert.equal(p.occupation,'shopworker');
 assert.equal(p.coins,coins);
 assert.equal(s.commerce.budget.market,budget);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('recent carriage injury makes a recovered worker hesitate before returning',async()=>{
 const {npcCareerDay}=await import('./npc-economy.js');
 const s=fresh(),p=s.npcWorld.individuals.dockhand01;
 s.commerce.budget.market=0;
 p.occupation='original';p.level='ordinary';p.injuryDays=0;
 p.unemployedDays=4;p.energy=80;p.hunger=0;p.coins=10;
 p.history=['第2日搬运时受伤，需休养三日。'];
 npcCareerDay(s,p,5);
 assert.equal(p.occupation,'original');
 p.energy=80;p.unemployedDays=4;
 npcCareerDay(s,p,10);
 assert.equal(p.occupation,'carrier');
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
