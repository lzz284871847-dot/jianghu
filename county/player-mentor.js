import {rememberExperience} from './county-life.js?v=5.66.0';
import {MARTIAL_ARTS} from './martial-data.js?v=5.66.0';
import {TRIALS} from './trials.js?v=5.66.0';
export const MENTOR_TASKS={delivery:{name:'送木料到作坊',description:'3日内交自己木料2份给许铁匠，再回武馆结算8文；交付后材料用于作业，撤回不退。'},inquiry:{name:'查访竹林小径',description:'3日内查明竹林小径。可稳妥查访45分钟/精力8；冒险快查15分钟/精力8、60%查明、失败擦伤6气血；师徒信任4可在街市凭身份向掌柜查问30分钟/精力1。回馆结算6文。'},spar:{name:'实际切磋考察',description:'3日内在武馆付正常陪练费，至少实际交手3回合并收手，再向师傅交代；不足3回合记未完成。保留气血、精力与耐久耗费，可随时收手，无钱物奖励。'}};
export const makePlayerMentor=()=>({member:false,joinedDay:0,trust:0,tasks:{delivery:'none',inquiry:'none',spar:'none'},active:null,dueDay:0,stage:0,sparring:false,lessonDay:0,lastDrill:null,parcelHint:false});
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),int=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
export function playerMentorValid(s){const m=s.adventures.mentor;if(!obj(m)||Object.keys(m).length!==11||typeof m.member!=='boolean'||!int(m.joinedDay,s.day)||!int(m.trust,10)||!int(m.lessonDay,s.day)||!int(m.stage,1)||typeof m.sparring!=='boolean'||typeof m.parcelHint!=='boolean'||m.lastDrill!==null&&!Object.hasOwn(TRIALS,m.lastDrill)||!obj(m.tasks)||Object.keys(m.tasks).length!==3||!Object.keys(MENTOR_TASKS).every(id=>['none','active','done','failed'].includes(m.tasks[id])))return false;
 if(!m.joinedDay&&(m.member||m.trust||m.lessonDay||m.lastDrill||m.parcelHint||Object.values(m.tasks).some(v=>v!=='none')))return false;
 if(m.active===null)return m.dueDay===0&&m.stage===0&&!m.sparring&&!Object.values(m.tasks).includes('active');
 return !!MENTOR_TASKS[m.active]&&m.member&&m.tasks[m.active]==='active'&&Object.values(m.tasks).filter(v=>v==='active').length===1&&(m.stage===1?m.dueDay===0:int(m.dueDay,s.day+3)&&m.dueDay>=m.joinedDay)&&(!m.sparring||m.active==='spar'&&m.stage===0&&s.place==='school'&&s.combat?.practice===true);
}
function finish(s,success){const m=s.adventures.mentor;m.tasks[m.active]=success?'done':'failed';m.active=null;m.dueDay=0;m.stage=0;m.sparring=false;m.trust=Math.max(0,Math.min(10,m.trust+(success?2:-1)));}
export function expirePlayerMentor(s){const m=s.adventures?.mentor;if(!m?.active)return;if(s.dead||m.stage===0&&s.day>m.dueDay){const title=MENTOR_TASKS[m.active].name;finish(s,false);s.news.unshift(title+'未完成，师徒信任 -1，无罚款；已经交付的材料不退。');s.news.length=Math.min(20,s.news.length);}}
export function finishMentorPractice(s,c,log){const m=s.adventures?.mentor;if(!m?.sparring||!c.practice)return;m.sparring=false;if(c.round>=3){m.stage=1;m.dueDay=0;log.push('至少三回合实际切磋已完成，可向师傅交代；未自动结算事务。');}else{finish(s,false);log.push('切磋不足三回合，事务记未完成，师徒信任 -1；不罚钱。');}}
export const mentorParcelChance=s=>s.adventures.mentor.member&&s.adventures.mentor.trust>=4&&s.adventures.mentor.parcelHint ? .85 : .7;
export function canStartMentorPractice(s){expirePlayerMentor(s);const m=s.adventures.mentor;return m.member&&m.active==='spar'&&m.stage===0&&!m.sparring;}
export function playerMentorAction(s,id,{present,transact,advance,rng}){
 const [,kind,key]=id.split(':'),m=s.adventures.mentor,p=s.npcWorld.individuals.master,fail=t=>{s.result=[t];return false;};expirePlayerMentor(s);
 if(kind==='join'){
  if(m.member||s.adventures.life?.sect.river||!Object.keys(s.martial.known).length||s.relations.master<3||s.npcWorld.school.holder!=='master'||!present(s,'master',30))return fail('正式拜师需先退出河湾习武会、已学一门武艺、周师傅关系3，并在其健康在馆时接洽。');
  return transact(s,m.joinedDay?'重新拜入周师傅门下':'正式拜周师傅为师',30,0,()=>{m.member=true;if(!m.joinedDay){m.joinedDay=s.day;m.trust=2;}s.result.push('无拜师费或赠物；事务自主领取，首次信任2。退出后任务、信任、指点记录均保留，不重置有限收益。');},advance);
 }
 if(!m.member)return fail('需先正式拜师；独自练习、付费求学和原有职业仍可继续。');
 if(kind==='leave')return transact(s,'退出师门',15,0,()=>{if(m.active)finish(s,false);m.member=false;if(s.adventures.life?.sect.letters.school==='carried')s.adventures.life.sect.letters.school='failed';m.trust=Math.max(0,m.trust-1);s.result.push('退出使师徒信任 -1；未完事务结束，已交材料不退。不罚钱，已学武艺和原有学习渠道保留。');},advance);
 if(kind==='withdraw'){if(!m.active||m.sparring)return fail('没有可撤回的师门事务；交手需先收手。');return transact(s,'撤回师门事务',0,0,()=>{finish(s,false);s.result.push('本项事务记未完成，信任 -1；不罚钱，不重开此有限事务，已交材料不退。');},advance);}
 if(kind==='task'){
  if(!MENTOR_TASKS[key]||m.active||m.tasks[key]!=='none'||!present(s,'master',15))return fail('事务已处理或仍有未完事务；请在师傅可接洽时自主领取。');
  return transact(s,'领取：'+MENTOR_TASKS[key].name,15,0,()=>{m.active=key;m.tasks[key]='active';m.dueDay=s.day+3;m.stage=0;s.result.push(MENTOR_TASKS[key].description,'截止第'+m.dueDay+'日；实际步骤完成后可等师傅可接洽再结算，没有每日强制功课。');},advance);
 }
 if(kind==='step'){
  if(m.stage||!m.active)return fail('请先领取并按步骤处理事务。');
  if(m.active==='delivery'&&key==='deliver'){
   if(!present(s,'smith',30)||s.bag.wood<2)return fail('需在作坊许铁匠可接洽时交自己木料2份。');
   return transact(s,'交木料给作坊',30,4,()=>{s.bag.wood-=2;m.stage=1;m.dueDay=0;s.result.push('木料2份用于实际作业；回武馆向师傅结算，尚未支付报酬。');},advance);
  }
  if(m.active==='inquiry'&&['careful','quick','identity'].includes(key)){
   if(key==='identity'?(m.trust<4||!present(s,'merchant',30)):s.place!=='bamboo')return fail('查访需到竹林；身份接洽需信任4、柳掌柜在街市健康在场。');
   if(s.hp<25)return fail('需气血至少25再查访，仍可撤回。');
   return transact(s,'查访小径',key==='identity'?30:key==='careful'?45:15,key==='identity'?1:8,()=>{if(key==='quick'&&rng()>=.6){s.hp-=6;finish(s,false);s.result.push('快查未能查明并擦伤6气血，事务未完成，信任 -1，无报酬。');}else{m.stage=1;m.dueDay=0;s.result.push(key==='identity'?'以周师傅门人身份接洽，掌柜提供小径情况；回馆交代。':'查明小径可通行，回馆向师傅交代；无额外物资。');}},advance);
  }
  return fail('当前事务、地点或步骤不符。');
 }
 if(kind==='report'){
  if(!m.active||m.stage!==1||!present(s,'master',15))return fail('完成真实步骤后，在师傅可接洽时交代。');
  const reward=m.active==='delivery'?8:m.active==='inquiry'?6:0;if(p.coins<reward||s.coins>10000000-reward)return fail('师傅现有余额不足，尚未结算；可稍后交代。');
  return transact(s,'交代师门事务',15,0,()=>{p.coins-=reward;s.coins+=reward;finish(s,true);rememberExperience(s,'master','cooperation',true);s.result.push('事务完成，师徒信任 +2；实际报酬'+reward+'文从师傅余额支付，仅一次。');},advance);
 }
 if(kind==='hint'){
  if(key!=='parcel'||m.trust<4||m.parcelHint||s.adventures.quest?.id!=='parcel'||s.adventures.quest.stage!==0||!present(s,'merchant',30))return fail('需信任4、尚未查问的竹林失物委托，并在掌柜可接洽时凭师门身份查问。');
  return transact(s,'凭师门身份查问失物线索',30,1,()=>{m.parcelHint=true;s.result.push('掌柜指出货包落点，实际竹林搜寻成功率由70%提高到85%；仍要走访、付出精力并承担失败，不直接发物资。退出师门或信任不足时线索加成暂停。');},advance);
 }
 if(kind==='guide'||kind==='drill'||kind==='rebuild'){
  const art=s.martial.equipped,known=s.martial.known[art],d=Object.hasOwn(TRIALS,key)?TRIALS[key]:null,fee=kind==='drill'?4:6;
  if((kind==='rebuild'?(m.trust>=4||!Object.values(m.tasks).includes('failed')):m.trust<4)||!known||m.lessonDay===s.day||s.adventures.life?.sect.lessonDay===s.day||!present(s,'master',60)||s.npcWorld.school.holder!=='master'||p.energy<20||s.hp<25||Object.keys(s.injuries).length||kind==='drill'&&!d)return fail('需信任4（或失约后通过练习重建）、已学选用武艺、气血25且无伤、今日未指点；师傅须在馆并有20精力。');
  if(s.coins<fee||p.coins>1000000-fee)return fail('费用'+fee+'文，须有实际资金才能接受指点。');
  if(s.martial.practice[art]>=2400&&s.martial.insight[art]>=2400)return fail('积累已满，不收费或耗费精力。');
  return transact(s,kind==='guide'?'接受师傅指点':kind==='rebuild'?'通过实际练习重建信任':'针对'+d.name+'备战练习',60,12,()=>{s.coins-=fee;p.coins+=fee;p.energy-=20;p.workDays=Math.min(100000,p.workDays+1);s.martial.practice[art]=Math.min(2400,s.martial.practice[art]+(kind==='guide'?36:24));s.martial.insight[art]=Math.min(2400,s.martial.insight[art]+(kind==='rebuild'?6:10));m.lessonDay=s.day;if(kind==='rebuild')m.trust=Math.min(4,m.trust+1);if(kind==='drill')m.lastDrill=key;s.result.push(MARTIAL_ARTS[art].name+'：熟练 +'+(kind==='guide'?36:24)+'、领悟 +'+(kind==='rebuild'?6:10)+'；费用'+fee+'文转入师傅余额。','每日指点与备战共用一次机会，不直接学习高阶武功。');if(kind==='rebuild')s.result.push('失约事务不重开；本次实际练习使师徒信任 +1，最多恢复到4。');if(d&&kind==='drill')s.result.push(d.advice,'练习应对上述战术；实际挑战仍由自己进行，没有自动胜利或临时战力加成。');},advance);
 }
 return fail('没有这项师门行动。');
}
export function playerMentorOptions(s){const m=s.adventures.mentor,out=[],add=(kind,label,preview)=>out.push({id:'mentor:'+kind,label,preview});if(s.place==='school'&&!m.member)add('join',m.joinedDay?'重新拜师 · 周师傅':'正式拜师 · 周师傅','已学武艺、关系3，师傅健康在馆；30分钟，无拜师费或赠物。首次信任2，既有任务和信任不重置。');if(!m.member)return out;
 if(s.place==='school'){for(const [id,d] of Object.entries(MENTOR_TASKS))if(!m.active&&m.tasks[id]==='none')add('task:'+id,'师门事务 · '+d.name,d.description);if(m.stage===1)add('report','向师傅交代事务','15分钟；真实步骤完成才结算，信任+2，报酬从师傅余额支付。');if(m.active==='spar'&&!m.stage&&!m.sparring)add('spar:start','师门切磋 · 开始实际陪练','正常陪练费用与身体条件；至少3回合并收手再交代，无金钱奖励；不足3回合记未完成。');if(m.trust<4&&Object.values(m.tasks).includes('failed'))add('rebuild','实际练习重建信任 · 6文','失约后仍可重新建立信任；1小时/精力12，熟练24、领悟6、信任+1，最多恢复到4；每日与指点备战共用一次，失败事务不重开。');if(m.trust>=4){const plateau=(s.martial.practice[s.martial.equipped]||0)>=120&&(s.martial.experience[s.martial.equipped]||0)<6?' 当前熟练已到关口：普通练习需先积累真实出招经验，可先参加武馆陪练；师傅付费指点仍按原有规则进行。':'';add('guide','师傅指点 · 6文','已学选用武艺，无伤，1小时/精力12；熟练36、领悟10。师徒信任4，每日指点与备战共用一次，师傅须有精力；封顶不收费。'+plateau);for(const [id,d] of Object.entries(TRIALS))add('drill:'+id,'备战指点 · '+d.name+' · 4文','1小时/精力12；实际练习熟练24、领悟10，并讲解对手战术。与指点共用每日一次，无临时战力加成、无自动胜利。');}add('leave','退出师门','15分钟，师徒信任-1；未完事务另外记失败、信任-1；已用材料不退，不罚钱，武艺仍可练习求学。');}
 if(m.active)add('withdraw','撤回师门事务','不罚钱，信任-1；本项记失败，不重开，已交材料不退。');if(m.active==='delivery'&&!m.stage&&s.place==='workshop')add('step:deliver','交师门木料给作坊','自己木料2份；30分钟/精力4；材料实际消耗，回馆结算8文。');if(m.active==='inquiry'&&!m.stage){if(s.place==='bamboo'){add('step:careful','查访 · 稳妥察看','45分钟/精力8，查明小径，无擦伤或钱物奖励，回馆交代。');add('step:quick','查访 · 冒险快查','15分钟/精力8；60%查明，失败擦伤6气血、信任-1，无报酬。');}if(s.place==='market'&&m.trust>=4)add('step:identity','师门身份 · 向掌柜查问','30分钟/精力1；凭门人身份取得情况，回馆交代。');}if(s.place==='market'&&m.trust>=4&&!m.parcelHint&&s.adventures.quest?.id==='parcel'&&!s.adventures.quest.stage)add('hint:parcel','师门接洽 · 失物线索','30分钟/精力1；实际竹林搜寻70%提高到85%，仍有失败，无预付钱物。');return out;}
export function playerMentorSummary(s){const m=s.adventures.mentor;return ['师门：'+(m.member?'周师傅门下':m.joinedDay?'已退出':'未拜师')+'；师徒信任'+m.trust+'/10；已完成'+Object.values(m.tasks).filter(x=>x==='done').length+'/3项。'+(m.active?'当前'+MENTOR_TASKS[m.active].name+(m.stage?'，步骤已完成，待回馆交代':'，截止第'+m.dueDay+'日，按地点完成步骤'):'没有未完师门事务。'),...Object.entries(m.tasks).filter(([,v])=>v==='done'||v==='failed').map(([id,v])=>MENTOR_TASKS[id].name+'：'+(v==='done'?'已完成':'未完成，不重开'))];}
export function playerMentorDialogue(s,id){if(id!=='master'||!s.adventures.mentor.joinedDay)return null;const m=s.adventures.mentor;return !m.member?'师徒经历仍保留；退出后，原有付费求学渠道仍开放。':m.trust>=4?'周师傅认可你的实际履约或练习，愿意付费指点和帮你备战。':'周师傅仍愿授艺；先实际履约再谈专门指点，失约会影响师徒信任。';}
