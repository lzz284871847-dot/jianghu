import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,adventureAction} from './engine.js';
import {present} from './adventures.js';
import {merchantWorkPlan} from './merchant-work.js';
import {bondInitiative,countyLifeOptions} from './county-life.js';
import {ordinaryRoute} from '../tests/qinghe-growth-route-helper.js';
const run=(s,a,rng=()=>0)=>{assert.ok(adventureAction(s,a,rng),s.result.join(';'));assert.deepEqual(restore(JSON.stringify(s)),s);};
const ready=()=>{const s=fresh();s.place='market';run(s,'quest:parcel');s.place='bamboo';run(s,'questStep:search');s.place='market';run(s,'deliver');run(s,'bond:merchant:promise');s.bag.vegetable=1;return s;};
const refuse=(s,a)=>{const before=structuredClone(s);assert.equal(adventureAction(s,a,()=>{throw Error('refusal rolled');}),false);const after=structuredClone(s);delete after.result;delete before.result;assert.deepEqual(after,before);};
test('the same real order trades extra time and energy for reduced failure risk, with identical input and payment',()=>{
 for(const action of ['work','work_careful']){const s=ready(),plan=merchantWorkPlan(s,action),minute=s.minute,energy=s.energy,coins=s.coins,stock=s.commerce.stock.market.vegetable;run(s,'bond:merchant:'+action,()=>.8);assert.equal(s.minute,minute+plan.minutes);assert.equal(s.energy,energy-plan.energy);assert.equal(s.bag.vegetable,0);assert.equal(s.coins,coins);assert.equal(s.commerce.stock.market.vegetable,stock+(action==='work_careful'?1:0));assert.equal(s.adventures.life.bonds.merchant.promise.status,action==='work_careful'?'ready':'failed');if(action==='work_careful'){run(s,'bond:merchant:claim');assert.equal(s.coins,coins+4);}else refuse(s,'bond:merchant:claim');for(const other of ['work','work_careful'])refuse(s,'bond:merchant:'+other);}
});
test('both methods can fail: careful work still loses the actual produce, time, energy and trust with no manufactured stock',()=>{
 const s=ready(),stock=s.commerce.stock.market.vegetable,minute=s.minute,energy=s.energy;run(s,'bond:merchant:work_careful',()=>.99);assert.equal(s.minute,minute+90);assert.equal(s.energy,energy-14);assert.equal(s.commerce.stock.market.vegetable,stock);assert.equal(s.bag.vegetable,0);assert.equal(s.adventures.life.bonds.merchant.trust,0);assert.equal(s.skills.trade,1);refuse(s,'bond:merchant:work');refuse(s,'bond:merchant:work_careful');
});
test('actual trading skill and earned trust improve the exact same plan used by execution, while experience remains unchanged',()=>{
 const s=ready();for(const action of ['work','work_careful']){const novice=merchantWorkPlan(s,action).chance;s.skills.trade=6;assert.ok(Math.abs(merchantWorkPlan(s,action).chance-novice-.05)<1e-9);s.skills.trade=0;}
 for(const skilled of [false,true]){const s=ready();if(skilled)s.skills.trade=6;run(s,'bond:merchant:work_careful',()=>.88);assert.equal(s.adventures.life.bonds.merchant.promise.status,skilled?'ready':'failed');assert.equal(s.skills.trade,skilled?8:1);}
 s.skills.trade=2100;s.adventures.life.bonds.merchant.trust=10;assert.equal(merchantWorkPlan(s,'work_careful').chance,.95);assert.match(merchantWorkPlan(s).preview,/成功\+0 \/ 失败\+0/);
});
test('opening hours and energy make normal work usable when there is not enough time or strength for careful sorting',()=>{
 for(const change of [s=>s.minute=1140,s=>s.energy=10]){const s=ready();change(s);refuse(s,'bond:merchant:work_careful');assert.equal(bondInitiative(s,'merchant').blocker,null);run(s,'bond:merchant:work');assert.equal(s.adventures.life.bonds.merchant.promise.status,'ready');}
 const s=ready();s.commerce.stock.market.vegetable=30;for(const action of ['work','work_careful'])refuse(s,'bond:merchant:'+action);refuse(s,'bond:merchant:work_unknown');
});
test('method previews stay read-only, expose complete risk and retain the original normal-work action for restored orders',()=>{
 const s=ready(),before=structuredClone(s),options=countyLifeOptions(s).filter(o=>o.id.startsWith('bond:merchant:work'));assert.equal(options.length,2);assert.ok(options.every(o=>o.details.includes('自己的蔬菜1份')&&o.details.includes('不重试')&&o.details.includes('原定4文')));assert.ok(bondInitiative(s,'merchant').actions.includes('bond:merchant:work_careful'));merchantWorkPlan(s);merchantWorkPlan(s,'work_careful');assert.deepEqual(s,before);assert.equal(merchantWorkPlan(s,'work_unknown'),null);const restored=restore(JSON.stringify(s));run(restored,'bond:merchant:work_careful');assert.equal(restored.adventures.life.bonds.merchant.promise.status,'ready');
});
test('an ordinary character harvests actual produce, completes a real delivery and chooses careful work without lessons or injected trust',t=>{
 const h=ordinaryRoute(),{s}=h;for(let i=0;!s.bag.vegetable;i++){assert.ok(i<12);h.walk('fields');h.rest();h.hours(120);if(!s.nodes['fields:vegetables'].left){h.nextDay();continue;}h.plain('vegetables');}assert.ok(s.bag.vegetable>0);h.nextDay();h.walk('market');h.hours();h.action('thread:escort:accept');h.walk('ferry');h.action('thread:escort:safe');h.walk('liuxi');h.hours();h.action('thread:escort:claim');
 for(let i=0;;i++){assert.ok(i<8);h.walk('market');h.hours(105);if(present(s,'merchant',105))break;h.nextDay();}h.action('bond:merchant:promise');const coins=s.coins;h.action('bond:merchant:work_careful');if(s.adventures.life.bonds.merchant.promise.status==='ready'){h.action('bond:merchant:claim');assert.equal(s.coins,coins+4);}else assert.equal(s.coins,coins);assert.equal(s.adventures.life.bonds.merchant.meetDay,0);t.diagnostic(JSON.stringify({...h.result(),trade:s.skills.trade,outcome:s.adventures.life.bonds.merchant.promise.status}));
});
