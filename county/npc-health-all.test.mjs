import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,act,martialAction} from './engine.js';
import {advance} from './world.js';
import {tickNPCs} from './npc-simulation.js';
import {makeLife} from './npc-mortality.js';
import {clinicSummary} from './npc-clinic.js';
import {schoolCanTeach,schoolSummary} from './npc-school.js';
const setup=(day=28)=>{const s=fresh();s.day=day;s.weather='晴';s.npcWorld.lastDay=day-1;for(const p of Object.values(s.npcWorld.individuals)){p.lastDay=day-1;p.food=5;}for(const n of Object.values(s.nodes))n.refreshDay=day%2?day+2:day+1;return s;};
test('all twenty-three registered residents settle their health daily without new persons or disease fields',()=>{
 const s=setup();tickNPCs(s,s.day);const ps=Object.values(s.npcWorld.individuals);assert.equal(ps.length,25);assert.ok(ps.every(p=>p.life.healthDay===28));assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);const snap=JSON.stringify(s);tickNPCs(s,28);assert.equal(JSON.stringify(s),snap);
});
test('ordinary workers rest through treatment day then resume existing work, not unemployment',()=>{
 for(const id of ['dockhand01','smithapprentice','laborer']){const s=setup(),p=s.npcWorld.individuals[id];p.life.sickDays=4;const work=p.workDays,unemployed=p.unemployedDays,herbs=s.commerce.stock.market.herb;tickNPCs(s,28);assert.equal(p.workDays,work,id);assert.equal(p.unemployedDays,unemployed,id);assert.equal(p.life.sickDays,0,id);assert.equal(p.life.restDay,28,id);assert.equal(s.commerce.stock.market.herb,herbs-1,id);s.day=29;tickNPCs(s,29);assert.ok(p.workDays>work,id);}
});
test('undernutrition starts ordinary resident illness at midnight without player conversation',()=>{
 const s=setup(23);s.minute=1430;s.weather='雨';const p=s.npcWorld.individuals.laborer;p.coins=0;p.hunger=60;s.commerce.stock.market.herb=0;advance(s,10);assert.equal(s.day,24);assert.equal(p.life.healthDay,24);assert.equal(p.life.sickDays,3);assert.equal(p.workDays,0);
});
test('doctor own illness settles first, preventing same-day treatment before doctor rest is known',()=>{
 const s=setup(25);s.weather='雨';const d=s.npcWorld.individuals.doctor,p=s.npcWorld.individuals.merchant;p.life.sickDays=4;const herbs=s.commerce.stock.market.herb;tickNPCs(s,25);assert.equal(d.life.sickDays,3);assert.equal(d.life.restDay,25);assert.equal(p.life.sickDays,3);assert.equal(s.commerce.stock.market.herb,herbs);assert.match(clinicSummary(s)[0],/暂停诊治/);
});
test('ill original doctor refuses player treatment with no fee, time, healing or consumables',()=>{
 for(const block of ['sick','rest','injury']){const s=setup(),d=s.npcWorld.individuals.doctor;s.place='village';s.minute=480;s.hp=50;if(block==='sick')d.life.sickDays=2;if(block==='rest'){d.life.restDay=28;d.life.healthDay=28;}if(block==='injury')d.injuryDays=2;const before=[s.coins,s.minute,s.hp,s.commerce.stock.market.herb];assert.equal(act(s,'doctor'),false,block);assert.deepEqual([s.coins,s.minute,s.hp,s.commerce.stock.market.herb],before);assert.match(s.result.join(' '),/休养/);}
});
test('school and village teachers pause player lessons through recovery day',()=>{
 for(const [teacher,place,art] of [['master','school','qinghe_fist'],['farmer','village','staff']]){const s=setup(),p=s.npcWorld.individuals[teacher];p.life.restDay=28;p.life.healthDay=28;s.place=place;s.minute=480;const before=[s.coins,s.minute,s.energy];assert.equal(martialAction(s,'learn',art),false);assert.deepEqual([s.coins,s.minute,s.energy],before);assert.equal(s.martial.known[art],undefined);assert.match(s.result.join(' '),/休养/);if(teacher==='master'){assert.equal(schoolCanTeach(s,art),false);assert.match(schoolSummary(s),/暂停授课/);}}
});
