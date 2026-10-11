import {advance} from './world.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,act} from './engine.js';
import {makeLife} from './npc-mortality.js';
import {makeChildLivelihood} from './npc-lineage.js';
import {npcHealthDay} from './npc-health.js';
import {clinicDoctor,clinicSummary} from './npc-clinic.js';
import {marketPrice} from './commerce.js';
import {readFileSync} from 'node:fs';
const setup=(day=28)=>{const s=fresh();s.day=day;for(const n of Object.values(s.nodes))n.refreshDay=day%2?day+2:day+1;const p=s.npcWorld.individuals.herbalist;p.coins=1000;p.workDays=40;p.food=3;p.energy=100;return {s,p,t:s.npcWorld.individuals.doctor};};
const cash=s=>Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0)+s.npcWorld.lineage.children.reduce((n,c)=>n+c.livelihood.coins,0)+Object.values(s.commerce.budget).reduce((n,x)=>n+x,0);
test('old saves receive no retrospective medical expertise and malformed learners are rejected',()=>{
 const {s}=setup();delete s.npcWorld.clinic;const x=restore(JSON.stringify(s));assert.deepEqual(x.npcWorld.clinic.learners,{});assert.equal(x.npcWorld.clinic.holder,'doctor');assert.equal(x.npcWorld.clinic.appointedDay,0);
 for(const learners of [{unknown:{practice:20,lastDay:21}},{herbalist:{practice:501,lastDay:21}},{herbalist:{practice:20,lastDay:29}}]){const y=setup();y.s.npcWorld.clinic.learners=learners;assert.throws(()=>restore(JSON.stringify(y.s)),/NPC人生/);}
 assert.match(readFileSync(new URL('./sw.js',import.meta.url),'utf8'),/'npc-clinic.js','npc-residents.js'/);
});
