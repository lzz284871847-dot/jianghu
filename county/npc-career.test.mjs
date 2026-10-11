import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {npcCareer,npcWork,npcTransport,npcCareerDay} from './npc-economy.js';

test('career thresholds use earned skill, never unrelated work or wealth',()=>{
 const p=fresh().npcWorld.individuals.shopassistant;
 p.workDays=100;p.coins=999;
 for(const [skill,rank] of [[0,0],[39,0],[40,1],[99,1],[100,2],[500,2]]){
  p.careerSkills.trade=skill;assert.equal(npcCareer(p).rank,rank);
 }
 p.occupation='carrier';assert.equal(npcCareer(p).rank,0);
 p.occupation='original';assert.equal(npcCareer(p).rank,2);
});
test('skilled shop and carriage pay comes entirely from actual employer funds',()=>{
 for(const id of ['shopassistant','dockhand01']){
  const s=fresh(),p=s.npcWorld.individuals[id];
  p.careerSkills.trade=100;p.careerSkills.carry=100;
  const before=p.coins+s.commerce.budget.market,coins=p.coins;
  assert.equal((id==='shopassistant'?npcWork:npcTransport)(s,p,2),true);
  assert.equal(p.coins-coins,id==='shopassistant'?6:5);
  assert.equal(p.coins+s.commerce.budget.market,before);
 }
});
test('unfunded promotion wage cannot consume protected shop reserves',()=>{
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;
 p.careerSkills.trade=100;s.commerce.budget.market=30;
 const snap=JSON.stringify([p,s.commerce]);
 assert.equal(npcWork(s,p,2),false);
 assert.equal(JSON.stringify([p,s.commerce]),snap);
});
test('seven days of employer insolvency releases a shop vacancy, preserving skills and savings',()=>{
 const s=fresh(),p=s.npcWorld.individuals.farmhand01;
 p.occupation='shopworker';p.careerSkills.trade=45;p.coins=120;
 s.commerce.budget.market=0;
 for(let day=2;day<=7;day++)npcCareerDay(s,p,day);
 assert.equal(p.occupation,'shopworker');
 npcCareerDay(s,p,8);
 assert.equal(p.occupation,'original');assert.equal(p.coins,120);assert.equal(p.careerSkills.trade,45);
 assert.ok(p.history.some(x=>x.includes('离职另寻生计')));
});
test('injury does not dismiss an employee of a solvent shop',()=>{
 const s=fresh(),p=s.npcWorld.individuals.farmhand01;
 p.occupation='shopworker';p.injuryDays=10;p.unemployedDays=10;
 npcCareerDay(s,p,2);assert.equal(p.occupation,'shopworker');
});
test('world advancement autonomously promotes and restore neither duplicates wages nor invents savings',()=>{
 const s=fresh(),p=s.npcWorld.individuals.shopassistant;
 p.careerSkills.trade=39;
 advance(s,1440-s.minute);
 assert.equal(npcCareer(p).rank,1);assert.ok(p.history.some(x=>x.includes('晋升')));
 const before=JSON.stringify(s.npcWorld),budget=s.commerce.budget.market;
 const restored=restore(JSON.stringify(s));
 assert.equal(JSON.stringify(restored.npcWorld),before);assert.equal(restored.commerce.budget.market,budget);
 advance(restored,1440);assert.equal(restored.npcWorld.individuals.shopassistant.coins,p.coins+5);
});
