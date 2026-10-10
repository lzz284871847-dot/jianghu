// Run: node --test county/martial-regression.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,martialAction,act} from './engine.js';
import {advance} from './world.js';
import {catalogCheck} from './martial-data.js';
import {combatCatalogValid} from './combat-core.js';
import {moveCatalogValid} from './martial-moves.js';

test('complete martial catalogue',()=>{
 assert.deepEqual(catalogCheck(),{arts:18,moves:54,opponents:12,injuries:6,distances:5});
 assert.ok(combatCatalogValid());assert.ok(moveCatalogValid());
});
test('old county save migrates and roundtrips',()=>{
 const old=fresh();delete old.martial;delete old.injuries;delete old.injuryRecovery;
 const loaded=restore(JSON.stringify(old));
 assert.deepEqual(loaded.martial.known,{});assert.deepEqual(loaded.injuries,{});
 assert.deepEqual(restore(JSON.stringify(loaded)).martial.known,{});
});
test('learn, train and fight in school survive save',()=>{
 const s=fresh();s.place='school';
 assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 assert.equal(s.minute,540);
 assert.equal(martialAction(s,'train','qinghe_fist'),true);
 assert.equal(s.minute,660);
 assert.equal(martialAction(s,'challenge','brawler'),true);
 assert.equal(restore(JSON.stringify(s)).combat.opponent,'brawler');
 assert.equal(martialAction(s,'move','qinghe_fist_1',()=>0.5),true);
 assert.ok(s.combat===null||s.combat.round===1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('bleeding and death are irreversible in restored state',()=>{
 const s=fresh();s.hp=1;s.injuries={cut:3};
 advance(s,1440);
 assert.equal(s.dead,true);assert.equal(s.hp,0);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('minor injuries treatable at full health',()=>{
 const s=fresh();s.injuries={bruise:1};s.bag.herb=1;
 assert.equal(martialAction(s,'train','qinghe_fist'),false);
 // Ordinary treatment uses the existing action pipeline.
 assert.equal(act(s,'heal'),true);assert.equal(s.injuries.bruise,undefined);
});
