import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,trade} from './engine.js';
import {advance} from './world.js';
import {districtStatus,societyDay,societyValid} from './society.js';
test('existing 0.9.0 saves receive independent social state',()=>{
 const s=fresh();delete s.society;const old=restore(JSON.stringify(s));
 assert.ok(societyValid(old));assert.equal(districtStatus(old,'market').closed,false);
 old.society.districts.market.hardship=50;
 assert.throws(()=>restore(JSON.stringify(old)),/居民生活记录无效/);
});
test('two days without staple grain cause hardship, normal supply reverses it',()=>{
 const s=fresh();s.commerce.stock.market.grain=0;
 societyDay(s,1);
 const alerts=s.society.districts.market;
 assert.equal(alerts.hardship,1);
 assert.ok(societyDay(s,2).some(x=>x.includes('粮食连续紧缺')));
 assert.equal(alerts.hardship,2);
 s.commerce.stock.market.grain=12;
 assert.ok(societyDay(s,3).some(x=>x.includes('供应改善')));
 assert.equal(alerts.hardship,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('insolvent merchants actually close, block trade atomically and reopen',()=>{
 const s=fresh();s.place='market';s.commerce.budget.market=0;
 societyDay(s,1);
 const notice=societyDay(s,2);
 assert.ok(notice.some(x=>x.includes('暂停营业')));
 assert.equal(districtStatus(s,'market').closed,true);
 const before={coins:s.coins,food:s.bag.food,time:s.minute};
 assert.equal(trade(s,'buy','food'),false);
 assert.deepEqual({coins:s.coins,food:s.bag.food,time:s.minute},before);
 s.day=5;for(const n of Object.values(s.nodes))n.refreshDay=7;s.commerce.budget.market=50;
 assert.equal(districtStatus(s,'market').closed,false);
 assert.equal(trade(s,'buy','food'),true);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('day-to-day simulation triggers real insolvency with bounded restock',()=>{
 const s=fresh();s.commerce.budget.market=0;
 advance(s,1440-s.minute);
 assert.equal(s.day,2);
 assert.equal(s.society.districts.market.cashStress,1);
 advance(s,1440);
 assert.equal(s.day,3);
 assert.equal(districtStatus(s,'market').closed,true);
 assert.ok(s.news.some(x=>x.includes('暂停营业')));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
