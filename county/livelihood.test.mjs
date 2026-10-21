import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,restore,move,trade} from './engine.js';
import {JOBS,jobAvailability,jobPlan,jobPreview,jobBlocker,jobSceneHint} from './livelihood.js';
import {localScene} from './local-map.js';
import {advance} from './world.js';

test('job catalogue covers all available workplaces',()=>{
 assert.deepEqual(Object.keys(JOBS).sort(),['county','dock','fields','liuxi','workshop']);
});
test('good and poor jobs both take time, but pay different wages',()=>{
 const good=fresh(),bad=fresh();
 assert.equal(act(good,'work',()=>0),true);
 assert.equal(act(bad,'work',()=>.99),true);
 assert.equal(good.coins,42);
 assert.equal(bad.coins,34);
 assert.equal(good.minute,660);assert.equal(bad.minute,660);
 assert.equal(good.energy,76);assert.equal(bad.energy,76);
});
test('daily work limit blocks repeat exploitation and refreshes next day',()=>{
 const s=fresh();
 assert.equal(act(s,'work',()=>0),true);
 assert.equal(act(s,'work',()=>0),true);
 const before={money:s.coins,minute:s.minute,energy:s.energy};
 assert.equal(act(s,'work',()=>0),false);
 assert.deepEqual({money:s.coins,minute:s.minute,energy:s.energy},before);
 assert.match(jobAvailability(s),/名额已用完/);
 advance(s,1440-s.minute);
 assert.equal(jobAvailability(s),null);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('rain makes dockside work less reliable than fine weather',()=>{
 const rain=fresh(),sun=fresh();
 rain.place='dock';sun.place='dock';rain.weather='雨';
 assert.equal(act(rain,'work',()=>.7),true);
 assert.equal(act(sun,'work',()=>.7),true);
 assert.equal(rain.coins,34);assert.equal(sun.coins,42);
});
test('old saves migrate while invalid job records are rejected',()=>{
 const s=fresh();delete s.livelihood;
 const migrated=restore(JSON.stringify(s));
 assert.deepEqual(migrated.livelihood.workDays,{});
 migrated.livelihood.workDays.county={day:1,count:3};
 assert.throws(()=>restore(JSON.stringify(migrated)),/短工记录无效/);
 migrated.livelihood.workDays.county={day:1,count:2};
 assert.doesNotThrow(()=>restore(JSON.stringify(migrated)));
});

test('grain shortage reduces county and farm hiring capacity but does not trap progress',async()=>{
 const {livelihoodPressure}=await import('./livelihood.js');
 const s=fresh();s.commerce.stock.market.grain=2;
 assert.equal(livelihoodPressure(s,'county').slots,1);
 assert.equal(act(s,'work',()=>0),true);
 assert.equal(act(s,'work',()=>0),false);
 assert.match(s.result.join(''),/名额已用完/);
 s.place='fields';s.minute=480;s.energy=100;
 assert.equal(jobAvailability(s),null);
 assert.equal(livelihoodPressure(s).slots,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('merchant insolvency restricts workshop and liuxi hiring and affects wage risk',async()=>{
 const {livelihoodPressure}=await import('./livelihood.js');
 const poor=fresh(),healthy=fresh();poor.place='workshop';healthy.place='workshop';
 poor.commerce.budget.market=15;
 assert.equal(livelihoodPressure(poor).slots,1);
 assert.equal(livelihoodPressure(healthy).slots,2);
 assert.equal(act(poor,'work',()=>.8),true);
 assert.equal(act(healthy,'work',()=>.8),true);
 assert.equal(poor.coins,34);
 assert.equal(healthy.coins,42);
 assert.match(poor.result.join(''),/资金紧张/);
 assert.equal(act(poor,'work',()=>0),false);
 const market=fresh();market.place='liuxi';market.commerce.budget.liuxi=0;
 assert.equal(livelihoodPressure(market).slots,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(poor)));
});
test('normal grain and merchant liquidity preserve earlier work opportunities',async()=>{
 const {livelihoodPressure}=await import('./livelihood.js');
 const s=fresh();assert.equal(livelihoodPressure(s).slots,2);
 assert.equal(act(s,'work',()=>0),true);
 assert.equal(act(s,'work',()=>0),true);
 assert.equal(s.coins,54);
});

test('second shift competes for limited full-pay work without removing fallback wages',()=>{
 const s=fresh();s.place='liuxi';
 assert.equal(act(s,'work',()=>.75),true);
 assert.equal(s.coins,42);
 assert.equal(act(s,'work',()=>.75),true);
 assert.equal(s.coins,46);
 assert.match(s.result.join(''),/竞争更激烈/);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('rare dock accident costs real hp while preserving earned wage and save',()=>{
 const s=fresh();s.place='dock';const before=s.hp;
 assert.equal(act(s,'work',()=>.99),true);
 assert.equal(s.hp,before-4);
 assert.equal(s.coins,34);
 assert.match(s.result.join(''),/短工意外/);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

const round=s=>assert.deepEqual(restore(JSON.stringify(s)),s);
const money=s=>s.coins+Object.values(s.commerce.budget).reduce((a,b)=>a+b,0);
const noWork=s=>{const before=structuredClone(s);let rolls=0;assert.equal(act(s,'work',()=>{rolls++;return 0;}),false);assert.equal(rolls,0);s.result=before.result;assert.deepEqual(s,before);};
test('every workplace transfers real full or fallback wages from its existing local funds with conserved cash',()=>{
 for(const place of Object.keys(JOBS))for(const good of [true,false]){const s=fresh();s.place=place;const p=jobPlan(s),before=structuredClone(s),total=money(s),paid=good?12:4;assert.ok(act(s,'work',()=>good?0:.99));assert.equal(money(s),total);assert.equal(s.coins,before.coins+paid);assert.equal(s.commerce.budget[p.payer],before.commerce.budget[p.payer]-paid);assert.equal(s.minute,before.minute+180);assert.equal(s.energy,before.energy-24);assert.equal(s.livelihood.workDays[place].count,1);round(s);}
});
test('insufficient hiring funds refuse before time, fatigue, slots or RNG and never create an unpaid shift',()=>{
 for(const place of Object.keys(JOBS))for(const funds of [0,11]){const s=fresh();s.place=place;s.commerce.budget[place==='liuxi'?'liuxi':'market']=funds;assert.match(jobAvailability(s),/不足本班满额12文/);assert.match(jobSceneHint(s),/资金不足/);noWork(s);round(s);}
});
test('an actual local purchase restores hiring cash and subsequent wages deduct only the real paid amount',()=>{
 const s=fresh();s.place='liuxi';s.commerce.budget.liuxi=0;const cash=money(s);noWork(s);assert.ok(trade(s,'buy','food',3));assert.ok(s.commerce.budget.liuxi>=12);assert.equal(jobAvailability(s),null);assert.match(jobSceneHint(s),/还招1班/);const before=s.commerce.budget.liuxi;assert.ok(act(s,'work',()=>0));assert.equal(s.commerce.budget.liuxi,before-12);assert.equal(money(s),cash);round(s);
});
test('normal world arrivals independently restore hiring after the finite route obstruction without player earnings or participation',()=>{
 const s=fresh();s.commerce.budget.liuxi=0;const coins=s.coins;advance(s,4*1440);s.place='liuxi';s.minute=480;assert.ok(s.commerce.budget.liuxi>=12);assert.equal(s.coins,coins);assert.equal(s.adventures.feedback.events.ferry,'ignored');assert.equal(jobAvailability(s),null);assert.equal(s.livelihood.workDays.liuxi,undefined);round(s);
});
test('weather, fatigue, second-shift competition and route shortages have read-only visible terms from the actual plan',()=>{
 const s=fresh();s.place='dock';s.weather='雨';s.energy=30;const before=structuredClone(s),p=jobPlan(s);assert.ok(Math.abs(p.chance-.5)<1e-9);assert.match(jobPreview(s),/概率50%/);assert.match(jobPreview(s),/雨天.*疲惫/);assert.match(jobPreview(s),/3%搬运擦伤4气血/);localScene(s);assert.deepEqual(s,before);
 const x=fresh();advance(x,2*1440);x.place='liuxi';const snapshot=structuredClone(x);assert.equal(jobPlan(x).pressure.routeBlocked,true);assert.match(jobPreview(x),/栈道受阻/);assert.match(localScene(x).facilities.find(f=>f.id==='jobs').hint,/还招1班/);assert.deepEqual(x,snapshot);round(x);
});
test('the previewed full-pay boundary matches actual settlement for all five ordinary jobs',()=>{
 for(const place of Object.keys(JOBS)){const s=fresh();s.place=place;const p=jobPlan(s),funds=p.funds;assert.ok(act(s,'work',()=>p.chance));assert.equal(s.coins,34);assert.equal(s.commerce.budget[p.payer],funds-4);round(s);}
});
test('old job counts and funds remain unchanged by import or repeated previews; caps and early time or fatigue refuse safely',()=>{
 const old=fresh();old.livelihood.workDays.county={day:1,count:1};old.commerce.budget.market=11;const raw=JSON.stringify(old);assert.equal(JSON.stringify(restore(raw)),raw);jobPlan(old);jobPreview(old);jobBlocker(old);assert.equal(JSON.stringify(old),raw);
 for(const mutate of [s=>s.coins=9999989,s=>s.minute=1000,s=>s.energy=23,s=>s.hp=24]){const s=fresh();mutate(s);assert.ok(jobBlocker(s));noWork(s);round(s);}
});
