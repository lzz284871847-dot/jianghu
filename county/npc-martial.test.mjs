import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {makeLife} from './npc-mortality.js';
import {makeChildLivelihood,lineageDay} from './npc-lineage.js';
import {makeStudy,studyValid,npcStudyDay,studySummary} from './npc-martial.js';
import {readFileSync} from 'node:fs';
const setup=()=>{const s=fresh();s.day=21;s.npcWorld.lastDay=20;for(const p of Object.values(s.npcWorld.individuals))p.lastDay=20;for(const n of Object.values(s.nodes))n.refreshDay=23;return s;};
const pupil=s=>{const p=s.npcWorld.individuals.dockhand01;p.coins=40;p.workDays=10;return p;};
const cash=s=>Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0)+s.npcWorld.lineage.children.reduce((n,c)=>n+c.livelihood.coins,0);
test('autonomous learning transfers the existing eight-coin fee and consumes finite teacher effort',()=>{
 const s=setup(),p=pupil(s),master=s.npcWorld.individuals.master,before=cash(s),coins=master.coins;
 assert.equal(npcStudyDay(s,p,p.age,21),true);assert.equal(p.coins,32);assert.equal(master.coins,coins+8);assert.equal(master.energy,80);assert.equal(master.workDays,1);assert.equal(cash(s),before);assert.equal(p.study.learnedDay,21);assert.equal(p.study.practice,0);
 const snap=JSON.stringify(s);assert.equal(npcStudyDay(s,p,p.age,21),false);assert.equal(JSON.stringify(s),snap);assert.equal(studySummary(master),'武馆教习');
});
test('personality savings thresholds and age, work, health and teaching availability gate learning',()=>{
 for(const block of ['cautious','steadfast','age','elder','work','hunger','injury','illness','rest','energy','teacher_energy','teacher_injury','teacher_dead','teacher_cap','day']){
  const s=setup(),p=pupil(s),master=s.npcWorld.individuals.master;let age=19,day=21;
  if(block==='cautious'||block==='steadfast')p.outlook.temperament=block;
  if(block==='age')age=15;if(block==='elder')age=65;if(block==='work')p.workDays=9;if(block==='hunger')p.hunger=40;if(block==='injury')p.injuryDays=1;
  if(block==='illness')p.life.sickDays=1;if(block==='rest')p.life.restDay=21;if(block==='energy')p.energy=29;
  if(block==='teacher_energy')master.energy=19;if(block==='teacher_injury')master.injuryDays=1;
  if(block==='teacher_dead')master.life={...makeLife(),frailty:100,deathDay:20};if(block==='teacher_cap')master.coins=1000000;if(block==='day')day=22;
  const before=cash(s);assert.equal(npcStudyDay(s,p,age,day),false,block);assert.equal(p.study.learnedDay,0);assert.equal(cash(s),before);
 }
});
test('practice reuses existing martial gains and charges twelve real energy without new fees',()=>{
 const s=setup(),p=pupil(s);npcStudyDay(s,p,19,21);const before=cash(s),energy=p.energy;
 s.day=24;assert.equal(npcStudyDay(s,p,19,24),true);assert.equal(p.energy,energy-12);assert.equal(p.study.practice,12);assert.equal(p.study.insight,3);assert.equal(cash(s),before);
 s.day=25;assert.equal(npcStudyDay(s,p,19,25),false);assert.equal(p.energy,energy-12);
});
test('practice caps remain bounded and completed study no longer spends energy',()=>{
 const s=setup(),p=pupil(s);p.study={...makeStudy(20),learnedDay:7,practice:2399,insight:2399};npcStudyDay(s,p,65,21);
 assert.equal(p.study.practice,2400);assert.equal(p.study.insight,2400);const energy=p.energy;npcStudyDay(s,p,65,24);assert.equal(p.energy,energy);
});
test('illness and death stop practice permanently until health permits it',()=>{
 const s=setup(),p=pupil(s);p.study.learnedDay=7;p.life.sickDays=3;npcStudyDay(s,p,19,21);assert.equal(p.study.practice,0);
 p.life={...makeLife(),frailty:100,deathDay:21};const snap=JSON.stringify(s);npcStudyDay(s,p,19,24);assert.equal(JSON.stringify(s),snap);
});
test('teacher cannot teach more than existing effort permits',()=>{
 const s=setup(),master=s.npcWorld.individuals.master;master.energy=20;
 const p=pupil(s);assert.equal(npcStudyDay(s,p,19,21),true);
 const other=s.npcWorld.individuals.carter;other.coins=80;other.workDays=10;assert.equal(npcStudyDay(s,other,31,21),false);assert.equal(other.study.learnedDay,0);assert.equal(master.energy,0);
});
test('old saves receive empty study without copying player arts or granting practice',()=>{
 const s=setup();s.martial.known.qinghe_fist=true;for(const key of ['practice','insight','experience','mastery'])s.martial[key].qinghe_fist=120;
 for(const p of Object.values(s.npcWorld.individuals))delete p.study;
 const before=cash(s),x=restore(JSON.stringify(s));assert.equal(cash(x),before);assert.deepEqual(x.martial,s.martial);assert.deepEqual(x.npcWorld.individuals.dockhand01.study,makeStudy(20));
 assert.deepEqual(restore(JSON.stringify(x)).npcWorld,x.npcWorld);
});
test('unknown, malformed or future martial records are rejected',()=>{
 for(const v of [{...makeStudy(),practice:1},{...makeStudy(),learnedDay:22},{...makeStudy(),practice:2401},{...makeStudy(),insight:-1},{...makeStudy(),lastDay:0}]){
  assert.equal(studyValid(v,21),false);const s=setup();s.npcWorld.individuals.dockhand01.study=v;assert.throws(()=>restore(JSON.stringify(s)),/NPC人生/);
 }
});
test('crossing midnight initiates funded learning without player meeting the teacher',()=>{
 const s=setup(),p=pupil(s);s.day=20;s.minute=480;advance(s,1440-s.minute);assert.equal(p.study.learnedDay,21);assert.equal(p.study.practice,0);assert.equal(restore(JSON.stringify(s)).npcWorld.individuals.dockhand01.study.learnedDay,21);
});
test('adult descendants fund their own lessons and retain independent practice on reload',()=>{
 const s=fresh();s.day=7007;s.weather='晴';for(const n of Object.values(s.nodes))n.refreshDay=7009;
 const v=makeChildLivelihood('chen-child-2',7006);v.coins=50;v.workDays=10;v.food=2;
 const c={id:'chen-child-1',bornDay:332,hunger:0,learning:30,lastDay:7006,life:makeLife(),livelihood:v};
 s.npcWorld.lineage={lastDay:7006,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[c]};
 const parent=s.npcWorld.individuals.farmhand01,coins=parent.coins;lineageDay(s,s.day);assert.equal(v.study.learnedDay,7007);assert.equal(v.coins,42);assert.equal(parent.coins,coins);
 assert.equal(restore(JSON.stringify(s)).npcWorld.lineage.children[0].livelihood.study.learnedDay,7007);
});
test('NPC martial module is included in offline caching',()=>{
 assert.match(readFileSync(new URL('./sw.js',import.meta.url),'utf8'),/'npc-martial.js'/);
});
test('second art has a real fee and zero initial mastery; training balances both arts',()=>{
 const s=setup(),p=pupil(s),teacher=s.npcWorld.individuals.master;p.study.learnedDay=7;p.study.practice=120;p.study.insight=30;
 const before=cash(s);assert.equal(npcStudyDay(s,p,19,21),true);assert.equal(p.coins,32);assert.equal(cash(s),before);assert.equal(teacher.energy,80);
 assert.deepEqual(p.study.otherArts.spring_kick,{learnedDay:21,practice:0,insight:0});assert.equal(p.study.teacherTrust,5);
 npcStudyDay(s,p,19,24);assert.equal(p.study.otherArts.spring_kick.practice,12);assert.equal(p.study.practice,120);assert.equal(p.energy,88);
});
test('advanced lessons require both predecessor proficiency and actual teacher trust',()=>{
 for(const block of ['first','second','trust',null]){
  const s=setup(),p=pupil(s);p.coins=100;p.study.learnedDay=7;p.study.practice=block==='first'?119:120;p.study.teacherTrust=block==='trust'?4:5;
  p.study.otherArts.spring_kick={learnedDay:14,practice:block==='second'?119:120,insight:30};
  npcStudyDay(s,p,19,21);assert.equal(!!p.study.otherArts.stone_palm,block===null,block);
  if(block===null){assert.equal(p.coins,84);assert.equal(p.study.otherArts.stone_palm.practice,0);assert.equal(p.study.teacherTrust,10);}
 }
});
test('long autonomous study reaches third-tier arts without creating money or simultaneous practice',()=>{
 const s=setup(),p=pupil(s);p.coins=800;const before=cash(s),teacher=s.npcWorld.individuals.master;
 for(let day=21;day<=420;day++){
  s.day=day;p.energy=100;teacher.energy=100;
  const progress=()=>p.study.practice+Object.values(p.study.otherArts).reduce((n,a)=>n+a.practice,0),old=progress(),coins=p.coins;
  npcStudyDay(s,p,19,day);assert.ok([0,12].includes(progress()-old));if(p.coins<coins)assert.equal(progress(),old);
 }
 assert.ok(p.study.otherArts.soft_palm);assert.ok(p.study.otherArts.stone_palm.practice>=120);assert.ok(p.study.otherArts.river_knife.practice>=120);assert.equal(cash(s),before);
 assert.equal(p.study.otherArts.wood_knife,undefined);assert.equal(p.study.otherArts.staff,undefined);assert.ok(studyValid(p.study,s.day));
 for(const n of Object.values(s.nodes))n.refreshDay=s.day%2===1?s.day+2:s.day+1;assert.deepEqual(restore(JSON.stringify(s)).npcWorld.individuals.dockhand01.study,p.study);
});
test('4.10 study migrates exactly, including adult descendant records, with no trust gift',()=>{
 const s=setup(),p=pupil(s);p.study={learnedDay:7,practice:120,insight:30,lastDay:20};
 s.day=7007;for(const n of Object.values(s.nodes))n.refreshDay=7009;
 const v=makeChildLivelihood('chen-child-1',7006);v.study={learnedDay:6000,practice:12,insight:3,lastDay:7006};
 s.npcWorld.lineage={lastDay:7006,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[{id:'chen-child-1',bornDay:332,hunger:0,learning:0,lastDay:7006,life:makeLife(),livelihood:v}]};
 const before=cash(s),x=restore(JSON.stringify(s));assert.deepEqual(x.npcWorld.individuals.dockhand01.study,{...p.study,otherArts:{},teacherTrust:0,experience:0,mastery:0,lastSparDay:0});
 assert.deepEqual(x.npcWorld.lineage.children[0].livelihood.study,{...v.study,otherArts:{},teacherTrust:0,experience:0,mastery:0,lastSparDay:0});assert.equal(cash(x),before);
});
test('extended study rejects unknown arts, duplicate primary and invalid gains',()=>{
 for(const [id,a] of [['unknown',{learnedDay:14,practice:0,insight:0}],['qinghe_fist',{learnedDay:14,practice:0,insight:0}],['spring_kick',{learnedDay:22,practice:0,insight:0}],['spring_kick',{learnedDay:14,practice:2401,insight:0}]]){
  const s=setup(),p=pupil(s);p.study.learnedDay=7;p.study.otherArts[id]=a;assert.throws(()=>restore(JSON.stringify(s)),/NPC人生/);
 }
 const s=setup();s.npcWorld.individuals.dockhand01.study.teacherTrust=101;assert.throws(()=>restore(JSON.stringify(s)),/NPC人生/);
});
test('forage aspiration funds village arts from the existing farmer without school trust gifts',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01,farmer=s.npcWorld.individuals.farmer,master=s.npcWorld.individuals.master;
 p.coins=80;p.workDays=10;p.study.learnedDay=7;p.study.practice=120;p.study.teacherTrust=5;
 const before=cash(s),fee=farmer.coins,masterCoins=master.coins;assert.equal(npcStudyDay(s,p,19,21),true);
 assert.deepEqual(p.study.otherArts.wood_knife,{learnedDay:21,practice:0,insight:0});assert.equal(p.coins,72);assert.equal(farmer.coins,fee+8);assert.equal(farmer.energy,80);assert.equal(farmer.workDays,1);assert.equal(master.coins,masterCoins);assert.equal(p.study.teacherTrust,5);assert.equal(cash(s),before);
 s.day=24;for(const n of Object.values(s.nodes))n.refreshDay=25;npcStudyDay(s,p,19,24);assert.equal(p.study.otherArts.wood_knife.practice,12);assert.equal(p.energy,88);assert.match(studySummary(p),/柴刀法/);
 assert.deepEqual(restore(JSON.stringify(s)).npcWorld.individuals.farmhand01.study,p.study);
});
test('village teaching requires a living healthy funded instructor with finite effort',()=>{
 for(const block of ['dead','sick','rest','retired','injury','energy','cap','savings']){
  const s=setup(),p=s.npcWorld.individuals.farmhand01,t=s.npcWorld.individuals.farmer;
  p.coins=80;p.workDays=10;p.study.learnedDay=7;p.study.practice=120;
  if(block==='dead')t.life={...makeLife(),frailty:100,deathDay:20};if(block==='sick')t.life.sickDays=1;if(block==='rest')t.life.restDay=21;
  if(block==='retired')t.retirement={active:true,retiredDay:20,lastDay:20};if(block==='injury')t.injuryDays=1;if(block==='energy')t.energy=19;if(block==='cap')t.coins=1000000;if(block==='savings')p.coins=59;
  const before=cash(s),coins=t.coins;npcStudyDay(s,p,19,21);assert.equal(p.study.otherArts.wood_knife,undefined,block);assert.equal(t.coins,coins);assert.equal(cash(s),before);
 }
});
test('both existing village arts can be learned once, and teaching effort cannot be shared twice',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01,t=s.npcWorld.individuals.farmer;p.coins=100;p.workDays=10;p.study.learnedDay=7;p.study.practice=120;
 npcStudyDay(s,p,19,21);t.energy=20;npcStudyDay(s,p,19,28);assert.ok(p.study.otherArts.staff);assert.equal(t.energy,0);
 const other=s.npcWorld.individuals.herbalist;other.outlook.ambition='forage';other.coins=100;other.workDays=10;other.study.learnedDay=7;other.study.practice=120;
 npcStudyDay(s,other,42,28);assert.equal(other.study.otherArts.wood_knife,undefined);
 const old=p.coins;t.energy=100;npcStudyDay(s,p,19,35);assert.equal(p.study.otherArts.wood_knife.learnedDay,21);assert.equal(p.study.otherArts.staff.learnedDay,28);assert.ok(p.coins<=old);
});
test('the village instructor cannot pay himself to learn his own lessons',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmer;p.outlook.ambition='forage';p.coins=100;p.workDays=10;p.study.learnedDay=7;p.study.practice=120;
 npcStudyDay(s,p,57,21);assert.equal(p.study.otherArts.wood_knife,undefined);assert.equal(p.study.otherArts.staff,undefined);
});
