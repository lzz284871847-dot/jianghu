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
 assert.equal(equipmentBonuses(s).attack,0);
 s.martial.equipped='staff';
 assert.equal(equipmentBonuses(s).attack,2);
 const c=newCombat('brawler','staff');c.distance=1;
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
 const s=fresh();s.place='workshop';s.coins=500;s.bag.iron=100;s.bag.wood=100;s.bag.fine_ore=4;
 assert.equal(equipmentAction(s,'craft','steel_blade'),false);
 s.relations.smith=8;
 assert.equal(equipmentAction(s,'craft','steel_blade',()=>.5),true);
 assert.equal(equipmentAction(s,'craft','iron_vest'),true);
 assert.equal(equipmentAction(s,'equip','iron_vest'),true);
 const c=newCombat('brawler','qinghe_fist');c.distance=1;
 resolve(c,s,'guard',()=>0.1);
 assert.equal(s.hp,93);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('invalid gear or equipped references cannot be imported',()=>{
 const s=fresh();s.equipment.equipped.weapon='heirloom_sword';
 assert.throws(()=>restore(JSON.stringify(s)),/装备数据无效/);
});

test('unmatched weapons do not buff fists and named weapon moves respect affinity',async()=>{
 const {martialAction}=await import('./engine.js');
 const s=fresh();s.place='workshop';s.bag.wood=20;s.bag.iron=20;
 assert.equal(equipmentAction(s,'craft','iron_sword'),true);
 assert.equal(equipmentAction(s,'equip','iron_sword'),true);
 assert.equal(equipmentBonuses(s).attack,0);
 s.place='school';
 assert.equal(martialAction(s,'learn','basic_sword'),true);
 assert.equal(martialAction(s,'equip','basic_sword'),true);
 assert.equal(equipmentBonuses(s).attack,6);
 assert.equal(martialAction(s,'challenge','brawler'),true);
 s.combat.distance=1;
 const before=s.equipment.owned.iron_sword;
 assert.equal(martialAction(s,'move','basic_sword_1',()=>.1),true);
 assert.equal(s.equipment.owned.iron_sword,before-1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('rare ore nodes migrate and deeper layers require mining mastery',async()=>{
 const {resourceBlocker,act,choose}=await import('./engine.js');
 const old=fresh();for(const key of ['fine_ore','cold_ore','meteor_ore'])delete old.bag[key];
 for(const k of Object.keys(old.nodes))if(k.endsWith(':fine_ore')||k.endsWith(':cold_ore')||k.endsWith(':meteor_ore'))delete old.nodes[k];
 const migrated=restore(JSON.stringify(old));
 for(const k of ['fine_ore','cold_ore','meteor_ore'])assert.equal(migrated.bag[k],0);
 assert.doesNotThrow(()=>restore(JSON.stringify(migrated)));
 migrated.place='mine';migrated.bag.pick=1;
 assert.match(resourceBlocker(migrated,'fine_ore'),/提高采矿经验/);
 migrated.skills.mining=150;
 assert.equal(resourceBlocker(migrated,'fine_ore'),null);
 assert.equal(act(migrated,'fine_ore',()=>0),true);
 assert.equal(migrated.pending.type,'resource');
 assert.equal(choose(migrated,'gather',()=>0),true);
 assert.equal(migrated.bag.fine_ore,1);
 assert.equal(resourceBlocker(migrated,'cold_ore')?.includes('提高采矿经验'),true);
 assert.doesNotThrow(()=>restore(JSON.stringify(migrated)));
});
test('higher tier crafting cannot bypass rare ore with cash and iron alone',()=>{
 const s=fresh();s.place='workshop';s.coins=5000;s.relations.smith=100;
 s.bag.iron=100;s.bag.wood=100;
 assert.equal(equipmentAction(s,'craft','steel_blade'),false);
 s.bag.fine_ore=2;
 assert.equal(equipmentAction(s,'craft','steel_blade',()=>.5),true);
 assert.equal(equipmentAction(s,'craft','master_blade'),false);
 s.bag.cold_ore=2;
 assert.equal(equipmentAction(s,'craft','master_blade',()=>.5),true);
 assert.equal(equipmentAction(s,'craft','heirloom_sword'),false);
 s.bag.meteor_ore=2;
 assert.equal(equipmentAction(s,'craft','heirloom_sword',()=>.5),true);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('high tier forge failure consumes inputs without creating equipment',()=>{
 const s=fresh();s.place='workshop';s.coins=500;s.relations.smith=30;
 s.bag.iron=30;s.bag.wood=10;s.bag.fine_ore=2;
 const coin=s.coins,ore=s.bag.fine_ore;
 assert.equal(equipmentAction(s,'craft','steel_blade',()=>0),true);
 assert.equal(s.equipment.owned.steel_blade,undefined);
 assert.equal(s.bag.fine_ore,ore-2);
 assert.equal(s.coins,coin-30);
 assert.match(s.result.join(''),/锻造.*失败/);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('fine quality improves matched attack and survives repair and save',()=>{
 const s=fresh();s.place='workshop';s.bag.iron=20;s.bag.wood=10;
 assert.equal(equipmentAction(s,'craft','iron_sword',()=>.99),true);
 assert.equal(s.equipment.quality.iron_sword,2);
 assert.equal(equipmentAction(s,'equip','iron_sword'),true);
 s.martial.equipped='basic_sword';
 assert.equal(equipmentBonuses(s).attack,7);
 s.equipment.owned.iron_sword=25;
 assert.equal(equipmentAction(s,'repair','iron_sword'),true);
 assert.equal(s.equipment.quality.iron_sword,2);
 assert.equal(restore(JSON.stringify(s)).equipment.quality.iron_sword,2);
});
test('old equipment save without quality is migrated as ordinary',()=>{
 const s=fresh();s.equipment.owned.wood_staff=20;
 delete s.equipment.quality;
 const restored=restore(JSON.stringify(s));
 assert.equal(restored.equipment.quality.wood_staff,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(restored)));
});
