import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,restore,adventureAction} from '../county/engine.js';
import {dungeonPlan,dungeonOptions,dungeonBlocker} from '../county/dungeon.js';
import {woodRoute} from './qinghe-growth-route-helper.js';
const run=(s,k,rng=()=>.5)=>assert.ok(adventureAction(s,'dungeon:'+k,rng),s.result.join(';'));
const round=s=>assert.deepEqual(restore(JSON.stringify(s)),s);
function prepared(){const s=fresh();s.place='mine';s.skills.woodwork=24;s.bag.wood=2;s.bag.cord=2;run(s,'enter');return s;}
function denied(s,k){const b=structuredClone(s);assert.equal(adventureAction(s,'dungeon:'+k,()=>{throw Error('blocked action cannot roll');}),false);s.result=b.result;assert.deepEqual(s,b);}
test('old-timber approach requires actual woodworking and a successful finite inspection before spending',()=>{
 const s=prepared();assert.match(dungeonBlocker(s,'lash'),/先实际察看/);denied(s,'lash');run(s,'inspect',()=>.99);assert.equal(s.dungeon.surveyed,false);assert.match(dungeonBlocker(s,'lash'),/未辨出/);denied(s,'lash');denied(s,'inspect');run(s,'safe');assert.equal(s.bag.wood,1);assert.equal(s.dungeon.stage,2);round(s);
 const low=prepared();run(low,'inspect');low.skills.woodwork=23;assert.match(dungeonBlocker(low,'lash'),/经验需24/);denied(low,'lash');run(low,'quick');round(low);
});
test('tying actual cord preserves new timber for rescue without generating timber or refreshing a route',()=>{
 const s=prepared();run(s,'inspect');const minute=s.minute,energy=s.energy;run(s,'lash');assert.equal(s.minute,minute+90);assert.equal(s.energy,energy-12);assert.equal(s.bag.wood,2);assert.equal(s.bag.cord,1);assert.equal(s.dungeon.route,'safe');assert.equal(s.dungeon.stage,2);round(s);
 const loaded=restore(JSON.stringify(s));denied(loaded,'lash');denied(loaded,'safe');run(loaded,'skip');run(loaded,'rescue');assert.equal(loaded.bag.wood,0);assert.equal(loaded.bag.cord,0);assert.equal(loaded.dungeon.rescue,'saved');run(loaded,'exit');assert.equal(loaded.dungeon.status,'done');round(loaded);
});
test('same two-timber preparation cannot complete new-timber bracing and timber rescue together',()=>{
 const s=prepared();run(s,'safe');run(s,'skip');assert.equal(s.bag.wood,1);assert.match(dungeonBlocker(s,'rescue'),/木料×2/);denied(s,'rescue');run(s,'pass');run(s,'exit');round(s);
});
test('preview and settlement share actual inputs, timing and hazard while old routes remain available',()=>{
 const s=prepared();run(s,'inspect');const b=structuredClone(s),opts=dungeonOptions(s),p=dungeonPlan(s,'lash');assert.deepEqual(s,b);assert.deepEqual(p.input,{cord:1});assert.equal(p.minutes,90);assert.equal(p.energy,12);assert.equal(p.risk,.05);assert.equal(dungeonPlan(s,'safe').risk,.03);assert.match(opts.find(o=>o.id==='dungeon:lash').preview,/90分钟\/精力12/);assert.match(opts.find(o=>o.id==='dungeon:lash').preview,/绳线×1/);assert.match(opts.find(o=>o.id==='dungeon:lash').preview,/5%损失8/);
 s.bag.cord=0;denied(s,'lash');s.bag.cord=1;s.energy=11;denied(s,'lash');s.energy=12;let i=0;run(s,'lash',()=>i++===0?.5:0);assert.equal(s.hp,92);assert.ok(s.injuries.strain);assert.equal(s.bag.cord,0);assert.equal(s.bag.wood,2);assert.equal(s.energy,0);run(s,'withdraw',()=>.99);assert.equal(s.dungeon.status,'left');assert.equal(s.bag.wood,2);round(s);
});
test('older surveyed saves remain unchanged on restore and preview, and interrupted or ended expeditions cannot retry',()=>{
 const s=prepared();run(s,'inspect');const raw=JSON.stringify(s),loaded=restore(raw);assert.equal(JSON.stringify(loaded),raw);dungeonOptions(loaded);assert.equal(JSON.stringify(loaded),raw);run(loaded,'withdraw',()=>.99);denied(loaded,'lash');denied(loaded,'enter');round(loaded);
});
test('ordinary woodworker learns, funds tools and materials, inspects, saves timber, rescues and claims along actual roads',t=>{
 const {h}=woodRoute(24,false),{s}=h;assert.equal(s.skills.woodwork,24);h.buy('wood',2);h.buy('cord',2);h.buy('pick');h.rest(100);h.walk('mine');h.action('dungeon:enter');h.action('dungeon:inspect');assert.equal(s.dungeon.surveyed,true);assert.equal(s.bag.wood,2);h.action('dungeon:lash');assert.equal(s.bag.wood,2);h.action('dungeon:mine');h.action('dungeon:rescue');h.action('dungeon:exit');h.walk('workshop');h.hours();h.action('outing:mine:claim');assert.equal(s.dungeon.rescue,'saved');assert.equal(s.adventures.outings.records.mine.outcome,'done');assert.equal(s.bag.ore,2);assert.equal(s.bag.wood,0);assert.equal(s.bag.cord,0);assert.deepEqual(s.martial.known,{});h.checkpoint();t.diagnostic(JSON.stringify(h.result()));
});
