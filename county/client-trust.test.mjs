import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,adventureAction} from './engine.js';
import {advance} from './world.js';
import {present} from './adventures.js';
import {bondInitiative,countyLifeBlocker,sharedWork} from './county-life.js';
const at=(s,place)=>{s.place=place;s.minute=480;};
const run=(s,a,rng=()=>0)=>{assert.ok(adventureAction(s,a,rng),s.result.join(';'));assert.deepEqual(restore(JSON.stringify(s)),s);};
const bond=(s,id)=>s.adventures.life.bonds[id];
const refuse=(s,a)=>{const before=structuredClone(s);assert.equal(adventureAction(s,a,()=>{throw Error('refusal must not roll');}),false);delete before.result;const after=structuredClone(s);delete after.result;assert.deepEqual(after,before);};
test('all four clients give initial acquaintance once; later meetings neither farm trust nor displace actual work',()=>{
 for(const [id,place] of [['boatman','dock'],['merchant','market'],['smith','workshop'],['doctor','village']]){
  const s=fresh();at(s,place);s.relations[id]=3;run(s,'bond:'+id+':meet');assert.equal(bond(s,id).trust,1);const history=structuredClone(bond(s,id).history);
  let meetings=0;while(meetings<7){assert.ok(s.day<20);advance(s,1440);at(s,place);if(!present(s,id,15))continue;run(s,'bond:'+id+':meet');meetings++;assert.equal(bond(s,id).trust,1);assert.deepEqual(bond(s,id).history,history);}
  if(['boatman','merchant'].includes(id)){assert.equal(sharedWork(s,id),false);refuse(s,'bond:'+id+':promise');assert.equal(bondInitiative(s,id),null);}
 }
});
test('returned parcel earns merchant trust only at actual paid delivery, opening real vegetable work without meetings',()=>{
 const s=fresh();at(s,'market');run(s,'quest:parcel');at(s,'bamboo');run(s,'questStep:search');assert.equal(bond(s,'merchant').trust,0);at(s,'market');const p=s.npcWorld.individuals.merchant;p.coins=0;refuse(s,'deliver');assert.equal(bond(s,'merchant').trust,0);p.coins=30;run(s,'deliver');assert.equal(bond(s,'merchant').trust,1);assert.equal(bond(s,'merchant').meetDay,0);refuse(s,'deliver');refuse(s,'quest:parcel');assert.match(bondInitiative(s,'merchant').detail,/菜货/);
 run(s,'bond:merchant:promise');s.bag.vegetable=1;const stock=s.commerce.stock.market.vegetable;run(s,'bond:merchant:work');assert.equal(s.bag.vegetable,0);assert.equal(s.commerce.stock.market.vegetable,stock+1);assert.equal(bond(s,'merchant').trust,2);const coins=s.coins;run(s,'bond:merchant:claim');assert.equal(s.coins,coins+4);refuse(s,'bond:merchant:claim');
});
test('failed searches and merely explaining a failure never invent a successful commercial cooperation',()=>{
 const s=fresh();at(s,'market');run(s,'quest:parcel');at(s,'bamboo');run(s,'questStep:search',()=>1);at(s,'market');run(s,'followup:merchant:explain');assert.equal(bond(s,'merchant').trust,0);assert.equal(sharedWork(s,'merchant'),false);refuse(s,'bond:merchant:promise');
});
test('supply delivery credits the actual merchant contact after recipient payment, once and without phantom inventory',()=>{
 const s=fresh();advance(s,1440);at(s,'market');const food=s.bag.food;run(s,'thread:escort:accept');assert.equal(s.bag.food,food-1);assert.equal(bond(s,'merchant').trust,0);at(s,'ferry');run(s,'thread:escort:safe');at(s,'liuxi');const p=s.npcWorld.individuals.stallholder;p.coins=0;refuse(s,'thread:escort:claim');assert.equal(bond(s,'merchant').trust,0);p.coins=30;run(s,'thread:escort:claim');assert.equal(bond(s,'merchant').trust,1);refuse(s,'thread:escort:claim');at(s,'market');run(s,'bond:merchant:promise');assert.equal(bond(s,'merchant').meetDay,0);
});
test('real ferry repair earns a single shared experience and immediately opens existing dock work',()=>{
 const s=fresh();advance(s,1440);at(s,'dock');s.bag.wood=2;run(s,'event:ferry:supply');assert.equal(bond(s,'boatman').trust,1);assert.equal(bond(s,'boatman').history[0].kind,'event');refuse(s,'event:ferry:supply');run(s,'bond:boatman:promise');assert.equal(bond(s,'boatman').meetDay,0);
});
test('legacy trust and existing orders survive restore; completed parcel records unlock work without retroactive trust awards',()=>{
 for(const [id,place] of [['boatman','dock'],['merchant','market']]){let s=fresh();at(s,place);Object.assign(bond(s,id),{trust:4,meetDay:1,history:[{day:1,kind:'meeting',success:true}]});s=restore(JSON.stringify(s));run(s,'bond:'+id+':promise');assert.equal(bond(s,id).trust,4);s=restore(JSON.stringify(s));assert.equal(bond(s,id).promise.status,'active');assert.equal(bond(s,id).trust,4);}
 let s=fresh();at(s,'market');run(s,'quest:parcel');at(s,'bamboo');run(s,'questStep:search');at(s,'market');run(s,'deliver');Object.assign(bond(s,'merchant'),{trust:0,history:[]});s=restore(JSON.stringify(s));assert.equal(countyLifeBlocker(s,'bond:merchant:promise'),null);run(s,'bond:merchant:promise');assert.equal(bond(s,'merchant').trust,0);
});
