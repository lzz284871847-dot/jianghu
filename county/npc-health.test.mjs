import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {makeLife,lifeValid} from './npc-mortality.js';
import {makeChildLivelihood,lineageValid} from './npc-lineage.js';
import {npcHealthDay,healthSummary} from './npc-health.js';
import {npcCareerDay,npcProduce,npcWork,npcSellProduce} from './npc-economy.js';
import {tickNPCs} from './npc-simulation.js';
import {marketPrice} from './commerce.js';
import {readFileSync} from 'node:fs';
const setup=()=>{
 const s=fresh();s.day=21;s.weather='雨';s.npcWorld.lastDay=20;
 for(const p of Object.values(s.npcWorld.individuals))p.lastDay=20;
 return s;
};
const money=s=>s.commerce.budget.market+s.commerce.budget.liuxi+Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0)+(s.npcWorld.lineage.children??[]).reduce((n,c)=>n+c.livelihood.coins,0);
test('rain can start a real illness, treatment pays doctor and purchases one consumed herb',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01,doctor=s.npcWorld.individuals.doctor;
 const before=money(s),coins=p.coins,fees=doctor.coins,stock=s.commerce.stock.market.herb,budget=s.commerce.budget.market,quote=marketPrice(s,'market','buy','herb'),seed=s.seed;
 const r=npcHealthDay(s,p,p.age,s.day);assert.equal(r.resting,true);assert.equal(p.coins,coins-8);assert.equal(doctor.coins,fees+8-quote);assert.equal(s.commerce.budget.market,budget+quote);assert.equal(s.commerce.stock.market.herb,stock-1);assert.equal(money(s),before);assert.equal(s.seed,seed);assert.equal(p.life.sickDays,0);assert.equal(p.life.restDay,s.day);
 assert.equal(doctor.energy,90);assert.equal(doctor.workDays,1);assert.match(doctor.history[0],/购药耗费/);assert.match(healthSummary(p,s.day),/今日休养/);
});
test('health settlement is idempotent even after same-day successful treatment',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;npcHealthDay(s,p,p.age,s.day);
 const snap=JSON.stringify(s);assert.equal(npcHealthDay(s,p,p.age,s.day).resting,true);assert.equal(JSON.stringify(s),snap);
});
test('poverty, depleted herbs, doctor injury, exhausted doctor and market closure block treatment',()=>{
 for(const blocker of ['money','stock','injury','energy','closed']){
  const s=setup(),p=s.npcWorld.individuals.farmhand01;
  if(blocker==='money')p.coins=7;
  if(blocker==='stock')s.commerce.stock.market.herb=0;
  if(blocker==='injury')s.npcWorld.individuals.doctor.injuryDays=1;
  if(blocker==='energy')s.npcWorld.individuals.doctor.energy=9;
  if(blocker==='closed')s.society.districts.market.closedUntil=s.day;
  const before=money(s),stock=s.commerce.stock.market.herb,coins=p.coins;npcHealthDay(s,p,p.age,s.day);
  assert.equal(p.life.sickDays,3,blocker);assert.equal(p.coins,coins);assert.equal(money(s),before);assert.equal(s.commerce.stock.market.herb,stock);
 }
});
test('untreated illness recovers over actual days; older people require longer rest',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;p.coins=0;
 for(let d=21;d<=24;d++){s.day=d;assert.equal(npcHealthDay(s,p,19,d).resting,true);assert.equal(p.life.sickDays,24-d);}
 s.day=25;assert.equal(npcHealthDay(s,p,19,25).resting,false);
 const elder=setup().npcWorld.individuals.farmhand01;elder.coins=0;s.day=21;npcHealthDay(s,elder,65,21);assert.equal(elder.life.sickDays,3);
});
test('dry weather with adequate food does not create illness but serious hunger can',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;s.weather='晴';p.coins=0;
 assert.equal(npcHealthDay(s,p,p.age,21).resting,false);
 p.life.healthDay=0;p.hunger=60;assert.equal(npcHealthDay(s,p,p.age,21).resting,true);
});
test('daily illness stops actual wages and production without causing unemployment or skill gain',()=>{
 const s=setup(),p=s.npcWorld.individuals.shopassistant;p.life.sickDays=4;p.coins=0;s.commerce.stock.market.herb=0;
 const work=p.workDays,skills=JSON.stringify(p.careerSkills),unemployed=p.unemployedDays;tickNPCs(s,s.day);
 assert.equal(p.workDays,work);assert.equal(JSON.stringify(p.careerSkills),skills);assert.equal(p.unemployedDays,unemployed);assert.equal(p.life.restDay,s.day);
 const snapshot=JSON.stringify(s.npcWorld);tickNPCs(s,s.day);assert.equal(JSON.stringify(s.npcWorld),snapshot);
});
test('labor APIs respect rest on the recovery day and resume the following day',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;npcHealthDay(s,p,p.age,21);p.cargo=1;
 assert.equal(npcProduce(s,p,21),false);assert.equal(npcSellProduce(s,p,21),false);assert.equal(npcCareerDay(s,p,21),false);
 s.day=22;assert.equal(npcSellProduce(s,p,22),true);
 const clerk=s.npcWorld.individuals.shopassistant;clerk.life.sickDays=2;assert.equal(npcWork(s,clerk,22),false);
});
const withChildren=()=>{
 const s=fresh();s.day=7000;s.weather='晴';s.npcWorld.lastDay=6999;
 for(const p of Object.values(s.npcWorld.individuals))p.lastDay=6999;
 for(const n of Object.values(s.nodes))n.refreshDay=7001;
 s.npcWorld.lineage={lastDay:6999,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[332,6200].map((bornDay,i)=>({life:makeLife(),livelihood:makeChildLivelihood(),id:'chen-child-'+(i+1),bornDay,hunger:0,learning:30,lastDay:6999}))};
 return s;
};
test('dead patients cannot consume medicine, pay fees or recover',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;p.life={...makeLife(),frailty:100,deathDay:20,sickDays:3};
 const snap=JSON.stringify(s);assert.equal(npcHealthDay(s,p,75,s.day).resting,false);assert.equal(JSON.stringify(s),snap);
});
test('4.5 saves receive empty disease fields without inventing treatments or altering balances',()=>{
 const s=withChildren();
 for(const p of [...Object.values(s.npcWorld.individuals),...s.npcWorld.lineage.children])for(const key of ['sickDays','healthDay','restDay'])delete p.life[key];
 const before=money(s),x=restore(JSON.stringify(s));assert.equal(money(x),before);assert.equal(x.npcWorld.individuals.farmhand01.life.healthDay,0);assert.equal(x.npcWorld.lineage.children[0].life.sickDays,0);assert.deepEqual(restore(JSON.stringify(x)).npcWorld,x.npcWorld);
 for(const field of [{sickDays:7},{healthDay:7001},{restDay:3,healthDay:2}])assert.equal(lifeValid({...makeLife(),...field},7000),false);
});
test('crossing midnight automatically settles existing disease and paid treatment',()=>{
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;p.life.sickDays=4;const work=p.workDays,herbs=s.commerce.stock.market.herb;
 advance(s,1440-s.minute);assert.equal(p.life.healthDay,2);assert.equal(p.life.restDay,2);assert.equal(p.workDays,work);assert.equal(s.commerce.stock.market.herb,herbs-3);
});
test('new health module is present in the offline release manifest',()=>{
 assert.match(readFileSync(new URL('./sw.js',import.meta.url),'utf8'),/'npc-health.js'/);
});
