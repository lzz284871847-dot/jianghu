import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {npcSparringDay} from './npc-sparring.js';
import {socialSummary} from './npc-social.js';
const setup=(day=28,ids=['carter','dockhand01'])=>{const s=fresh();s.day=day;for(const n of Object.values(s.nodes))n.refreshDay=day%2?day+2:day+1;for(const id of ids){const p=s.npcWorld.individuals[id];p.study.learnedDay=7;p.study.practice=2400;p.study.lastDay=day;p.energy=100;}return s;};
const rival=s=>s.npcWorld.social.bonds['dockhand01:carter'];
test('peaceful sparring improves the actual bond without creating new relationships or resources',()=>{
 let outcome;
 for(let day=28;day<=280&&!outcome;day+=14){const s=setup(day),before=JSON.stringify({commerce:s.commerce,cash:Object.values(s.npcWorld.individuals).map(p=>p.coins)});npcSparringDay(s,day);if(rival(s).trust===36)outcome={s,before};}
 assert.ok(outcome);const {s,before}=outcome;assert.equal(rival(s).resentment,19);assert.match(rival(s).history[0],/平安收手/);assert.equal(Object.keys(s.npcWorld.social.bonds).length,5);
 assert.equal(JSON.stringify({commerce:s.commerce,cash:Object.values(s.npcWorld.individuals).map(p=>p.coins)}),before);assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);
 const snap=JSON.stringify(s);npcSparringDay(s,s.day);assert.equal(JSON.stringify(s),snap);
});
test('real sparring injury reduces trust and increases rival resentment with bounded history',()=>{
 let s;
 for(let day=28;day<=280&&!s;day+=14){const x=setup(day);npcSparringDay(x,day);if(rival(x).trust===33)s=x;}
 assert.ok(s);assert.equal(rival(s).resentment,23);assert.ok(['carter','dockhand01'].some(id=>s.npcWorld.individuals[id].injuryDays===2));assert.match(rival(s).history[0],/轻伤/);assert.equal(rival(s).lastEventDay,s.day);
});
test('low trust or deep resentment prevents pairing with that acquaintance and charges nothing',()=>{
 for(const [trust,resentment] of [[19,0],[100,60],[0,100]]){const s=setup();rival(s).trust=trust;rival(s).resentment=resentment;const old=JSON.stringify(s);assert.deepEqual(npcSparringDay(s,28),[]);assert.equal(JSON.stringify(s),old);}
 const s=setup();rival(s).trust=20;rival(s).resentment=59;assert.equal(npcSparringDay(s,28).length,1);
});
test('eligible friends pair before an unrelated pupil regardless of sorting order',()=>{
 const s=setup(28,['dockhand01','farmhand01','shopassistant']);const notes=npcSparringDay(s,28);assert.equal(notes.length,1);assert.match(notes[0],/陈二与小莲/);assert.equal(s.npcWorld.individuals.dockhand01.study.lastSparDay,0);assert.equal(s.npcWorld.individuals.dockhand01.energy,100);
 assert.equal(s.npcWorld.social.bonds['farmhand01:shopassistant'].lastEventDay,28);
});
test('relationship display uses saved values and names; bounds and history caps remain valid',()=>{
 const s=setup();rival(s).trust=100;rival(s).resentment=0;rival(s).history=Array(6).fill('旧经历');npcSparringDay(s,28);assert.ok(rival(s).trust<=100);assert.ok(rival(s).resentment>=0);assert.equal(rival(s).history.length,6);
 const lines=socialSummary(s);assert.equal(lines.length,5);assert.match(lines[1],new RegExp('信任'+rival(s).trust+'/100'));assert.match(lines[1],/齐三/);assert.match(lines[1],/最近：/);assert.deepEqual(socialSummary(restore(JSON.stringify(s))),lines);
});
