import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,equipmentAction} from './engine.js';
import {EQUIPMENT,equipmentBonuses,wearEquipment,equipmentWorkCost} from './equipment.js';
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

test('forging consumes time and stamina on both success and failure',()=>{
 const successful=fresh();successful.place='workshop';successful.bag.wood=5;
 const cost=equipmentWorkCost(EQUIPMENT.wood_staff,'craft');
 assert.equal(equipmentAction(successful,'craft','wood_staff',()=>.5),true);
 assert.equal(successful.minute,480+cost.minutes);
 assert.equal(successful.energy,100-cost.energy);
 const failed=fresh();failed.place='workshop';failed.coins=100;failed.relations.smith=8;
 failed.bag.iron=20;failed.bag.wood=5;failed.bag.fine_ore=2;
 const high=equipmentWorkCost(EQUIPMENT.steel_blade,'craft');
 assert.equal(equipmentAction(failed,'craft','steel_blade',()=>0),true);
 assert.equal(failed.minute,480+high.minutes);
 assert.equal(failed.energy,100-high.energy);
 assert.equal(failed.bag.fine_ore,0);
 assert.equal(failed.equipment.owned.steel_blade,undefined);
 assert.doesNotThrow(()=>restore(JSON.stringify(failed)));
});
test('insufficient time or energy rejects work without taking materials or coins',()=>{
 const s=fresh();s.place='workshop';s.bag.wood=6;s.minute=1070;
 const before={coins:s.coins,wood:s.bag.wood,minute:s.minute,energy:s.energy};
 assert.equal(equipmentAction(s,'craft','wood_staff',()=>.5),false);
 assert.deepEqual({coins:s.coins,wood:s.bag.wood,minute:s.minute,energy:s.energy},before);
 s.minute=480;s.energy=0;
 assert.equal(equipmentAction(s,'craft','wood_staff',()=>.5),false);
 assert.equal(s.bag.wood,6);assert.equal(s.coins,30);
 s.energy=100;
 assert.equal(equipmentAction(s,'craft','wood_staff',()=>.5),true);
 s.equipment.owned.wood_staff=20;s.minute=1070;
 assert.equal(equipmentAction(s,'repair','wood_staff'),false);
 assert.equal(s.equipment.owned.wood_staff,20);
});
test('repair consumes fewer resources but advances clock and preserves fine quality',()=>{
 const s=fresh();s.place='workshop';s.bag.wood=8;
 assert.equal(equipmentAction(s,'craft','wood_staff',()=>.99),true);
 assert.equal(s.equipment.quality.wood_staff,2);
 s.equipment.owned.wood_staff=10;
 const start=s.minute,energy=s.energy;
 const work=equipmentWorkCost(EQUIPMENT.wood_staff,'repair');
 assert.equal(equipmentAction(s,'repair','wood_staff'),true);
 assert.equal(s.minute,start+work.minutes);
 assert.equal(s.energy,energy-work.energy);
 assert.equal(s.equipment.quality.wood_staff,2);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('routine high-tier repairs use common materials and preserve scarce ore',()=>{
 const s=fresh();s.place='workshop';s.coins=500;s.relations.smith=24;s.bag.iron=100;s.bag.wood=20;s.bag.meteor_ore=2;
 assert.equal(equipmentAction(s,'craft','heirloom_sword',()=>.5),true);
 assert.equal(s.bag.meteor_ore,0);
 s.equipment.owned.heirloom_sword=70;
 assert.equal(equipmentAction(s,'repair','heirloom_sword'),true);
 assert.equal(s.equipment.owned.heirloom_sword,100);
 assert.equal(s.bag.meteor_ore,0);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('mining to forge to actual combat wear to repair can be played end to end',async()=>{
 const {move,act,choose,martialAction}=await import('./engine.js');
 const {advance}=await import('./world.js');
 const s=fresh();
 assert.equal(move(s,'market'),true);
 assert.equal((await import('./engine.js')).trade(s,'buy','pick'),true);
 for(const to of ['county','road','foot'])assert.equal(move(s,to),true);
 assert.equal(act(s,'wood',()=>.5),true);
 assert.equal(act(s,'wood',()=>.5),true);
 assert.equal(s.bag.wood,4);
 for(const to of ['hill','mine'])assert.equal(move(s,to),true);
 for(let i=0;i<2;i++){
  assert.equal(act(s,'ore'),true);
  assert.equal(choose(s,'gather',()=>.5),true);
 }
 assert.equal(s.bag.ore,4);
 for(const to of ['hill','foot','road','county','workshop'])assert.equal(move(s,to),true);
 advance(s,1440-s.minute+480);
 assert.equal(act(s,'rest'),true);
 assert.equal(act(s,'smelt'),true);
 assert.equal(act(s,'smelt'),true);
 assert.equal(equipmentAction(s,'craft','farm_knife',()=>.5),true);
 assert.equal(equipmentAction(s,'equip','farm_knife'),true);
 for(const to of ['county','village'])assert.equal(move(s,to),true);
 assert.equal(martialAction(s,'learn','wood_knife'),true);
 assert.equal(martialAction(s,'equip','wood_knife'),true);
 for(const to of ['county','school'])assert.equal(move(s,to),true);
 assert.equal(martialAction(s,'challenge','brawler'),true);
 s.combat.distance=1;
 assert.equal(martialAction(s,'turn','strike',()=>.1),true);
 assert.equal(s.equipment.owned.farm_knife,EQUIPMENT.farm_knife.durability-1);
 assert.equal(martialAction(s,'turn','flee',()=>.1),true);
 assert.equal(s.combat,null);
 for(const to of ['county','workshop'])assert.equal(move(s,to),true);
 advance(s,1440-s.minute+480);
 assert.equal(equipmentAction(s,'repair','farm_knife'),true);
 assert.equal(s.equipment.owned.farm_knife,EQUIPMENT.farm_knife.durability);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('deep ore refreshes only after its two-day cycle and survives save/load',async()=>{
 const {act,choose,resourceBlocker}=await import('./engine.js');
 const {advance}=await import('./world.js');
 const s=fresh();s.place='mine';s.bag.pick=1;s.skills.mining=1000;
 const node=s.nodes['mine:meteor_ore'];assert.equal(node.left,1);
 assert.equal(act(s,'meteor_ore'),true);
 assert.equal(choose(s,'gather',()=>0.5),true); // deterministic failure still consumes a node
 assert.equal(node.left,0);
 assert.match(resourceBlocker(s,'meteor_ore'),/暂时采尽/);
 const saved=restore(JSON.stringify(s));
 assert.equal(saved.nodes['mine:meteor_ore'].left,0);
 advance(saved,1440-saved.minute);
 assert.equal(saved.day,2);assert.equal(saved.nodes['mine:meteor_ore'].left,0);
 advance(saved,1440);
 assert.equal(saved.day,3);assert.equal(saved.nodes['mine:meteor_ore'].left,1);
 assert.equal(resourceBlocker(saved,'meteor_ore'),null);
 assert.doesNotThrow(()=>restore(JSON.stringify(saved)));
});
test('every advanced recipe requires the correct deep ore and no tier is unreachable by recipe',()=>{
 const rare={3:'fine_ore',4:'cold_ore',5:'meteor_ore'};
 for(const item of Object.values(EQUIPMENT)){
  for(const [key,n] of Object.entries(item.materials))assert.ok(n>0,'positive quantity '+key);
  if(item.tier>=3)assert.equal(item.materials[rare[item.tier]],2,item.name);
 }
});

test('mobile release uses uniform version and preloads equipment logic offline',async()=>{
 const {readFileSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const dir=new URL('.',import.meta.url);
 const paths=['sw.js','index.html','manifest.webmanifest','app.js','engine.js','storage.js','commands.js','world.js','progression.js','martial-moves.js','martial-progression.js','combat-core.js','injury.js','equipment.js'];
 for(const path of paths){
  const txt=readFileSync(fileURLToPath(new URL(path,dir)),'utf8');
  assert.doesNotMatch(txt,/\?v=0\.(?:1\.0|2\.[01])/,path+' stale module version');
 }
 const sw=readFileSync(fileURLToPath(new URL('sw.js',dir)),'utf8');
 assert.match(sw,/VERSION='4\.23\.0'/);
 assert.match(sw,/'equipment\.js'/);
 assert.match(readFileSync(fileURLToPath(new URL('index.html',dir)),'utf8'),/青河县 4\.23\.0/);
});
