import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,adventureAction} from './engine.js';
import {advance} from './world.js';
import {MARKET_SURPLUS,MARKET_LIMIT} from './commerce.js';
import {bondInitiative,countyLifeBlocker,countyLifeOptions,merchantDemandBlocker} from './county-life.js';
const run=(s,a,rng=()=>0)=>{assert.ok(adventureAction(s,a,rng),s.result.join(';'));assert.deepEqual(restore(JSON.stringify(s)),s);};
const refusal=(s,a)=>{const before=structuredClone(s);assert.equal(adventureAction(s,a,()=>{throw Error('refused action rolled');}),false);const after=structuredClone(s);delete before.result;delete after.result;assert.deepEqual(after,before);};
const client=()=>{const s=fresh();s.place='market';run(s,'quest:parcel');s.place='bamboo';run(s,'questStep:search');s.place='market';run(s,'deliver');return s;};
const active=()=>{const s=client();run(s,'bond:merchant:promise');s.bag.vegetable=1;return s;};
const promise=s=>s.adventures.life.bonds.merchant.promise;
test('failed vegetable work consumes the offered produce but never invents market goods or wages',()=>{
 const s=active();s.commerce.stock.market.vegetable=23;const coins=s.coins,stock=s.commerce.stock.market.vegetable,energy=s.energy,npcEnergy=s.npcWorld.individuals.merchant.energy,npcCoins=s.npcWorld.individuals.merchant.coins;
 run(s,'bond:merchant:work',()=>1);assert.equal(s.commerce.stock.market.vegetable,stock);assert.equal(s.bag.vegetable,0);assert.equal(s.coins,coins);assert.equal(s.npcWorld.individuals.merchant.coins,npcCoins);assert.equal(s.energy,energy-10);assert.equal(s.npcWorld.individuals.merchant.energy,npcEnergy-8);assert.equal(promise(s).status,'failed');assert.equal(s.adventures.life.bonds.merchant.trust,0);assert.equal(s.skills.trade,1);assert.match(s.result.join(';'),/不进入市场库存/);refusal(s,'bond:merchant:work');refusal(s,'bond:merchant:claim');
});
test('market surplus pauses new requests with a visible causal reason; quotes and task previews are read-only',()=>{
 const s=client();s.commerce.stock.market.vegetable=MARKET_SURPLUS;const before=structuredClone(s);assert.match(merchantDemandBlocker(s),/先卖现货/);assert.match(countyLifeBlocker(s,'bond:merchant:promise'),/已有订单和工钱保留/);assert.match(bondInitiative(s,'merchant').blocker,/24份/);assert.match(bondInitiative(s,'merchant').detail,/先把现货卖掉/);assert.ok(countyLifeOptions(s).find(o=>o.id==='bond:merchant:promise').blocker);assert.deepEqual(s,before);refusal(s,'bond:merchant:promise');s.commerce.stock.market.vegetable--;run(s,'bond:merchant:promise');assert.equal(promise(s).status,'active');
});
test('residents independently consume surplus and restore demand without any player sale or extra event',()=>{
 const s=client();s.commerce.stock.market.vegetable=MARKET_SURPLUS;refusal(s,'bond:merchant:promise');const bag=structuredClone(s.bag);advance(s,1440);s.minute=480;assert.equal(s.commerce.stock.market.vegetable,21);assert.deepEqual(s.bag,bag);assert.equal(merchantDemandBlocker(s),null);run(s,'bond:merchant:promise');
});
test('accepted orders remain valid as surplus develops; successful work adds exactly one unit and pays the promised four',()=>{
 const s=active();s.commerce.stock.market.vegetable=MARKET_LIMIT-1;assert.ok(merchantDemandBlocker(s));run(s,'bond:merchant:work');assert.equal(s.commerce.stock.market.vegetable,MARKET_LIMIT);assert.equal(s.bag.vegetable,0);assert.equal(promise(s).status,'ready');const coins=s.coins,p=s.npcWorld.individuals.merchant;p.coins=0;refusal(s,'bond:merchant:claim');advance(s,4*1440);s.minute=480;assert.equal(promise(s).status,'ready');p.coins=4;run(s,'bond:merchant:claim');assert.equal(s.coins,coins+4);assert.equal(p.coins,0);assert.equal(promise(s).status,'done');refusal(s,'bond:merchant:claim');
});
test('a completely full shelf refuses work atomically and gives the same reason in the NPC request',()=>{
 const s=active();s.commerce.stock.market.vegetable=MARKET_LIMIT;assert.match(bondInitiative(s,'merchant').blocker,/容量已满/);refusal(s,'bond:merchant:work');assert.equal(promise(s).status,'active');advance(s,1440);s.minute=480;run(s,'bond:merchant:work');assert.equal(promise(s).status,'ready');
});
test('legacy failed records and pre-existing inventory survive import without retroactive subtraction or retry rewards',()=>{
 let s=active();run(s,'bond:merchant:work',()=>1);s.commerce.stock.market.vegetable=10;const before=structuredClone(s);s=restore(JSON.stringify(s));assert.deepEqual(s,before);refusal(s,'bond:merchant:work');refusal(s,'bond:merchant:claim');assert.equal(s.commerce.stock.market.vegetable,10);
});
