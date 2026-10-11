import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,martialAction} from './engine.js';
import {makeLife} from './npc-mortality.js';
import {npcStudyDay} from './npc-martial.js';
import {makeChildLivelihood} from './npc-lineage.js';
import {schoolDay,schoolTeacher,schoolCanTeach,schoolSummary} from './npc-school.js';
import {tickNPCs} from './npc-simulation.js';
import {readFileSync} from 'node:fs';
const qualify=p=>{p.study.learnedDay=7;p.study.practice=120;p.study.teacherTrust=15;p.study.mentor.joinedDay=14;p.study.lastDay=27;for(const id of ['stone_palm','river_knife'])p.study.otherArts[id]={learnedDay:21,practice:120,insight:30};};
const setup=()=>{const s=fresh();s.day=28;s.place='school';for(const n of Object.values(s.nodes))n.refreshDay=29;s.npcWorld.individuals.master.life={...makeLife(),frailty:100,deathDay:27};const p=s.npcWorld.individuals.dockhand01;qualify(p);p.coins=100;p.energy=100;return {s,p};};
test('qualified existing resident succeeds the deceased teacher without gifts or copied knowledge',()=>{
 const {s,p}=setup(),cash=Object.values(s.npcWorld.individuals).map(x=>x.coins),study=JSON.stringify(p.study);assert.equal(schoolDay(s,28).length,1);assert.equal(s.npcWorld.school.holder,p.id);assert.equal(s.npcWorld.school.appointedDay,28);assert.equal(JSON.stringify(p.study),study);assert.deepEqual(Object.values(s.npcWorld.individuals).map(x=>x.coins),cash);
 assert.equal(schoolCanTeach(s,'qinghe_fist'),true);assert.equal(schoolCanTeach(s,'stone_palm'),true);assert.equal(schoolCanTeach(s,'soft_palm'),false);assert.match(schoolSummary(s),/阿旺/);assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);
 const snap=JSON.stringify(s);schoolDay(s,28);assert.equal(JSON.stringify(s),snap);
});
test('living holder is retained; missing skill, lineage or health leaves a vacancy',()=>{
 for(const block of ['practice','tier','mentor','trust','minor','elder','ill','retired','hunger','injury']){
  const {s,p}=setup();if(block==='practice')p.study.practice=119;if(block==='tier')p.study.otherArts.river_knife.practice=119;if(block==='mentor')p.study.mentor.joinedDay=0;if(block==='trust')p.study.teacherTrust=11;if(block==='minor')p.age=15;if(block==='elder')p.age=65;if(block==='ill')p.life.sickDays=1;if(block==='retired')p.retirement.active=true;if(block==='hunger')p.hunger=40;if(block==='injury')p.injuryDays=1;
  assert.deepEqual(schoolDay(s,28),[],block);assert.equal(s.npcWorld.school.holder,'',block);
 }
 const {s}=setup();s.npcWorld.individuals.master.life=makeLife();schoolDay(s,28);assert.equal(s.npcWorld.school.holder,'master');
});
test('successor charges player fees and real teaching effort; unavailable arts cannot be learned',()=>{
 const {s,p}=setup();schoolDay(s,28);const cash=p.coins;assert.equal(martialAction(s,'learn','qinghe_fist'),true);assert.equal(p.coins,cash+8);assert.equal(p.energy,80);assert.equal(s.coins,22);
 const coins=s.coins,energy=p.energy;assert.equal(martialAction(s,'learn','spring_kick'),false);assert.equal(s.coins,coins);assert.equal(p.energy,energy);
 p.energy=19;assert.equal(martialAction(s,'learn','stone_palm'),false);assert.equal(p.energy,19);
});
test('NPC pupils pay the successor instead of the deceased teacher and do not copy advanced arts',()=>{
 const {s,p}=setup();schoolDay(s,28);const pupil=s.npcWorld.individuals.carter;pupil.coins=80;pupil.workDays=10;const total=p.coins+pupil.coins;
 npcStudyDay(s,pupil,31,28);assert.equal(pupil.study.learnedDay,28);assert.equal(pupil.coins,72);assert.equal(p.coins,108);assert.equal(p.energy,80);assert.equal(p.coins+pupil.coins,total);assert.deepEqual(pupil.study.otherArts,{});assert.equal(s.npcWorld.individuals.master.coins,30);
});
test('adult descendants teach using their own saved purse and effort; another death reopens vacancy',()=>{
 const {s,p}=setup();p.study.mentor.joinedDay=0;p.study.practice=0;s.day=7000;for(const n of Object.values(s.nodes))n.refreshDay=7001;const v=makeChildLivelihood('chen-child-1',6999);qualify(v);v.study.learnedDay=6000;v.study.mentor.joinedDay=6100;for(const a of Object.values(v.study.otherArts))a.learnedDay=6200;v.study.lastDay=6999;v.coins=10;
 const c={id:'chen-child-1',bornDay:332,hunger:0,learning:20,lastDay:6999,life:makeLife(),livelihood:v};s.npcWorld.lineage={lastDay:6999,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[c]};
 schoolDay(s,7000);assert.equal(schoolTeacher(s).id,c.id);assert.equal(martialAction(s,'learn','qinghe_fist'),true);assert.equal(v.coins,18);assert.equal(v.energy,80);assert.equal(v.workDays,1);assert.deepEqual(restore(JSON.stringify(s)).npcWorld.lineage.children[0].livelihood,v);
 c.life={...makeLife(),frailty:100,deathDay:7000};s.day=7001;schoolDay(s,7001);assert.equal(s.npcWorld.school.holder,'');
});
test('daily tick appoints autonomously and old saves do not fabricate a successor on load',()=>{
 const {s,p}=setup();delete s.npcWorld.school;const x=restore(JSON.stringify(s));assert.equal(x.npcWorld.school.holder,'master');assert.equal(x.npcWorld.school.appointedDay,0);tickNPCs(x,28);assert.equal(x.npcWorld.school.holder,p.id);
 for(const school of [{holder:'unknown',appointedDay:28,lastDay:28},{holder:p.id,appointedDay:29,lastDay:28},{holder:'master',appointedDay:0,lastDay:0}]){const y=setup();y.s.npcWorld.school=school;assert.throws(()=>restore(JSON.stringify(y.s)),/NPC人生/);}
 assert.match(readFileSync(new URL('./sw.js',import.meta.url),'utf8'),/'npc-school.js'/);
});
