import {MARTIAL_ARTS} from './martial-data.js?v=0.2.0';
import {newCombat,resolve,enemyResponse,intent} from './combat-core.js?v=0.2.0';
import {useMove,usableMoves} from './martial-moves.js?v=0.2.0';
const MAX=2400;
export const makeMartial=()=>({known:{},equipped:'qinghe_fist',practice:{},insight:{},experience:{},mastery:{}});
export function ensureMartial(s){if(!s.martial)s.martial=makeMartial();return s.martial;}
export function canLearn(s,id){const art=MARTIAL_ARTS[id];if(!art)return '不存在这门武学。';const m=ensureMartial(s);if(m.known[id])return '已经学过。';if(art.tier>1){const trained=Object.entries(m.known).filter(([k,v])=>v&&MARTIAL_ARTS[k].tier===art.tier-1).length;if(trained<2)return '需先掌握至少两门前一阶段武学。';}if(s.place!=='school'&&s.place!=='village')return '请到武馆或河湾村寻找授艺机会。';if(s.coins<art.tier*8)return '学费不足。';return null;}
export function learn(s,id){const error=canLearn(s,id);if(error){s.result=[error];return false;}const art=MARTIAL_ARTS[id],m=ensureMartial(s);s.coins-=art.tier*8;m.known[id]=true;m.practice[id]=0;m.insight[id]=0;m.experience[id]=0;m.mastery[id]=0;if(!m.equipped||!m.known[m.equipped])m.equipped=id;s.result=['学会'+art.name+'的基础架构。','扣除学费'+art.tier*8+'文；招式需逐步练熟。'];return true;}
export function equip(s,id){const m=ensureMartial(s);if(!m.known[id]){s.result=['尚未学会这门武学。'];return false;}m.equipped=id;s.result=['当前使用'+MARTIAL_ARTS[id].name];return true;}
export function train(s,id){const m=ensureMartial(s),art=MARTIAL_ARTS[id];if(!art||!m.known[id]){s.result=['需要先学会这门武学。'];return false;}if(s.energy<12||s.hp<25){s.result=['身体状态不允许继续练习。'];return false;}s.energy-=12;m.practice[id]=Math.min(MAX,(m.practice[id]||0)+12);m.insight[id]=Math.min(MAX,(m.insight[id]||0)+3);s.result=['练习'+art.name,'精力 -12；熟练 +12；领悟 +3。'];return true;}
export function availableMoves(s,id){const m=ensureMartial(s),art=MARTIAL_ARTS[id];if(!art||!m.known[id])return [];const points=(m.practice[id]||0)+(m.insight[id]||0)+(m.experience[id]||0)+(m.mastery[id]||0);return art.moves.filter((move,i)=>i===0||points>=i*120);}
export function beginMartialCombat(s,opponent='brawler'){const m=ensureMartial(s);if(!m.known[m.equipped])throw Error('尚未学会当前武学');if(s.combat)throw Error('交手尚未结束');s.combat=newCombat(opponent,m.equipped);s.result=['与'+opponent+'交手。撤退并不保证成功。'];}
export function martialTurn(s,action,rng){if(!s.combat)throw Error('当前没有战斗');const result=resolve(s.combat,s,action,rng);const m=ensureMartial(s),id=s.combat.martial;if(action==='strike'||action==='heavy'||action==='feint'){m.experience[id]=Math.min(MAX,(m.experience[id]||0)+2);if(result.enemyHpDelta<0)m.mastery[id]=Math.min(MAX,(m.mastery[id]||0)+1);}if(result.ended){s.combat=null;}s.result=[...result.log, '距离 '+result.distanceAfter+'；对手意图 '+result.enemyIntent];return result;}

// Move turns resolve the chosen technique and an actual enemy response in one transaction.
export function martialMoveTurn(s,moveId,rng=()=>.5){
 if(!s.combat)throw Error('当前没有战斗');
 const c=s.combat,id=c.martial,m=ensureMartial(s),enemyHpBefore=c.enemyHp;
 const move=useMove(s,c,moveId,rng);
 m.experience[id]=Math.min(MAX,(m.experience[id]||0)+2);
 if(c.enemyHp<enemyHpBefore)m.mastery[id]=Math.min(MAX,(m.mastery[id]||0)+1);
 c.round++;
 const enemy=c.ended?null:intent(c);
 const response=c.ended?[]:enemyResponse(c,s,enemy,rng);
 const log=[...move.log,...response];
 c.history.push({round:c.round,move:moveId,enemyIntent:enemy,log});
 if(c.history.length>30)c.history.shift();
 s.result=log;
 if(c.ended)s.combat=null;
 return {move,ended:c.ended||null,log};
}

export {usableMoves};
