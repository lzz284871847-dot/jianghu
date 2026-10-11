import {advance} from './world.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,act} from './engine.js';
import {makeLife} from './npc-mortality.js';
import {makeChildLivelihood} from './npc-lineage.js';
import {npcHealthDay} from './npc-health.js';
import {clinicTrainingDay,clinicDay,clinicDoctor,clinicSummary} from './npc-clinic.js';
import {marketPrice} from './commerce.js';
import {readFileSync} from 'node:fs';
const setup=(day=28)=>{const s=fresh();s.day=day;for(const n of Object.values(s.nodes))n.refreshDay=day%2?day+2:day+1;const p=s.npcWorld.individuals.herbalist;p.coins=1000;p.workDays=40;p.food=3;p.energy=100;return {s,p,t:s.npcWorld.individuals.doctor};};
const cash=s=>Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0)+s.npcWorld.lineage.children.reduce((n,c)=>n+c.livelihood.coins,0)+Object.values(s.commerce.budget).reduce((n,x)=>n+x,0);
test('paid clinical learning consumes actual herb and effort with complete cash conservation',()=>{
 const {s,p,t}=setup(),total=cash(s),stock=s.commerce.stock.market.herb,quote=marketPrice(s,'market','buy','herb'),coins=t.coins;
 assert.equal(clinicTrainingDay(s,28).length,1);assert.equal(p.coins,992);assert.equal(p.energy,88);assert.equal(t.energy,90);assert.equal(t.coins,coins+8-quote);assert.equal(s.commerce.stock.market.herb,stock-1);assert.equal(cash(s),total);assert.deepEqual(s.npcWorld.clinic.learners[p.id],{practice:1,lastDay:28});
 const snap=JSON.stringify(s);clinicTrainingDay(s,28);assert.equal(JSON.stringify(s),snap);assert.deepEqual(restore(snap).npcWorld,s.npcWorld);
});
test('learning rejects missing cash, work, food, energy, health, stock or teacher availability',()=>{
 for(const block of ['cash','work','food','energy','ill','age','stock','teacher_dead','teacher_energy','cap']){
  const {s,p,t}=setup();if(block==='cash')p.coins=67;if(block==='work')p.workDays=39;if(block==='food')p.food=1;if(block==='energy')p.energy=23;if(block==='ill')p.life.sickDays=1;if(block==='age')p.age=65;if(block==='stock')s.commerce.stock.market.herb=0;if(block==='teacher_dead')t.life={...makeLife(),frailty:100,deathDay:27};if(block==='teacher_energy')t.energy=9;if(block==='cap')s.commerce.budget.market=1000000;
  const snap=JSON.stringify(s);assert.deepEqual(clinicTrainingDay(s,28),[],block);assert.equal(JSON.stringify(s),snap,block);
 }
});
test('twenty funded sessions qualify the existing learner; a living doctor is never replaced',()=>{
 const {s,p,t}=setup(),total=cash(s);s.commerce.stock.market.herb=40;
 for(let day=28;day<=161;day+=7){s.day=day;p.energy=100;t.energy=100;clinicTrainingDay(s,day);}
 assert.equal(s.npcWorld.clinic.learners[p.id].practice,20);assert.equal(s.commerce.stock.market.herb,20);assert.equal(cash(s),total);assert.deepEqual(clinicDay(s,161),[]);assert.equal(s.npcWorld.clinic.holder,'doctor');
 t.life={...makeLife(),frailty:100,deathDay:161};s.day=162;const coins=p.coins;assert.equal(clinicDay(s,162).length,1);assert.equal(clinicDoctor(s).id,p.id);assert.equal(p.coins,coins);assert.equal(s.npcWorld.clinic.learners[p.id].practice,20);assert.match(clinicSummary(s).join(' '),/罗采药/);
});
test('succession rejects nineteen lessons, unfit candidates and creates no replacement person',()=>{
 for(const block of ['experience','sick','retired','elder']){const {s,p,t}=setup();s.npcWorld.clinic.learners[p.id]={practice:block==='experience'?19:20,lastDay:21};t.life={...makeLife(),frailty:100,deathDay:27};if(block==='sick')p.life.sickDays=1;if(block==='retired')p.retirement.active=true;if(block==='elder')p.age=65;const count=Object.keys(s.npcWorld.individuals).length;clinicDay(s,28);assert.equal(s.npcWorld.clinic.holder,'',block);assert.equal(Object.keys(s.npcWorld.individuals).length,count);}
});
test('successor treats actual NPC illness using finite herbs, real fees and own energy',()=>{
 const {s,p,t}=setup();s.npcWorld.clinic.learners[p.id]={practice:20,lastDay:21};t.life={...makeLife(),frailty:100,deathDay:27};clinicDay(s,28);p.energy=100;const patient=s.npcWorld.individuals.farmhand01;patient.life.sickDays=4;patient.coins=20;const before=cash(s),stock=s.commerce.stock.market.herb;
 npcHealthDay(s,patient,19,28);assert.equal(patient.coins,12);assert.equal(patient.life.sickDays,0);assert.equal(p.energy,90);assert.equal(s.commerce.stock.market.herb,stock-1);assert.equal(cash(s),before);assert.equal(t.coins,30);
});
test('adult descendants persist learning and successor player treatment uses their own wallet',()=>{
 const {s,p,t}=setup(7000);p.coins=0;const v=makeChildLivelihood('chen-child-1',6999);v.coins=100;v.workDays=40;v.food=3;
 const c={id:'chen-child-1',bornDay:332,hunger:0,learning:20,lastDay:6999,life:makeLife(),livelihood:v};s.npcWorld.lineage={lastDay:6999,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[c]};
 clinicTrainingDay(s,7000);assert.equal(v.coins,92);assert.equal(v.energy,88);assert.equal(s.npcWorld.clinic.learners[c.id].practice,1);
 s.npcWorld.clinic.learners[c.id].practice=20;t.life={...makeLife(),frailty:100,deathDay:7000};s.day=7001;for(const n of Object.values(s.nodes))n.refreshDay=7003;clinicDay(s,7001);s.place='village';s.hp=50;s.minute=480;const coins=v.coins,stock=s.commerce.stock.market.herb,quote=marketPrice(s,'market','buy','herb');
 assert.equal(act(s,'doctor'),true);assert.equal(s.hp,100);assert.equal(s.coins,22);assert.equal(v.coins,coins+8-quote);assert.equal(v.energy,78);assert.equal(s.commerce.stock.market.herb,stock-1);assert.deepEqual(restore(JSON.stringify(s)).npcWorld.lineage.children[0].livelihood,v);
});
test('old saves receive no retrospective medical expertise and malformed learners are rejected',()=>{
 const {s}=setup();delete s.npcWorld.clinic;const x=restore(JSON.stringify(s));assert.deepEqual(x.npcWorld.clinic.learners,{});assert.equal(x.npcWorld.clinic.holder,'doctor');assert.equal(x.npcWorld.clinic.appointedDay,0);
 for(const learners of [{unknown:{practice:20,lastDay:21}},{herbalist:{practice:501,lastDay:21}},{herbalist:{practice:20,lastDay:29}}]){const y=setup();y.s.npcWorld.clinic.learners=learners;assert.throws(()=>restore(JSON.stringify(y.s)),/NPC人生/);}
 assert.match(readFileSync(new URL('./sw.js',import.meta.url),'utf8'),/'npc-clinic.js','npc-residents.js'/);
});

test('crossing midnight starts funded medical learning without player interaction',()=>{
 const {s,p}=setup(27);s.minute=1430;s.npcWorld.lastDay=27;for(const q of Object.values(s.npcWorld.individuals))q.lastDay=27;advance(s,10);assert.equal(s.day,28);assert.equal(s.npcWorld.clinic.learners[p.id].practice,1);assert.equal(s.npcWorld.clinic.learners[p.id].lastDay,28);
});
