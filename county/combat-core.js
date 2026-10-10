import {MARTIAL_ARTS,DISTANCES,STANCES,INJURIES,OPPONENTS} from './martial-data.js?v=0.2.0';
// Deterministic tactical resolution. Caller supplies a seeded random source for uncertainty.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const ACTIONS=Object.freeze(['strike','heavy','guard','feint','sidestep','advance','retreat','flee']);
export function newCombat(opponent='brawler',martial='qinghe_fist'){
 if(!OPPONENTS[opponent]||!MARTIAL_ARTS[martial])throw Error('未知对手或武学');
 return {opponent,martial,round:0,distance:2,stance:'中正',enemyStance:'中正',enemyHp:100,enemyEnergy:100,playerGuard:0,enemyGuard:0,exits:1,history:[]};
}
export function intent(c){const type=OPPONENTS[c.opponent].style;if(c.enemyEnergy<18)return 'guard';if(c.distance>=3)return type==='kite'?'retreat':'advance';if(c.playerGuard>0)return type==='adapt'||type==='counter'?'feint':'strike';return ({rush:'heavy',cautious:'guard',reach:'strike',tempo:'strike',pressure:'heavy',defend:'guard',counter:'guard',kite:'retreat',adapt:c.round%3===0?'feint':'strike'})[type]||'strike';}
export function legal(c,action){return ACTIONS.includes(action)&&!(action==='retreat'&&c.distance===4)&&!(action==='advance'&&c.distance===0);}
export function resolve(c,player,action,rng=()=>.5){
 if(!legal(c,action))throw Error('当前距离无法执行此行动');
 if(player.dead||player.hp<=0)throw Error('角色已经死亡');
 const energy={strike:5,heavy:11,guard:3,feint:6,sidestep:5,advance:4,retreat:4,flee:6}[action];
 if(player.energy<energy)throw Error('精力不足');
 const enemy=intent(c),before={hp:player.hp,energy:player.energy,enemyHp:c.enemyHp};
 const log=[],injuries=player.injuries||{};
 player.energy-=energy;c.round++;
 const distanceBefore=c.distance;
 if(action==='advance')c.distance=clamp(c.distance-1,0,4);
 if(action==='retreat')c.distance=clamp(c.distance+1,0,4);
 if(action==='sidestep'){c.stance='游走';c.playerGuard=2;}else if(action==='guard'){c.stance='守势';c.playerGuard=5;}else if(action==='heavy'){c.stance='进逼';c.playerGuard=0;}else if(action==='feint'){c.stance='中正';c.playerGuard=1;}else if(action==='strike')c.playerGuard=0;
 if(action==='flee'){
  const advantage=(c.distance>=3?3:0)+(c.stance==='游走'?2:0)+(c.exits>0?2:0)-(c.enemyStance==='进逼'?2:0)-(injuries.fracture?3:0);
  const threshold=clamp(.28+advantage*.08,.08,.92);
  if(rng()<threshold){c.ended='escaped';log.push('成功脱离交手。');}
  else{log.push('撤退受阻，对手仍有机会追击。');c.distance=clamp(c.distance+1,0,4);}
 }else if(['strike','heavy','feint'].includes(action)){
  const reach=MARTIAL_ARTS[c.martial].category==='枪法'?3:['棍法','剑法','刀法'].includes(MARTIAL_ARTS[c.martial].category)?2:1;
  const inReach=c.distance<=reach;
  const base=action==='heavy'?18:action==='strike'?11:0;
  const accuracy=clamp(.78-(action==='heavy'?.18:0)-(c.distance===reach?.08:0)-(injuries.strain?.12:0)-(injuries.fracture?.22:0),.08,.95);
  if(action==='feint'){c.enemyGuard=0;log.push('虚招试探，削弱对方防守。');}
  else if(inReach&&rng()<accuracy){const dmg=Math.max(1,base-(enemy==='guard'?8:0)-c.enemyGuard);c.enemyHp=Math.max(0,c.enemyHp-dmg);log.push('命中对手，造成'+dmg+'点伤害。');}
  else log.push(inReach?'攻击未能命中。':'兵器距离不足，攻击落空。');
 }
 if(c.enemyHp<=0){c.ended='victory';log.push('对手失去继续战斗的能力。');}
 if(!c.ended){
  if(enemy==='advance')c.distance=clamp(c.distance-1,0,4);
  else if(enemy==='retreat')c.distance=clamp(c.distance+1,0,4);
  else if(enemy==='guard'){c.enemyGuard=5;c.enemyStance='守势';}
  else if(enemy==='feint'){c.playerGuard=0;c.enemyStance='游走';}
  else if(c.distance<= (['reach'].includes(OPPONENTS[c.opponent].style)?3:2)){
   const hit=clamp(.72-(action==='sidestep'?.24:0)-(action==='guard'?.12:0),.12,.9);
   if(rng()<hit){const damage=Math.max(1,(enemy==='heavy'?17:10)-c.playerGuard);player.hp=Math.max(0,player.hp-damage);log.push('对手命中，损失气血'+damage+'。');
    if(damage>=12&&rng()<.2){player.injuries??={};player.injuries.bruise=clamp((player.injuries.bruise||0)+1,1,5);log.push('新增擦伤瘀伤。');}
   }else log.push('避开对手攻击。');
  }
 }
 if(player.hp===0){player.dead=true;c.ended='death';log.push('角色死亡，不能自动复活。');}
 if(c.enemyEnergy>0)c.enemyEnergy=Math.max(0,c.enemyEnergy-(enemy==='heavy'?10:4));
 const result={round:c.round,action,enemyIntent:enemy,distanceBefore,distanceAfter:c.distance,hpDelta:player.hp-before.hp,energyDelta:player.energy-before.energy,enemyHpDelta:c.enemyHp-before.enemyHp,ended:c.ended||null,log};
 c.history.push(result);if(c.history.length>30)c.history.shift();return result;
}
export function combatCatalogValid(){return Object.keys(MARTIAL_ARTS).length===18&&Object.values(MARTIAL_ARTS).every(a=>a.moves.length===3)&&Object.keys(OPPONENTS).length===12&&Object.keys(INJURIES).length===6&&DISTANCES.length===5&&STANCES.length===5;}
