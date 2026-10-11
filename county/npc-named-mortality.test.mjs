import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,act,martialAction,talk} from './engine.js';
import {npcPlace} from './world.js';
import {parentMortality,settleEstates,mortalitySummary} from './npc-mortality.js';
import {tickNPCs,npcAt} from './npc-simulation.js';
const setup=()=>{const s=fresh();s.day=30;for(const n of Object.values(s.nodes))n.refreshDay=31;return s;};
const aged=(s,id)=>{const p=s.npcWorld.individuals[id];p.age=75;p.life.frailty=99;return p;};
const cash=s=>Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0)+Object.values(s.npcWorld.households).reduce((n,h)=>n+h.coins,0);
test('named teacher ages and dies through the same existing gradual frailty rule',()=>{
 const s=setup(),p=aged(s,'master'),coins=p.coins,food=p.food;assert.equal(parentMortality(s,30).length,1);assert.equal(p.life.deathDay,30);assert.equal(p.life.frailty,100);assert.equal(p.coins,coins);assert.equal(p.food,food);assert.equal(npcPlace(s,'master'),null);assert.ok(!npcAt(s,'school').some(x=>x.id==='master'));
 const snap=JSON.stringify(s);assert.deepEqual(parentMortality(s,30),[]);assert.equal(JSON.stringify(s),snap);assert.deepEqual(restore(snap).npcWorld,s.npcWorld);
});
test('nonfamily ordinary NPC starvation is consecutive and stops all later labor',()=>{
 const s=setup(),p=s.npcWorld.individuals.hunter;p.life.starvationDays=29;p.hunger=100;p.food=0;const coins=p.coins,work=p.workDays;
 tickNPCs(s,30);assert.equal(p.life.deathDay,30);assert.equal(p.life.starvationDays,30);assert.equal(p.coins,coins);assert.equal(p.workDays,work);assert.equal(p.lastDay,30);
});
test('named household heirs receive only existing money and food, with capacity overflow retained',()=>{
 const s=setup(),smith=aged(s,'smith'),heir=s.npcWorld.individuals.smithapprentice;smith.coins=50;smith.food=4;smith.cargo=2;heir.coins=999990;heir.food=99;const before=cash(s),market=JSON.stringify(s.commerce);
 parentMortality(s,30);settleEstates(s);assert.equal(heir.coins,1000000);assert.equal(heir.food,100);assert.equal(smith.coins,40);assert.equal(smith.food,3);assert.equal(smith.cargo,2);assert.equal(cash(s),before);assert.equal(JSON.stringify(s.commerce),market);
 const snap=JSON.stringify(s);settleEstates(s);assert.equal(JSON.stringify(s),snap);assert.deepEqual(restore(snap).npcWorld,s.npcWorld);
});
test('no heirs or deceased household members leave the estate intact and shared stores separate',()=>{
 const s=setup(),p=aged(s,'merchant'),q=aged(s,'shopassistant');s.npcWorld.households.market.coins=60;s.npcWorld.households.market.food=7;
 parentMortality(s,30);const a=p.coins,b=p.food,shared=JSON.stringify(s.npcWorld.households.market);settleEstates(s);assert.equal(p.coins,a);assert.equal(p.food,b);assert.equal(JSON.stringify(s.npcWorld.households.market),shared);assert.equal(q.life.deathDay,30);
});
test('dead service providers cannot teach, converse or treat the player; learned practice continues',()=>{
 const s=setup();for(const id of ['master','farmer','doctor'])aged(s,id);parentMortality(s,30);
 s.place='school';s.martial.known.qinghe_fist=true;s.martial.practice.qinghe_fist=0;s.martial.insight.qinghe_fist=0;const coins=s.coins,day=s.day,minute=s.minute;
 assert.equal(martialAction(s,'learn','spring_kick'),false);assert.equal(talk(s,'master'),false);assert.equal(s.coins,coins);assert.equal(s.day,day);assert.equal(s.minute,minute);assert.equal(martialAction(s,'train','qinghe_fist'),true);
 s.place='village';assert.equal(martialAction(s,'learn','staff'),false);s.hp=50;assert.equal(act(s,'doctor'),false);assert.equal(s.hp,50);assert.equal(s.coins,coins);
});
test('real teacher death closes discipleship during the independent daily tick',()=>{
 const s=setup();aged(s,'master');const p=s.npcWorld.individuals.dockhand01;p.study.learnedDay=7;p.study.practice=120;p.study.teacherTrust=15;p.study.lastDay=29;p.study.mentor.joinedDay=21;
 tickNPCs(s,30);assert.equal(p.study.mentor.endedDay,30);assert.equal(p.study.mentor.joinedDay,21);assert.equal(p.study.mentor.aidCount,0);assert.match(mortalitySummary(s).join(' '),/周师傅.*第30日去世/);
});
test('legacy age and hunger do not retroactively invent frailty, starvation or death',()=>{
 const s=setup(),p=s.npcWorld.individuals.master;p.age=100;p.hunger=100;const x=restore(JSON.stringify(s));assert.equal(x.npcWorld.individuals.master.life.frailty,0);assert.equal(x.npcWorld.individuals.master.life.starvationDays,0);parentMortality(x,30);assert.equal(x.npcWorld.individuals.master.life.deathDay,0);assert.equal(x.npcWorld.individuals.master.life.starvationDays,1);
});
