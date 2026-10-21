import {dungeonGuideLocation} from './dungeon.js?v=5.55.0';
import {cooperationRefusal} from './npc-social.js?v=5.55.0';
import {rememberExperience,sharedWork} from './county-life.js?v=5.55.0';
import {people,places,items} from './content.js?v=5.55.0';
import {gain} from './progression.js?v=5.55.0';
import {travelBusy} from './npc-journeys.js?v=5.55.0';
export const COOPERATIONS={
 boat:{name:'船工同行修架',actor:'boatman',from:'dock',site:'ferry',corridor:['dock','ferry'],fee:3,payer:'merchant',claim:'market',total:12,share:4,skill:'carry',input:{wood:1},dispute:'route',info:'贺船工同行到旧渡口修货架。工钱3文，关系3或有信任的实际共事可免；需自己木料1份。分歧是稳妥处理或说服冒险。雨天更难，实际工钱共12文由柳掌柜支付，协作时船工分4文。'},
 hunter:{name:'猎户同行清径',actor:'hunter',from:'bamboo',site:'hill',corridor:['bamboo','hill','foot'],fee:2,payer:'merchant',claim:'market',total:10,share:4,skill:'hunt',input:{wood:1},dispute:'split',info:'蒋猎户同行清理南山猎径，需自己木料1份。邀请工钱2文；猎户想分6文，可接受或谈4文，谈崩后仍可独行。实际工钱共10文来自柳掌柜，不凭空提供猎物。'},
 smith:{name:'铁匠同行修具',actor:'smith',from:'workshop',site:'county',corridor:['workshop','county'],fee:2,payer:'public',claim:'county',total:12,share:5,skill:'smelt',input:{iron:1,wood:1},dispute:'materials',info:'许铁匠同行修整县城公用旧工具，邀请2文，关系3或有信任的实际共事可免。用自己的铁料1、木料1；可自备或请熟悉铁匠出实际2文补助。没有免费打造装备；县衙实际支付共12文，协作者分5文。'},
 peer:{name:'学友同行查路',actor:'smithapprentice',from:'workshop',site:'road',corridor:['workshop','county','road'],fee:0,payer:'public',claim:'county',total:10,share:4,skill:'forage',input:{},dispute:'none',info:'许小成实际学会武艺且玩家已学一门后可邀学友查官道。双方真正拜周师傅后才称同门。稳妥侦察或冒险快查；快查可能损失30气血并使学友受伤，可能永久死亡。伤后可用药材照料，或让其离队独行。县衙工钱共10文，协作者分4文；不代打强敌。'}
};
const empty=()=>({status:'new',joined:false,invitedDay:0,until:0,returnAt:0,prepared:false,route:null,share:0,support:0,assisted:false,trust:0,paid:0,conflict:'none',npcSpent:0,fee:0});
export const makeCompanions=()=>({active:null,records:Object.fromEntries(Object.keys(COOPERATIONS).map(k=>[k,empty()]))});
export const sameMaster=s=>!!s.adventures.mentor.member&&s.npcWorld.individuals.smithapprentice.study.mentor.joinedDay>0&&!s.npcWorld.individuals.smithapprentice.study.mentor.endedDay;
const clock=s=>s.day*1440+s.minute,obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),int=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
export function companionsValid(s){const c=s.adventures.companions;if(!obj(c)||Object.keys(c).length!==2||c.active!==null&&!Object.hasOwn(COOPERATIONS,c.active)||!obj(c.records)||Object.keys(c.records).length!==4)return false;let joined=0;
 return Object.entries(COOPERATIONS).every(([id,d])=>{const r=c.records[id];if(!obj(r)||Object.keys(r).length!==15||!['new','open','ready','done','failed','withdrawn','died'].includes(r.status)||typeof r.joined!=='boolean'||typeof r.prepared!=='boolean'||typeof r.assisted!=='boolean'||!int(r.invitedDay,s.day)||!int(r.until,s.day*1440+1080)||!int(r.returnAt,s.day*1440+1440)||!int(r.share,d.total)||![0,2].includes(r.support)||!int(r.trust,3)||!int(r.paid,d.total)||!int(r.npcSpent,100)||![0,d.fee].includes(r.fee)||!['none','route','split','materials','hurt','resolved'].includes(r.conflict)||![null,'safe','quick','fair','bargain','self','support','solo'].includes(r.route))return false;
 if(r.status==='new')return Object.entries(empty()).every(([k,v])=>r[k]===v);
 if(!r.invitedDay||r.status==='died'&&!s.dead||r.status!=='done'&&r.paid||['ready','done'].includes(r.status)&&(!r.prepared||r.conflict!=='resolved')||r.status==='done'&&r.paid!==d.total-r.share||r.assisted&&r.npcSpent<12||!r.assisted&&r.status!=='open'&&r.share||r.support&&id!=='smith')return false;
 if(r.joined){joined++;if(c.active!==id||r.status!=='open'||r.until<clock(s)||Math.floor(r.until/1440)!==r.invitedDay||!d.corridor.includes(s.place)||r.returnAt)return false;}else if(r.until)return false;
 return r.status==='open'||!r.joined;
 })&&joined===(c.active===null?0:1);
}
export function companionLocation(s,actor){const c=s.adventures?.companions;if(!c)return undefined;const id=Object.keys(COOPERATIONS).find(k=>COOPERATIONS[k].actor===actor);if(!id)return undefined;const r=c.records[id];if(r.joined&&clock(s)<=r.until)return s.place;if(r.returnAt>clock(s))return null;return undefined;}
export const companionBusy=(s,actor)=>companionLocation(s,actor)!==undefined||dungeonGuideLocation(s,actor)!==undefined;
function returnTime(from,to){const queue=[[from,0]],seen=new Set();while(queue.length){const [p,n]=queue.shift();if(p===to)return n;if(seen.has(p))continue;seen.add(p);for(const k of places[p].routes)queue.push([k,n+places[k].minutes]);}return 180;}
function record(s,d,text){const p=s.npcWorld.individuals[d.actor];p.history=['第'+s.day+'日'+text,...p.history].slice(0,8);}
function detach(s,id,text,departAfter=0){const d=COOPERATIONS[id],r=s.adventures.companions.records[id];if(!r.joined)return;r.joined=false;r.until=0;if(r.conflict==='hurt'){r.conflict='resolved';r.route='solo';}r.returnAt=clock(s)+departAfter+returnTime(s.place,d.from);s.adventures.companions.active=null;record(s,d,text+'，沿已有道路返程，返程期间暂停接洽。');s.result.push(text+'；你仍可独行、绕行或撤回，不恢复气血、不退工钱。');}
function fit(s,d,minutes=0){const p=s.npcWorld.individuals[d.actor];return !p.life.deathDay&&!p.life.sickDays&&!p.injuryDays&&p.life.restDay!==s.day&&!travelBusy(s,d.actor)&&p.energy>=2&&s.minute>=480&&s.minute+minutes<=1080;}
function shift(s,id,n){const r=s.adventures.companions.records[id],d=COOPERATIONS[id];r.trust=Math.max(0,Math.min(3,r.trust+n));if(Object.hasOwn(s.relations,d.actor))s.relations[d.actor]=Math.max(0,Math.min(100,s.relations[d.actor]+n));}
export function expireCompanions(s){const c=s.adventures?.companions;if(!c)return;for(const [id,d] of Object.entries(COOPERATIONS)){const r=c.records[id];if(s.dead&&['open','ready'].includes(r.status)){detach(s,id,'玩家身亡，同行结束');r.status='died';r.share=r.assisted?r.share:0;continue;}if(r.joined&&(clock(s)>r.until||s.combat||s.pending||!d.corridor.includes(s.place)||!fit(s,d)&&!(id==='peer'&&r.conflict==='hurt'&&!s.npcWorld.individuals[d.actor].life.deathDay))){detach(s,id,(clock(s)>r.until?'约定同行时限已到':s.combat||s.pending?'前路出现冲突，短途同伴先返程':!d.corridor.includes(s.place)?'已离开约定路线':'同伴伤病、休养或精力不足，先返程'));if(!r.assisted)r.share=0;}}}
export function beforeCompanionMove(s,to){const id=s.adventures.companions.active;if(!id)return;const d=COOPERATIONS[id],r=s.adventures.companions.records[id],p=s.npcWorld.individuals[d.actor];if(!d.corridor.includes(to)||p.energy<2||p.injuryDays||p.life.sickDays){detach(s,id,(!d.corridor.includes(to)?'已超出约定路线，同伴返程':p.injuryDays||p.life.sickDays?'同伴伤病，不能继续赶路':'同伴精力不足，先返程'));r.share=0;return;}p.energy-=2;r.npcSpent+=2;}
function near(s,d){const p=s.npcWorld.individuals[d.actor],expected=people[d.actor]?.place??p.place;return s.place===d.from&&expected===d.from&&!companionBusy(s,d.actor)&&fit(s,d,15);}
// Only new invitations consult recent memories; an existing share remains payable.
export function companionInviteTerms(s,key){
 const d=COOPERATIONS[key],bond=s.adventures.life.bonds[d.actor];
 const trusted=(s.relations[d.actor]??0)>=3||key==='peer'&&sameMaster(s)||!!bond&&bond.trust>0&&sharedWork(s,d.actor);
 const failed=bond?.history.find(h=>h.kind==='promise'&&!h.success);
 const blocker=cooperationRefusal(s,d.actor)||(failed&&s.day<failed.day+2?'上次约定未成，对方先整理手头活计；第'+(failed.day+2)+'日起可再商量同行。':null);
 return {trusted,fee:trusted?0:d.fee,blocker};
}
// A read-only plan drives both the scene preview and the actual work settlement.
export function companionWorkPlan(s,key){
 const d=COOPERATIONS[key],r=s.adventures.companions.records[key],p=s.npcWorld.individuals[d.actor];
 const assisted=r.joined,minutes=r.route==='quick'?30:60,energy=assisted?10:16;
 const chance=Math.min(.95,(assisted?.8:.55)+(s.skills[d.skill]>=12?.1:0)+(r.trust?.05:0)-(s.weather==='雨'?.15:0)),risk=r.route==='quick'?.25:.05;
 const missing=Object.entries(d.input).filter(([k,n])=>s.bag[k]<n).map(([k,n])=>items[k]+'缺'+(n-s.bag[k])+'份（现有'+s.bag[k]+'/'+n+'）');
 const blocker=r.status!=='open'||s.place!==d.site?'需沿现有道路到进行中的合作现场。':!r.prepared||r.conflict!=='resolved'?'先商量路线、处理伤势或独行准备。':s.hp<25?'作业需气血25，当前'+s.hp+'；可先养伤或撤回。':missing.length?missing.join('、')+'；备料后再作业，未消耗尝试。':s.minute<360||s.minute+minutes>1080?'白天作业须在18时前完成，当前需'+minutes+'分钟；可改日独行或撤回。':assisted&&(!fit(s,d,minutes)||p.energy<12||clock(s)+minutes>r.until)?'同伴伤病、精力不足12或约定余时不足'+minutes+'分钟；可离队独行或撤回。':s.energy<energy?'自己精力不足'+energy+'，当前'+s.energy+'；可先休息或撤回。':null;
 return {assisted,minutes,energy,chance,risk,blocker};
}
function workPreview(s,key,plan){
 const d=COOPERATIONS[key],r=s.adventures.companions.records[key],materials=Object.entries(d.input).map(([k,n])=>items[k]+'×'+n+'（现有'+s.bag[k]+'）').join('、')||'无';
 return plan.minutes+'分钟/精力'+plan.energy+'；当前成功率'+Math.round(plan.chance*100)+'%；材料：'+materials+'。'+Math.round(plan.risk*100)+'%擦伤8气血'+(plan.assisted?'并使同伴轻伤':'')+'，成功与受伤分别判定。'+(plan.assisted?'同伴另耗精力12，须在约定时限内完成。':'独行无同伴分帐。')+'成功后到'+places[d.claim].name+'结算，你'+(d.total-(plan.assisted?r.share:0))+'文；缺款保留成果。开工前可撤回；失败仍耗料，无报酬，不重试。';
}
function preparationPreview(s,key,choice){const r=s.adventures.companions.records[key];
 if(key==='boat')return choice==='safe'?'商量15分钟/精力0；后续作业60分钟，擦伤风险5%，仍需自己的木料1份。':'商量15分钟/精力2，说服率'+(r.trust?75:45)+'%；谈妥后作业30分钟，擦伤风险25%；拒绝则船工离队，可独行或撤回。';
 if(key==='hunter')return choice==='fair'?'商量15分钟/精力0；成功后实际总工钱10文，猎户分6文，你4文。':'商量15分钟/精力2，谈妥率'+(r.trust?80:50)+'%；成功后猎户分4文，你6文；谈崩则离队，可独行。';
 if(key==='smith')return '商量15分钟/精力0；'+(choice==='support'?'需已有熟悉关系且铁匠实际有2文，真实转给你。':'自己备料，不预发工钱。')+'后续仍需自己的铁料1、木料1，作业另计工时与风险。';
 return choice==='safe'?'侦察45分钟/精力8，同伴精力6；本步无身体伤害，后续作业另计。':'侦察20分钟/精力8，同伴精力6；30%损失30气血并使学友轻伤，可能永久死亡。伤后可用药材1份、30分钟/精力2照料，或让其离队。';
}
export function companionAction(s,id,{transact,advance,rng}){const [,key,choice]=id.split(':'),d=COOPERATIONS[key],c=s.adventures.companions,r=c.records[key],fail=t=>{s.result=[t];return false;};if(!d)return fail('没有这项熟人合作。');const p=s.npcWorld.individuals[d.actor];
 if(choice==='invite'){
  if(r.status!=='new'||c.active!==null||s.dungeon?.guide==='joined'||s.raid?.guide==='joined')return fail('一次只邀一人，每条合作一次；先交代或结束当前同行。');
  const terms=companionInviteTerms(s,key);if(terms.blocker)return fail(terms.blocker);
  if(!near(s,d))return fail('此人不在岗、患病、受伤、外出或返程中；改日再来。');
  if(key==='peer'&&(!Object.keys(s.martial.known).length||!p.study.learnedDay))return fail('双方需实际学过武艺；不会凭空授武或补写同门记录。');
  const {trusted,fee}=terms;if(s.coins<fee||p.coins>1000000-fee)return fail('实际邀请工钱或收款容量不足；可独自进行原有玩法。');
  return transact(s,'邀请 · '+d.name,15,0,()=>{s.coins-=fee;p.coins+=fee;p.energy-=2;Object.assign(r,{status:'open',joined:true,invitedDay:s.day,until:Math.min(clock(s)+360,s.day*1440+1080),trust:trusted?1:0,fee,npcSpent:2,conflict:d.dispute});c.active=key;record(s,d,'答应一次短途合作，实际收工钱'+fee+'文、准备精力2');s.result.push('只在指定现有路线同行，最晚今天18时或六小时后离队；工钱'+fee+'文已转付，NPC精力实际消耗。');},advance);
 }
 if(choice==='claim'){
  const payer=d.payer==='public'?s.commerce.budget:s.npcWorld.individuals[d.payer],field=d.payer==='public'?'market':'coins',your=d.total-r.share;
  if(r.status!=='ready'||s.place!==d.claim||s.minute<480||s.minute+15>1080)return fail('需实际合作成果，白天到说明中的付款处交代。');
  if(d.payer!=='public'&&(!fit(s,{actor:d.payer},15)||companionBusy(s,d.payer)))return fail('付款人今日无法接洽，保留成果。');
  if(payer[field]<d.total||s.coins>10000000-your||p.coins>1000000-r.share)return fail('付款方实际余额或分帐容量不足，整笔未结算，成果保留。');
  return transact(s,'结算 · '+d.name,15,0,()=>{payer[field]-=d.total;s.coins+=your;p.coins+=r.share;r.paid=your;r.status='done';if(r.assisted){shift(s,key,1);rememberExperience(s,d.actor,'cooperation',true);record(s,d,'合作完成，实际分帐'+r.share+'文');}s.result.push('实际总工钱'+d.total+'文：你'+your+'文，同伴'+r.share+'文；没有重复材料或自动掉落。');},advance);
 }
 if(choice==='withdraw'){
  if(!['open','ready'].includes(r.status))return fail('没有可撤回的这项合作。');return transact(s,'撤回 · '+d.name,0,0,()=>{detach(s,key,'合作撤回，同伴离队');r.status='withdrawn';if(!r.assisted)r.share=0;s.result.push('实际投入不退，未结算工钱不发；记录保留。');},advance);
 }
 if(choice==='dismiss'&&r.status==='open'&&r.joined)return transact(s,'结束同行',0,0,()=>{detach(s,key,'让同伴返程，自己继续');r.share=0;},advance);
 if(r.status!=='open'||s.place!==d.site)return fail('需进行中的合作，并沿现有道路到现场。');
 if(choice==='solo'&&!r.joined&&!r.prepared)return transact(s,'独行准备',15,0,()=>{r.prepared=true;r.route='solo';r.conflict='resolved';r.share=0;},advance);
 if(r.joined&&r.conflict==='hurt'){
  if(choice==='care'){if(s.bag.herb<1)return fail('伤后照料需自己的药材1份，也可让其离队后独行。');return transact(s,'照料学友',30,2,()=>{s.bag.herb--;p.injuryDays=Math.max(0,p.injuryDays-1);r.conflict='resolved';shift(s,key,1);s.result.push('药材用于处理轻伤；不恢复玩家气血，不获得武学或免费材料。');},advance);}return fail('先照料轻伤，或结束同行后独行；不强迫伤者继续。');
 }
 if(!r.prepared&&r.joined){
  if(key==='boat'&&['safe','persuade'].includes(choice))return transact(s,'商量修架路线',15,choice==='safe'?0:2,()=>{r.prepared=true;r.conflict='resolved';r.route=choice==='safe'?'safe':'quick';r.share=d.share;if(choice==='persuade'&&rng()>=(r.trust? .75:.45)){shift(s,key,-1);detach(s,key,'船工拒绝冒险并离队');r.share=0;}else s.result.push('路线商量完成；协助不保证成功。');},advance);
  if(key==='hunter'&&['fair','bargain'].includes(choice))return transact(s,'商量报酬分帐',15,choice==='fair'?0:2,()=>{r.prepared=true;r.conflict='resolved';r.route=choice;r.share=choice==='fair'?6:4;if(choice==='bargain'&&rng()>=(r.trust?.8:.5)){shift(s,key,-1);detach(s,key,'猎户不接受分帐，离队');r.share=0;}else s.result.push('实际结算时按约分帐，未提前发奖。');},advance);
  if(key==='smith'&&['self','support'].includes(choice)){if(choice==='support'&&(r.trust<1||p.coins<2||s.coins>9999998))return fail('需已有熟悉关系且铁匠实际余钱2文；也可自己备材料。');return transact(s,'商量材料投入',15,0,()=>{r.prepared=true;r.conflict='resolved';r.route=choice;r.share=d.share;if(choice==='support'){p.coins-=2;s.coins+=2;r.support=2;}s.result.push('仍需玩家自己的铁料1、木料1；补助来自铁匠实际余额，不生成材料。');},advance);}
  if(key==='peer'&&['safe','quick'].includes(choice)){if(s.hp<25||p.energy<8)return fail('侦察需玩家气血25及学友精力8；不足可撤回。');return transact(s,'学友侦察路线',choice==='safe'?45:20,8,()=>{p.energy-=6;r.npcSpent+=6;r.prepared=true;r.route=choice;r.share=d.share;r.conflict='resolved';if(choice==='quick'&&rng()<.3){s.hp=Math.max(0,s.hp-30);p.injuryDays=Math.max(1,p.injuryDays);r.conflict='hurt';s.result.push('险路失足：你损失30气血，学友轻伤；先照料或让其离队。');if(!s.hp){s.dead=true;detach(s,key,'玩家身亡，学友自行返程');r.status='died';r.share=0;}}},advance);}
 }
 if(choice!=='work'||!r.prepared||r.conflict!=='resolved')return fail('先处理合作分歧或独行准备，再实际作业。');
 const plan=companionWorkPlan(s,key);if(plan.blocker)return fail(plan.blocker);
 const {assisted,minutes,energy,chance,risk}=plan;
 return transact(s,'实际作业 · '+d.name,minutes,energy,()=>{for(const [k,n] of Object.entries(d.input))s.bag[k]-=n;if(assisted){p.energy-=12;r.npcSpent+=12;}r.assisted=assisted;if(!assisted)r.share=0;const success=rng()<chance;r.status=success?'ready':'failed';if(rng()<risk){s.hp=Math.max(0,s.hp-8);if(assisted)p.injuryDays=Math.max(1,p.injuryDays);s.result.push('意外擦伤8气血'+(assisted?'，同伴轻伤，停止同行。':'。'));if(!s.hp){s.dead=true;r.status='died';}}detach(s,key,'本次作业结束，同伴返程',minutes);if(!s.dead){const line=gain(s,d.skill,success?2:1);if(line)s.result.push(line);if(!success&&assisted){shift(s,key,-1);rememberExperience(s,d.actor,'cooperation',false);}s.result.push(success?'成果保留，去付款处按真实分帐结算。':'作业未成，材料、工钱、精力与伤势保留，无报酬；原有短工仍可谋生。');}},advance);
}
export function companionOptions(s){const out=[];if(s.dead)return out;for(const [id,d] of Object.entries(COOPERATIONS)){const r=s.adventures.companions.records[id],add=(choice,label,preview=d.info,blocker=null)=>out.push({id:'companion:'+id+':'+choice,label,preview,blocker});if(r.status==='new'&&s.place===d.from){const t=companionInviteTerms(s,id);add('invite','邀请 · '+d.name,d.info+' 本次邀请工钱'+t.fee+'文'+(t.trusted?'（熟识、同门或真实共事，免邀请费；完工仍按约分帐）。':'；未提前发放报酬。'),t.blocker);}if(r.status==='open'){add('withdraw','撤回 · '+d.name,'投入不退，无罚款或预付报酬。');if(r.joined)add('dismiss','离队独行 · '+d.name,'同伴沿原路返程，不瞬移玩家，仍可独行作业。');if(s.place===d.site){if(!r.joined&&!r.prepared)add('solo','独行准备 · '+d.name,'15分钟；成功率较低，仍需自己的材料。');if(r.joined&&r.conflict==='hurt')add('care','伤后照料 · '+d.name,'药材1份、30分钟/精力2；或结束同行。');else if(!r.prepared&&r.joined){const choices=id==='boat'?['safe','persuade']:id==='hunter'?['fair','bargain']:id==='smith'?['self','support']:['safe','quick'];for(const choice of choices)add(choice,({safe:'选择稳妥',persuade:'说服冒险',fair:'接受猎户分6文',bargain:'商谈分4文',self:'自己备材料',support:'请铁匠出2文',quick:'冒险快查'})[choice]+' · '+d.name,preparationPreview(s,id,choice));}else if(r.prepared&&r.conflict==='resolved'){const plan=companionWorkPlan(s,id);add('work','实际作业 · '+d.name,workPreview(s,id,plan),plan.blocker);}}}
 if(r.status==='ready'&&s.place===d.claim)add('claim','结算 · '+d.name,'实际总工钱'+d.total+'文，你'+(d.total-r.share)+'文，同伴'+r.share+'文；余额不足保留成果。');}return out;}
// Scene feedback projects finite saved outcomes; it never creates an event or NPC location.
export function companionFeedback(s,key){
 const d=COOPERATIONS[key],r=s.adventures.companions.records[key];if(r.status==='new')return null;
 const p=s.npcWorld.individuals[d.actor],returning=r.returnAt>clock(s),departure=p.history.find(h=>h.includes('沿已有道路返程'));
 let hint,detail;
 if(r.status==='open'){
  hint=r.joined?(r.conflict==='hurt'?'伤后待照料':r.prepared?'同行待作业':'同行待商量'):'可独行继续';
  detail=r.joined?(r.conflict==='hurt'?'学友轻伤，先照料或离队；不强迫继续。':'同伴仍在约定路线，点击本人商量或作业；可自由离队。'):(returning?p.name+'正在沿原路返程。':'本段同行已结束。')+'未完作业仍留在现场，可独行准备、作业或撤回。'+(departure?' 最近同行记录：'+departure:'');
 }else if(r.status==='ready'){
  hint='成果待交代';const cash=d.payer==='public'?s.commerce.budget.market:s.npcWorld.individuals[d.payer].coins,payer=d.payer==='public'?'县衙':s.npcWorld.individuals[d.payer].name;
  detail='成果保留，到'+places[d.claim].name+'找'+payer+'按原规则交代；总工钱'+d.total+'文，你'+(d.total-r.share)+'文，同伴'+r.share+'文。'+(cash<d.total?'付款方现有余额不足'+d.total+'文，暂不能整笔结算。':'白天接洽，实际付款后才入袋。');
 }else if(r.status==='done'){hint='已结清';detail=(r.assisted?'共同作业':'独行作业')+'已结清，你实际领到'+r.paid+'文，同伴实际分帐'+r.share+'文；不重复领奖。';}
 else if(r.status==='failed'){hint='作业未成';detail=(r.assisted?'共同作业':'独行作业')+'未成，材料、工钱和精力已消耗，无报酬，本项不重试；仍可做原有短工或离开。';}
 else if(r.status==='withdrawn'){hint='已撤回';detail='本项已撤回，已投入不退，未结算工钱不发；没有罚款，仍可离开。';}
 else {hint='身亡结束';detail='本段冒险随人生结束；不发报酬，不重新开工。';}
 if(r.status!=='open'&&returning)detail+=' '+p.name+'正在沿原路返程，途中暂停接洽。';
 if((r.joined||r.assisted)&&p.injuryDays)detail+=' '+p.name+'目前带伤，不能强迫其继续。';
 return {id:key,name:d.name,hint,brief:d.name+'：'+hint+'。',detail};
}
export function companionActorHint(s,actor){
 for(const [key,d] of Object.entries(COOPERATIONS)){const r=s.adventures.companions.records[key];
  if(r.status==='ready'&&d.payer===actor)return '有工钱待交代';
  if(d.actor!==actor)continue;
  if(r.joined)return r.conflict==='hurt'?'伤后需照料':'正在同行';
  if(r.assisted&&r.status==='ready')return '成果待交代';
  if(r.assisted&&s.day<=r.invitedDay+2&&['failed','done'].includes(r.status))return r.status==='failed'?'上次合作未成':'上次合作结清';
 }return null;
}
export function companionSummary(s){return Object.entries(COOPERATIONS).filter(([id])=>s.adventures.companions.records[id].status!=='new').map(([id,d])=>{const r=s.adventures.companions.records[id];return d.name+'：'+({open:r.joined?'同行中':'可独行继续',ready:'待结算',done:'已完成',failed:'失败',withdrawn:'已撤回',died:'身亡结束'})[r.status]+'；合作信任'+r.trust+'/3，邀请工钱'+r.fee+'文，NPC实际精力消耗'+r.npcSpent+'，已收款'+r.paid+'文。';});}
