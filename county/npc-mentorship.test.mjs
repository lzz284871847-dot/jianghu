import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {makeMentor,npcStudyDay,studySummary} from './npc-martial.js';
import {makeLife} from './npc-mortality.js';
import {makeChildLivelihood} from './npc-lineage.js';
const setup=()=>{const s=fresh();s.day=28;for(const n of Object.values(s.nodes))n.refreshDay=29;const p=s.npcWorld.individuals.dockhand01;p.study.lastDay=27;p.study.learnedDay=7;p.study.practice=120;p.study.teacherTrust=15;p.workDays=10;p.coins=100;return {s,p,t:s.npcWorld.individuals.master};};
const purse=s=>Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0);
test('formal apprenticeship uses earned trust, finite mutual effort and no free art or wealth',()=>{
 const {s,p,t}=setup(),coins=purse(s),martial=s.martial;assert.equal(npcStudyDay(s,p,19,28),true);assert.deepEqual(p.study.mentor,{joinedDay:28,endedDay:0,lastAidDay:0,aidCount:0});assert.equal(p.energy,96);assert.equal(t.energy,96);assert.equal(purse(s),coins);assert.deepEqual(p.study.otherArts,{});assert.equal(p.study.practice,120);assert.equal(p.study.teacherTrust,15);assert.deepEqual(s.martial,martial);assert.match(studySummary(p),/师承周师傅/);
 const snapshot=JSON.stringify(s);npcStudyDay(s,p,19,28);assert.equal(JSON.stringify(s),snapshot);assert.deepEqual(restore(snapshot).npcWorld,s.npcWorld);
});
test('formal apprenticeship rejects insufficient practice, trust, age, health and teacher effort',()=>{
 for(const block of ['practice','trust','minor','elder','retired','hungry','injured','sick','rest','tired','teacher_sick','teacher_dead','teacher_tired']){
  const {s,p,t}=setup();let age=19;if(block==='practice')p.study.practice=119;if(block==='trust')p.study.teacherTrust=11;if(block==='minor')age=15;if(block==='elder')age=65;if(block==='retired')p.retirement.active=true;if(block==='hungry')p.hunger=40;if(block==='injured')p.injuryDays=1;if(block==='sick')p.life.sickDays=1;if(block==='rest')p.life.restDay=28;if(block==='tired')p.energy=29;if(block==='teacher_sick')t.life.sickDays=1;if(block==='teacher_dead')t.life={...makeLife(),frailty:100,deathDay:27};if(block==='teacher_tired')t.energy=3;
  npcStudyDay(s,p,age,28);assert.equal(p.study.mentor.joinedDay,0,block);
 }
});
test('disciples support their actual impoverished teacher once with bounded personal savings',()=>{
 const {s,p,t}=setup();p.study.mentor.joinedDay=21;t.coins=4;const total=purse(s),energy=p.energy;
 npcStudyDay(s,p,19,28);assert.equal(p.coins,97);assert.equal(t.coins,7);assert.equal(p.energy,energy-4);assert.equal(purse(s),total);assert.equal(p.study.mentor.aidCount,1);assert.equal(p.study.mentor.lastAidDay,28);
 const snap=JSON.stringify(s);npcStudyDay(s,p,19,28);assert.equal(JSON.stringify(s),snap);
 const x=setup();x.p.study.mentor.joinedDay=21;x.p.coins=42;x.t.coins=0;const coins=x.p.coins;npcStudyDay(x.s,x.p,19,28);assert.equal(x.p.study.mentor.aidCount,0);assert.equal(x.t.coins,8);assert.equal(x.p.coins,coins-8);
});
test('food aid comes from disciple stock, not market inventory or shared household reserves',()=>{
 const {s,p,t}=setup();p.study.mentor.joinedDay=21;t.food=0;t.hunger=40;t.coins=10;p.food=3;const before=JSON.stringify({commerce:s.commerce,households:s.npcWorld.households});
 npcStudyDay(s,p,19,28);assert.equal(p.food,2);assert.equal(t.food,1);assert.equal(p.study.mentor.aidCount,1);assert.equal(JSON.stringify({commerce:s.commerce,households:s.npcWorld.households}),before);
});
test('teacher death preserves lineage and learned arts while stopping all aid and new lessons',()=>{
 const {s,p,t}=setup();p.study.mentor.joinedDay=21;p.study.otherArts.spring_kick={learnedDay:14,practice:0,insight:0};t.life={...makeLife(),frailty:100,deathDay:27};t.coins=0;t.food=0;t.hunger=80;
 const coins=p.coins,food=p.food;npcStudyDay(s,p,19,28);assert.equal(p.study.mentor.endedDay,27);assert.equal(p.coins,coins);assert.equal(p.food,food);assert.equal(p.study.mentor.aidCount,0);assert.match(studySummary(p),/师傅已故/);
 s.day=30;for(const n of Object.values(s.nodes))n.refreshDay=31;npcStudyDay(s,p,19,30);assert.equal(p.study.otherArts.spring_kick.practice,12);assert.equal(p.coins,coins);assert.equal(p.study.mentor.joinedDay,21);assert.deepEqual(restore(JSON.stringify(s)).npcWorld.individuals.dockhand01.study,p.study);
});
test('old records migrate without retrospective apprenticeship, and forged lineage is rejected',()=>{
 const {s,p}=setup();for(const q of Object.values(s.npcWorld.individuals))delete q.study.mentor;
 const v=makeChildLivelihood('chen-child-1',7006);delete v.study.mentor;v.study.learnedDay=6000;v.study.practice=120;v.study.teacherTrust=15;
 s.day=7007;for(const n of Object.values(s.nodes))n.refreshDay=7009;s.npcWorld.lineage={lastDay:7006,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[{id:'chen-child-1',bornDay:332,hunger:0,learning:20,lastDay:7006,life:makeLife(),livelihood:v}]};
 const x=restore(JSON.stringify(s));assert.deepEqual(x.npcWorld.individuals.dockhand01.study.mentor,makeMentor());assert.deepEqual(x.npcWorld.lineage.children[0].livelihood.study.mentor,makeMentor());assert.equal(x.npcWorld.individuals.dockhand01.study.teacherTrust,p.study.teacherTrust);
 for(const m of [{...makeMentor(),joinedDay:29},{...makeMentor(),joinedDay:21,endedDay:20},{...makeMentor(),joinedDay:21,aidCount:1},{...makeMentor(),aidCount:-1}]){const y=setup();y.p.study.mentor=m;assert.throws(()=>restore(JSON.stringify(y.s)),/NPC人生/);}
});
test('midnight establishes apprenticeship independently of player conversation',()=>{
 const {s,p}=setup();s.day=27;s.minute=1430;s.npcWorld.lastDay=27;for(const q of Object.values(s.npcWorld.individuals))q.lastDay=27;
 advance(s,10);assert.equal(p.study.mentor.joinedDay,28);assert.equal(s.combat,null);
});
