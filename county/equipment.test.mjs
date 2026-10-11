import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,equipmentAction} from './engine.js';
import {EQUIPMENT,equipmentBonuses,wearEquipment} from './equipment.js';
import {newCombat,resolve} from './combat-core.js';

test('20 pieces span five tiers and two slots',()=>{
 assert.equal(Object.keys(EQUIPMENT).length,20);
 assert.deepEqual([...new Set(Object.values(EQUIPMENT).map(x=>x.tier))].sort(),[1,2,3,4,5]);
 assert.deepEqual([...new Set(Object.values(EQUIPMENT).map(x=>x.slot))].sort(),['armor','weapon']);
});
test('county 0.2 saves gain equipment without deleting their martial progress',()=>{
 const s=fresh();s.martial.known.qinghe_fist=true;
 for(const k of ['practice','insight','experience','mastery'])s.martial[k].qinghe_fist=0;
 delete s.equipment;
 const restored=restore(JSON.stringify(s));
 assert.deepEqual(restored.equipment.equipped,{weapon:null,armor:null});
 assert.equal(restored.martial.known.qinghe_fist,true);
});
test('craft requires location and materials, equip affects combat, durability runs out',()=>{
 const s=fresh();s.bag.wood=8;s.place='county';
 assert.equal(equipmentAction(s,'craft','wood_staff'),false);
 s.place='workshop';
 assert.equal(equipmentAction(s,'craft','wood_staff'),true);
 assert.equal(s.equipment.owned.wood_staff,35);
 assert.equal(equipmentAction(s,'equip','wood_staff'),true);
 assert.equal(equipmentBonuses(s).attack,2);
 const c=newCombat('brawler','qinghe_fist');c.distance=1;
 const before=s.equipment.owned.wood_staff;
 const result=resolve(c,s,'strike',()=>0.1);
 assert.equal(result.enemyHpDelta,-13);
 assert.equal(s.equipment.owned.wood_staff,before-1);
 s.equipment.owned.wood_staff=1;
 assert.match(wearEquipment(s,'weapon'),/失效/);
 assert.equal(equipmentBonuses(s).attack,0);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('advanced gear needs smith trust; armor reduces incoming damage',()=>{
 const s=fresh();s.place='workshop';s.coins=500;s.bag.iron=100;s.bag.wood=100;
 assert.equal(equipmentAction(s,'craft','steel_blade'),false);
 s.relations.smith=8;
 assert.equal(equipmentAction(s,'craft','steel_blade'),true);
 assert.equal(equipmentAction(s,'craft','iron_vest'),true);
 assert.equal(equipmentAction(s,'equip','iron_vest'),true);
 const c=newCombat('brawler','qinghe_fist');c.distance=1;
 resolve(c,s,'guard',()=>0.1);
 assert.equal(s.hp,100-12);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('invalid gear or equipped references cannot be imported',()=>{
 const s=fresh();s.equipment.equipped.weapon='heirloom_sword';
 assert.throws(()=>restore(JSON.stringify(s)),/装备数据无效/);
});
