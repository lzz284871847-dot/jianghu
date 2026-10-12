import {schoolCanTeach} from './npc-school.js?v=5.10.0';
import {villageCanTeach} from './npc-village-school.js?v=5.10.0';
import {MARTIAL_ARTS} from './martial-data.js?v=5.10.0';
import {canLearn,availableMoves} from './martial-progression.js?v=5.10.0';
export function starterAdvice(s){
 const lines=['这些是可忽略的建议，不是强制主线。普通职业与武者都能完成县境目标。'];
 if((s.injuries?.cut||0)+(s.injuries?.critical||0)>0)lines.push('正在出血：先用药材处理切伤，或到河湾村找医者；带着出血睡觉可能危及生命。');
 else if(s.hp<60||s.energy<30)lines.push('先恢复身体：歇息免费，河湾村可免费借宿；药材在背包使用，医者诊金8文。');
 if(s.coins<8)lines.push('钱少仍能继续：歇息免费，止血后可到河湾村免费借宿；县城白天做短工，或去河湾村、南山脚采药；不要先把钱全部花在会费和租房。');
 if(!s.adventures.done.length)lines.push('第一条委托可从河湾村药材急单开始：交自己的药材2份；途中失败、逾期或撤回后可重新约定。');
 if(!Object.keys(s.martial.known).length)lines.push('想学武：到县城武馆，再打开人物页学青河长拳（8文）；练习和陪练之后，再考虑致命挑战。');
 else lines.push('学过的武学在人物页直接查看；未学武艺按阶折叠，门槛不足会显示原因。');
 return lines;
}
export function learningBlocker(s,id){
 if(s.dead||s.pending||s.combat)return '先处理眼前交手或选择。';
 if(s.minute<480||s.minute+60>1080)return '授艺08:00–18:00，需留足1小时。';
 const why=canLearn(s,id);if(why)return why;
 if(MARTIAL_ARTS[id].source==='village'?!villageCanTeach(s,id):!schoolCanTeach(s,id))return '授艺者正在休养、外出或未掌握这门武艺。';
 const holder=s.npcWorld[id&&MARTIAL_ARTS[id].source==='village'?'villageSchool':'school'].holder;
 const p=s.npcWorld.individuals[holder]||s.npcWorld.lineage.children.find(c=>c.id===holder);
 if(!p||p.life.deathDay||p.life.sickDays||p.life.restDay===s.day||(p.injuryDays??p.livelihood?.injuryDays))return '授艺者暂不能授课，请恢复后再来。';
 return null;
}
export function martialProgress(s,id){const m=s.martial;const plateau=(m.practice[id]||0)>=120&&(m.experience[id]||0)<6?' · 突破关口：需真实出招经验'+(m.experience[id]||0)+'/6，可去武馆陪练':'';return '熟练'+(m.practice[id]||0)+' · 领悟'+(m.insight[id]||0)+' · 实战'+(m.experience[id]||0)+' · 招式'+availableMoves(s,id).length+'/'+MARTIAL_ARTS[id].moves.length+'；一小时练习消耗12精力，熟练+24、领悟+6。'+plateau;}

export function recoveryAdvice(s){
 if(s.dead)return [];const lines=[];
 const bleeding=(s.injuries.cut||0)+(s.injuries.critical||0);
 if(bleeding)lines.push('正在出血：先止血；跨日会失血，免费歇息或借宿也可能危及生命。'+(s.bag.herb&&s.injuries.cut?'背包药材优先处理切伤。':'重伤需医者诊治，诊金8文。'));
 else if(s.hp<60||s.energy<30)lines.push('身体需要恢复：歇息免费，2小时恢复精力30、气血10；河湾村可免费借宿。');
 if(s.coins<8)lines.push('诊金不足：先处理出血；身体允许时可做白天短工，或采集并出售现有物资。租房和入会可暂缓。');
 if(s.adventures.failed.length&&!s.adventures.quest)lines.push('委托失败仍可继续：药材、护送和救援可回委托人处重新约定；失物不重复。');
 return lines;
}
