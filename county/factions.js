// Three finite local disputes. Standing affects optional services, never basic survival.
import {ORGANIZATIONS} from './adventure-data.js?v=5.17.1';
export const DISPUTES={
 escort:{name:'护送规矩之争',place:'market',holder:'merchant',offset:0,days:3,school:'武馆要求先花时间探路，宁可晚到也不冒险。',caravan:'互助会愿走官道赶交期，但不愿另付武馆探路费。'},
 yard:{name:'武馆场地借用',place:'school',holder:'master',offset:2,days:3,school:'武馆要保留学徒练功时段，反对货物占满场地。',caravan:'互助会希望借场地避雨，愿意分批搬入而非长期占用。'},
 loading:{name:'码头装船排班',place:'dock',holder:'boatman',offset:4,days:3,school:'武馆主张留出护送检查时间，不让学徒仓促上船。',caravan:'互助会担心延误货期，希望先装已核对的货物。'}
};
const sides=['school','caravan'],outcomes=['open','school','caravan','mediated','failed','neutral','ignored'];
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
export const makeFactions=(day=1)=>({startDay:day,standing:{school:0,caravan:0},cases:Object.fromEntries(Object.keys(DISPUTES).map(id=>[id,{heard:[],outcome:'open'}]))});
export function factionsValid(s){const f=s.adventures.factions;if(!obj(f)||Object.keys(f).length!==3||!Number.isSafeInteger(f.startDay)||f.startDay<1||f.startDay>s.day||!obj(f.standing)||Object.keys(f.standing).length!==2||!sides.every(id=>Number.isSafeInteger(f.standing[id])&&Math.abs(f.standing[id])<=6)||!obj(f.cases)||Object.keys(f.cases).length!==3)return false;
 return Object.entries(DISPUTES).every(([id,d])=>{const r=f.cases[id],begin=f.startDay+d.offset;return obj(r)&&Object.keys(r).length===2&&Array.isArray(r.heard)&&r.heard.length<=2&&new Set(r.heard).size===r.heard.length&&r.heard.every(k=>sides.includes(k))&&outcomes.includes(r.outcome)&&(s.day>=begin||!r.heard.length&&r.outcome==='open')&&(r.outcome!=='ignored'||s.day>begin+d.days);});
}
export const factionStanding=(s,id)=>s.adventures.factions?.standing[id]??0;
export const factionHostile=(s,id)=>factionStanding(s,id)<=-2;
export const factionFriendly=(s,id)=>factionStanding(s,id)>=2;
export const disputeOpen=(s,id)=>{const d=DISPUTES[id],f=s.adventures.factions;return Object.hasOwn(DISPUTES,id)&&f.cases[id].outcome==='open'&&s.day>=f.startDay+d.offset&&s.day<=f.startDay+d.offset+d.days;};
export function expireFactions(s){const f=s.adventures?.factions;if(!f)return;for(const [id,d] of Object.entries(DISPUTES))if(f.cases[id].outcome==='open'&&s.day>f.startDay+d.offset+d.days){f.cases[id].outcome='ignored';s.news.unshift(d.name+'：双方自行安排，你未介入；立场不变，无罚款。');s.news.length=Math.min(20,s.news.length);}}
function shift(s,side,n){const f=s.adventures.factions,holder=ORGANIZATIONS[side].holder;f.standing[side]=Math.max(-6,Math.min(6,f.standing[side]+n));s.relations[holder]=Math.max(0,Math.min(100,s.relations[holder]+n));}
export const mediationChance=(s,id)=>s.adventures.factions.cases[id].heard.length===2?.8:.35;
export function factionAction(s,id,{present,transact,advance,rng}){
 const [,kind,key,choice]=id.split(':'),f=s.adventures.factions,fail=t=>{s.result=[t];return false;};
 if(kind==='repair'){
  const d=ORGANIZATIONS[key],p=d&&s.npcWorld.individuals[d.holder];
  if(!d||!factionHostile(s,key)||!present(s,d.holder,30)||s.bag.food<1||p.food>=1000000)return fail('赔礼需组织接洽人在场、立场不高于-2及自己的口粮1份。');
  return transact(s,'向'+d.name+'赔礼',30,0,()=>{s.bag.food--;p.food++;f.standing[key]=0;s.result.push('交付自己的口粮1份，恢复中立接洽；过往选择、贡献与人物关系不重置，不退物。');},advance);
 }
 const d=DISPUTES[key];if(!d||!disputeOpen(s,key))return fail('争议尚未开放、已经处理或已经结束。');
 const r=f.cases[key];
 if(kind==='inquire'){
  const org=ORGANIZATIONS[choice];if(!org||r.heard.includes(choice)||!present(s,org.holder,15))return fail('请在尚未问过的组织接洽人在场时询问，不可远程或重复查问。');
  return transact(s,'问清：'+d.name,15,0,()=>{r.heard.push(choice);s.result.push(d[choice],'已问清'+r.heard.length+'/2方；双方都问过后调停成功率80%，否则35%。');},advance);
 }
 if(kind!=='resolve'||!['school','caravan','mediate','neutral'].includes(choice))return fail('没有这个争议处理方式。');
 const minutes=choice==='mediate'?60:30,energy=choice==='mediate'?12:choice==='neutral'?0:6;
 if(!present(s,d.holder,minutes))return fail('请回争议接洽处，留足时间且当事人须能接洽。');
 return transact(s,'处理：'+d.name,minutes,energy,()=>{
  if(choice==='neutral'){r.outcome='neutral';s.result.push('明确不介入；双方自行安排，立场不变，无钱物奖励。');return;}
  if(choice==='mediate'){const success=rng()<mediationChance(s,key);r.outcome=success?'mediated':'failed';for(const side of sides)shift(s,side,success?1:-1);s.result.push(success?'找到双方能接受的安排；双方立场及接洽人关系各+1。':'调停未成，双方不满；双方立场及接洽人关系各-1，时间精力已消耗。');}
  else{r.outcome=choice;shift(s,choice,2);shift(s,choice==='school'?'caravan':'school',-2);s.result.push('支持'+ORGANIZATIONS[choice].name+'；该方立场及关系+2，另一方-2。');}
  s.result.push('立场达到2：武馆陪练3文，或可购互助口粮；不高于-2：该方暂停入会及这些特别照应。基本求学、交易和短工照常。');
 },advance);
}
export function factionOptions(s){const f=s.adventures.factions,out=[],add=(id,label,preview)=>out.push({id,label,preview});
 for(const side of sides){const org=ORGANIZATIONS[side];if(s.place===org.place&&factionHostile(s,side))add('faction:repair:'+side,'赔礼 · '+org.name,'30分钟，交自己的口粮1份恢复中立接洽；保留过往选择和贡献，不重置人物关系。');}
 for(const [id,d] of Object.entries(DISPUTES))if(disputeOpen(s,id)){
  const r=f.cases[id],due=f.startDay+d.offset+d.days;
  for(const side of sides)if(s.place===ORGANIZATIONS[side].place&&!r.heard.includes(side))add('faction:inquire:'+id+':'+side,'问一方 · '+d.name+' · '+ORGANIZATIONS[side].name,'15分钟，无精力消耗；第'+due+'日结束前可到另一方问清。');
  if(s.place===d.place){for(const side of sides)add('faction:resolve:'+id+':'+side,'支持 · '+d.name+' · '+ORGANIZATIONS[side].name,d[side]+' 30分钟/精力6；该方立场及关系+2，另一方-2；无报酬。');add('faction:resolve:'+id+':mediate','调停 · '+d.name,'已问'+r.heard.length+'/2方；1小时/精力12，成功率'+Math.round(mediationChance(s,id)*100)+'%；成功双方+1，失败双方-1；第'+due+'日为最后一天，只处理一次。');add('faction:resolve:'+id+':neutral','不介入 · '+d.name,'30分钟，无精力消耗，双方立场不变；也可直接离开等待双方自行解决。');}
 }
 return out;
}
const labels={open:'尚未处理',school:'支持武馆',caravan:'支持互助会',mediated:'调停成功',failed:'调停失败',neutral:'不介入',ignored:'双方自行收尾'};
export function factionSummary(s){const f=s.adventures.factions;return ['势力立场：武馆'+f.standing.school+'，互助会'+f.standing.caravan+'。立场与组织贡献分开；退出组织不抹去选择。友好达到2获得特别照应，交恶不高于-2暂停照应；基础谋生与求学不受限。',...Object.entries(DISPUTES).map(([id,d])=>d.name+' · 第'+(f.startDay+d.offset)+'—'+(f.startDay+d.offset+d.days)+'日 · '+labels[f.cases[id].outcome]+' · 接洽地点：'+({market:'县城街市',school:'县城武馆',dock:'青石码头'}[d.place]))];}
export function factionDialogue(s,id){const side=sides.find(k=>ORGANIZATIONS[k].holder===id);return side&&factionHostile(s,side)?'对方记得你在组织争议中的立场，暂停特别照应；可带自己的口粮赔礼，基本生意照常。':side&&factionFriendly(s,side)?'对方记得你的支持或调停，愿按当前组织立场提供特别照应。':null;}
