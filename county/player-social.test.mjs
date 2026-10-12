import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,socialChoice} from './engine.js';
import {people} from './content.js';

const prepare=()=>{
 const s=fresh();const key=Object.keys(people)[0];
 s.place=people[key].place;s.minute=people[key].open;
 return {s,key};
};
test('old save gets optional social record',()=>{
 const {s}=prepare();delete s.socialActions;
 assert.deepEqual(restore(JSON.stringify(s)).socialActions,{});
});
test('requests require actual relationship and NPC funds',()=>{
 const {s,key}=prepare();const start=s.minute;
 assert.equal(socialChoice(s,key,'request'),false);
 assert.equal(s.minute,start);
 s.relations[key]=4;s.npcWorld.individuals[key].coins=0;
 assert.equal(socialChoice(s,key,'request'),false);
 assert.equal(s.coins,30);
});
test('one request transfers existing money and cannot repeat that day',()=>{
 const {s,key}=prepare();s.relations[key]=5;
 s.npcWorld.individuals[key].coins=10;
 assert.equal(socialChoice(s,key,'request'),true);
 assert.equal(s.coins,32);assert.equal(s.npcWorld.individuals[key].coins,8);
 assert.equal(s.relations[key],3);
 assert.equal(socialChoice(s,key,'request'),false);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('reconciliation consumes real food and has a daily cap',()=>{
 const {s,key}=prepare();const food=s.bag.food;
 const npc=s.npcWorld.individuals[key],oldFood=npc.food;
 assert.equal(socialChoice(s,key,'reconcile'),true);
 assert.equal(s.bag.food,food-1);assert.equal(npc.food,oldFood+1);
 assert.equal(s.relations[key],3);
 assert.equal(socialChoice(s,key,'reconcile'),false);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('corrupt social action record rejected',()=>{
 const {s,key}=prepare();s.socialActions[key]={request:999};
 assert.throws(()=>restore(JSON.stringify(s)),/交往记录无效/);
});

test('quarrel reduces ties, prevents repeat and blocks borrowing until restitution',()=>{
 const {s,key}=prepare();s.relations[key]=20;s.npcWorld.individuals[key].coins=10;
 assert.equal(socialChoice(s,key,'quarrel'),true);
 assert.equal(s.relations[key],12);
 assert.equal(socialChoice(s,key,'quarrel'),false);
 assert.equal(socialChoice(s,key,'request'),false);
 assert.equal(s.coins,30);
 assert.equal(socialChoice(s,key,'reconcile'),true);
 assert.equal(s.socialActions[key].quarrel,undefined);
 assert.equal(socialChoice(s,key,'request'),true);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
