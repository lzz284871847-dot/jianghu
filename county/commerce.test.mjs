import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,restore,trade,act} from './engine.js';
import {commerceValid,stockAt,MARKET_LIMIT} from './commerce.js';
import {advance} from './world.js';
test('market stock is a finite, valid independent world state',()=>{const s=fresh();assert.ok(commerceValid(s));assert.equal(stockAt(s,'market','food'),10);assert.equal(stockAt(s,'market','iron'),0);});
test('purchase decrements merchant stock and failed shortage leaves player unchanged',()=>{
 const s=fresh();s.place='market';s.coins=100;
 assert.equal(trade(s,'buy','food',3),true);assert.equal(stockAt(s,'market','food'),7);assert.equal(s.bag.food,5);
 const before={coins:s.coins,food:s.bag.food,time:s.minute};
 assert.equal(trade(s,'buy','food',8),false);
 assert.deepEqual({coins:s.coins,food:s.bag.food,time:s.minute},before);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('merchant acquisition respects finite capacity and does not confiscate items',()=>{
 const s=fresh();s.place='market';s.bag.iron=40;s.commerce.budget.market=300;
 assert.equal(trade(s,'sell','iron',20),true);assert.equal(stockAt(s,'market','iron'),20);
 const before={coins:s.coins,iron:s.bag.iron,time:s.minute};
 assert.equal(trade(s,'sell','iron',11),false);
 assert.deepEqual({coins:s.coins,iron:s.bag.iron,time:s.minute},before);
 assert.equal(trade(s,'sell','iron',10),true);assert.equal(stockAt(s,'market','iron'),MARKET_LIMIT);
});
test('independent daily consumption and two-day deliveries restore availability',()=>{
 const s=fresh();s.place='market';s.coins=100;s.bag.food=0;
 assert.equal(trade(s,'buy','food',10),true);assert.equal(stockAt(s,'market','food'),0);
 advance(s,1440-s.minute);assert.equal(s.day,2);assert.equal(stockAt(s,'market','food'),0);
 advance(s,1440);assert.equal(s.day,3);assert.equal(stockAt(s,'market','food'),5);
 assert.ok(s.news.some(x=>x.includes('商贩补充')));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('older save migrates commerce and forged stock is rejected',()=>{
 const s=fresh();delete s.commerce;const migrated=restore(JSON.stringify(s));
 assert.equal(stockAt(migrated,'market','food'),10);
 migrated.commerce.stock.market.food=-1;assert.throws(()=>restore(JSON.stringify(migrated)),/商铺库存/);
});

test('merchant cannot pay more than owned capital; failed sale never confiscates player goods',()=>{
 const s=fresh();s.place='market';s.bag.iron=50;
 assert.equal(trade(s,'sell','iron',20),true);
 const cash=s.commerce.budget.market;
 assert.equal(cash,20);
 const before={coins:s.coins,iron:s.bag.iron,minute:s.minute};
 assert.equal(trade(s,'sell','iron',3),false);
 assert.deepEqual({coins:s.coins,iron:s.bag.iron,minute:s.minute},before);
 assert.match(s.result.join(''),/收购资金不足/);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('customer purchases refill shop cash and allow more farmer sales',()=>{
 const s=fresh();s.place='market';s.bag.iron=30;s.coins=100;
 assert.equal(trade(s,'sell','iron',20),true);
 assert.equal(s.commerce.budget.market,20);
 assert.equal(trade(s,'buy','grain',5),true);
 assert.equal(s.commerce.budget.market,30);
 assert.equal(trade(s,'sell','iron',4),true);
 assert.equal(s.commerce.budget.market,2);
});
test('households clear stalled merchant acquisitions and bring limited sales cash',()=>{
 const s=fresh();s.place='market';s.bag.iron=40;
 assert.equal(trade(s,'sell','iron',20),true);
 advance(s,1440-s.minute);
 assert.equal(stockAt(s,'market','iron'),19);
 assert.equal(s.commerce.budget.market,28);
 advance(s,1440);
 assert.equal(stockAt(s,'market','iron'),18);
 assert.equal(s.commerce.budget.market,60);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('0.5.0 saves without merchant budgets migrate; invalid bank notes rejected',()=>{
 const s=fresh();delete s.commerce.budget;
 const migrated=restore(JSON.stringify(s));
 assert.equal(migrated.commerce.budget.market,160);
 migrated.commerce.budget.market=-1;
 assert.throws(()=>restore(JSON.stringify(migrated)),/商铺库存记录无效/);
});
