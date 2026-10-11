import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,restore,trade} from './engine.js';
import {advance} from './world.js';
import {harvestFor,farmDelivery} from './agriculture.js';
import {stockAt,MARKET_LIMIT} from './commerce.js';
test('harvest occurs every three days with distinct weather and seasons',()=>{
 assert.equal(harvestFor(2,'晴'),null);
 assert.deepEqual(harvestFor(3,'晴').market,{grain:6,vegetable:4});
 assert.deepEqual(harvestFor(3,'雨').market,{grain:3,vegetable:2});
 assert.ok(harvestFor(33,'晴').market.grain>harvestFor(3,'晴').market.grain);
});
test('independent farm deliveries enter two shops and never exceed capacity',()=>{
 const s=fresh();s.commerce.stock.market.grain=0;s.commerce.stock.liuxi.grain=0;
 assert.equal(farmDelivery(s,2,'晴').length,0);
 assert.ok(farmDelivery(s,3,'晴').length>=4);
 assert.equal(stockAt(s,'market','grain'),6);
 assert.equal(stockAt(s,'liuxi','grain'),4);
 s.commerce.stock.market.grain=29;
 farmDelivery(s,6,'晴');
 assert.equal(stockAt(s,'market','grain'),MARKET_LIMIT);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('unassisted day progression feeds shops and survives save roundtrip',()=>{
 const s=fresh();s.commerce.stock.market.grain=0;s.commerce.stock.liuxi.grain=0;
 advance(s,1440-s.minute);advance(s,1440);
 assert.equal(s.day,3);
 assert.ok(stockAt(s,'market','grain')>=3);
 assert.ok(s.news.some(t=>t.includes('农户送来')));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('a rain-hit harvest produces a shortage report and less grain',()=>{
 const wet=fresh(),dry=fresh();
 wet.commerce.stock.market.grain=0;dry.commerce.stock.market.grain=0;
 const wetNews=farmDelivery(wet,3,'雨'),dryNews=farmDelivery(dry,3,'晴');
 assert.ok(wetNews.some(x=>x.includes('收成偏低')));
 assert.ok(!dryNews.some(x=>x.includes('收成偏低')));
 assert.ok(stockAt(wet,'market','grain')<stockAt(dry,'market','grain'));
});

test('rain-shortage explanation remains in the limited world-news feed',async()=>{
 const {dailyCommerce}=await import('./commerce.js');
 const s=fresh();s.day=3;s.weather='雨';s.commerce.lastDay=2;for(const node of Object.values(s.nodes))node.refreshDay=5;
 const news=dailyCommerce(s);
 assert.ok(news.some(line=>line.includes('收成偏低')),news.join(' / '));
 assert.equal(news.length<=2,true);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
