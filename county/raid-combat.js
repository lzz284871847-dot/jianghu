import {MARTIAL_ARTS,OPPONENTS,INJURIES} from './martial-data.js?v=5.68.0';
import {EQUIPMENT,equipmentBonuses} from './equipment.js?v=5.68.0';
import {usableMoves} from './martial-moves.js?v=5.68.0';
import {basicAttackReach,newCombat} from './combat-core.js?v=5.68.0';
import {opponentBrief} from './trials.js?v=5.68.0';

// A read-only snapshot of existing combat rules; no score, predicted win rate or new gate.
export function raidCombatPreview(s,foe){
 const id=s.martial.equipped,art=MARTIAL_ARTS[id],known=!!s.martial.known[id],moves=usableMoves(s),bonuses=equipmentBonuses(s),initial=newCombat(foe,id),notes=[];
 const gear=slot=>{const key=s.equipment.equipped[slot],item=EQUIPMENT[key],left=item?s.equipment.owned[key]:0;return {key,item,left,text:!item?(slot==='weapon'?'未持兵器':'未穿护具'):item.name+'（耐久'+left+'/'+item.durability+'）'+(left===0?'已损坏，当前加成无效':'')};};
 const weapon=gear('weapon'),armor=gear('armor');
 if(weapon.item&&weapon.item.kind!==art.category)notes.push('兵器不适配当前'+art.category+'，兵器攻击加成无效');
 if(weapon.item&&weapon.left===0)notes.push('兵器已损坏');
 if(armor.item&&armor.left===0)notes.push('护具已损坏');
 const injuries=Object.entries(s.injuries).map(([key,n])=>INJURIES[key].name+'×'+n);if(injuries.length)notes.push('仍有伤势：'+injuries.join('、'));
 const reach=known?basicAttackReach(id):0,maxReach=known?Math.max(reach,...moves.map(m=>m.reach)):0;
 const range=!known?'尚未学会当前选用武艺，不能开始这场交手。':'起手距离'+initial.distance+'；普通攻击可及距离'+reach+'，当前可用招式最远距离'+maxReach+'。'+(maxReach<initial.distance?'从起手位置直接攻击会够不到，须调整距离或改走别的办法。':'是否能打中仍取决于当回合距离、招式与对手动作。');
 const brief='15分钟准备；'+OPPONENTS[foe].name+'：'+opponentBrief(foe)+'。当前'+(known?art.name:'未学当前武艺')+'，气血'+s.hp+'、精力'+s.energy+'，有效兵器攻击+'+bonuses.attack+'、护甲减伤'+bonuses.defense+'。'+(notes.length?notes.join('；')+'。':'')+'气血25、精力20只是开战门槛，不保证能打赢；可以改路或撤回。';
 const details=range+' '+weapon.text+'；'+armor.text+'。'+(moves.length?'已解锁招式：'+moves.map(m=>m.name+'（距离'+m.reach+'，精力'+m.energy+'）').join('、')+'。':'尚无已解锁招式。')+'尚可交手'+Math.max(0,2-s.raid.battles)+'场（本副本最多两场）。交手会提高警戒到2，消耗实际气血、精力与耐久，可能永久死亡；同伴不代打。撤退可能失败，失败后对手仍可追击；距离、伤势和精力影响脱身。获胜不回血、不补精力、不追加掉落；换装换艺须先在寨外准备，入寨后不能临时更换；潜入与交涉仍按实际条件办理，撤回后副本不重开。';
 return {brief,details,artName:art.name,known,reach,maxReach,bonuses,weapon:weapon.text,armor:armor.text,notes};
}
