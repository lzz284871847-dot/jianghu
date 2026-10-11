import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,restore,martialAction} from './engine.js';
import {makeLife} from './npc-mortality.js';
import {makeChildLivelihood} from './npc-lineage.js';
import {npcStudyDay} from './npc-martial.js';
import {tickNPCs} from './npc-simulation.js';
import {villageSchoolDay,villageTeacher,villageCanTeach} from './npc-village-school.js';
const qualify=p=>{Object.assign(p.study,{learnedDay:7,lastDay:27,practice:120});for(const id of ['wood_knife','staff'])p.study.otherArts[id]={learnedDay:14,practice:120,insight:0};};
const setup=()=>{const s=fresh();s.day=28;s.weather='晴';s.place='village';s.minute=480;for(const n of Object.values(s.nodes))n.refreshDay=29;const old=s.npcWorld.individuals.farmer,p=s.npcWorld.individuals.herbalist;old.life={...makeLife(),frailty:100,deathDay:27};qualify(p);return {s,p,old};};
test('qualified existing villager succeeds a deceased teacher with no gifted assets or skills',()=>{
 const {s,p}=setup(),coins=Object.values(s.npcWorld.individuals).map(p=>p.coins),study=JSON.stringify(p.study);assert.equal(villageSchoolDay(s,28).length,1);assert.equal(villageTeacher(s).id,p.id);assert.equal(JSON.stringify(p.study),study);assert.deepEqual(Object.values(s.npcWorld.individuals).map(p=>p.coins),coins);assert.ok(villageCanTeach(s,'staff'));assert.equal(villageCanTeach(s,'stone_palm'),false);assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);const snap=JSON.stringify(s);villageSchoolDay(s,28);assert.equal(JSON.stringify(s),snap);
});
test('retirement releases the office; living working teacher remains and real deficiencies leave a vacancy',()=>{
 const x=setup();x.old.life=makeLife();assert.deepEqual(villageSchoolDay(x.s,28),[]);assert.equal(x.s.npcWorld.villageSchool.holder,'farmer');x.s.day=29;x.old.retirement={active:true,retiredDay:28,lastDay:28};assert.equal(villageSchoolDay(x.s,29).length,1);assert.equal(villageTeacher(x.s).id,x.p.id);
 for(const block of ['fist','knife','staff','age','sick','rest','injury','retired','hunger','away']){const {s,p}=setup();if(block==='fist')p.study.practice=119;if(block==='knife')p.study.otherArts.wood_knife.practice=119;if(block==='staff')p.study.otherArts.staff.practice=119;if(block==='age')p.age=65;if(block==='sick')p.life.sickDays=1;if(block==='rest')p.life.restDay=28;if(block==='injury')p.injuryDays=1;if(block==='retired')p.retirement.active=true;if(block==='hunger')p.hunger=40;if(block==='away')s.npcWorld.journeys.records[p.id]={departedDay:27,returnedDay:0,completed:0,home:'village'};assert.deepEqual(villageSchoolDay(s,28),[],block);assert.equal(s.npcWorld.villageSchool.holder,'',block);}
});
test('player pays successor actual fee with finite effort, while unavailable teacher cancels the whole lesson',()=>{
 const {s,p}=setup();villageSchoolDay(s,28);const coins=p.coins;assert.equal(martialAction(s,'learn','staff'),true);assert.equal(s.coins,22);assert.equal(p.coins,coins+8);assert.equal(p.energy,80);assert.equal(p.workDays,1);assert.equal(s.martial.known.staff,true);assert.equal(s.minute,540);
 for(const block of ['energy','rest','dead','cap']){const {s,p}=setup();villageSchoolDay(s,28);if(block==='energy')p.energy=19;if(block==='rest')p.life.restDay=28;if(block==='dead')p.life.deathDay=28;if(block==='cap')p.coins=999993;const before=[s.coins,s.minute,p.coins,p.energy];assert.equal(martialAction(s,'learn','wood_knife'),false,block);assert.deepEqual([s.coins,s.minute,p.coins,p.energy],before);assert.equal(s.martial.known.wood_knife,undefined);}
});
test('NPCs independently learn from successor using existing wallets and real training cost',()=>{
 const {s,p}=setup();villageSchoolDay(s,28);const a=s.npcWorld.individuals.farmhand01;Object.assign(a,{coins:100,workDays:10,food:3});Object.assign(a.study,{learnedDay:7,practice:120,lastDay:27});const total=a.coins+p.coins;assert.equal(npcStudyDay(s,a,a.age,28),true);assert.equal(a.study.otherArts.wood_knife.learnedDay,28);assert.equal(a.coins,92);assert.equal(p.coins,38);assert.equal(p.energy,80);assert.equal(a.coins+p.coins,total);assert.match(a.history[0],/罗采药/);
});
test('adult descendant appointment persists its own wallet through player lessons and reload',()=>{
 const {s,p}=setup();s.day=7300;for(const n of Object.values(s.nodes))n.refreshDay=7301;p.study.otherArts.staff.practice=119;const v=makeChildLivelihood('chen-child-1',7299);qualify({study:v.study});v.study.lastDay=7299;const c={id:'chen-child-1',bornDay:332,hunger:0,learning:20,lastDay:7299,life:makeLife(),livelihood:v};s.npcWorld.lineage={lastDay:7299,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[c]};villageSchoolDay(s,7300);assert.equal(villageTeacher(s).id,c.id);assert.equal(martialAction(s,'learn','staff'),true);assert.equal(v.coins,8);assert.equal(v.energy,80);assert.equal(v.workDays,1);assert.deepEqual(restore(JSON.stringify(s)).npcWorld.lineage.children[0].livelihood,v);
});
test('daily succession is autonomous and old saves receive no retrospective qualifications or extra assets',()=>{
 const {s,p}=setup();s.npcWorld.lastDay=27;tickNPCs(s,28);assert.equal(villageTeacher(s).id,p.id);const x=setup();delete x.s.npcWorld.villageSchool;const before=Object.values(x.s.npcWorld.individuals).map(p=>p.coins),restored=restore(JSON.stringify(x.s));assert.deepEqual(restored.npcWorld.villageSchool,{holder:'farmer',appointedDay:0,lastDay:1});assert.deepEqual(Object.values(restored.npcWorld.individuals).map(p=>p.coins),before);
});
test('invalid office records reject saves and new module participates in offline caching',()=>{
 for(const record of [{holder:'unknown',appointedDay:28,lastDay:28},{holder:'herbalist',appointedDay:29,lastDay:28},{holder:'herbalist',appointedDay:0,lastDay:28}]){const {s}=setup();s.npcWorld.villageSchool=record;assert.throws(()=>restore(JSON.stringify(s)),/NPC人生/);}
 assert.match(readFileSync(new URL('./sw.js',import.meta.url),'utf8'),/'npc-village-school.js'/);
});
