import {growthPreview} from './practice-growth.js?v=5.49.0';
import {places,people} from './content.js?v=5.49.0';
import {fieldChance,fieldRisk,useFieldClue} from './field-skills.js?v=5.49.0';
import {forestBonus,rainDelay,wornUtility,useUtility} from './equipment.js?v=5.49.0';
import {addInjury} from './injury.js?v=5.49.0';

// Three finite jobs. Held medicine and game never enter saleable inventory twice.
export const FOREST_CONTRACTS={
 search:{name:'山林寻人',holder:'farmer',home:'fields',reward:12,duration:2880,maxStep:3,info:'两游戏日内寻人并带回河湾村。南山脚辨路、南山坡救助需自备药材1份；找到后可冒险寻找财物或立即护送。最多16文由陈农户实际支付。'},
 medicine:{name:'雨中送药',holder:'doctor',home:'village',reward:14,duration:360,maxStep:3,info:'实际雨天接单，六小时内向青石码头贺船工交药。自己的药材2份、绳线1份打包，南山脚选绕路或涉水近路；失手药包报废。送达后回沈医者处领14文。'},
 hunt:{name:'追踪伤兽',holder:'hunter',home:'bamboo',reward:8,duration:2880,maxStep:2,info:'两游戏日内从竹林追踪到南山坡；自备猎具、绳线1份，选择稳妥设猎或冒险驱赶。伤兽可能逃走或反扑。成功带回肉1份、生皮1份并向猎户领8文，仅一次。'}
};
const statuses=['new','active','claim','done','failed','left','died'];
const routes={search:['safe','quick'],medicine:['detour','ford'],hunt:['patient','drive']};
const clock=s=>(s.day-1)*1440+s.minute;
const blank=()=>({status:'new',accepted:0,due:0,step:0,route:null,extra:null,cargo:0});
export const makeForestContracts=()=>({records:Object.fromEntries(Object.keys(FOREST_CONTRACTS).map(id=>[id,blank()]))});
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
export function forestContractsValid(s){
 const x=s.forestContracts;if(!obj(x)||Object.keys(x).length!==1||!obj(x.records)||Object.keys(x.records).length!==3)return false;
 if(Object.values(x.records).filter(r=>r?.status==='active').length>1)return false;
 return Object.entries(FOREST_CONTRACTS).every(([id,d])=>{const r=x.records[id];
  if(!obj(r)||Object.keys(r).length!==7||!statuses.includes(r.status)||!Number.isSafeInteger(r.accepted)||r.accepted<0||r.accepted>clock(s)||!Number.isSafeInteger(r.due)||!Number.isSafeInteger(r.step)||r.step<0||r.step>d.maxStep||r.route!==null&&!routes[id].includes(r.route)||![null,'found','lost'].includes(r.extra)||!Number.isSafeInteger(r.cargo)||r.cargo<0||r.cargo>2)return false;
  if(r.status==='new')return r.accepted===0&&r.due===0&&r.step===0&&r.route===null&&r.extra===null&&r.cargo===0;
  if(r.due!==r.accepted+d.duration||id!=='search'&&r.extra!==null||id!=='medicine'&&r.cargo!==0)return false;
  if(['claim','done'].includes(r.status)&&r.step!==d.maxStep)return false;
  if(r.status==='active'&&(s.dead||clock(s)>r.due||r.step>=d.maxStep))return false;
  if(r.status==='claim'&&s.dead||r.status==='died'&&!s.dead)return false;
  if(id==='medicine'&&r.cargo!==(r.status==='active'&&r.step>=1?2:0))return false;
  if(id==='search'&&(r.step>=1)!==(r.route!==null)||id==='medicine'&&(r.step>=2)!==(r.route!==null)||id==='hunt'&&(r.step>=2)!==(r.route!==null))return false;
  if(r.extra!==null&&(id!=='search'||r.step<2))return false;
  return true;
 });
}
export function reconcileForestContracts(s){for(const [id,r] of Object.entries(s.forestContracts?.records??{})){
 if(s.dead&&['active','claim'].includes(r.status)){r.status='died';r.cargo=0;}
 else if(r.status==='active'&&clock(s)>r.due){r.status='failed';r.cargo=0;s.news.unshift(FOREST_CONTRACTS[id].name+'已超时，其他人接手；自备投入不退，无报酬。');s.news.length=Math.min(20,s.news.length);}
}}
export function forestPlan(s,id,action){
 if(id==='search'&&['safe','quick'].includes(action))return {place:'foot',minutes:action==='safe'?90:35,energy:action==='safe'?8:12,chance:Math.min(.95,fieldChance(s,'navigation',action==='safe'?.8:.55)+forestBonus(s)),risk:fieldRisk(s,action==='safe'?.05:.2),damage:8,input:{},skill:'navigation'};
 if(id==='search'&&action==='rescue')return {place:'hill',minutes:45,energy:10,chance:1,risk:0,damage:0,input:{herb:1},skill:'herb'};
 if(id==='search'&&action==='belongings')return {place:'hill',minutes:45,energy:10,chance:fieldChance(s,'tracking',.6),risk:fieldRisk(s,.25),damage:12,input:{},skill:'tracking'};
 if(id==='search'&&action==='escort')return {place:'village',minutes:45,energy:10,chance:1,risk:0,damage:0,input:{},skill:'carry'};
 if(id==='medicine'&&action==='pack')return {place:'village',minutes:30,energy:4,chance:1,risk:0,damage:0,input:{herb:2,cord:1},skill:'herb'};
 if(id==='medicine'&&['detour','ford'].includes(action))return {place:'foot',minutes:(action==='detour'?120:45)+rainDelay(s,true),energy:action==='detour'?8:14,chance:action==='detour'?1:fieldChance(s,'navigation',s.weather==='雨'?.6:.75),risk:fieldRisk(s,action==='detour'?0:.2),damage:10,input:{},skill:'navigation'};
 if(id==='medicine'&&action==='deliver')return {place:'dock',minutes:15,energy:0,chance:1,risk:0,damage:0,input:{},skill:'carry'};
 if(id==='hunt'&&action==='track')return {place:'bamboo',minutes:45,energy:8,chance:fieldChance(s,'tracking',.75),risk:0,damage:0,input:{},skill:'tracking'};
 if(id==='hunt'&&['patient','drive'].includes(action))return {place:'hill',minutes:action==='patient'?90:35,energy:action==='patient'?14:20,chance:fieldChance(s,'tracking',(action==='patient'?.75:.5)+(wornUtility(s,'hunting_vest')?.08:0)),risk:fieldRisk(s,action==='patient'?.1:.35),damage:15,input:{cord:1},skill:'hunt'};
 return null;
}
const actionsFor=(id,r)=>id==='search'?r.step===0?['safe','quick']:r.step===1?['rescue']:['escort',...(r.extra===null?['belongings']:[])]:id==='medicine'?r.step===0?['pack']:r.step===1?['detour','ford']:['deliver']:r.step===0?['track']:['patient','drive'];
export function forestBlocker(s,id,action,present){
 const d=FOREST_CONTRACTS[id],r=s.forestContracts?.records?.[id];if(!d||!r)return '没有这项山林委托。';
 if(s.dead||s.pending||s.combat||s.adventures.law.pursuit)return '先处理眼前选择或交手；死亡后不能继续。';
 if(action==='accept'){
  if(r.status!=='new'||Object.values(s.forestContracts.records).some(x=>x.status==='active'))return '本单已处理，或有另一项进行中的山林委托；不重开。';
  if(s.place!==d.home||!present(s,d.holder,15)||id==='hunt'&&s.npcWorld.individuals.hunter.place!==s.place)return '请到委托人实际在场并能接洽时领取。';
  if(id==='medicine'&&s.weather!=='雨')return '只在实际雨天需要这趟送药，不人为改变天气。';
  return null;
 }
 if(action==='decline')return r.status==='new'&&s.place===d.home?null:'未领取时可在原接单处拒绝；已处理不重开。';
 if(action==='withdraw')return r.status==='active'?null:'没有这项进行中的委托；已完成成果保留待付款。';
 if(action==='claim'){
  if(r.status!=='claim'||s.place!==d.home||!present(s,d.holder,15)||id==='hunt'&&s.npcWorld.individuals.hunter.place!==s.place)return '需实际完成并回到委托人在场时交代，仅结算一次。';
  const pay=d.reward+(r.extra==='found'?4:0);if(s.npcWorld.individuals[d.holder].coins<pay||s.coins>10000000-pay)return '付款人现钱不足或无法收款；整笔成果保留。';
  if(id==='hunt'&&(s.bag.meat>=1000000||s.bag.hide>=1000000))return '背包容量不足，猎物和报酬整笔留存。';
  return null;
 }
 if(r.status!=='active'||clock(s)>r.due||!actionsFor(id,r).includes(action))return '委托步骤不符或已结束，失败不重掷。';
 const p=forestPlan(s,id,action);if(!p||s.place!==p.place)return '请按任务手册沿现有道路到现场，不会自动移动。';
 if(s.minute<360||s.minute+p.minutes>1080)return '野外与交付作业需在06:00–18:00内做完。';
 if(clock(s)+p.minutes>r.due)return '剩余期限不足以完成本步，可撤回或等待其他人接手。';
 if(s.hp<25||s.energy<p.energy)return '需气血25、精力'+p.energy+'；可养伤或零精力撤回。';
 if(Object.entries(p.input).some(([k,n])=>s.bag[k]<n))return '自己的材料不足，整笔不消耗；先准备或撤回。';
 if(id==='hunt'&&['patient','drive'].includes(action)&&!s.bag.trap)return '需自己的猎具；皮衣不能代替猎具。';
 if(id==='medicine'&&action==='deliver'&&!present(s,'boatman',15))return '贺船工暂不在岗或不能接洽，药包仍留存，期限照常流逝。';
 return null;
}
export function forestAction(s,id,{settle,rng,present}){
 const parts=String(id).split(':');if(parts.length!==3){s.result=['没有这项山林委托行动。'];return false;}
 const [,key,action]=parts,why=forestBlocker(s,key,action,present);if(why){s.result=[why];return false;}
 const d=FOREST_CONTRACTS[key],r=s.forestContracts.records[key];
 if(action==='accept')return settle(s,'领取 · '+d.name,15,0,()=>{r.status='active';r.accepted=clock(s);r.due=r.accepted+d.duration;s.result.push(d.info,'截止第'+(Math.floor(r.due/1440)+1)+'日 '+String(Math.floor(r.due%1440/60)).padStart(2,'0')+':'+String(r.due%60).padStart(2,'0')+'；不预付，可以撤回，不重开。');});
 if(action==='decline'||action==='withdraw')return settle(s,'结束 · '+d.name,0,0,()=>{if(action==='decline'){r.accepted=clock(s);r.due=r.accepted+d.duration;}r.status='left';r.cargo=0;s.result.push('选择不继续，其他人接手；已花耗不退，没有报酬，不强迫交手。');});
 if(action==='claim')return settle(s,'交代 · '+d.name,15,0,()=>{const n=d.reward+(r.extra==='found'?4:0);s.npcWorld.individuals[d.holder].coins-=n;s.coins+=n;if(key==='hunt'){s.bag.meat++;s.bag.hide++;}r.status='done';s.result.push(n+'文实际扣委托人钱袋；仅一次。'+(key==='hunt'?'实际猎物转入肉1份、生皮1份，未克隆其他猎场库存。':''));});
 const p=forestPlan(s,key,action),success=p.chance===1||rng()<p.chance;
 return settle(s,d.name+' · '+labels[action],p.minutes,p.energy,()=>{
  for(const [k,n] of Object.entries(p.input))s.bag[k]-=n;
  if(key==='search'&&['safe','quick'].includes(action)){r.route=action;r.step=1;if(forestBonus(s))useUtility(s,'forest_staff');useFieldClue(s,'navigation');}
  if(key==='medicine'&&['detour','ford'].includes(action)){r.route=action;r.step=2;if(s.weather==='雨')useUtility(s,'rain_cloak');if(action==='ford')useFieldClue(s,'navigation');}
  if(key==='hunt'&&['patient','drive'].includes(action)){r.route=action;r.step=2;useUtility(s,'hunting_vest');}
  if(['track','belongings','patient','drive'].includes(action))useFieldClue(s,'tracking');
  if(action==='belongings')r.extra=success?'found':'lost';
  else if(!success){r.status='failed';r.cargo=0;s.result.push(key==='hunt'?'伤兽逃走，此次结束，没有猎物或报酬。':key==='medicine'?'涉水失手，药包报废，自备材料不退，无报酬。':'没找到有效路线，搜寻交给其他人；这项不重掷。');}
  else if(action==='rescue'){r.step=2;s.result.push('药材已用于救助；找到的人等待你沿道路护送至河湾村，可直接回村，不必找财物。');}
  else if(action==='pack'){r.step=1;r.cargo=2;s.result.push('自己的两份药材进入不可出售的药包，绳线已用；仍需走到南山脚选路线。');}
  else if(action==='track'){r.step=1;s.result.push('发现通往南山坡的足迹，需沿现有道路前往。');}
  else if(['escort','deliver','patient','drive'].includes(action)){r.step=d.maxStep;r.status='claim';r.cargo=0;s.result.push('实际成果完成；回委托人处交代，不自动发钱。');}
  else s.result.push('本步完成，请沿道路继续；没有瞬移或回血。');
  if(action==='belongings')s.result.push(success?'找到当事人的财物，交回时额外4文由陈农户支付；不是可卖物资。':'没有找到财物，仍可护送回村，不能重搜。');
  if(p.risk&&rng()<p.risk){s.hp=Math.max(0,s.hp-p.damage);addInjury(s,key==='hunt'?'cut':'bruise');s.result.push('途中意外，气血-'+p.damage+'并受伤，可能永久死亡。');if(!s.hp){s.dead=true;r.status='died';r.cargo=0;}}
  if(p.risk)useFieldClue(s,'awareness');
 },{[p.skill]:success?(['escort','deliver','patient','drive'].includes(action)?20:6):2});
}
const labels={safe:'沿主径辨路',quick:'冒险抄近路',rescue:'用药救助',belongings:'继续寻找财物',escort:'带人回村',pack:'自备材料打包',detour:'绕开涉水小径',ford:'冒险涉水赶路',deliver:'向船工交药',track:'追查伤兽足迹',patient:'稳妥设猎',drive:'冒险驱赶',accept:'领取',decline:'拒绝',withdraw:'撤回',claim:'交代'};
const stateNames={new:'未接，可忽略',active:'进行中',claim:'完成，待实际付款',done:'已结清',failed:'失败或逾期，其他人接手',left:'已拒绝或撤回',died:'人生结束，未结算'};
export function forestOptions(s,present){const out=[];for(const [id,d] of Object.entries(FOREST_CONTRACTS)){const r=s.forestContracts.records[id];let actions=r.status==='new'&&s.place===d.home?['accept','decline']:r.status==='claim'&&s.place===d.home?['claim']:r.status==='active'?[...actionsFor(id,r).filter(a=>forestPlan(s,id,a)?.place===s.place),'withdraw']:[];
 for(const action of actions){const p=forestPlan(s,id,action),preview=p?p.minutes+'分钟 / 精力'+p.energy+'；成功率'+Math.round(p.chance*100)+'%；'+(Object.entries(p.input).map(([k,n])=>({herb:'药材',cord:'绳线'}[k])+n+'份').join('、')||'不耗额外材料')+'；'+(p.risk?'受伤概率'+Math.round(p.risk*100)+'%，气血-'+p.damage+'并受伤。':'本步无直接受伤风险。')+(id==='hunt'&&['patient','drive'].includes(action)?'需自备猎具；':'')+'失败花耗保留，可能逾期；装备须实际穿戴且未损坏。':action==='withdraw'||action==='decline'?'零精力结束，仅一次；已投入不退，没有报酬。':d.info;
 out.push({id:'forest:'+id+':'+action,label:labels[action]+' · '+d.name,preview:preview+(p?growthPreview(s,p.skill,p.energy,['escort','deliver','patient','drive'].includes(action)?20:6,2):''),blocker:forestBlocker(s,id,action,present)});
 }}return out;}
export const forestSummary=s=>Object.entries(FOREST_CONTRACTS).map(([id,d])=>{const r=s.forestContracts.records[id];return d.name+' · '+stateNames[r.status]+'；步骤'+r.step+'/'+d.maxStep+(r.route?'，'+labels[r.route]:'')+(r.extra?'；财物'+(r.extra==='found'?'找到':'未找到'):'')+(r.cargo?'；留存药材'+r.cargo+'份':'')+'。';});
export function forestTasks(s){return Object.entries(FOREST_CONTRACTS).filter(([id])=>['active','claim'].includes(s.forestContracts.records[id].status)).map(([id,d])=>{const r=s.forestContracts.records[id],p=r.status==='claim'?d.home:forestPlan(s,id,actionsFor(id,r)[0]).place;return {title:d.name,place:p,next:r.status==='claim'?'找委托人实际付款，缺钱或无法接洽时整笔成果保留。':d.info,due:r.status==='claim'?0:Math.floor(r.due/1440)+1,goods:'截止时刻 '+Math.floor(r.due%1440/60)+':'+String(r.due%60).padStart(2,'0')+'；'+forestSummary(s).find(x=>x.startsWith(d.name)),group:'forest'};});}
