import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {makeLife} from './npc-mortality.js';
import {makeChildLivelihood,lineageDay} from './npc-lineage.js';
import {npcRetirementDay} from './npc-economy.js';
import {tickNPCs} from './npc-simulation.js';
const setup=()=>{const s=fresh();s.day=7300;s.weather='晴';for(const n of Object.values(s.nodes))n.refreshDay=7301;s.npcWorld.lastDay=7299;for(const p of Object.values(s.npcWorld.individuals))p.lastDay=7299;
 const children=[332,692].map((bornDay,i)=>({id:'chen-child-'+(i+1),bornDay,hunger:0,learning:20,lastDay:7299,life:makeLife(),livelihood:makeChildLivelihood('chen-child-'+(i+1),7299)}));s.npcWorld.lineage={lastDay:7299,courtshipDay:2,marriedDay:32,conceivedDay:0,children};for(const c of children){c.livelihood.food=5;c.livelihood.coins=20;}const father=s.npcWorld.individuals.farmhand01;Object.assign(father,{age:65,coins:200,food:5,workDays:40});father.careerSkills.forage=100;return {s,father,children};};
test('living father retirement releases exactly one farm job without transferring assets or experience',()=>{
 const {s,father,children:[a,b]}=setup();npcRetirementDay(s,father,65,7300);const before=[father.coins,father.food,father.cargo,father.careerSkills.forage];lineageDay(s,7300);assert.equal(a.livelihood.occupation,'farmer');assert.equal(b.livelihood.occupation,'original');assert.equal(a.livelihood.careerSkills.forage,0);assert.equal(a.livelihood.coins,20);assert.deepEqual([father.coins,father.food,father.cargo,father.careerSkills.forage],before);assert.equal(father.life.deathDay,0);assert.match(a.livelihood.history.join(' '),/父亲退养后空出的/);assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);const snap=JSON.stringify(s);lineageDay(s,7300);assert.equal(JSON.stringify(s),snap);
});
test('daily autonomous retirement and child succession occur without player contact',()=>{
 const {s,father,children:[a,b]}=setup();tickNPCs(s,7300);assert.equal(father.retirement.active,true);assert.equal(a.livelihood.occupation,'farmer');assert.notEqual(b.livelihood.occupation,'farmer');assert.equal(father.workDays,40);assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);
});
test('working father and existing living successor retain their occupied farm position',()=>{
 const {s,children:[a,b]}=setup();lineageDay(s,7300);assert.notEqual(a.livelihood.occupation,'farmer');assert.notEqual(b.livelihood.occupation,'farmer');const x=setup();npcRetirementDay(x.s,x.father,65,7300);x.children[1].livelihood.occupation='farmer';lineageDay(x.s,7300);assert.notEqual(x.children[0].livelihood.occupation,'farmer');assert.equal(x.children[1].livelihood.occupation,'farmer');
});
test('children need adulthood, learning, health and presence to take the vacancy',()=>{
 for(const block of ['minor','learning','ill','injury','hunger','away','retired']){const {s,father,children:[a,b]}=setup();npcRetirementDay(s,father,65,7300);b.learning=0;if(block==='minor')a.bornDay=4000;if(block==='learning')a.learning=19;if(block==='ill'){a.life.sickDays=4;a.livelihood.coins=0;s.commerce.stock.market.herb=0;}if(block==='injury')a.livelihood.injuryDays=2;if(block==='hunger')a.hunger=80;if(block==='away')s.npcWorld.journeys.records[a.id]={departedDay:7299,returnedDay:0,completed:0,home:'market'};if(block==='retired')a.livelihood.retirement={active:true,retiredDay:7200,lastDay:7299},a.livelihood.coins=200;lineageDay(s,7300);assert.notEqual(a.livelihood.occupation,'farmer',block);}
});
test('unemployed carrier may take the farm vacancy; stable wage work is preserved',()=>{
 for(const [occupation,unemployed,takes] of [['carrier',3,true],['carrier',0,false],['shopworker',3,false]]){const {s,father,children:[a,b]}=setup();npcRetirementDay(s,father,65,7300);b.learning=0;Object.assign(a.livelihood,{occupation,unemployedDays:unemployed});lineageDay(s,7300);assert.equal(a.livelihood.occupation==='farmer',takes,occupation+unemployed);}
});
test('returning father seeks other work and cannot displace child; old archives preserve actual jobs',()=>{
 const {s,father,children:[a]}=setup();npcRetirementDay(s,father,65,7300);lineageDay(s,7300);s.day=7301;for(const n of Object.values(s.nodes))n.refreshDay=7303;father.coins=29;npcRetirementDay(s,father,65,7301);assert.equal(father.occupation,'carrier');assert.equal(father.retirement.active,false);assert.equal(a.livelihood.occupation,'farmer');assert.equal(restore(JSON.stringify(s)).npcWorld.lineage.children[0].livelihood.occupation,'farmer');const old=setup();const x=restore(JSON.stringify(old.s));assert.ok(x.npcWorld.lineage.children.every(c=>c.livelihood.occupation==='original'));
});
