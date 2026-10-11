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
 assert.equal(s.commerce.budget.market,budget-8+1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
