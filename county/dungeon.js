import {places} from './content.js?v=5.71.0';
import {gain} from './progression.js?v=5.71.0';
import {addInjury} from './injury.js?v=5.71.0';
import {travelBusy} from './npc-journeys.js?v=5.71.0';

// One finite expedition, sharing the existing mine rescue and its actual payer.
export const makeDungeon=()=>({status:'new',stage:0,day:0,surveyed:false,inspected:false,route:null,loot:'new',rescue:'new',guide:'none',until:0,returnAt:0});
export const expeditionClock=s=>s.day*1440+s.minute;
const clock=expeditionClock;
const active=s=>s.dungeon?.status==='active';
export const dungeonMovementBlocker=s=>s.wreck?.status==='active'?'正在河岸废船内；先沿来路返回河岸，再走县境道路。':s.fort?.status==='active'?'正在荒山旧堡内；先处理机关或交手，再撤回旧道。':s.raid?.status==='active'?'正在山中匪寨内；先处理副本或交手，再撤回旧道。':active(s)?'正在废弃矿道内；先从副本行动撤回洞口，再走县境道路。':null;
export const dungeonGuideLocation=(s,id)=>{if(id!=='hunter')return undefined;const trips=[s.dungeon,s.raid].filter(Boolean);if(trips.some(d=>d.guide==='joined'))return s.place;return trips.some(d=>d.returnAt>clock(s))?null:undefined;};
export function guideReturnMinutes(s){const q=[[s.place,0]],seen=new Set();while(q.length){const [id,n]=q.shift();if(id==='bamboo')return n;if(seen.has(id))continue;seen.add(id);for(const to of places[id].routes)q.push([to,n+places[to].minutes]);}return 120;}
function dismiss(s,text,after=0){const d=s.dungeon;if(d.guide!=='joined')return;d.guide='left';d.until=0;d.returnAt=clock(s)+after+guideReturnMinutes(s);s.result.push(text+'；蒋猎户按县境道路返程，工钱不退，材料与伤势保留。');}
export function guideAvailable(s,until,minutes=0){const p=s.npcWorld.individuals.hunter;return !p.life.deathDay&&!p.life.sickDays&&p.life.restDay!==s.day&&!p.retirement.active&&!p.injuryDays&&!travelBusy(s,'hunter')&&p.energy>=6&&clock(s)+minutes<=until;}
const fitGuide=(s,minutes=0)=>guideAvailable(s,s.dungeon.until,minutes);
export function reconcileDungeon(s){const d=s.dungeon;if(!d)return;if(s.dead&&active(s))d.status='died';if(d.guide==='joined'&&(s.dead||s.pending||s.combat||!['bamboo','hill','mine'].includes(s.place)||!fitGuide(s)))dismiss(s,'同伴结束这次矿道同行');}
export function dungeonValid(s){const d=s.dungeon,empty=makeDungeon(),int=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).length!==Object.keys(empty).length||Object.keys(empty).some(k=>!Object.hasOwn(d,k))||!['new','active','done','left','died'].includes(d.status)||!int(d.stage,4)||!int(d.day,s.day)||typeof d.surveyed!=='boolean'||typeof d.inspected!=='boolean'||d.surveyed&&!d.inspected||![null,'safe','quick'].includes(d.route)||!['new','ore','fine','empty','skipped'].includes(d.loot)||!['new','saved','failed','skipped','unavailable'].includes(d.rescue)||!['none','joined','left','refused'].includes(d.guide)||!int(d.until,clock(s)+600)||!int(d.returnAt,clock(s)+500))return false;
 if(d.guide==='joined'&&(d.until<clock(s)||d.returnAt||s.adventures.companions.active!==null||s.raid?.guide==='joined'||!['bamboo','hill','mine'].includes(s.place)||['done','left','died'].includes(d.status)))return false;
 if(d.guide!=='joined'&&d.until||d.guide!=='left'&&d.returnAt)return false;
 if(d.status==='new')return d.stage===0&&d.day===0&&!d.inspected&&!d.surveyed&&d.route===null&&d.loot==='new'&&d.rescue==='new';
 if(!d.day||!d.stage||d.status==='died'&&!s.dead||s.dead&&d.status==='active')return false;
 if(active(s)&&(s.place!=='mine'||s.combat||s.pending))return false;
 if(d.stage===1&&d.route!==null||d.stage>=2&&d.route===null||d.stage<=2&&d.rescue!=='new'&&d.rescue!=='unavailable'||d.stage<3&&d.loot!=='new'||d.stage>=3&&d.loot==='new'||d.stage===3&&['saved','failed','skipped'].includes(d.rescue)||d.stage===4&&d.rescue==='new'||d.status==='done'&&d.stage!==4)return false;
 const old=s.adventures.outings.records.mine;
 if(d.rescue==='saved'&&!['claim','done','died'].includes(old.outcome)||d.rescue==='failed'&&!['failed','died'].includes(old.outcome)||d.rescue==='skipped'&&old.outcome!=='left')return false;
 if(d.loot==='fine'&&s.skills.mining<150)return false;
 return true;
}
function harm(s,n){s.hp=Math.max(0,s.hp-n);addInjury(s,'strain');s.result.push('失足或落石：气血 -'+n+'，拉伤；可能永久死亡。');if(!s.hp){s.dead=true;s.dungeon.status='died';s.result.push('你在矿道伤重身亡，不能自动读档复活。');}}
function xp(s,key,n){const line=gain(s,key,n);if(line)s.result.push(line);}
function finish(s,status,minutes){s.dungeon.status=status;dismiss(s,'矿道同行结束',minutes);s.result.push('退回旧矿洞洞口；不瞬移、不回血，已有物资保留，副本不重开。');}
function helper(s,minutes){if(s.dungeon.guide!=='joined')return false;if(!fitGuide(s,minutes)){dismiss(s,'同伴拒绝继续这段冒险');return false;}s.npcWorld.individuals.hunter.energy-=6;return true;}
export function dungeonPlan(s,key){const d=s.dungeon,help=d.guide==='joined'&&fitGuide(s,75),bonus=help?.08:0;
 return ({inspect:{stage:1,minutes:30,energy:4,chance:Math.min(.95,.65+(s.skills.awareness>=12?.15:0)+bonus),risk:0,damage:0,input:{},skill:'awareness'},lash:{stage:1,minutes:90,energy:12,chance:1,risk:.05,damage:8,input:{cord:1},skill:'woodwork'},safe:{stage:1,minutes:60,energy:8,chance:1,risk:.03,damage:8,input:{wood:1},skill:'woodwork'},quick:{stage:1,minutes:30,energy:10,chance:1,risk:d.surveyed?.12:.35,damage:12,input:{},skill:'navigation'},mine:{stage:2,minutes:45,energy:12,chance:Math.min(.9,.6+(s.skills.mining>=30?.15:0)+bonus),risk:d.route==='safe'?.05:.18,damage:10,input:{},skill:'mining'},skip:{stage:2,minutes:15,energy:0,chance:1,risk:0,damage:0,input:{},skill:null},rescue:{stage:3,minutes:75,energy:16,chance:Math.min(.95,.85+(s.skills.woodwork>=12?.05:0)+bonus),risk:.05,damage:8,input:{wood:2,cord:1},skill:'woodwork'},lift:{stage:3,minutes:45,energy:20,chance:Math.min(.85,.5+(s.skills.carry>=12?.15:0)+bonus),risk:d.surveyed?.15:.3,damage:24,input:{},skill:'carry'},pass:{stage:3,minutes:15,energy:0,chance:1,risk:0,damage:0,input:{},skill:null},exit:{stage:4,minutes:30,energy:0,chance:1,risk:0,damage:0,input:{},skill:null},withdraw:{stage:d.stage,minutes:60,energy:0,chance:1,risk:d.surveyed?.05:.2,damage:8,input:{},skill:null}})[key]??null;
}
export function dungeonBlocker(s,key){const d=s.dungeon,p=s.npcWorld.individuals.hunter;
 if(s.fort?.status==='active')return '先结束荒山旧堡。';
 if(s.raid?.status==='active')return '先结束山中匪寨，不能同时进入另一处副本。';
 if(s.dead||s.pending||s.combat||s.adventures.law.pursuit)return '先处理眼前事件；永久死亡后不能进入或继续。';
 if(key==='invite')return d.status!=='new'||d.guide!=='none'||s.place!=='bamboo'||s.adventures.companions.active!==null||s.raid?.guide==='joined'||(s.raid?.returnAt??0)>clock(s)||s.adventures.companions.records.hunter.returnAt>clock(s)||s.minute<480||s.minute+15>1080||p.life.deathDay||p.life.sickDays||p.life.restDay===s.day||p.retirement.active||p.injuryDays||travelBusy(s,'hunter')||p.energy<20||s.coins<3||p.coins>999997?'需在竹林白天接洽健康猎户、自己的3文且无其他同行；每次副本只问一次。':null;
 if(key==='dismiss')return d.guide==='joined'?null:'当前没有矿道同伴。';
 if(key==='enter')return d.status!=='new'||s.place!=='mine'||s.hp<25||s.energy<8?'需到旧矿洞、气血25、精力8；副本仅进入一次。':null;
 if(!active(s)||s.place!=='mine')return '需在进行中的废弃矿道内；已结束不会刷新。';
 const plan=dungeonPlan(s,key);if(!plan||plan.stage!==d.stage)return '请按当前场景选择。';
 if(key==='inspect'&&d.inspected)return '入口已察看，失败也不能读档重查。';
 if(key==='lash'&&s.skills.woodwork<24)return '木工累计经验需24，才能辨用旧撑并绑扎受力；仍可自备新木加固、穿缝或撤回。';
 if(key==='lash'&&!d.surveyed)return d.inspected?'本次察看未辨出可用旧撑，不能凭空修复；仍可自备新木加固、穿缝或撤回。':'先实际察看入口支撑，确认可用旧撑后才能绑扎；察看可能失败，不能重查。';
 if(key==='mine'&&!s.bag.pick)return '有限矿堆需要自己的矿镐；可跳过。';
 if(['rescue','lift'].includes(key)&&d.rescue==='unavailable')return '旧矿洞救工已有结局，这里不再出现同一位困工。';
 if(!['withdraw','exit','skip','pass'].includes(key)&&s.hp<25)return '气血不足25，仍可跳过或撤回，撤离风险会提前显示。';
 if(s.energy<plan.energy)return '精力不足'+plan.energy+'；仍可零精力撤回。';
 if(Object.entries(plan.input).some(([k,n])=>s.bag[k]<n))return '需要自己的'+Object.entries(plan.input).map(([k,n])=>({wood:'木料',cord:'绳线'}[k])+'×'+n).join('、')+'；可选择另一条路或撤回。';
 if(key==='mine'&&(s.bag.ore>999998||s.skills.mining>=150&&s.bag.fine_ore>=1000000))return '背包矿料容量不足；可跳过。';
 return null;
}
export function dungeonAction(s,id,{settle,rng}){const [,key,...extra]=String(id).split(':'),why=extra.length?'没有这项矿道行动。':dungeonBlocker(s,key);if(why){s.result=[why];return false;}const d=s.dungeon;
 if(key==='invite')return settle(s,'邀请蒋猎户探矿道',15,0,()=>{s.coins-=3;s.npcWorld.individuals.hunter.coins+=3;s.npcWorld.individuals.hunter.energy-=2;if(rng()<((s.relations.hunter??0)>=3?.9:.75)){d.guide='joined';d.until=Math.min(clock(s)+600,s.day*1440+1080);s.result.push('猎户收下准备工钱，答应同行；最多十小时且不晚于18时，仅竹林—南山坡—旧矿洞。每次协助耗他6精力，不保证成功，不分救援报酬。');}else{d.guide='refused';s.result.push('猎户备好绳具后不愿冒险，3文准备工钱已付不退；仍可独行，不重复邀请。');}});
 if(key==='dismiss')return settle(s,'结束矿道同行',0,0,()=>dismiss(s,'你让猎户先返程'));
 if(key==='enter')return settle(s,'进入废弃矿道 · 入口',15,2,()=>{d.status='active';d.stage=1;d.day=s.day;if(s.adventures.outings.records.mine.outcome!=='new')d.rescue='unavailable';s.result.push('四段：入口岔路、有限矿堆、塌落支巷、返回洞口。旧救工共用10文报酬；不自动领取、不赠装备。常规县境行动暂停，可随时选择有风险的撤回。');});
 const p=dungeonPlan(s,key);return settle(s,'废弃矿道 · '+({inspect:'察看支撑',lash:'绑扎旧撑绕行',safe:'加固支撑绕行',quick:'穿过狭缝',mine:'开采有限矿堆',skip:'放弃矿堆',rescue:'木架绳具救工',lift:'徒手搬石救工',pass:'略过支巷',exit:'沿处理过的路线返回',withdraw:'紧急撤回洞口'}[key]),p.minutes,p.energy,()=>{
  const assisted=p.skill?helper(s,p.minutes):false;for(const [k,n] of Object.entries(p.input))s.bag[k]-=n;
  const success=rng()<p.chance;
  if(key==='inspect'){d.inspected=true;d.surveyed=success;s.result.push(success?'辨出松石、支撑走向与可用旧撑，本次路线与救援风险降低；木工累计24可用绳线1份绑扎旧撑，省下新木用于后续救工，但更耗工时精力，仍有落石风险。':'未能看清支撑，耗时耗力，不生成有效线索；可加固绕行。');}
  else if(['safe','quick','lash'].includes(key)){d.route=key==='lash'?'safe':key;if(key==='lash')s.result.push('用自己的绳线绑扎已察明的旧撑，耗时更长，未生成通用木料；新木保留，可用于支巷救工。');d.stage=2;s.result.push('进入第二段 · 有限矿堆；岔路不可重选。');}
  else if(['mine','skip'].includes(key)){d.loot=key==='skip'?'skipped':success?s.skills.mining>=150?'fine':'ore':'empty';if(d.loot==='fine')s.bag.fine_ore++;if(d.loot==='ore')s.bag.ore+=2;d.stage=3;s.result.push(d.loot==='fine'?'凭实际采矿150取得精铁矿1份。':d.loot==='ore'?'取得普通铁矿石2份；高级矿料仍需采矿150。':d.loot==='empty'?'矿料破碎不可用，消耗保留，不再开采。':'放弃矿堆；进入第三段 · 塌落支巷。');}
  else if(['rescue','lift','pass'].includes(key)){const old=s.adventures.outings.records.mine;if(d.rescue!=='unavailable'){d.rescue=key==='pass'?'skipped':success?'saved':'failed';old.outcome=key==='pass'?'left':success?'claim':'failed';old.route=key==='rescue'?'safe':key==='lift'?'risk':'leave';if(success&&key!=='pass')s.relations.smith=Math.min(100,s.relations.smith+1);}d.stage=4;s.result.push(d.rescue==='saved'?'救出困工，可返回洞口后去作坊找许铁匠领取原有10文；没有第二份救工奖励。':d.rescue==='failed'?'救援未成，乡邻接手；投入保留，不能重救领钱。':'本支巷不再救工；第四段沿已走路线返回。');}
  if(p.risk&&rng()<p.risk){harm(s,p.damage);if(assisted){s.npcWorld.individuals.hunter.injuryDays=Math.max(1,s.npcWorld.individuals.hunter.injuryDays);dismiss(s,'猎户也受了轻伤，拒绝继续',p.minutes);}}
  if(!s.dead&&p.skill)xp(s,p.skill,success?2:1);
  if(!s.dead&&['exit','withdraw'].includes(key))finish(s,key==='exit'?'done':'left',p.minutes);
  if(s.dead)dismiss(s,'你身亡，猎户自行返程',p.minutes);
 });
}
const names={inspect:'察看入口支撑',lash:'凭木工绑扎旧撑',safe:'交木料加固绕行',quick:'冒险穿过狭缝',mine:'开采一次矿堆',skip:'跳过有限矿堆',rescue:'用木架绳具救工',lift:'冒险徒手搬石',pass:'略过塌落支巷',exit:'返回旧矿洞洞口',withdraw:'紧急撤回洞口'};
export function dungeonOptions(s){const d=s.dungeon,out=[],add=(key,label,preview)=>out.push({id:'dungeon:'+key,label,preview,blocker:dungeonBlocker(s,key)});if(s.dead)return out;
 if(d.status==='new'){if(s.place==='bamboo'&&d.guide==='none')add('invite','邀请蒋猎户 · 废弃矿道','15分钟；真实准备工钱3文，成功率'+((s.relations.hunter??0)>=3?90:75)+'%，可能拒绝且工钱不退。最多十小时、不晚于18时，仅竹林—南山坡—矿洞同行；协助不代打、不保证成功。');if(s.place==='mine')add('enter','进入副本 · 废弃矿道','入门四场景；15分钟/精力2，需气血25、精力8。自己的木料3、绳线1可走加固救援；木工累计24且察看成功时可改用木料2、绳线2绑扎旧撑再救工，入口多耗30分钟/精力4，落石风险5%（新木加固3%）；矿堆需矿镐；所有材料可缺省改路或跳过。铁矿2或采矿150后精铁1；共用旧救工10文，许铁匠实付。途中有伤亡风险、可撤回，仅首次有成果。');}
 if(d.guide==='joined')add('dismiss','让矿道同伴返程','0分钟/精力0，工钱不退，独行仍可完成。');
 if(active(s)){for(const key of d.stage===1?['inspect','safe','lash','quick']:d.stage===2?['mine','skip']:d.stage===3?d.rescue==='unavailable'?['pass']:['rescue','lift','pass']:['exit']){const p=dungeonPlan(s,key);add(key,names[key],p.minutes+'分钟/精力'+p.energy+'；成功率'+Math.round(p.chance*100)+'%；'+(Object.keys(p.input).length?'自己的'+Object.entries(p.input).map(([k,n])=>({wood:'木料',cord:'绳线'}[k])+'×'+n).join('、')+'；':'')+(p.risk?Math.round(p.risk*100)+'%损失'+p.damage+'气血并拉伤，可能永久死亡。':'本步骤无身体伤害。')+(key==='mine'?'有限矿料，只尝试一次，高级矿需采矿150。':['rescue','lift'].includes(key)?'成功后回作坊自主领取原救工10文，缺钱成果保留；失败结束救援。':'')+(d.guide==='joined'?'协助要看猎户当时健康、精力和剩余时间；本步可能离队。':''));}const p=dungeonPlan(s,'withdraw');add('withdraw',names.withdraw,'60分钟/精力0；'+Math.round(p.risk*100)+'%损失8气血并拉伤，可能死亡。低精力也可退；已获得矿料和救援成果保留，未走场景不重开。');}
 return out;
}
export function dungeonSummary(s){const d=s.dungeon;return d.status==='new'?null:'废弃矿道 · '+({active:'第'+d.stage+'/4段 · '+['','入口岔路','有限矿堆','塌落支巷','返回洞口'][d.stage],done:'已返回',left:'已撤回',died:'身亡'}[d.status])+'；矿堆'+({new:'未处理',ore:'铁矿2',fine:'精铁1',empty:'无所得',skipped:'已跳过'}[d.loot])+'；救工'+({new:'未处理',saved:s.adventures.outings.records.mine.outcome==='done'?'已救出，10文已领取':s.adventures.outings.records.mine.outcome==='died'?'救援成果随人生结束':'已救出，回作坊领取10文',failed:'未成',skipped:'已略过',unavailable:'已有旧结局'}[d.rescue])+'；同行'+({none:'独行',joined:'蒋猎户（不晚于18时）',left:'已离队',refused:'猎户已拒绝'}[d.guide])+'。再访不刷新材料或救援。';}
