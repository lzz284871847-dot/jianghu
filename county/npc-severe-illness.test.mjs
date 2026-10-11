import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {makeLife,lifeValid} from './npc-mortality.js';
import {npcHealthDay,healthSummary} from './npc-health.js';
import {tickNPCs} from './npc-simulation.js';
import {openLoan} from './npc-contracts.js';
import {makeChildLivelihood,lineageDay} from './npc-lineage.js';
const setup=()=>{const s=fresh();s.day=400;s.weather='晴';s.npcWorld.lastDay=399;for(const p of Object.values(s.npcWorld.individuals))p.lastDay=399;for(const n of Object.values(s.nodes))n.refreshDay=401;s.npcWorld.lineage={lastDay:399,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[]};return s;};
const ill=p=>{p.life={...makeLife(),sickDays:4,illnessDays:1};};
const cash=s=>Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0)+s.commerce.budget.market+s.commerce.budget.liuxi+Object.values(s.npcWorld.households).reduce((n,h)=>n+h.coins,0)+s.npcWorld.lineage.children.reduce((n,c)=>n+c.livelihood.coins,0);
test('only an existing illness with severe hunger, injury or frail old age deteriorates',()=>{
 for(const risk of ['hunger','injury','elder','none']){
  const s=setup(),p=s.npcWorld.individuals.farmhand01;p.life.sickDays=4;p.coins=0;let age=19;
  if(risk==='hunger')p.hunger=80;if(risk==='injury')p.injuryDays=2;if(risk==='elder'){age=75;p.life.frailty=50;}
  npcHealthDay(s,p,age,400);assert.equal(p.life.illnessDays,risk==='none'?0:1,risk);
 }
 const s=setup(),p=s.npcWorld.individuals.farmhand01;p.hunger=80;s.day=401;npcHealthDay(s,p,19,401);assert.equal(p.life.illnessDays,0);
});
test('three separately funded treatments consume three herbs and conserve all money',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;ill(p);p.coins=30;
 const before=cash(s),stock=s.commerce.stock.market.herb;
 for(let day=400;day<=402;day++){s.day=day;assert.equal(npcHealthDay(s,p,19,day).resting,true);if(day<402){assert.equal(p.life.careDays,day-399);assert.ok(p.life.sickDays>0);}}
 assert.equal(p.coins,6);assert.equal(s.commerce.stock.market.herb,stock-3);assert.equal(cash(s),before);assert.equal(p.life.illnessDays,0);assert.equal(p.life.careDays,0);assert.equal(p.life.sickDays,0);assert.equal(p.life.restDay,402);
 assert.equal(npcHealthDay(s,p,19,403).resting,false);
});
test('severe cases do not naturally disappear when the ordinary illness countdown reaches zero',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;ill(p);p.life.sickDays=1;p.coins=0;
 for(let day=400;day<405;day++){s.day=day;npcHealthDay(s,p,19,day);assert.equal(p.life.sickDays,1);assert.equal(p.life.deathDay,0);}
 assert.equal(p.life.illnessDays,6);assert.match(healthSummary(p,405),/已就医0\/3/);
});
test('partial treatment preserves progress but poverty or missing herbs cannot complete the course',()=>{
 for(const block of ['money','stock']){
  const s=setup(),p=s.npcWorld.individuals.farmhand01;ill(p);p.coins=8;npcHealthDay(s,p,19,400);assert.equal(p.life.careDays,1);
  if(block==='stock'){p.coins=20;s.commerce.stock.market.herb=0;}
  s.day=401;npcHealthDay(s,p,19,401);assert.equal(p.life.careDays,1);assert.equal(p.life.illnessDays,3);assert.equal(p.life.deathDay,0);
 }
});
test('untreated day thirty causes real death and same-day calls never repeat treatment or death',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;ill(p);p.life.illnessDays=29;p.coins=0;
 npcHealthDay(s,p,19,400);assert.equal(p.life.deathDay,400);assert.equal(p.life.frailty,0);assert.equal(lifeValid(p.life,400),true);
 const snap=JSON.stringify(s);npcHealthDay(s,p,19,400);npcHealthDay(s,p,19,401);assert.equal(JSON.stringify(s),snap);
});
test('the third real treatment at the terminal boundary saves the patient',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;ill(p);p.life.illnessDays=29;p.life.careDays=2;p.coins=8;
 npcHealthDay(s,p,19,400);assert.equal(p.life.deathDay,0);assert.equal(p.life.illnessDays,0);assert.equal(p.coins,0);assert.equal(p.life.restDay,400);
});
test('world illness death precedes meals and labor, clears debts, then distributes actual estate',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01,spouse=s.npcWorld.individuals.shopassistant;
 ill(p);p.life.illnessDays=29;p.coins=20;s.commerce.stock.market.herb=0;s.npcWorld.individuals.smith.injuryDays=2;
 assert.equal(openLoan(s,s.npcWorld.contracts,'shopassistant','farmhand01',5,450),true);
 const before=cash(s),days=p.workDays;tickNPCs(s,400);
 assert.equal(p.life.deathDay,400);assert.equal(p.workDays,days);assert.equal(p.coins,0);assert.equal(p.food,0);assert.equal(spouse.food,5);
 assert.equal(s.npcWorld.contracts.entries[0].status,'repaid');assert.equal(cash(s),before);
 assert.equal(restore(JSON.stringify(s)).npcWorld.individuals.farmhand01.life.deathDay,400);
});
test('a child dying of illness stops feeding and earning before inheritance',()=>{
 const s=setup();s.day=7000;s.npcWorld.lineage.lastDay=6999;
 const c={id:'chen-child-1',bornDay:332,hunger:0,learning:30,lastDay:6999,life:makeLife(),livelihood:makeChildLivelihood('chen-child-1',6999)};
 ill(c);c.life.illnessDays=29;c.livelihood.food=2;s.npcWorld.lineage.children=[c];s.commerce.stock.market.herb=0;
 lineageDay(s,7000);assert.equal(c.life.deathDay,7000);assert.equal(c.livelihood.food,2);assert.equal(c.livelihood.workDays,0);assert.equal(c.lastDay,7000);
});
test('old 4.9 saves gain zero severity without converting existing short illness or killing elders',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;p.age=75;p.life.sickDays=4;p.life.frailty=50;
 for(const n of Object.values(s.npcWorld.individuals)){delete n.life.illnessDays;delete n.life.careDays;}
 const before=cash(s),x=restore(JSON.stringify(s));assert.equal(cash(x),before);assert.equal(x.npcWorld.individuals.farmhand01.life.illnessDays,0);assert.equal(x.npcWorld.individuals.farmhand01.life.sickDays,4);assert.equal(x.npcWorld.individuals.farmhand01.life.deathDay,0);
 assert.deepEqual(restore(JSON.stringify(x)).npcWorld,x.npcWorld);
});
test('invalid disease progress, cure count and invented illness death are rejected',()=>{
 for(const bad of [{illnessDays:31},{careDays:3},{careDays:1},{illnessDays:1},{deathDay:400}])assert.equal(lifeValid({...makeLife(),...bad},400),false);
});
