import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {tickNPCs,npcAt} from './npc-simulation.js';
import {journeyDepartures,journeySteps,travelBusy,travelPlace,journeySummary} from './npc-journeys.js';
import {makeLife} from './npc-mortality.js';
import {makeChildLivelihood,lineageDay} from './npc-lineage.js';
import {npcHealthDay} from './npc-health.js';
import {npcStudyDay} from './npc-martial.js';
import {npcSparringDay} from './npc-sparring.js';
import {familyResponsibility} from './npc-households.js';
import {openLoan} from './npc-contracts.js';
const setup=(day=30)=>{const s=fresh();s.day=day;for(const n of Object.values(s.nodes))n.refreshDay=day%2?day+2:day+1;const p=s.npcWorld.individuals.dockhand01;Object.assign(p,{coins:200,food:5,energy:100,workDays:40});Object.assign(p.study,{learnedDay:2,lastDay:2,practice:120,experience:6});return {s,p,host:s.npcWorld.individuals.stallholder};};
const cash=s=>Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0)+s.npcWorld.lineage.children.reduce((n,c)=>n+c.livelihood.coins,0)+Object.values(s.commerce.budget).reduce((n,x)=>n+x,0);
const food=s=>Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.food,0)+s.npcWorld.lineage.children.reduce((n,c)=>n+c.livelihood.food,0);
test('eligible existing resident autonomously departs without minted cash, supplies or walking effort',()=>{
 const {s,p}=setup(),total=cash(s),grain=food(s),count=Object.keys(s.npcWorld.individuals).length;
 assert.equal(journeyDepartures(s,30).length,1);assert.equal(p.place,'road');assert.equal(travelPlace(s,p.id),'road');assert.equal(p.energy,100);assert.equal(cash(s),total);assert.equal(food(s),grain);assert.equal(Object.keys(s.npcWorld.individuals).length,count);assert.ok(npcAt(s,'road').includes(p));assert.ok(!npcAt(s,'dock').includes(p));
 const snap=JSON.stringify(s);journeyDepartures(s,30);assert.equal(JSON.stringify(s),snap);journeySteps(s,30);assert.equal(p.place,'road');assert.equal(p.coins,200);
});
test('journey eligibility respects life, personality, age, work, combat, stocks and civic duties',()=>{
 for(const block of ['cash','food','energy','work','practice','experience','temper','young','elder','ill','hurt','retired','hungry','dead','school','clinic']){
  const {s,p}=setup();if(block==='cash')p.coins=79;if(block==='food')p.food=2;if(block==='energy')p.energy=49;if(block==='work')p.workDays=39;if(block==='practice')p.study.practice=119;if(block==='experience')p.study.experience=5;if(block==='temper')p.outlook.temperament='cautious';if(block==='young')p.age=17;if(block==='elder')p.age=60;if(block==='ill')p.life.sickDays=1;if(block==='hurt')p.injuryDays=1;if(block==='retired')p.retirement.active=true;if(block==='hungry')p.hunger=40;if(block==='dead')p.life.deathDay=29;if(block==='school')s.npcWorld.school.holder=p.id;if(block==='clinic')s.npcWorld.clinic.holder=p.id;
  assert.deepEqual(journeyDepartures(s,30),[],block);assert.deepEqual(s.npcWorld.journeys.records,{},block);
 }
});
test('arrival pays actual host for finite food and uses real training effort exactly once',()=>{
 const {s,p,host}=setup();journeyDepartures(s,30);s.day=31;for(const n of Object.values(s.nodes))n.refreshDay=33;const total=cash(s),grain=food(s),hostCoins=host.coins,hostFood=host.food;
 journeySteps(s,31);assert.equal(p.place,'liuxi');assert.equal(p.coins,195);assert.equal(host.coins,hostCoins+5);assert.equal(host.food,hostFood-1);assert.equal(host.energy,98);assert.equal(p.food,6);assert.equal(p.energy,88);assert.equal(p.study.practice,132);assert.equal(p.study.insight,3);assert.equal(cash(s),total);assert.equal(food(s),grain);
 const snap=JSON.stringify(s);journeySteps(s,31);assert.equal(JSON.stringify(s),snap);assert.deepEqual(restore(snap).npcWorld,s.npcWorld);
});
test('unavailable food or host prevents trades; illness prevents journey training',()=>{
 for(const block of ['stock','cash','host_dead','host_rest','host_energy','host_cap']){
  const {s,p,host}=setup();journeyDepartures(s,30);s.day=31;if(block==='stock')host.food=0;if(block==='cash')p.coins=4;if(block==='host_dead')host.life.deathDay=31;if(block==='host_rest')host.life.restDay=31;if(block==='host_energy')host.energy=1;if(block==='host_cap')host.coins=999996;
  const coins=p.coins,grain=food(s);p.life.sickDays=2;journeySteps(s,31);assert.equal(p.coins,coins,block);assert.equal(food(s),grain,block);assert.equal(p.energy,100,block);assert.equal(p.study.practice,120,block);
 }
});
test('daily journey occupies work days and return rest, then the original paid job resumes',()=>{
 const {s,p}=setup();journeyDepartures(s,30);const work=p.workDays;
 s.day=31;tickNPCs(s,31);assert.equal(p.workDays,work);assert.equal(p.coins,195);assert.equal(p.food,5);assert.equal(p.place,'liuxi');
 s.day=32;tickNPCs(s,32);assert.equal(p.workDays,work);assert.equal(p.place,p.home);assert.equal(p.coins,195);assert.ok(travelBusy(s,p.id));assert.equal(s.npcWorld.journeys.records[p.id].completed,1);
 s.day=33;tickNPCs(s,33);assert.equal(p.workDays,work+1);assert.ok(!travelBusy(s,p.id));assert.match(journeySummary(s).join(' '),/已完成1次/);
 s.day=60;assert.deepEqual(journeyDepartures(s,60),[]);s.day=90;p.energy=100;p.food=5;p.coins=200;assert.equal(journeyDepartures(s,90).length,1);assert.equal(s.npcWorld.journeys.records[p.id].completed,1);
});
test('dead travelers never eat, train, receive meals or gain fictional return completion',()=>{
 const {s,p}=setup();journeyDepartures(s,30);p.life.deathDay=31;s.day=31;const coins=p.coins,grain=food(s);journeySteps(s,31);s.day=32;journeySteps(s,32);assert.equal(p.coins,coins);assert.equal(food(s),grain);assert.equal(p.study.practice,120);assert.equal(s.npcWorld.journeys.records[p.id].completed,0);assert.match(journeySummary(s).join(' '),/去世/);
});
test('travel suspends home teaching, sparring, direct aid, loans and remote medical care',()=>{
 const {s,p}=setup(420);p.study.teacherTrust=20;journeyDepartures(s,420);const before=p.coins;
 s.day=421;p.life.sickDays=4;const herbs=s.commerce.stock.market.herb;npcHealthDay(s,p,p.age,421);assert.equal(p.coins,before);assert.equal(s.commerce.stock.market.herb,herbs);assert.equal(p.life.sickDays,3);
 const q=JSON.stringify({...p.study,lastDay:421});npcStudyDay(s,p,p.age,421);assert.equal(JSON.stringify(p.study),q);s.day=434;npcSparringDay(s,434);assert.equal(p.study.lastSparDay,0);
 const sibling=s.npcWorld.individuals.dockhand02;sibling.coins=0;sibling.food=0;sibling.hunger=80;const cashBefore=p.coins,foodBefore=p.food;familyResponsibility(s,434);assert.equal(p.coins,cashBefore);assert.equal(p.food,foodBefore);assert.equal(openLoan(s,s.npcWorld.contracts,p.id,sibling.id,3,438),false);
});
test('adult child journey persists its own wallet and cannot receive distant parent provisions',()=>{
 const {s,host}=setup(7590);const v=makeChildLivelihood('chen-child-1',7589);Object.assign(v,{coins:200,food:5,workDays:40});v.outlook.temperament='enterprising';Object.assign(v.study,{learnedDay:7000,lastDay:7589,practice:120,experience:6});
 const c={id:'chen-child-1',bornDay:332,hunger:0,learning:20,lastDay:7589,life:makeLife(),livelihood:v};s.npcWorld.lineage={lastDay:7589,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[c]};s.npcWorld.individuals.dockhand01.coins=0;
 assert.equal(journeyDepartures(s,7590).length,1);s.day=7591;for(const n of Object.values(s.nodes))n.refreshDay=7593;journeySteps(s,7591);assert.equal(v.coins,195);assert.equal(v.energy,88);assert.equal(v.study.practice,132);assert.equal(v.food,6);
 host.food=0;v.food=0;const parents=[s.npcWorld.individuals.farmhand01,s.npcWorld.individuals.shopassistant],stocks=parents.map(p=>p.food),work=v.workDays;lineageDay(s,7591);assert.equal(v.workDays,work);assert.equal(c.hunger,22);assert.deepEqual(parents.map(p=>p.food),stocks);assert.equal(v.coins,195);assert.deepEqual(restore(JSON.stringify(s)).npcWorld.lineage.children[0].livelihood,v);
});
test('crossing midnight departs without a player travel trigger',()=>{
 const {s,p}=setup(29);s.minute=1430;s.npcWorld.lastDay=29;for(const q of Object.values(s.npcWorld.individuals))q.lastDay=29;advance(s,10);assert.equal(s.day,30);assert.equal(s.npcWorld.journeys.records[p.id].departedDay,30);assert.equal(p.place,'road');
});
test('old saves gain empty journey records; malformed records reject and offline file is included',()=>{
 const {s}=setup();delete s.npcWorld.journeys;assert.deepEqual(restore(JSON.stringify(s)).npcWorld.journeys,{lastDay:1,records:{}});
 for(const record of [{departedDay:31,returnedDay:0,completed:0,home:'dock'},{departedDay:30,returnedDay:30,completed:1,home:'dock'},{departedDay:30,returnedDay:0,completed:0,home:'far_mountains'}]){const x=setup();x.s.npcWorld.journeys.records.dockhand01=record;assert.throws(()=>restore(JSON.stringify(x.s)),/NPC人生/);}
 assert.match(readFileSync(new URL('./sw.js',import.meta.url),'utf8'),/'npc-journeys.js'/);
});
