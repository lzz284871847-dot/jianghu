import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance,npcPlace} from './world.js';
import {makeLife,mortality,parentMortality,settleEstates,recoveryFor,lifeValid} from './npc-mortality.js';
import {npcAt,tickNPCs} from './npc-simulation.js';
import {makeChildLivelihood,lineageDay,lineageValid,childAge} from './npc-lineage.js';
import {npcWork,npcCareerDay,npcApplyShop} from './npc-economy.js';
import {openLoan,settleContracts} from './npc-contracts.js';
const setup=()=>{
 const s=fresh();s.day=7000;s.npcWorld.lastDay=6999;
 for(const p of Object.values(s.npcWorld.individuals))p.lastDay=6999;
 s.npcWorld.lineage={lastDay:6999,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[332,692].map((bornDay,i)=>({life:makeLife(),livelihood:makeChildLivelihood(),id:'chen-child-'+(i+1),bornDay,hunger:0,learning:30,lastDay:6999}))};
 return s;
};
const cash=s=>Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0)+s.npcWorld.lineage.children.reduce((n,c)=>n+c.livelihood.coins,0);
const food=s=>Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.food,0)+s.npcWorld.lineage.children.reduce((n,c)=>n+c.livelihood.food,0);
const kill=p=>{p.life={...makeLife(),frailty:100,deathDay:7000};};

test('old age reduces recovery and advances bounded frailty only on scheduled days',()=>{
 const p={life:makeLife()};assert.equal(recoveryFor(64),25);assert.equal(recoveryFor(65),18);assert.equal(recoveryFor(75),12);
 mortality(p,64,0,30);assert.equal(p.life.frailty,0);
 mortality(p,65,0,31);assert.equal(p.life.frailty,0);mortality(p,65,0,60);assert.equal(p.life.frailty,1);
 p.life.frailty=99;assert.equal(mortality(p,75,0,70),true);assert.equal(p.life.deathDay,70);
 const before=JSON.stringify(p);mortality(p,80,100,80);assert.equal(JSON.stringify(p),before);
});
test('only thirty consecutive severely starving days kill, recovery resets the counter',()=>{
 const p={life:makeLife()};for(let d=1;d<=29;d++)assert.equal(mortality(p,30,100,d),false);
 mortality(p,30,80,30);assert.equal(p.life.starvationDays,0);
 for(let d=31;d<=59;d++)assert.equal(mortality(p,30,100,d),false);
 assert.equal(mortality(p,30,100,60),true);assert.equal(p.life.deathDay,60);
});
test('parent death settles actual debt before distributing personal cash and food',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01,spouse=s.npcWorld.individuals.shopassistant;
 p.coins=15;assert.equal(openLoan(s,s.npcWorld.contracts,'shopassistant','farmhand01',5,7010),true);
 const before=cash(s),rations=food(s);p.age=75;p.life.frailty=99;
 parentMortality(s,7000);settleContracts(s,s.npcWorld.contracts,7000);settleEstates(s);
 assert.equal(s.npcWorld.contracts.entries[0].status,'repaid');assert.equal(p.coins,0);assert.equal(p.food,0);
 assert.equal(cash(s),before);assert.equal(food(s),rations);assert.equal(spouse.coins,35);
 assert.equal(s.npcWorld.lineage.children[0].livelihood.coins,5);
 const snap=JSON.stringify(s.npcWorld);settleEstates(s);assert.equal(JSON.stringify(s.npcWorld),snap);
});
test('capacity limits leave excess in the estate and never remove joint family stores or cargo',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;kill(p);p.coins=20;p.food=3;p.cargo=2;
 s.npcWorld.individuals.shopassistant.coins=1000000;s.npcWorld.individuals.shopassistant.food=100;
 for(const c of s.npcWorld.lineage.children){c.livelihood.coins=1000000;c.livelihood.food=100;}
 s.npcWorld.households.chen.coins=50;const before=cash(s),rations=food(s);
 settleEstates(s);assert.equal(p.coins,20);assert.equal(p.food,3);assert.equal(p.cargo,2);
 assert.equal(s.npcWorld.households.chen.coins,50);assert.equal(cash(s),before);assert.equal(food(s),rations);
 s.npcWorld.lineage.children[0].livelihood.coins-=2;settleEstates(s);assert.equal(p.coins,18);
});
test('deceased residents cannot earn, borrow, receive household aid or remain on the map',()=>{
 const s=setup(),p=s.npcWorld.individuals.shopassistant;kill(p);
 const before=p.coins;assert.equal(npcWork(s,p,7000),false);assert.equal(npcCareerDay(s,p,7000),false);
 assert.equal(openLoan(s,s.npcWorld.contracts,'farmhand01','shopassistant',1,7001),false);
 assert.equal(npcAt(s,p.place).some(n=>n.id===p.id),false);
 p.occupation='shopworker';const applicant=s.npcWorld.individuals.dockhand01;
 assert.equal(npcApplyShop(s,applicant,7000),true);assert.equal(p.coins,before);
});
test('child death halts career growth, freezes age and transfers assets to living relatives',()=>{
 const s=setup(),c=s.npcWorld.lineage.children[0];kill(c);c.livelihood.coins=9;c.livelihood.food=2;c.livelihood.occupation='shopworker';
 const before=cash(s),rations=food(s),age=childAge(c,s.day);lineageDay(s,s.day);settleEstates(s);
 assert.equal(c.livelihood.workDays,0);assert.equal(c.livelihood.coins,0);assert.equal(c.livelihood.food,0);
 assert.equal(cash(s),before);assert.equal(food(s),rations-1); // living sibling eats one real ration
 assert.equal(childAge(c,7360),age);
});
test('death before birth cancels the deceased mother pregnancy without inventing a newborn',()=>{
 const s=setup();s.npcWorld.lineage.children=[];s.npcWorld.lineage.conceivedDay=6000;kill(s.npcWorld.individuals.shopassistant);
 lineageDay(s,s.day);assert.equal(s.npcWorld.lineage.conceivedDay,0);assert.equal(s.npcWorld.lineage.children.length,0);
});
test('an insolvent deceased debtor defaults and empty assets do not generate inheritance',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;
 openLoan(s,s.npcWorld.contracts,'shopassistant','farmhand01',5,7010);p.coins=0;p.food=0;kill(p);
 const before=cash(s);settleContracts(s,s.npcWorld.contracts,s.day);settleEstates(s);
 assert.equal(s.npcWorld.contracts.entries[0].status,'defaulted');assert.equal(cash(s),before);
});
test('mortality records migrate without retrospectively killing elders or replaying inheritance',()=>{
 const s=setup();for(const p of Object.values(s.npcWorld.individuals))delete p.life;
 for(const c of s.npcWorld.lineage.children)delete c.life;
 for(const node of Object.values(s.nodes))node.refreshDay=7001;
 const old=cash(s);const x=restore(JSON.stringify(s));assert.equal(cash(x),old);
 assert.deepEqual(x.npcWorld.individuals.farmhand01.life,makeLife());assert.ok(lineageValid(x));
 const snap=JSON.stringify(x.npcWorld);assert.equal(JSON.stringify(restore(JSON.stringify(x)).npcWorld),snap);
});
test('real world ticks kill before labor and save reload preserves permanent death',()=>{
 const s=setup(),p=s.npcWorld.individuals.shopassistant;p.age=75;p.life.frailty=99;
 s.day=6999;s.minute=480;s.npcWorld.lastDay=6999;s.npcWorld.lineage.lastDay=6999;
 const work=p.workDays;advance(s,1440-s.minute);assert.equal(p.life.deathDay,7000);assert.equal(p.workDays,work);
 const restored=restore(JSON.stringify(s));assert.equal(restored.npcWorld.individuals.shopassistant.life.deathDay,7000);
 const snap=JSON.stringify(restored.npcWorld);tickNPCs(restored,7000);assert.equal(JSON.stringify(restored.npcWorld),snap);
});
test('invalid life states and death before birth are rejected',()=>{
 for(const v of [{frailty:0,starvationDays:0,deathDay:1},{frailty:101,starvationDays:0,deathDay:0},{frailty:0,starvationDays:31,deathDay:0}])assert.equal(lifeValid(v,7000),false);
 const s=setup(),c=s.npcWorld.lineage.children[0];c.life={frailty:100,starvationDays:0,deathDay:1};assert.equal(lineageValid(s),false);
});
