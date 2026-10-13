import {reconcileRaid} from './raid.js?v=5.28.0';
import {reconcileDungeon,dungeonMovementBlocker} from './dungeon.js?v=5.28.0';
import {fieldChance,useFieldClue} from './field-skills.js?v=5.28.0';
import {makeCountyLife,countyLifeValid,expireCountyLife,countyLifeAction} from './county-life.js?v=5.28.0';
import {makeSpoils,spoilsValid,spoilAction,disposeEquipment} from './spoils.js?v=5.28.0';
import {makeCompanions,companionsValid,expireCompanions,companionAction,companionBusy} from './companions.js?v=5.28.0';
import {GOALS,makeThreads,threadsValid,expireThreads,threadAction} from './threads.js?v=5.28.0';
import {makeBusiness,businessValid,expireBusiness,businessAction} from './business.js?v=5.28.0';
import {makeOutings,outingsValid,noticeOutings,outingAction} from './outings.js?v=5.28.0';
import {makeLaw,lawValid,expireLaw,lawAction} from './law.js?v=5.28.0';
import {makeFactions,factionsValid,expireFactions,factionAction,factionHostile,factionFriendly,factionDialogue} from './factions.js?v=5.28.0';
import {makePlayerMentor,playerMentorValid,playerMentorAction,expirePlayerMentor,playerMentorDialogue,mentorParcelChance} from './player-mentor.js?v=5.28.0';
import {makeTrials,trialsValid} from './trials.js?v=5.28.0';
import {makeExploration,explorationValid,explorationAction,reconcileExploration} from './exploration.js?v=5.28.0';
import {makeFeedback,feedbackValid,expireFeedback,feedbackAction,feedbackDialogue} from './world-feedback.js?v=5.28.0';
import {QUESTS,SITES,ORGANIZATIONS,CAREERS} from './adventure-data.js?v=5.28.0';
import {people,items} from './content.js?v=5.28.0';
import {gain} from './progression.js?v=5.28.0';
import {MARTIAL_ARTS,OPPONENTS} from './martial-data.js?v=5.28.0';
import {EQUIPMENT} from './equipment.js?v=5.28.0';
export const makeAdventures=(day=1)=>({life:makeCountyLife(day),spoils:makeSpoils(),companions:makeCompanions(),threads:makeThreads(),business:makeBusiness(),outings:makeOutings(),law:makeLaw(),factions:makeFactions(day),mentor:makePlayerMentor(),trials:makeTrials(),exploration:makeExploration(),feedback:makeFeedback(day),quest:null,done:[],failed:[],sites:{},org:{id:'none',rep:{school:0,caravan:0},aidDay:0},career:{porter:0,smith:0,herb:0},orders:{porter:0,smith:0,herb:0},orderCounts:{porter:0,smith:0,herb:0},home:{untilDay:0,restDay:0},milestones:[],victories:[]});
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),num=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const unique=(a,keys)=>Array.isArray(a)&&a.length<=keys.length&&new Set(a).size===a.length&&a.every(id=>keys.includes(id));
export function adventuresValid(s){
 const a=s.adventures;if(!obj(a)||Object.keys(a).length!==23||!countyLifeValid(s)||!spoilsValid(s)||!companionsValid(s)||!threadsValid(s)||!businessValid(s)||!feedbackValid(s)||!factionsValid(s)||!lawValid(s)||!outingsValid(s))return false;
 if(!unique(a.done,Object.keys(QUESTS))||!unique(a.failed,Object.keys(QUESTS))||a.done.some(x=>a.failed.includes(x))||!obj(a.sites)||Object.entries(a.sites).some(([id,v])=>!SITES[id]||!['found','empty','retreated'].includes(v)))return false;
 if(!explorationValid(s)||!trialsValid(s)||!playerMentorValid(s))return false;
 if(a.quest!==null){const q=a.quest;if(!obj(q)||Object.keys(q).length!==4||!QUESTS[q.id]||a.done.includes(q.id)||a.failed.includes(q.id)||!num(q.stage,2)||!num(q.acceptedDay,s.day)||q.acceptedDay<1||q.dueDay!==q.acceptedDay+QUESTS[q.id].days||q.id!=='escort'&&q.stage>1)return false;}
 const o=a.org;if(!obj(o)||Object.keys(o).length!==3||!['none','school','caravan'].includes(o.id)||!obj(o.rep)||Object.keys(o.rep).length!==2||!['school','caravan'].every(id=>num(o.rep[id],100))||!num(o.aidDay,s.day))return false;
 if(!obj(a.orderCounts)||Object.keys(a.orderCounts).length!==3||!Object.keys(CAREERS).every(id=>num(a.orderCounts[id],100000)))return false;
 for(const key of ['career','orders'])if(!obj(a[key])||Object.keys(a[key]).length!==3||!Object.keys(CAREERS).every(id=>num(a[key][id],s.day)))return false;
 const h=a.home;if(!obj(h)||Object.keys(h).length!==2||!num(h.untilDay,s.day+3)||!num(h.restDay,s.day)||h.restDay>h.untilDay)return false;
 return unique(a.milestones,[1,2,3])&&a.milestones.every((v,i)=>v===i+1)&&unique(a.victories,Object.keys(OPPONENTS));
}
const fail=(s,t)=>{s.result=[t];return false;};
const away=(s,id)=>{const r=s.npcWorld.journeys.records[id];return r&&(r.departedDay>r.returnedDay||r.returnedDay===s.day);};
export const present=(s,id,minutes=0)=>{const p=s.npcWorld.individuals[id],d=people[id]??{place:p?.home,open:480,close:1080};return p&&!companionBusy(s,id)&&!p.life.deathDay&&!away(s,id)&&!p.life.sickDays&&!p.injuryDays&&p.life.restDay!==s.day&&s.place===d.place&&s.minute>=d.open&&s.minute+minutes<=d.close;};
const paid=(s,id,n)=>{const p=s.npcWorld.individuals[id];return p.coins>=n&&s.coins<=10000000-n;};
function reward(s,id,n){s.npcWorld.individuals[id].coins-=n;s.coins+=n;}
function fee(s,id,n){const p=s.npcWorld.individuals[id];if(s.coins<n||p.coins>1000000-n)return false;s.coins-=n;p.coins+=n;return true;}
function finish(s,success){const a=s.adventures,q=a.quest;(success?a.done:a.failed).push(q.id);a.quest=null;if(success&&a.org.id!=='none')a.org.rep[a.org.id]=Math.min(100,a.org.rep[a.org.id]+1);}
export function expireAdventures(s){reconcileDungeon(s);reconcileRaid(s);expireCountyLife(s);expireCompanions(s);expireThreads(s);expireBusiness(s);reconcileExploration(s);noticeOutings(s);expireLaw(s);expireFactions(s);expirePlayerMentor(s);expireFeedback(s);const q=s.adventures?.quest;if(q&&s.day>q.dueDay){finish(s,false);s.news.unshift(QUESTS[q.id].name+'已逾期，委托结束，没有报酬或罚款。');s.news.length=Math.min(20,s.news.length);}}
export function recordAdventureVictory(s,c){if(c.ended==='victory'&&!c.practice&&s.adventures&&!s.adventures.victories.includes(c.opponent))s.adventures.victories.push(c.opponent);}
export const practiceFee=s=>!factionHostile(s,'school')&&(s.adventures?.org.id==='school'&&s.adventures.org.rep.school>=3||factionFriendly(s,'school'))?3:4;
const trained=(s,tier)=>Object.keys(s.martial.known).filter(id=>MARTIAL_ARTS[id].tier===tier&&s.martial.practice[id]>=120).length;
export function nextMilestone(s){const n=s.adventures.milestones.length+1;return {n,ready:n===1?s.adventures.done.length>=1:n===2?s.adventures.done.length>=2&&(trained(s,1)>=2&&Object.entries(s.equipment.owned).some(([id,v])=>v>0&&EQUIPMENT[id].slot==='armor'&&EQUIPMENT[id].tier>=2)||Object.values(s.adventures.career).some(Boolean)&&s.adventures.home.untilDay>0):n===3?(trained(s,2)>=2&&['escort','teacher'].every(id=>s.adventures.victories.includes(id))||Object.values(s.adventures.orderCounts).some(n=>n>=3)&&s.adventures.done.length+s.adventures.failed.length>=3&&Object.keys(s.adventures.sites).length>=2):false};}
function transact(s,title,minutes,energy,run,advance){if(s.energy<energy)return fail(s,'精力不足，需'+energy+'点。');s.result=[title];s.energy-=energy;run();advance(s,minutes);s.result.push('耗时'+minutes+'分钟；精力消耗'+energy+'。');s.journal.unshift({day:s.day,text:s.result.join('；')});s.journal.length=Math.min(30,s.journal.length);return true;}
function xp(s,key,n){const line=gain(s,key,n);if(line)s.result.push(line);}
export function adventureAction(s,id,{advance,rng}){
 if(dungeonMovementBlocker(s))return fail(s,dungeonMovementBlocker(s));
 if(s.dead||s.pending||s.combat)return fail(s,'先处理眼前交手或选择；死亡后不能继续。');
 expireAdventures(s);const a=s.adventures,[kind,key]=String(id).split(':');
 if(kind==='law')return lawAction(s,String(id),{present,transact,advance,rng});
 if(a.law.pursuit)return fail(s,'先处理县城拦查：投案、短期拘押或冒险逃避。');
 if(kind==='goal'){if(!['none',...Object.keys(GOALS)].includes(key))return fail(s,'没有这条近期目标。');a.threads.goal=key;s.result=['近期方向：'+(GOALS[key]?.name??'自由行动'),'目标可随时更换或忽略，不耗时、不发钱物或隐藏加成。'];return true;}
 if(['sect','bond','stall','countyEvent'].includes(kind))return countyLifeAction(s,String(id),{present,transact,advance,rng});
 if(kind==='spoil')return spoilAction(s,String(id),{transact,advance,rng});
 if(kind==='dispose'){const [,mode,equipmentId]=String(id).split(':');return disposeEquipment(s,equipmentId,mode,{transact,advance});}
 if(kind==='companion')return companionAction(s,String(id),{transact,advance,rng});
 if(kind==='thread')return threadAction(s,String(id),{present,transact,advance,rng});
 if(kind==='business')return businessAction(s,String(id),{present,transact,advance,rng});
 if(kind==='outing')return outingAction(s,String(id),{present,transact,advance,rng});
 if(kind==='faction')return factionAction(s,String(id),{present,transact,advance,rng});
 if(kind==='followup'||kind==='event')return feedbackAction(s,String(id),{present,transact,advance});
 if(kind==='mentor')return playerMentorAction(s,String(id),{present,transact,advance,rng});
 if(kind==='route'||kind==='encounter')return explorationAction(s,String(id),{transact,advance,rng});
 if(kind==='retry'){
  const d=QUESTS[key];if(!d||key==='parcel'||a.quest||!a.failed.includes(key)||a.done.includes(key))return fail(s,'此委托不能重新约定；失物与已完成委托不重复开放。');
  if(key==='rescue'&&a.milestones.length<2)return fail(s,'救援仍需完成县境成长第二阶段。');
  if(!present(s,d.giver,15))return fail(s,'请在委托人可接洽时回到原领取处。');
  return transact(s,'重新约定：'+d.name,15,0,()=>{a.failed=a.failed.filter(id=>id!==key);a.quest={id:key,stage:0,acceptedDay:s.day,dueDay:s.day+d.days};s.result.push('不预付报酬；需重新完成实际步骤，本条成功后只结算一次。',d.description);},advance);
 }
 if(kind==='quest'){
  const d=QUESTS[key];if(!d)return fail(s,'没有这条委托。');
  if(a.quest||a.done.includes(key)||a.failed.includes(key))return fail(s,'这条委托已处理，或仍有未结束的委托。');
  if(key==='rescue'&&a.milestones.length<2)return fail(s,'需先完成县境成长第二阶段。');
  if(!present(s,d.giver,15))return fail(s,'请在委托人所在地营业时间内领取；本人须在场且能接洽。');
  return transact(s,'领取：'+d.name,15,0,()=>{a.quest={id:key,stage:0,acceptedDay:s.day,dueDay:s.day+d.days};s.result.push(d.description,'截止第'+a.quest.dueDay+'日；可自行撤回。');},advance);
 }
 if(kind==='withdraw'){if(!a.quest)return fail(s,'没有进行中的委托。');return transact(s,'撤回委托',0,0,()=>{finish(s,false);s.result.push('无报酬，无罚款；本条委托结束。');},advance);}
 if(kind==='questStep'){
  const q=a.quest;if(!q)return fail(s,'没有进行中的委托。');
  if(q.id==='parcel'&&q.stage===0&&s.place==='bamboo'&&key==='search')return transact(s,'搜寻竹林失物',60,12,()=>{const chance=fieldChance(s,'tracking',mentorParcelChance(s));useFieldClue(s,'tracking');if(rng()<chance){q.stage=1;s.result.push('找到失落货包，请回县城街市交还；货包不是可出售物资。');}else{finish(s,false);s.result.push('未能找到失物，委托结束，无报酬。');}xp(s,'forage',2);},advance);
  if(q.id==='escort'&&q.stage===0&&s.place==='ferry'&&['safe','quick'].includes(key))return transact(s,'护送经过旧渡口',key==='safe'?45:15,key==='safe'?8:12,()=>{if(key==='quick'&&rng()<.3){s.hp=Math.max(0,s.hp-8);if(!s.hp){s.dead=true;finish(s,false);s.result.push('受伤身亡，护送结束。');return;}s.result.push('抄近路擦伤，气血 -8。');}q.stage=1;s.result.push('行脚人已过渡口，继续前往柳溪集。');xp(s,'carry',2);},advance);
  if(q.id==='rescue'&&q.stage===0&&s.place==='hill'&&key==='help'){
   if(s.bag.herb<1||s.hp<25)return fail(s,'救助需自己现有药材1份，气血至少25。');
   return transact(s,'救助采药人',60,16,()=>{s.bag.herb--;if(rng()<.7){q.stage=1;s.result.push('采药人已获初步处理，回河湾村向医者交代。');}else{s.hp-=8;finish(s,false);s.result.push('寻人受挫并擦伤8气血，药材已用于途中处理；无报酬。');}xp(s,'herb',2);},advance);
  }
  return fail(s,'当前地点或委托步骤不符。');
 }
 if(kind==='deliver'){
  const q=a.quest;if(!q)return fail(s,'没有进行中的委托。');const d=QUESTS[q.id];
  const destination=q.id==='escort'?'liuxi':d.from;
  if(s.place!==destination||q.id!=='escort'&&!present(s,d.giver,15)||q.id==='escort'&&(s.minute<480||s.minute+15>1080))return fail(s,'请到交付地点，在可接洽时段结算。');
  if(q.id==='medicine'&&s.bag.herb<2||q.id!=='medicine'&&q.stage!==1)return fail(s,'物资不足或尚未完成所需步骤。');
  if(!paid(s,d.payer||d.giver,d.reward)||q.id==='escort'&&!present(s,d.payer,15))return fail(s,'委托人现有钱不足，未交物或结算；可稍后再来或撤回。');
  return transact(s,'完成：'+d.name,15,0,()=>{if(q.id==='medicine')s.bag.herb-=2;reward(s,d.payer||d.giver,d.reward);s.relations[d.giver]=Math.min(100,s.relations[d.giver]+2);finish(s,true);s.result.push('实际支付报酬'+d.reward+'文，委托完成。');xp(s,q.id==='escort'?'carry':q.id==='parcel'?'forage':'herb',2);},advance);
 }
 if(kind==='explore')return explorationAction(s,'route:'+key+':standard',{transact,advance,rng});
 if(kind==='join'){
  const d=ORGANIZATIONS[key];if(factionHostile(s,key))return fail(s,'该组织因争议立场暂停接洽，可交口粮赔礼后再申请。');if(!d||a.org.id!=='none')return fail(s,'请先退出当前组织，或选择已开放组织。');
  if(!present(s,d.holder,30))return fail(s,'组织接洽人不在场或已休息。');
  if(key==='school'&&(!Object.keys(s.martial.known).length||s.relations.master<3)||key==='caravan'&&!a.done.length)return fail(s,'尚未达到加入条件，请查看组织说明。');
  if(s.coins<12||s.npcWorld.individuals[d.holder].coins>999988)return fail(s,'入会费用12文，资金不符则不加入。');
  return transact(s,'加入'+d.name,30,0,()=>{fee(s,d.holder,12);a.org.id=key;s.result.push('会费转入接洽人余额；完成新委托增加贡献，退出不退会费，贡献记录保留。');},advance);
 }
 if(kind==='leaveOrg'){if(a.org.id==='none')return fail(s,'尚未加入组织。');return transact(s,'退出组织',0,0,()=>{a.org.id='none';s.result.push('不退会费，不清除过往贡献，无强制义务。');},advance);}
 if(kind==='memberFood'){
  const p=s.npcWorld.individuals.merchant;if(factionHostile(s,'caravan')||!(a.org.id==='caravan'&&a.org.rep.caravan>=2||factionFriendly(s,'caravan'))||a.org.aidDay===s.day||!present(s,'merchant',15)||p.food<2||s.bag.food>=1000000||s.coins<3||p.coins>999997)return fail(s,'需互助会贡献2或友好立场2、未交恶、今日未购、柳掌柜在场且余粮至少2份；费用3文。');
  return transact(s,'购买会内现有口粮',15,0,()=>{fee(s,'merchant',3);p.food--;s.bag.food++;a.org.aidDay=s.day;},advance);
 }
 if(kind==='career'){
  const d=CAREERS[key];if(!d||a.career[key]||!present(s,d.holder,30)||s.skills[d.skill]<d.required)return fail(s,'请达到职业积累要求后，在对应人物工作时验收；已验收不重复。');
  return transact(s,'验收：'+d.name,30,0,()=>{a.career[key]=s.day;s.result.push('凭现有实际技能开放合作订单，不赠送额外技能或钱物。');},advance);
 }
 if(kind==='order'){
  const d=CAREERS[key];if(!d||!a.career[key]||a.orders[key]===s.day||!present(s,d.holder,d.minutes)||s.commerce.budget.market<d.reward||s.coins>10000000-d.reward)return fail(s,'合作订单需先验收、今日未接且对方有现钱与工作时间。');
  if(Object.entries(d.input).some(([id,n])=>s.bag[id]<n))return fail(s,'交付材料不足。');
  // Materials are consumed by real production/medical work rather than returned or cloned.
  return transact(s,'合作：'+d.name,d.minutes,d.energy,()=>{for(const [id,n] of Object.entries(d.input))s.bag[id]-=n;s.commerce.budget.market-=d.reward;s.coins+=d.reward;a.orders[key]=s.day;a.orderCounts[key]=Math.min(100000,a.orderCounts[key]+1);xp(s,d.skill,2);s.result.push('完成实际作业，报酬'+d.reward+'文由现有商铺资金支付；今日不能重复。');},advance);
 }
 if(kind==='rent'){
  if(s.place!=='inn'||a.home.untilDay>=s.day||s.coins<12||s.npcWorld.individuals.merchant.coins>999988)return fail(s,'客栈可短租3日共12文；租期内不重复缴费，钱不足不租。');
  return transact(s,'短租客栈房间',15,0,()=>{fee(s,'merchant',12);a.home.untilDay=s.day+2;s.result.push('租期至第'+a.home.untilDay+'日；每天可在租房休息一次，期满不自动续费或扣钱。');},advance);
 }
 if(kind==='homeRest'){
  if(s.place!=='inn'||a.home.untilDay<s.day||a.home.restDay===s.day)return fail(s,'需有效租期且今日尚未在租房休息；期满可选择续租。');
  return transact(s,'在租房休息',480,0,()=>{a.home.restDay=s.day;s.energy=100;s.hp=Math.min(100,s.hp+20);s.result.push('使用已付费房间，无本次住宿费；不自动续租。');},advance);
 }
 if(kind==='milestone'){
  const next=nextMilestone(s);if(s.place!=='county'||!next.ready)return fail(s,'请满足当前成长目标后到县城确认；目标可选，不强迫转行或战斗。');
  return transact(s,'确认县境成长第'+next.n+'阶段',15,0,()=>{a.milestones.push(next.n);s.result.push(next.n===3?'县境成长目标完成，仍可自由生活与挑战；无神装或隐藏奖励。':next.n===2?'开放南山救援委托，可自由继续职业或武学生活。':'已经独立完成一条委托，开始在县境立足。');},advance);
 }
 return fail(s,'没有这项县境行动。');
}

export function adventureDialogue(s,id){
 const a=s.adventures;if(!a)return null;const faction=factionDialogue(s,id),mentor=playerMentorDialogue(s,id),follow=feedbackDialogue(s,id);if(mentor)return [faction,mentor].filter(Boolean).join(' ');if(follow)return [faction,follow].filter(Boolean).join(' ');if(faction)return faction;
 if(a.failed.includes(id==='doctor'?'medicine':id==='boatman'?'escort':'none'))return '上次委托未完成，当事人记得失约；可以说清经过，也可重新约定。';
 if(id==='doctor'&&a.done.includes('rescue'))return '南山采药人已得到救助，诊所记着你实际帮过的忙。';
 if(id==='doctor'&&a.done.includes('medicine'))return '你交来的两份药材已用于诊所，这趟急单已经结清。';
 if(id==='merchant'&&a.done.includes('parcel'))return '竹林货包已归还，柳掌柜认得这次帮忙的人。';
 if(id==='merchant'&&a.failed.includes('parcel'))return '失物这件事已经结束；没有找到或选择撤回，都不会再逼你去寻。';
 if(id==='boatman'&&a.done.includes('escort'))return '行脚人已经沿岸抵达柳溪，这次护送已结清。';
 return null;
}
