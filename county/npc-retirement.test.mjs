import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {makeLife} from './npc-mortality.js';
import {makeChildLivelihood,lineageDay} from './npc-lineage.js';
import {makeRetirement,retirementValid,retirementSummary,npcRetirementDay,npcCareerDay,npcApplyShop,npcWork,npcProduce} from './npc-economy.js';
import {ambitionDay} from './npc-social.js';
import {npcStudyDay} from './npc-martial.js';
const setup=()=>{const s=fresh();s.day=21;s.npcWorld.lastDay=20;for(const p of Object.values(s.npcWorld.individuals))p.lastDay=20;for(const n of Object.values(s.nodes))n.refreshDay=23;return s;};
const elder=s=>{const p=s.npcWorld.individuals.shopassistant;p.age=65;p.coins=120;p.food=3;p.workDays=20;return p;};
test('wealth-funded retirement preserves actual assets and skills, with no pension',()=>{
 const s=setup(),p=elder(s),before=JSON.stringify([p.coins,p.food,p.careerSkills,s.commerce]);
 assert.equal(npcRetirementDay(s,p,65,21),true);assert.equal(p.retirement.active,true);assert.equal(p.retirement.retiredDay,21);assert.equal(JSON.stringify([p.coins,p.food,p.careerSkills,s.commerce]),before);
 assert.equal(npcWork(s,p,21),false);assert.equal(npcCareerDay(s,p,21),false);assert.equal(p.workDays,20);assert.match(retirementSummary(p),/退养中/);
 const snap=JSON.stringify(s);npcRetirementDay(s,p,65,21);assert.equal(JSON.stringify(s),snap);
});
test('age, real labor, reserve, rations and health are necessary for retirement',()=>{
 for(const block of ['age','labor','cash','food','hunger','injury','illness','rest']){
  const s=setup(),p=elder(s);let age=65;
  if(block==='age')age=64;if(block==='labor')p.workDays=19;if(block==='cash')p.coins=119;if(block==='food')p.food=1;
  if(block==='hunger')p.hunger=40;if(block==='injury')p.injuryDays=1;if(block==='illness')p.life.sickDays=1;if(block==='rest')p.life.restDay=21;
  npcRetirementDay(s,p,age,21);assert.equal(p.retirement.active,false,block);
 }
});
test('retirement releases a shop vacancy and a returning elder cannot reclaim an occupied job',()=>{
 const s=setup(),p=elder(s),a=s.npcWorld.individuals.dockhand01,b=s.npcWorld.individuals.dockhand02;
 npcRetirementDay(s,p,65,21);assert.equal(npcApplyShop(s,a,21),true);assert.equal(npcApplyShop(s,b,21),true);
 p.coins=29;s.day=22;npcRetirementDay(s,p,65,22);assert.equal(p.retirement.active,false);assert.equal(p.occupation,'carrier');assert.equal(npcApplyShop(s,p,22),false);
 const coins=p.coins;assert.equal(npcWork(s,p,22),false);assert.equal(p.coins,coins);assert.equal(a.occupation,'shopworker');assert.equal(b.occupation,'shopworker');
});
test('a returning elder can obtain a real vacant job, with salary only after hiring',()=>{
 const s=setup(),p=elder(s);npcRetirementDay(s,p,65,21);p.coins=29;npcRetirementDay(s,p,65,22);
 assert.equal(npcApplyShop(s,p,22),true);assert.equal(p.coins,29);const budget=s.commerce.budget.market;
 assert.equal(npcWork(s,p,23),true);assert.equal(p.coins,33);assert.equal(s.commerce.budget.market,budget-4);
});
test('retirees cease production and voluntary hiring but may use energy for existing solo practice',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;p.age=65;p.coins=120;p.food=3;p.workDays=20;p.study.learnedDay=7;
 npcRetirementDay(s,p,65,21);assert.equal(npcProduce(s,p,21),false);assert.equal(npcApplyShop(s,p,21),false);
 ambitionDay(s,p,21,npcApplyShop);assert.equal(p.outlook.achievedDay,0);assert.equal(npcStudyDay(s,p,65,21),true);assert.equal(p.study.practice,12);assert.equal(p.coins,120);
});
test('daily world retirement precedes wages, preserves meals and reload state',()=>{
 const s=setup(),p=elder(s),days=p.workDays;s.day=20;s.minute=480;advance(s,1440-s.minute);
 assert.equal(p.retirement.active,true);assert.equal(p.workDays,days);assert.equal(p.food,2);assert.equal(p.coins,115);assert.equal(p.coins+s.npcWorld.households.market.coins,120);
 assert.equal(restore(JSON.stringify(s)).npcWorld.individuals.shopassistant.retirement.active,true);
});
test('old saves never retrospectively retire elders or invent reserves',()=>{
 const s=setup(),p=elder(s);for(const n of Object.values(s.npcWorld.individuals))delete n.retirement;
 const coins=p.coins,food=p.food,x=restore(JSON.stringify(s));assert.deepEqual(x.npcWorld.individuals.shopassistant.retirement,makeRetirement(20));assert.equal(x.npcWorld.individuals.shopassistant.coins,coins);assert.equal(x.npcWorld.individuals.shopassistant.food,food);
 assert.deepEqual(restore(JSON.stringify(x)).npcWorld,x.npcWorld);
});
test('malformed retirement records are rejected instead of granting benefits or resetting them',()=>{
 for(const bad of [{active:'yes'},{active:true},{retiredDay:22},{lastDay:0}]){
  const s=setup(),p=elder(s);Object.assign(p.retirement,bad);assert.equal(retirementValid(p.retirement,21),false);assert.throws(()=>restore(JSON.stringify(s)),/NPC人生/);
 }
});
test('death preserves retirement history without reentering the workforce',()=>{
 const s=setup(),p=elder(s);npcRetirementDay(s,p,65,21);p.life={...makeLife(),frailty:100,deathDay:21};p.coins=0;
 const snap=JSON.stringify(s);npcRetirementDay(s,p,65,22);assert.equal(JSON.stringify(s),snap);
});
test('elder descendants retire independently, release farm succession and preserve old practice',()=>{
 const s=fresh();s.day=25000;s.weather='晴';for(const n of Object.values(s.nodes))n.refreshDay=25001;
 const a={id:'chen-child-1',bornDay:332,hunger:0,learning:30,lastDay:24999,life:makeLife(),livelihood:makeChildLivelihood('chen-child-1',24999)};
 const b={id:'chen-child-2',bornDay:692,hunger:0,learning:30,lastDay:24999,life:makeLife(),livelihood:makeChildLivelihood('chen-child-2',24999)};
 s.npcWorld.lineage={lastDay:24999,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[a,b]};
 s.npcWorld.individuals.farmhand01.life={...makeLife(),frailty:100,deathDay:24000};
 Object.assign(a.livelihood,{coins:120,food:3,workDays:20,occupation:'farmer'});
 lineageDay(s,s.day);assert.equal(a.livelihood.retirement.active,true);assert.equal(a.livelihood.workDays,20);assert.equal(a.livelihood.coins,120);assert.equal(b.livelihood.occupation,'farmer');
 assert.equal(restore(JSON.stringify(s)).npcWorld.lineage.children[0].livelihood.retirement.active,true);
});
