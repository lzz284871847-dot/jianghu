import {MARTIAL_ARTS} from './martial-data.js?v=5.73.0';
import {people} from './content.js?v=5.73.0';
import {travelBusy} from './npc-journeys.js?v=5.73.0';
import {companionBusy} from './companions.js?v=5.73.0';
// Two named, bounded exercises. Instructor arts are the existing teaching roles,
// never a new NPC lineage or an inferred martial history for ordinary residents.
export const ASSESSMENTS={
 master:{name:'周师傅 · 拆招考较',place:'school',art:'qinghe_fist',foe:'boxer',trust:8,required:240,fee:4,lessonFee:8,style:'counter',advice:'拳掌需贴近，先拆防再出招；盲目重击会遭守中反击。专题：拆招复盘。'},
 farmer:{name:'陈农户 · 刀棍考较',place:'fields',art:'staff',foe:'staffhand',trust:4,required:120,fee:2,lessonFee:6,style:'reach',advice:'农家棍法擅长长距离，稳守与进退交替；刀法需把握逼近时机。专题：长短兵进退。'}
};
const empty=()=>({attempts:0,wins:0,losses:0,withdrawals:0,lastDay:0,lessonArt:''});
export const makeAssessments=()=>({active:null,records:Object.fromEntries(Object.keys(ASSESSMENTS).map(id=>[id,empty()]))});
const exact=(v,keys)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export const assessmentArtValid=(id,art)=>!!MARTIAL_ARTS[art]&&(id==='farmer'?['wood_knife','staff'].includes(art):MARTIAL_ARTS[art].source==='school'&&!['身法','内功'].includes(MARTIAL_ARTS[art].category));
export function assessmentsValid(s){const a=s.assessments;if(!exact(a,['active','records'])||!exact(a.records,Object.keys(ASSESSMENTS))||a.active!==null&&!ASSESSMENTS[a.active])return false;
 for(const [id,d] of Object.entries(ASSESSMENTS)){const r=a.records[id];if(!exact(r,Object.keys(empty()))||!['attempts','losses','withdrawals'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0&&r[k]<=100000)||![0,1].includes(r.wins)||!Number.isSafeInteger(r.lastDay)||r.lastDay<0||r.lastDay>s.day||!!r.attempts!==!!r.lastDay||r.attempts!==r.wins+r.losses+r.withdrawals+(a.active===id?1:0)||typeof r.lessonArt!=='string'||r.lessonArt&&(!r.wins||!assessmentArtValid(id,r.lessonArt)||s.martial.known[r.lessonArt]!==true))return false;}
 const c=s.combat;if(a.active===null)return !Object.hasOwn(c||{},'assessment');
 const id=a.active,d=ASSESSMENTS[id],r=a.records[id];return !s.dead&&!!c&&!c.ended&&c.assessment===id&&!c.practice&&c.opponent===d.foe&&s.place===d.place&&assessmentArtValid(id,c.martial)&&s.martial.known[c.martial]===true&&s.martial.equipped===c.martial&&r.lastDay===s.day&&!r.wins&&s.hp>40&&s.energy>=3&&c.enemyHp>40&&c.enemyEnergy>=4&&c.enemyEnergy===s.npcWorld.individuals[id].energy&&c.round<20;
}
export function assessmentBlocker(s,id,action){const d=ASSESSMENTS[id],r=s.assessments?.records[id];if(!d||!r||!['start','lesson'].includes(action))return '没有这项人物考较行动。';
 if(s.dead||s.pending||s.combat||s.adventures.law.pursuit||s.assessments.active)return '先处理眼前选择或交手；永久死亡后不能考较或授艺。';
 if(['active'].includes(s.fort.status)||s.raid.status==='active'||s.dungeon.status==='active')return '先结束正在进行的副本。';
 if(s.adventures.companions.active)return '先结束短途同行，再单独约考较或授艺。';
 if(action==='start'&&r.wins)return '已获此人认可，考较不重复发奖；可领取未用的专题授艺。';
 if(action==='start'&&(r.lastDay===s.day||r.attempts>=100000))return '今日已约过此人，失败与撤回保留；恢复后改日再约。';
 if(action==='lesson'&&(!r.wins||r.lessonArt))return '需先获考较认可；每人的专题授艺只用一次。';
 const p=s.npcWorld.individuals[id],hours=people[id],minutes=action==='start'?50:90,fee=action==='start'?d.fee:d.lessonFee;
 if(id==='master'&&s.npcWorld.school.holder!=='master'||id==='farmer'&&s.npcWorld.villageSchool.holder!=='farmer')return '此人的原有授艺岗位已改变，不能替现任教习接洽考较。';
 if(s.place!==d.place||s.minute<hours.open||s.minute+minutes>hours.close||travelBusy(s,id)||companionBusy(s,id)||p.life.deathDay||p.retirement.active||p.life.sickDays||p.life.restDay===s.day||p.injuryDays||p.energy<(action==='start'?40:16))return '需'+hours.name+'在'+(id==='farmer'?'河湾田地':'县城武馆')+'在岗且有精力；休养、外出或退养时可拒绝，留足准备及交手/授艺时间。';
 if(s.relations[id]<d.trust||s.socialActions?.[id]?.quarrel>=s.day-2)return '需关系'+d.trust+'，近期争执先赔礼；不会强迫此人出手。';
 if(s.hp<60||s.energy<(action==='start'?30:16)||Object.keys(s.injuries).length)return '需气血60、无伤势和精力'+(action==='start'?30:16)+'；原伤势与耗费不自动恢复。';
 const m=s.martial,art=m.equipped;if(!m.known[art]||!assessmentArtValid(id,art)||(m.practice[art]||0)<d.required||(m.experience[art]||0)<6)return '需选用'+(id==='farmer'?'已学柴刀法或农家棍法':'已学武馆攻防武艺')+'，熟练'+d.required+'、实际出招经验6；内功身法不能单独替代攻防考较。';
 if(action==='lesson'&&m.practice[art]>=2400&&m.insight[art]>=2400)return '所选武艺的专题练习积累已满，不收费也不占用机会。';
 if(s.coins<fee||p.coins>1000000-fee)return '需自己的'+fee+'文实际付给'+hours.name+'，钱袋不足或对方无法收款时不开始。';return null;
}
export function assessmentAction(s,id,action,{settle,begin}){const why=assessmentBlocker(s,id,action);if(why){s.result=[why];return false;}const d=ASSESSMENTS[id],r=s.assessments.records[id],p=s.npcWorld.individuals[id],lesson=action==='lesson',fee=lesson?d.lessonFee:d.fee;
 return settle(s,d.name+' · '+(lesson?'专题授艺':'约定考较'),lesson?90:30,lesson?16:4,()=>{s.coins-=fee;p.coins+=fee;p.energy-=lesson?16:6;
  if(lesson){const art=s.martial.equipped,m=s.martial,oldP=m.practice[art],oldI=m.insight[art];m.practice[art]=Math.min(2400,oldP+48);m.insight[art]=Math.min(2400,oldI+24);r.lessonArt=art;s.result.push('专题复盘与对练：'+MARTIAL_ARTS[art].name+'熟练+'+(m.practice[art]-oldP)+'、领悟+'+(m.insight[art]-oldI)+'；不补造实战经验、不新授整门武学。机会已用，不重领。');p.history=['第'+s.day+'日为'+s.name+'完成一次专题授艺，实收'+fee+'文。',...p.history].slice(0,8);}
  else{begin(s,d.foe);s.result=[people[id].name+'同意约定考较，认输即可立即收手，不会追击。'];s.combat.assessment=id;s.combat.distance=id==='farmer'?3:2;s.combat.enemyEnergy=p.energy;s.assessments.active=id;r.attempts++;r.lastDay=s.day;s.result.push(d.advice,'约定收手：任一方气血到40、满20回合或精力不足即停止；可随时认输，不遭追击。气血、擦伤、精力与耐久耗费保留，不发野外钱物。');}
  s.result.push(fee+'文实际付给'+people[id].name+'，对方精力消耗'+(lesson?16:6)+'。');
 });
}
export const assessmentStyle=c=>ASSESSMENTS[c?.assessment]?.style;
export const assessmentModifiers=(s,c)=>s.assessments?.active===c?.assessment&&ASSESSMENTS[c?.assessment]?{attack:c.assessment==='master'?2:1,defense:2}:null;
export function stopAssessment(s,c,log){if(!c.assessment)return;const p=s.npcWorld.individuals[c.assessment];p.energy=Math.min(p.energy,c.enemyEnergy);c.enemyHp=Math.max(40,c.enemyHp);
 if(c.ended==='victory'||c.enemyHp<=40){c.ended='victory';log.push('对方达到约定收手线。');}
 else if(!c.ended&&(s.hp<=40||s.energy<3||c.enemyEnergy<4||c.round>=20)){c.ended='assessment';log.push('达到收手线、精力或20回合上限，考较停止，本次未获认可。');}
}
export function finishAssessment(s,c,log){const id=c.assessment,d=ASSESSMENTS[id];if(!d||s.assessments.active!==id)return;const r=s.assessments.records[id];s.assessments.active=null;
 if(c.ended==='victory'){r.wins=1;s.relations[id]=Math.min(100,s.relations[id]+1);log.push('获'+people[id].name+'认可，开放一次付费专题授艺；不赠钱物、不恢复状态。');}
 else if(c.ended==='escaped'){r.withdrawals++;log.push('主动认输，立即收手；原耗费保留，改日可再约。');}else{r.losses++;log.push('本次未获认可，伤势、精力与耐久保留，恢复后改日可再约。');}
 const p=s.npcWorld.individuals[id];p.history=['第'+s.day+'日与'+s.name+'约定考较，'+(r.wins?'认可其应对。':'平安收手，暂未认可。'),...p.history].slice(0,8);
}
export function assessmentOptions(s){return Object.entries(ASSESSMENTS).filter(([,d])=>s.place===d.place).flatMap(([id,d])=>{const r=s.assessments.records[id],action=r.wins?'lesson':'start';if(r.lessonArt)return [];return [{id:'assessment:'+id+':'+action,label:d.name+' · '+(action==='start'?'约定交手':'一次专题授艺'),preview:action==='start'?d.advice+' 建议气血与精力备足至100；开始门槛不代表足以获胜，失败可认输并改日再约。关系'+d.trust+'、熟练'+d.required+'、实际出招经验6；准备30分钟/精力4/'+d.fee+'文，每回合1分钟，最多20回合；主动认输立即收手，可受伤，改日再约。':'选用适合且已学武艺，90分钟/精力16/'+d.lessonFee+'文；熟练最多+48、领悟最多+24，老师精力-16；仅一次，不补实战经验。',blocker:assessmentBlocker(s,id,action)}];});}
export function assessmentSummary(s){return Object.entries(ASSESSMENTS).map(([id,d])=>{const r=s.assessments.records[id];return d.name+'：'+(s.assessments.active===id?'正在考较':r.lessonArt?'已完成专题 · '+MARTIAL_ARTS[r.lessonArt].name:r.wins?'已获认可，专题尚未用':'尚未获认可')+'；尝试'+r.attempts+'、未获认可'+r.losses+'、认输'+r.withdrawals+'。';});}

