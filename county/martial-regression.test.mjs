// Run: node --test county/martial-regression.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,martialAction,act,choose} from './engine.js';
import {advance} from './world.js';
import {catalogCheck} from './martial-data.js';
import {combatCatalogValid,newCombat,intent,resolve} from './combat-core.js';
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


test('tactical combat accepts basic strike and heavy',()=>{
 const s=fresh();s.place='school';assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 assert.equal(martialAction(s,'challenge','brawler'),true);
 assert.equal(martialAction(s,'turn','strike',()=>0.5),true);
 assert.equal(s.combat?.round,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('roadside fight uses tactical rules for trained character',()=>{
 const s=fresh();s.place='school';assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 s.place='oldroad';s.pending={type:'bandit'};
 assert.equal(choose(s,'fight'),true);
 assert.equal(s.combat.opponent,'brawler');
 assert.equal(s.pending,null);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('untrained roadside encounter remains playable and saveable',()=>{
 const s=fresh();s.place='oldroad';s.pending={type:'bandit'};
 assert.equal(choose(s,'fight'),true);
 assert.equal(s.combat.hp,28);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('higher martial tiers cannot be purchased without prerequisite practice',()=>{
 const s=fresh();s.place='school';s.coins=500;
 assert.equal(martialAction(s,'learn','stone_palm'),false);
 assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 assert.equal(martialAction(s,'learn','spring_kick'),true);
 assert.equal(martialAction(s,'learn','stone_palm'),false);
 s.martial.practice.qinghe_fist=120;s.martial.practice.spring_kick=119;
 assert.equal(martialAction(s,'learn','stone_palm'),false);
 s.martial.practice.spring_kick=120;
 assert.equal(martialAction(s,'learn','stone_palm'),false);
 s.relations.master=5;
 assert.equal(martialAction(s,'learn','stone_palm'),true);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('martial teachers demand the appropriate place and trust',()=>{
 const s=fresh();s.coins=500;s.place='school';
 assert.equal(martialAction(s,'learn','wood_knife'),false);
 s.place='village';assert.equal(martialAction(s,'learn','wood_knife'),true);
 assert.equal(martialAction(s,'learn','qinghe_fist'),false);
 s.place='school';assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 assert.equal(martialAction(s,'learn','spring_kick'),true);
 s.martial.practice.qinghe_fist=120;s.martial.practice.spring_kick=120;
 assert.equal(martialAction(s,'learn','stone_palm'),false);
 s.relations.master=5;assert.equal(martialAction(s,'learn','stone_palm'),true);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('footwork evades enemy blows that would hit ordinary attacks',()=>{
 const agile=fresh();agile.place='school';assert.equal(martialAction(agile,'learn','footwork'),true);
 assert.equal(martialAction(agile,'challenge','brawler'),true);
 agile.combat.distance=0;
 assert.equal(martialAction(agile,'move','footwork_1',()=>.6),true);
 assert.equal(agile.hp,100);
 assert.equal(agile.combat.distance,1);
 const plain=fresh();plain.place='school';assert.equal(martialAction(plain,'learn','qinghe_fist'),true);
 assert.equal(martialAction(plain,'challenge','brawler'),true);
 plain.combat.distance=0;
 assert.equal(martialAction(plain,'move','qinghe_fist_1',()=>.6),true);
 assert.ok(plain.hp<100);
 assert.doesNotThrow(()=>restore(JSON.stringify(agile)));
});
test('breathing techniques restore stamina while exposed to enemy pressure',()=>{
 const s=fresh();s.place='school';assert.equal(martialAction(s,'learn','breath'),true);
 assert.equal(martialAction(s,'challenge','brawler'),true);
 s.energy=30;s.combat.distance=0;
 assert.equal(martialAction(s,'move','breath_1',()=>.6),true);
 assert.equal(s.energy,31);
 assert.equal(s.combat.playerGuard,4);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('reach fighters strike at distance three while ordinary brawlers approach',()=>{
 const spear=newCombat('spearman','qinghe_fist');spear.distance=3;
 const brawler=newCombat('brawler','qinghe_fist');brawler.distance=3;
 assert.equal(intent(spear),'strike');assert.equal(intent(brawler),'advance');
 const player=fresh();
 resolve(spear,player,'guard',()=>0.1);
 assert.equal(spear.distance,3);
 assert.ok(player.hp<100);
 assert.doesNotThrow(()=>restore(JSON.stringify(player)));
});
test('skirmishers withdraw when crowded but close in when out of range',()=>{
 const c=newCombat('skirmisher','qinghe_fist');c.distance=1;
 assert.equal(intent(c),'retreat');
 c.distance=4;assert.equal(intent(c),'advance');
});
