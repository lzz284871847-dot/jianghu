import {makeLife} from './npc-mortality.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {makeChildLivelihood,lineageDay,lineageValid,lineageSummary} from './npc-lineage.js';
import {npcApplyShop} from './npc-economy.js';
const setup=(count=1)=>{
 const s=fresh();s.day=7000;
 s.npcWorld.lineage={lastDay:6999,courtshipDay:2,marriedDay:32,conceivedDay:0,children:Array.from({length:count},(_,i)=>({life:makeLife(),id:'chen-child-'+(i+1),bornDay:332+i*360,hunger:0,learning:40,lastDay:6999,livelihood:makeChildLivelihood()}))};
 return s;
};
const step=s=>{lineageDay(s,s.day);s.day++;};
const money=s=>s.commerce.budget.market+s.npcWorld.lineage.children.reduce((n,c)=>n+c.livelihood.coins,0)+['farmhand01','shopassistant'].reduce((n,id)=>n+s.npcWorld.individuals[id].coins,0);

test('adult children must find funded work and their wages transfer real merchant cash',()=>{
 const s=setup(),c=s.npcWorld.lineage.children[0],v=c.livelihood;
 v.food=10;const before=money(s);step(s);step(s);step(s);
 assert.equal(v.occupation,'shopworker');assert.equal(v.coins,0);assert.equal(v.workDays,0);
 step(s);assert.equal(v.coins,4);assert.equal(v.workDays,1);assert.equal(v.careerSkills.trade,1);
 assert.equal(money(s),before);assert.ok(lineageSummary(s).some(t=>t.includes('商铺伙计')));
});
test('adult siblings and existing NPCs share one finite shop vacancy',()=>{
 const s=setup(2);for(const c of s.npcWorld.lineage.children)c.livelihood.food=10;
 step(s);step(s);step(s);
 assert.equal(s.npcWorld.lineage.children.filter(c=>c.livelihood.occupation==='shopworker').length,1);
 const applicant=s.npcWorld.individuals.dockhand01;
 assert.equal(npcApplyShop(s,applicant,s.day),false);
 step(s);const workers=s.npcWorld.lineage.children;
 assert.equal(workers[0].livelihood.workDays,1);assert.equal(workers[1].livelihood.occupation,'carrier');
});
test('insolvent employers cannot give a child wages or career experience',()=>{
 const s=setup(),v=s.npcWorld.lineage.children[0].livelihood;
 s.commerce.budget.market=0;v.food=20;const before=money(s);
 for(let i=0;i<8;i++)step(s);
 assert.equal(v.coins,0);assert.equal(v.workDays,0);assert.equal(v.careerSkills.carry,0);assert.equal(money(s),before);
});
test('minors consume existing food but do not work or draw wages',()=>{
 const s=setup(),c=s.npcWorld.lineage.children[0];c.bornDay=s.day-15*360;
 c.livelihood.occupation='carrier';c.livelihood.food=2;
 const before=money(s);step(s);assert.equal(c.livelihood.coins,0);assert.equal(c.livelihood.workDays,0);assert.equal(c.livelihood.food,1);assert.equal(money(s),before);
});
test('children purchase from the same finite grain inventory without minting money or rations',()=>{
 const s=setup(),v=s.npcWorld.lineage.children[0].livelihood;v.coins=20;
 const before=money(s),stock=s.commerce.stock.market.grain;
 step(s);assert.equal(s.commerce.stock.market.grain,stock-1);assert.equal(v.food,0);
 assert.ok(v.coins<20);assert.equal(money(s),before);
});
test('adult support transfers only the child own surplus to a needy parent',()=>{
 const s=setup(),c=s.npcWorld.lineage.children[0],v=c.livelihood,p=s.npcWorld.individuals.farmhand01;
 s.commerce.budget.market=0;v.coins=18;v.food=3;p.coins=0;p.food=0;p.age=60;p.hunger=60;
 s.npcWorld.individuals.shopassistant.food=0;
 const before=money(s),food=v.food+p.food;
 step(s);assert.equal(p.coins,3);assert.equal(v.coins,15);assert.equal(p.food,1);assert.equal(v.food,1);
 assert.equal(v.food+p.food,food-1);assert.equal(money(s),before);assert.ok(p.history.some(t=>t.includes('赡养')));
 const snap=JSON.stringify(s.npcWorld);lineageDay(s,s.day-1);assert.equal(JSON.stringify(s.npcWorld),snap);
});
test('poor or hungry descendants cannot manufacture support for their parents',()=>{
 const s=setup(),c=s.npcWorld.lineage.children[0],p=s.npcWorld.individuals.farmhand01;
 c.hunger=80;p.coins=0;p.food=0;p.hunger=80;c.livelihood.coins=0;s.commerce.budget.market=0;
 step(s);assert.equal(p.coins,0);assert.equal(c.livelihood.coins,0);assert.equal(c.livelihood.workDays,0);
});
test('4.2 children migrate with empty purses, no historical wages and unchanged original resources',()=>{
 const s=setup();for(const node of Object.values(s.nodes))node.refreshDay=7001;
 const c=s.npcWorld.lineage.children[0];delete c.livelihood;
 const old=JSON.stringify([s.coins,s.bag,s.commerce,s.npcWorld.individuals,s.npcWorld.households]);
 const x=restore(JSON.stringify(s));assert.deepEqual(x.npcWorld.lineage.children[0].livelihood,makeChildLivelihood(c.id,c.lastDay));
 assert.equal(JSON.stringify([x.coins,x.bag,x.commerce,x.npcWorld.individuals,x.npcWorld.households]),old);
 assert.deepEqual(restore(JSON.stringify(x)).npcWorld.lineage,x.npcWorld.lineage);
});
test('invalid descendant cash, career, skills and histories are rejected instead of reset',()=>{
 for(const mutate of [v=>v.coins=-1,v=>v.food=101,v=>v.occupation='emperor',v=>v.careerSkills.trade=501,v=>v.history=['x'.repeat(181)],v=>v.workDays=1.5]){
  const s=setup();mutate(s.npcWorld.lineage.children[0].livelihood);assert.equal(lineageValid(s),false);
 }
});

test('world advancement pays adult descendants autonomously and save reload does not repay wages',async()=>{
 const {advance}=await import('./world.js');
 const s=setup(),c=s.npcWorld.lineage.children[0];c.livelihood.occupation='shopworker';c.livelihood.food=3;
 advance(s,1440-s.minute);
 assert.equal(c.livelihood.workDays,1);assert.equal(c.livelihood.careerSkills.trade,1);
 const before=JSON.stringify([s.npcWorld.lineage,s.commerce]);
 const x=restore(JSON.stringify(s));assert.equal(JSON.stringify([x.npcWorld.lineage,x.commerce]),before);
 lineageDay(x,x.day);assert.equal(JSON.stringify([x.npcWorld.lineage,x.commerce]),before);
});
