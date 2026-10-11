import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,restore,move} from './engine.js';
import {JOBS,jobAvailability} from './livelihood.js';
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
