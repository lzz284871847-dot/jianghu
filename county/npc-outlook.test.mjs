import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {makeOutlook,outlookValid,voluntaryShopSearch,ambitionDay,outlookSummary} from './npc-social.js';
import {npcApplyShop,npcCareerDay} from './npc-economy.js';
import {makeLife} from './npc-mortality.js';
import {makeChildLivelihood,lineageDay,lineageSummary} from './npc-lineage.js';
const setup=()=>{const s=fresh();s.day=21;s.npcWorld.lastDay=20;for(const p of Object.values(s.npcWorld.individuals))p.lastDay=20;for(const n of Object.values(s.nodes))n.refreshDay=23;return s;};
const candidate=s=>{const p=s.npcWorld.individuals.dockhand01;p.workDays=10;p.coins=40;p.occupation='carrier';p.energy=100;return p;};
const cash=s=>s.commerce.budget.market+s.commerce.budget.liuxi+Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0);
test('temperament changes voluntary job timing while steadfast workers retain their trade',()=>{
 const s=setup(),p=candidate(s);assert.equal(voluntaryShopSearch(p,21),true);
 p.outlook=makeOutlook('carter');assert.equal(voluntaryShopSearch(p,21),false);
 p.workDays=20;p.coins=60;assert.equal(voluntaryShopSearch(p,21),true);
 p.outlook.temperament='steadfast';assert.equal(voluntaryShopSearch(p,21),false);
 p.outlook.temperament='enterprising';p.outlook.ambition='forage';assert.equal(voluntaryShopSearch(p,21),false);
});
test('voluntary applications require actual savings, paid work, health and a weekly review day',()=>{
 for(const block of ['coins','work','hunger','injury','energy','unemployed','date','illness','rest']){
  const s=setup(),p=candidate(s);let day=21;
  if(block==='coins')p.coins=39;if(block==='work')p.workDays=9;if(block==='hunger')p.hunger=40;
  if(block==='injury')p.injuryDays=1;if(block==='energy')p.energy=19;if(block==='unemployed')p.unemployedDays=1;
  if(block==='date')day=22;if(block==='illness')p.life.sickDays=1;if(block==='rest')p.life.restDay=21;
  ambitionDay(s,p,day,npcApplyShop);assert.equal(p.occupation,'carrier',block);
 }
});
test('successful voluntary career change consumes one vacancy without wages or skill grants',()=>{
 const s=setup(),p=candidate(s),before=cash(s),skills=structuredClone(p.careerSkills),days=p.workDays;
 ambitionDay(s,p,21,npcApplyShop);assert.equal(p.occupation,'shopworker');assert.equal(cash(s),before);assert.deepEqual(p.careerSkills,skills);assert.equal(p.workDays,days);const snap=JSON.stringify(s);ambitionDay(s,p,21,npcApplyShop);assert.equal(JSON.stringify(s),snap);
 const rival=s.npcWorld.individuals.carter;rival.occupation='carrier';rival.workDays=20;rival.coins=60;
 ambitionDay(s,rival,21,npcApplyShop);assert.equal(rival.occupation,'carrier');
});
test('insolvency, closure and damaged manager relationship block voluntary hiring',()=>{
 for(const block of ['budget','closed','trust']){
  const s=setup(),p=candidate(s);
  if(block==='budget')s.commerce.budget.market=69;
  if(block==='closed')s.society.districts.market.closedUntil=21;
  if(block==='trust'){p.id='shopassistant';p.outlook=makeOutlook('dockhand01');s.npcWorld.social.bonds['merchant:shopassistant'].trust=29;}
  const before=cash(s);ambitionDay(s,p,21,npcApplyShop);assert.equal(p.occupation,'carrier',block);assert.equal(cash(s),before);
 }
});
test('skill aspirations require actual work and proficiency, persist once and award no assets',()=>{
 const s=setup(),p=s.npcWorld.individuals.smithapprentice;p.workDays=20;p.careerSkills.craft=39;
 const before=cash(s);assert.equal(ambitionDay(s,p,21,npcApplyShop),false);assert.equal(p.outlook.achievedDay,0);
 p.careerSkills.craft=40;s.day=22;assert.equal(ambitionDay(s,p,22,npcApplyShop),true);assert.equal(p.outlook.achievedDay,22);assert.equal(cash(s),before);
 const history=structuredClone(p.history);ambitionDay(s,p,22,npcApplyShop);assert.deepEqual(p.history,history);ambitionDay(s,p,23,npcApplyShop);assert.deepEqual(p.history,history);assert.equal(p.outlook.achievedDay,22);
 assert.match(outlookSummary(p),/曾达成/);
});
test('stability goals require earned labor, a funded recent job and a real cash reserve',()=>{
 const s=setup(),p=s.npcWorld.individuals.shopassistant;p.workDays=20;p.coins=59;
 ambitionDay(s,p,21,npcApplyShop);assert.equal(p.outlook.achievedDay,0);
 p.coins=60;p.unemployedDays=1;ambitionDay(s,p,22,npcApplyShop);assert.equal(p.outlook.achievedDay,0);
 p.unemployedDays=0;ambitionDay(s,p,23,npcApplyShop);assert.equal(p.outlook.achievedDay,23);
});
test('survival job transitions remain available to cautious workers without voluntary reserves',()=>{
 const s=setup(),p=s.npcWorld.individuals.laborer;p.outlook=makeOutlook('carter');p.coins=0;p.unemployedDays=2;s.commerce.budget.market=0;
 npcCareerDay(s,p,21);assert.equal(p.occupation,'carrier');assert.equal(p.coins,0);
});
test('dead residents never review or achieve aspirations',()=>{
 const s=setup(),p=candidate(s);p.life={...makeLife(),frailty:100,deathDay:20};
 const snap=JSON.stringify(s);ambitionDay(s,p,21,npcApplyShop);assert.equal(JSON.stringify(s),snap);
});
test('old saves gain preferences without retrospective accomplishments, cash or proficiency',()=>{
 const s=setup();for(const p of Object.values(s.npcWorld.individuals))delete p.outlook;
 const before=cash(s),skills=structuredClone(s.npcWorld.individuals.smithapprentice.careerSkills),x=restore(JSON.stringify(s));
 assert.equal(cash(x),before);assert.deepEqual(x.npcWorld.individuals.smithapprentice.careerSkills,skills);assert.equal(x.npcWorld.individuals.smithapprentice.outlook.achievedDay,0);assert.equal(x.npcWorld.individuals.smithapprentice.outlook.lastDay,21);
 assert.deepEqual(restore(JSON.stringify(x)).npcWorld,x.npcWorld);
});
test('invalid or future preference records are rejected without resetting them',()=>{
 for(const bad of [{temperament:'emperor'},{ambition:'immortality'},{achievedDay:22},{lastDay:22},{lastDay:0}]){
  const s=setup();Object.assign(s.npcWorld.individuals.farmhand01.outlook,bad);assert.equal(outlookValid(s.npcWorld.individuals.farmhand01.outlook,21),false);assert.throws(()=>restore(JSON.stringify(s)),/NPC人生/);
 }
});
test('world time advances voluntary choices without player conversation or job triggers',()=>{
 const s=setup(),p=candidate(s);p.workDays=9;s.day=20;s.minute=480;
 advance(s,1440-s.minute);assert.equal(p.workDays,10);assert.equal(p.occupation,'shopworker');assert.equal(p.outlook.lastDay,21);
 assert.equal(restore(JSON.stringify(s)).npcWorld.individuals.dockhand01.occupation,'shopworker');
});
test('adult descendants independently pursue their own goals while children retain distinct defaults',()=>{
 const s=fresh();s.day=7007;s.weather='晴';s.npcWorld.lastDay=7006;
 for(const n of Object.values(s.nodes))n.refreshDay=7009;
 for(const p of Object.values(s.npcWorld.individuals))p.lastDay=7006;
 const child=(id,bornDay)=>({id,bornDay,hunger:0,learning:30,lastDay:7006,life:makeLife(),livelihood:makeChildLivelihood(id,7006)});
 const cs=[child('chen-child-1',332),child('chen-child-2',692)];
 s.npcWorld.lineage={lastDay:7006,courtshipDay:2,marriedDay:32,conceivedDay:0,children:cs};
 const v=cs[1].livelihood;v.occupation='carrier';v.workDays=9;v.coins=40;v.food=2;
 const coins=s.npcWorld.individuals.farmhand01.coins;lineageDay(s,s.day);
 assert.match(lineageSummary(s).join(' '),/性格进取/);assert.equal(cs[0].livelihood.outlook.temperament,'steadfast');assert.equal(v.outlook.temperament,'enterprising');assert.equal(v.occupation,'shopworker');assert.equal(v.workDays,10);assert.equal(s.npcWorld.individuals.farmhand01.coins,coins);
 assert.equal(restore(JSON.stringify(s)).npcWorld.lineage.children[1].livelihood.occupation,'shopworker');
});
