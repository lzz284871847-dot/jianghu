import {settleExplorationCombat} from './exploration.js?v=5.3.0';
import {finishFeedbackBout} from './world-feedback.js?v=5.3.0';
import {recordAdventureVictory} from './adventures.js?v=5.3.0';
import {MARTIAL_ARTS,OPPONENTS} from './martial-data.js?v=5.3.0';
import {newCombat,resolve,enemyResponse,intent} from './combat-core.js?v=5.3.0';
import {useMove,usableMoves} from './martial-moves.js?v=5.3.0';
const MAX=2400;
export const makeMartial=()=>({known:{},equipped:'qinghe_fist',practice:{},insight:{},experience:{},mastery:{},rewardDays:{}});
export function ensureMartial(s){if(!s.martial)s.martial=makeMartial();return s.martial;}
export function canLearn(s,id){const art=MARTIAL_ARTS[id];if(!art)return '不存在这门武学。';const m=ensureMartial(s);if(m.known[id])return '已经学过。';if(art.tier>1){const trained=Object.entries(m.known).filter(([k,v])=>v&&MARTIAL_ARTS[k].tier===art.tier-1&&(m.practice[k]||0)>=120).length;if(trained<2)return '需先把至少两门前一阶段武学练至熟练（各120点）。';}const teachingPlace=art.source==='village'?'village':'school';if(s.place!==teachingPlace)return teachingPlace==='village'?'这门武学要到河湾村求教。':'这门武学需到县城武馆求教。';if(art.tier>1){const trust=art.tier===2?5:12;if((s.relations?.master||0)<trust)return '高阶授艺需周师傅信任达到'+trust+'点，请先在武馆结识教习。';}if(s.coins<art.tier*8)return '学费不足。';return null;}
export function learn(s,id){const error=canLearn(s,id);if(error){s.result=[error];return false;}const art=MARTIAL_ARTS[id],m=ensureMartial(s);s.coins-=art.tier*8;m.known[id]=true;m.practice[id]=0;m.insight[id]=0;m.experience[id]=0;m.mastery[id]=0;if(!m.equipped||!m.known[m.equipped])m.equipped=id;s.result=['学会'+art.name+'的基础架构。','扣除学费'+art.tier*8+'文；招式需逐步练熟。'];return true;}
export function equip(s,id){const m=ensureMartial(s);if(!m.known[id]){s.result=['尚未学会这门武学。'];return false;}m.equipped=id;s.result=['当前使用'+MARTIAL_ARTS[id].name];return true;}
export function train(s,id,playerSession=false){const m=ensureMartial(s),art=MARTIAL_ARTS[id];if(!art||!m.known[id]){s.result=['需要先学会这门武学。'];return false;}if((m.practice[id]||0)>=MAX&&(m.insight[id]||0)>=MAX){s.result=['这门武学的练习积累已满，不再消耗时间与精力。'];return false;}if(s.energy<12||s.hp<25){s.result=['身体状态不允许继续练习。'];return false;}s.energy-=12;m.practice[id]=Math.min(MAX,(m.practice[id]||0)+(playerSession?24:12));m.insight[id]=Math.min(MAX,(m.insight[id]||0)+(playerSession?6:3));s.result=['练习'+art.name,playerSession?'精力 -12；熟练 +24；领悟 +6。':'精力 -12；熟练 +12；领悟 +3。'];return true;}
export function availableMoves(s,id){const m=ensureMartial(s),art=MARTIAL_ARTS[id];if(!art||!m.known[id])return [];const points=(m.practice[id]||0)+(m.insight[id]||0)+(m.experience[id]||0)+(m.mastery[id]||0);return art.moves.filter((move,i)=>i===0||points>=i*120);}
export function beginMartialCombat(s,opponent='brawler'){const m=ensureMartial(s);if(!m.known[m.equipped])throw Error('尚未学会当前武学');if(s.combat)throw Error('交手尚未结束');s.combat=newCombat(opponent,m.equipped);s.result=['与'+OPPONENTS[opponent].name+'交手。撤退并不保证成功。'];}
// Victory grants limited insight, not free equipment or money. Flight and death grant no victory reward.
function stopPractice(s,c,log){if(c.practice&&!c.ended&&(s.hp<=40||c.enemyHp<=40||c.round>=12||s.energy<3)){c.ended='practice';log.push('达到收手线或本轮练习上限，陪练停止。');}}
function finalizeCombat(s,c,log){
 recordAdventureVictory(s,c);settleExplorationCombat(s,c,log);finishFeedbackBout(s,c,log);
 if(c.practice&&c.round>=3&&s.npcWorld?.school.holder==='master'&&s.talkDays&&s.talkDays.master!==s.day){s.relations.master=Math.min(100,s.relations.master+1);s.talkDays.master=s.day;log.push('完成至少三回合实际陪练，与周师傅熟悉1点；与今日交谈共用一次熟悉机会。');}
 if(c.practice){log.push('陪练结束，保留实际耗费和招式积累，不发实战胜利领悟、钱物或装备。');return;}
 if(c.ended==='victory'){
  const narrow=s.hp<=30;
  const baseGain=narrow?6:s.hp<=60?4:2;
  const m=ensureMartial(s),id=c.martial;
  m.rewardDays??={};
  const repeated=m.rewardDays[c.opponent]===s.day;
  const gain=repeated?0:baseGain;
  if(!repeated)m.rewardDays[c.opponent]=s.day;
  m.insight[id]=Math.min(MAX,(m.insight[id]||0)+gain);
  log.push(narrow?'险胜保命，伤势沉重，需尽快疗伤。':s.hp<=60?'苦战取胜，伤势不轻。':'交手获胜，仍须提防下一场恶战。');
  log.push(repeated?'今天已从此类对手得到实战领悟，再战无额外领悟。':'实战领悟 +'+gain+'；没有额外钱财或神兵掉落。');
 }else if(c.ended==='escaped')log.push('成功脱身，未获得胜利奖励；气血和伤势保留。');
 else if(c.ended==='death')log.push('战败身亡，这段人生结束。');
}
export function martialTurn(s,action,rng){if(!s.combat)throw Error('当前没有战斗');const result=resolve(s.combat,s,action,rng);const m=ensureMartial(s),id=s.combat.martial;if(action==='strike'||action==='heavy'||action==='feint'){m.experience[id]=Math.min(MAX,(m.experience[id]||0)+2);if(result.enemyHpDelta<0)m.mastery[id]=Math.min(MAX,(m.mastery[id]||0)+1);}stopPractice(s,s.combat,result.log);result.ended=s.combat.ended||null;if(result.ended){finalizeCombat(s,s.combat,result.log);s.combat=null;}s.result=[...result.log, '距离 '+result.distanceAfter+'；对手意图 '+result.enemyIntent];return result;}

// Move turns resolve the chosen technique and an actual enemy response in one transaction.
export function martialMoveTurn(s,moveId,rng=()=>.5){
 if(!s.combat)throw Error('当前没有战斗');
 const c=s.combat,id=c.martial,m=ensureMartial(s),enemyHpBefore=c.enemyHp;
 const move=useMove(s,c,moveId,rng);
 m.experience[id]=Math.min(MAX,(m.experience[id]||0)+2);
 if(c.enemyHp<enemyHpBefore)m.mastery[id]=Math.min(MAX,(m.mastery[id]||0)+1);
 c.round++;
 const enemy=c.ended?null:intent(c);
 const response=c.ended?[]:enemyResponse(c,s,enemy,rng,move.move&&MARTIAL_ARTS[id].category==='身法'?'sidestep':'move');
 const log=[...move.log,...response];
 c.history.push({round:c.round,move:moveId,enemyIntent:enemy,log});
 if(c.history.length>30)c.history.shift();
 stopPractice(s,c,log);
 if(c.ended)finalizeCombat(s,c,log);
 s.result=log;
 if(c.ended)s.combat=null;
 return {move,ended:c.ended||null,log};
}

export {usableMoves};
