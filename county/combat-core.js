import {assessmentStyle} from './assessments.js?v=5.47.0';
import {bodyFleeBlocker,bodyFleeBonus} from './mobility.js?v=5.47.0';
import {trialModifiers} from './trials.js?v=5.47.0';
import {MARTIAL_ARTS,DISTANCES,STANCES,INJURIES,OPPONENTS} from './martial-data.js?v=5.47.0';
import {injuryEffects} from './injury.js?v=5.47.0';
import {equipmentBonuses,wearEquipment} from './equipment.js?v=5.47.0';
// Deterministic tactical resolution. Caller supplies a seeded random source for uncertainty.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const ACTIONS=Object.freeze(['strike','heavy','guard','feint','sidestep','advance','retreat','flee']);
export function newCombat(opponent='brawler',martial='qinghe_fist'){
 if(!OPPONENTS[opponent]||!MARTIAL_ARTS[martial])throw Error('未知对手或武学');
 return {opponent,martial,round:0,distance:2,stance:'中正',enemyStance:'中正',enemyHp:100,enemyEnergy:100,playerGuard:0,enemyGuard:0,exits:1,history:[]};
}
export function intent(c){const type=assessmentStyle(c)||OPPONENTS[c.opponent].style;if(c.assessment==='master'){if(c.enemyEnergy<18)return 'guard';if(c.distance>1)return 'advance';if(c.playerGuard>0&&c.round%3===0)return 'feint';if(c.enemyStance==='失衡'||c.round%3===1)return 'strike';return 'guard';}if(c.assessment==='farmer'&&c.distance<=1&&c.round%3===1)return 'retreat';if(c.assessment==='farmer'&&c.distance<=2&&c.round%3===0)return 'guard';if(c.enemyEnergy<18)return 'guard';if(c.distance===4)return 'advance';if(type==='reach'&&c.distance===3)return 'strike';if(type==='kite'&&c.distance<=1)return 'retreat';if(c.distance===3)return 'advance';if(c.playerGuard>0)return type==='adapt'||type==='counter'?'feint':'strike';return ({rush:'heavy',cautious:'guard',reach:'strike',tempo:'strike',pressure:'heavy',defend:'guard',counter:'guard',kite:'retreat',adapt:c.round%3===0?'feint':'strike'})[type]||'strike';}
export function legal(c,action){return ACTIONS.includes(action)&&!(action==='retreat'&&c.distance===4)&&!(action==='advance'&&c.distance===0);}
export function enemyResponse(c,player,enemy=intent(c),rng=()=>.5,action=''){ 
 const log=[];
 
  if(enemy==='advance')c.distance=clamp(c.distance-1,0,4);
  else if(enemy==='retreat')c.distance=clamp(c.distance+1,0,4);
  else if(enemy==='guard'){c.enemyGuard=5;c.enemyStance='守势';if(['counter','adapt'].includes(assessmentStyle(c)||OPPONENTS[c.opponent].style)&&action==='heavy'&&c.distance<=2&&rng()<.7){const damage=Math.max(1,12+trialModifiers(player,c).attack-c.playerGuard);const dealt=Math.min(Math.max(1,damage-equipmentBonuses(player).defense),Math.max(0,player.hp-(c.practice||c.assessment?40:0)));player.hp=Math.max(c.practice||c.assessment?40:0,player.hp-dealt);wearEquipment(player,'armor');log.push('对手看穿重击破绽，守中反击造成'+dealt+'点伤害。');}}
  else if(enemy==='feint'){c.playerGuard=0;c.enemyStance='游走';}
  else if(c.distance<= (['reach'].includes(assessmentStyle(c)||OPPONENTS[c.opponent].style)?3:2)){
   const hit=clamp(.72-(action==='sidestep'?.24:0)-(action==='guard'?.12:0),.12,.9);
   if(rng()<hit){const damage=Math.max(1,(enemy==='heavy'?17:10)+trialModifiers(player,c).attack-c.playerGuard);const dealt=Math.min(Math.max(1,damage-equipmentBonuses(player).defense),Math.max(0,player.hp-(c.practice||c.assessment?40:0)));player.hp=Math.max(c.practice||c.assessment?40:0,player.hp-dealt);wearEquipment(player,'armor');log.push('对手命中，损失气血'+dealt+'。');
    if(damage>=12&&rng()<.2){player.injuries??={};player.injuries.bruise=clamp((player.injuries.bruise||0)+1,1,5);log.push('新增擦伤瘀伤。');}
   }else log.push('避开对手攻击。');
  }

 if(player.hp===0){player.dead=true;c.ended='death';log.push('角色死亡，不能自动复活。');}
 c.enemyEnergy=Math.max(0,c.enemyEnergy-(enemy==='heavy'?10:4));
 return log;
}
export function resolve(c,player,action,rng=()=>.5,useBody=false){
 if(useBody){if(action!=='flee')throw Error('辅助身法用于撤退');const why=bodyFleeBlocker(player);if(why)throw Error(why);}
 if(!legal(c,action))throw Error('当前距离无法执行此行动');
 if(player.dead||player.hp<=0)throw Error('角色已经死亡');
 const energy=useBody?12:{strike:5,heavy:11,guard:3,feint:6,sidestep:5,advance:4,retreat:4,flee:Math.min(6,player.energy)}[action];
 if((c.practice||c.assessment)&&action==='flee'){c.ended='escaped';return {round:c.round,action,enemyIntent:c.assessment?'认输收手':'停止陪练',ended:'escaped',log:[c.assessment?'你认输示意收手，对方立即停止，不追击。':'你示意收手，陪练立即停止。'],distanceAfter:c.distance};}
 if(player.energy<energy)throw Error('精力不足');
 const enemy=intent(c),before={hp:player.hp,energy:player.energy,enemyHp:c.enemyHp};
 const log=[],injuries=player.injuries||{},effects=injuryEffects(player);
 player.energy-=energy;c.round++;
 const distanceBefore=c.distance;
 if(action==='advance')c.distance=clamp(c.distance-1,0,4);
 if(action==='retreat')c.distance=clamp(c.distance+1,0,4);
 if(action==='sidestep'){c.stance='游走';c.playerGuard=2;}else if(action==='guard'){c.stance='守势';c.playerGuard=5;}else if(action==='heavy'){c.stance='进逼';c.playerGuard=0;}else if(action==='feint'){c.stance='中正';c.playerGuard=1;}else if(action==='strike')c.playerGuard=0;
 if(action==='flee'){
  const advantage=(c.distance>=3?3:0)+(c.stance==='游走'?2:0)+(c.exits>0?2:0)-(c.enemyStance==='进逼'?2:0)-(injuries.fracture?3:0)-effects.movementPenalty;
  const bonus=useBody?bodyFleeBonus(player):0;const threshold=clamp(.28+advantage*.08-(before.energy<6?.16:0)+bonus,.08,.92);if(useBody)log.push('运身法撤退：精力12，成功率增加'+Math.round(bonus*100)+'个百分点，仍可能被追上。');
  if(rng()<threshold){c.ended='escaped';log.push('成功脱离交手。');}
  else{log.push('撤退受阻，对手仍有机会追击。');c.distance=clamp(c.distance+1,0,4);}
 }else if(['strike','heavy','feint'].includes(action)){
  const reach=MARTIAL_ARTS[c.martial].category==='枪法'?3:['棍法','剑法','刀法'].includes(MARTIAL_ARTS[c.martial].category)?2:1;
  const inReach=c.distance<=reach;
  const base=action==='heavy'?18:action==='strike'?11:0;
  const accuracy=clamp(.78-(action==='heavy'?.18:0)-(c.distance===reach?.08:0)-effects.accuracyPenalty,.08,.95);
  if(action==='feint'){c.enemyGuard=0;log.push('虚招试探，削弱对方防守。');}
  else if(inReach&&rng()<accuracy){const broken=c.enemyStance==='失衡';const dmg=Math.max(1,base+equipmentBonuses(player,c.martial).attack-trialModifiers(player,c).defense-(enemy==='guard'&&!broken?8:0)-c.enemyGuard);wearEquipment(player,'weapon');c.enemyHp=Math.max(c.assessment?40:0,c.enemyHp-dmg);log.push('命中对手，造成'+dmg+'点伤害。');}
  else log.push(inReach?'攻击未能命中。':'兵器距离不足，攻击落空。');
 }
 if(c.enemyHp<=(c.assessment?40:0)){c.ended='victory';log.push('对手失去继续战斗的能力。');}
 if(!c.ended)log.push(...enemyResponse(c,player,enemy,rng,action));
 // A feint breaks a freshly renewed guard until the following player attack.
 if(!c.ended&&action==='feint'&&c.distance<=2){c.enemyGuard=0;c.enemyStance='失衡';log.push('对手架势失衡，下次进攻可趁虚而入。');}
 if(player.hp===0){player.dead=true;c.ended='death';log.push('角色死亡，不能自动复活。');}

 const result={round:c.round,action,enemyIntent:enemy,distanceBefore,distanceAfter:c.distance,hpDelta:player.hp-before.hp,energyDelta:player.energy-before.energy,enemyHpDelta:c.enemyHp-before.enemyHp,ended:c.ended||null,log};
 c.history.push(result);if(c.history.length>30)c.history.shift();return result;
}
export function combatCatalogValid(){return Object.keys(MARTIAL_ARTS).length===18&&Object.values(MARTIAL_ARTS).every(a=>a.moves.length===3)&&Object.keys(OPPONENTS).length===12&&Object.keys(INJURIES).length===6&&DISTANCES.length===5&&STANCES.length===5;}
