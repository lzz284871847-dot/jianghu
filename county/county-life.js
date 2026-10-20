import {present as contactPresent} from './adventures.js?v=5.37.0';
import {items,people,places} from './content.js?v=5.37.0';
import {gain} from './progression.js?v=5.37.0';
import {districtStatus} from './society.js?v=5.37.0';

// Player-facing local life. No background shops, hereditary ownership or new population.
export const BONDS={
 boatman:{name:'贺船工',place:'dock',item:'wood',reward:5,skill:'carry',work:'修补货架'},
 smith:{name:'许铁匠',place:'workshop',item:'wood',reward:5,skill:'smelt',work:'整理炉具'},
 doctor:{name:'沈医者',place:'village',item:'herb',reward:6,skill:'herb',work:'协助配药'},
 merchant:{name:'柳掌柜',place:'market',item:'vegetable',reward:4,skill:'trade',work:'整理菜货'}
};
export const COUNTY_EVENTS={
 patrol:{name:'两门联合护路',offset:2,days:5,description:'周师傅与河湾习武会争论护路办法。县城领取，问双方、官道察看、旧渡口修标，再回县城交代。道路受阻期间官道与渡口各多15分钟；不强迫战斗。'},
 relief:{name:'县境粮药互济',offset:6,days:5,description:'县城与柳溪争论粮药调配。县城领取，问掌柜与医者，河湾村交自己干粮2份、药材1份，沿路送药到柳溪，再回县城交代。期间两地粮食与药材购价各多1文。'}
};
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const integer=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const exact=(x,keys)=>obj(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const fail=(s,t)=>{s.result=[t];return false;};
const clamp=(x,max=10)=>Math.max(0,Math.min(max,x));
const relation=(s,id,n)=>{if(Object.hasOwn(s.relations,id))s.relations[id]=clamp(s.relations[id]+n,100);};
const logNPC=(s,id,t)=>{const p=s.npcWorld.individuals[id];p.history=['第'+s.day+'日'+t,...p.history].slice(0,8);};
const xp=(s,key,n)=>{const t=gain(s,key,n);if(t)s.result.push(t);};
const eventRecord=()=>({status:'new',accepted:0,heard:[],step:0,cargo:0,route:null,paid:0});
export function makeCountyLife(day=1){return {
 sect:{river:false,joined:0,trust:0,lessonDay:0,letters:{school:'none',river:'none'}},
 bonds:Object.fromEntries(Object.keys(BONDS).map(k=>[k,{trust:0,history:[],meetDay:0,promise:null}])),
 stall:{place:null,until:0,stock:{food:0,herb:0,vegetable:0},sessionDay:0,sessions:0,cost:0,revenue:0,lost:0},
 events:{startDay:day,records:Object.fromEntries(Object.keys(COUNTY_EVENTS).map(k=>[k,eventRecord()]))}
 };}
export function countyLifeValid(s){const l=s.adventures.life;if(!exact(l,['sect','bonds','stall','events']))return false;
 const t=l.sect;if(!exact(t,['river','joined','trust','lessonDay','letters'])||typeof t.river!=='boolean'||!integer(t.joined,s.day)||!integer(t.trust,10)||!integer(t.lessonDay,s.day)||!exact(t.letters,['school','river'])||!Object.values(t.letters).every(x=>['none','carried','done','failed'].includes(x))||t.river&&(!t.joined||s.adventures.mentor.member)||!t.joined&&(t.river||t.trust||t.lessonDay||t.letters.river!=='none')||t.letters.river==='carried'&&!t.river||t.letters.school==='carried'&&!s.adventures.mentor.member)return false;
 if(!exact(l.bonds,Object.keys(BONDS))||!Object.values(l.bonds).every(r=>exact(r,['trust','history','meetDay','promise'])&&integer(r.trust,10)&&integer(r.meetDay,s.day)&&Array.isArray(r.history)&&r.history.length<=6&&r.history.every(h=>exact(h,['day','kind','success'])&&integer(h.day,s.day)&&h.day>0&&['cooperation','meeting','promise','event'].includes(h.kind)&&typeof h.success==='boolean')&&(r.promise===null||exact(r.promise,['accepted','due','status'])&&integer(r.promise.accepted,s.day)&&r.promise.accepted>0&&r.promise.due===r.promise.accepted+2&&['active','ready','done','failed'].includes(r.promise.status))))return false;
 const st=l.stall;if(!exact(st,['place','until','stock','sessionDay','sessions','cost','revenue','lost'])||![null,'market','liuxi'].includes(st.place)||!integer(st.until,s.day+2)||!integer(st.sessionDay,s.day)||!integer(st.sessions,3)||!st.sessionDay&&st.sessions||!exact(st.stock,['food','herb','vegetable'])||!Object.values(st.stock).every(n=>integer(n,8))||Object.values(st.stock).reduce((a,b)=>a+b,0)>8||!['cost','revenue','lost'].every(k=>integer(st[k],10000000))||st.place===null&&(st.until||Object.values(st.stock).some(Boolean)))return false;
 const e=l.events;if(!exact(e,['startDay','records'])||!integer(e.startDay,s.day)||!e.startDay||!exact(e.records,Object.keys(COUNTY_EVENTS)))return false;
 return Object.entries(COUNTY_EVENTS).every(([id,d])=>{const r=e.records[id],end=e.startDay+d.offset+d.days;if(!exact(r,['status','accepted','heard','step','cargo','route','paid'])||!['new','active','ready','done','failed','ignored','left'].includes(r.status)||!integer(r.accepted,s.day)||!Array.isArray(r.heard)||new Set(r.heard).size!==r.heard.length||r.heard.length>2||!r.heard.every(k=>(id==='patrol'?['master','farmer']:['merchant','doctor']).includes(k))||!integer(r.step,2)||!integer(r.cargo,id==='relief'?1:0)||![null,'school','river','joint'].includes(r.route)||![0,8].includes(r.paid))return false;
  if(r.status==='new')return Object.entries(eventRecord()).every(([k,v])=>Array.isArray(v)?r[k].length===0:r[k]===v);
  if(r.status==='ignored')return s.day>end&&!r.accepted&&!r.step&&!r.cargo&&!r.route&&!r.paid&&!r.heard.length;
  if(!r.accepted||r.accepted<e.startDay+d.offset||r.accepted>end)return false;
  return (r.status==='done'?r.paid===8:r.paid===0)&&(!['ready','done'].includes(r.status)||r.step===2&&r.cargo===0&&r.route!==null)&&(r.cargo===0||id==='relief'&&r.step===1)&&(!['ready','done'].includes(r.status)||r.route==='joint'||id==='patrol');
 });
}
export function rememberExperience(s,id,kind,success){const r=s.adventures?.life?.bonds[id];if(!r)return;r.trust=clamp(r.trust+(success?1:-1));r.history=[{day:s.day,kind,success},...r.history].slice(0,6);logNPC(s,id,'与你的共同经历：'+({cooperation:'合作',meeting:'当面盘点',promise:'再次约定',event:'县境事件'})[kind]+(success?'已履行':'未完成')+'；旧经历不清除。');}
export function expireCountyLife(s){const l=s.adventures?.life;if(!l)return;for(const [id,r] of Object.entries(l.bonds))if(r.promise?.status==='active'&&(s.dead||s.day>r.promise.due)){r.promise.status='failed';rememberExperience(s,id,'promise',false);relation(s,id,-1);s.news=['与'+BONDS[id].name+'的约定未完成，关系和合作信任各-1，无罚款。',...s.news].slice(0,20);}
 for(const [id,d] of Object.entries(COUNTY_EVENTS)){const r=l.events.records[id],end=l.events.startDay+d.offset+d.days;if(s.day>end&&['new','active'].includes(r.status)||s.dead&&r.status==='active'){r.status=r.status==='new'?'ignored':'failed';s.news=[d.name+'已结束，乡邻将自行收尾；投入不退，留存货物仍可领回。',...s.news].slice(0,20);}}
}
export function countyEventActive(s,id){const e=s.adventures?.life?.events,d=COUNTY_EVENTS[id];return !!e&&s.day>=e.startDay+d.offset&&s.day<=e.startDay+d.offset+d.days+2&&!['ready','done'].includes(e.records[id].status);}
export const countyEventDelay=(s,to)=>countyEventActive(s,'patrol')&&['road','ferry'].includes(to)?15:0;
export const countyEventSurcharge=(s,place,key)=>['market','liuxi'].includes(place)&&['grain','herb'].includes(key)&&countyEventActive(s,'relief')?1:0;

function sectAction(s,action,h){const t=s.adventures.life.sect,m=s.adventures.mentor,p=s.npcWorld.individuals.farmer,{present,transact,advance}=h;
 if(action==='join'){
  if(t.river||m.member||!['wood_knife','staff'].some(k=>s.martial.known[k])||s.relations.farmer<3||s.npcWorld.villageSchool.holder!=='farmer'||!present(s,'farmer',30))return fail(s,'河湾习武会需已学柴刀法或农家棍法、陈农户关系3，且陈农户在田地可接洽；先退出周师傅门下。不收费或赠物。');
  return transact(s,'加入河湾习武会',30,0,()=>{t.river=true;if(!t.joined){t.joined=s.day;t.trust=2;}s.result.push('重视农具兵器与乡路协作。与周师傅门下互斥；退出仍保留武艺、信任和事务记录。');},advance);
 }
 if(action==='leave')return t.river?transact(s,'退出河湾习武会',15,0,()=>{t.river=false;t.trust=clamp(t.trust-1);if(t.letters.river==='carried')t.letters.river='failed';s.result.push('信任-1，未交交换函结束，不重开或罚钱；基本求学照常。');},advance):fail(s,'尚未加入河湾习武会。');
 if(action==='guide'){
  const art=s.martial.equipped;
  if(t.river&&(!['wood_knife','staff'].includes(art)||!s.martial.known[art]))return fail(s,'当前未选用已学刀/棍法；到人物页选用柴刀法或农家棍法。');
  if(t.river&&(t.lessonDay===s.day||m.lessonDay===s.day))return fail(s,'今日已经接受指点，两门共用每日一次；明日再来。');
  if(t.river&&(s.hp<25||Object.keys(s.injuries).length))return fail(s,'指点需气血25且无伤；先休养或诊治。');
  if(t.river&&s.coins<4)return fail(s,'当前'+s.coins+'文，河湾指点需4文；可先做短工。');
  if(!t.river||t.trust<2||!['wood_knife','staff'].includes(art)||!s.martial.known[art]||t.lessonDay===s.day||m.lessonDay===s.day||s.hp<25||Object.keys(s.injuries).length||!present(s,'farmer',60)||s.npcWorld.villageSchool.holder!=='farmer'||p.energy<12||s.coins<4||p.coins>999996||s.martial.practice[art]>=2400&&s.martial.insight[art]>=2400)return fail(s,'指点需会内信任2、选用已学刀/棍法、无伤气血25，陈农户在岗且有精力；4文、1小时/精力12，与周门指点共用每日一次。');
  return transact(s,'河湾农具兵器指点',60,12,()=>{s.coins-=4;p.coins+=4;p.energy-=12;t.lessonDay=s.day;s.martial.practice[art]=Math.min(2400,s.martial.practice[art]+24);s.martial.insight[art]=Math.min(2400,s.martial.insight[art]+8);s.result.push('熟练+24、领悟+8，师傅实际消耗12精力；不赠武学、不增加真实出招经验。');},advance);
 }
 const [kind,side]=action.split(':');if(!['school','river'].includes(side)||!(side==='school'?m.member:t.river))return fail(s,'需相应门人身份，独自求学仍开放。');
 const from=side==='school'?'master':'farmer',to=side==='school'?'farmer':'master';
 if(kind==='letter'&&t.letters[side]==='none'&&present(s,from,15))return transact(s,'领取两门交换函',15,0,()=>{t.letters[side]='carried';s.result.push('沿已有道路交给'+people[to].name+'；无报酬，各门只一次。');},advance);
 if(kind==='deliver'&&t.letters[side]==='carried'&&present(s,to,30))return transact(s,'交付两门交换函',30,2,()=>{t.letters[side]='done';if(side==='river')t.trust=clamp(t.trust+1);else m.trust=clamp(m.trust+1);relation(s,to,1);s.result.push('本门信任+1，对方关系+1；两门各自保留门人条件，不自动加入另一门。');},advance);
 return fail(s,'需未领取的交换函，或带实际函件到另一门授艺者在岗处。');
}
function bondAction(s,id,action,h){const d=BONDS[id],r=s.adventures.life.bonds[id],{present,transact,advance,rng}=h;if(!d)return fail(s,'没有这位熟人的合作记录。');const p=s.npcWorld.individuals[id];
 if(action==='withdraw'&&r.promise?.status==='active')return transact(s,'撤回熟人约定',0,0,()=>{r.promise.status='failed';rememberExperience(s,id,'promise',false);relation(s,id,-1);s.result.push('失约代价保留，不罚钱；可在以后游戏日重新商量。');},advance);
 if(!present(s,id,action==='work'?60:15))return fail(s,'需当面在岗接洽；伤病、外出、返程或时间不足时保留进度。');
 if(action==='meet'){
  if(r.meetDay===s.day)return fail(s,'今日已经盘点过，明日可再当面接洽。');
  if(s.relations[id]<3)return fail(s,'当前关系'+s.relations[id]+'/3；可先与'+d.name+'交谈或用自己的口粮和解。');
  if(p.energy<2)return fail(s,d.name+'精力不足2，改日再来。');
  return transact(s,'与'+d.name+'盘点近况',15,2,()=>{r.meetDay=s.day;p.energy-=2;rememberExperience(s,id,'meeting',true);s.result.push('合作信任+1；留下实际会面经历，无钱物奖励。');},advance);
 }
 if(action==='promise'){
  if(r.trust<2||!r.history.some(x=>x.success)||r.promise&&(['active','ready'].includes(r.promise.status)||r.promise.accepted===s.day)||p.energy<8)return fail(s,'需合作信任2及共同经历，对方精力8；先处理现有约定，每人每日最多新约一次。');
  return transact(s,'再次约定 · '+d.work,15,0,()=>{r.promise={accepted:s.day,due:s.day+2,status:'active'};s.result.push('截止第'+r.promise.due+'日；自己的'+items[d.item]+'1份，实际作业才记履约；成功工钱'+d.reward+'文来自本人余额，可能失败。');},advance);
 }
 if(action==='work'){
  if(r.promise?.status!=='active')return fail(s,'先再次约定，才能实际作业。');
  if(s.bag[d.item]<1)return fail(s,'缺自己的'+items[d.item]+'1份；可先采集、制作或购买。');
  if(p.energy<8)return fail(s,d.name+'当前精力'+p.energy+'，作业需8；改日接洽，约定保留。');
  if(s.hp<25)return fail(s,'当前气血'+s.hp+'，作业需25；先恢复身体。');
  if(d.item==='vegetable'&&s.commerce.stock.market.vegetable>=30)return fail(s,'当地菜货容量已满，约定保留。');
  return transact(s,'共同作业 · '+d.work,60,10,()=>{s.bag[d.item]--;p.energy-=8;const ok=rng()<(r.trust>=4?.85:.7);r.promise.status=ok?'ready':'failed';if(d.item==='vegetable')s.commerce.stock.market.vegetable++;rememberExperience(s,id,'promise',ok);relation(s,id,ok?1:-1);xp(s,d.skill,ok?2:1);s.result.push(ok?'真实作业已成，另行交代领实际工钱；缺钱时成果保留。':'作业未成，投入与时间精力不退，关系及信任-1，无工钱。');},advance);
 }
 if(action==='claim'){
  if(r.promise?.status!=='ready')return fail(s,'先完成实际作业，再交代领款。');
  if(p.coins<d.reward)return fail(s,d.name+'当前余额'+p.coins+'文，需支付'+d.reward+'文；成果保留。');
  if(s.coins>10000000-d.reward)return fail(s,'钱包容量不足，成果保留。');
  return transact(s,'交代熟人合作',15,0,()=>{p.coins-=d.reward;s.coins+=d.reward;r.promise.status='done';s.result.push('实际领款'+d.reward+'文，不重复结算。再次合作须另日约定和实际作业。');},advance);
 }
 return fail(s,'当前熟人约定步骤不符。');
}
export function stallPrice(s,item,mode){const base={food:4,herb:4,vegetable:3}[item];return base+({low:-1,fair:0,high:2}[mode]??0);}
function stallAction(s,action,item,h){const r=s.adventures.life.stall,{transact,advance,rng,present}=h,stock=r.stock;
 if(action==='rent'){
  if(!['market','liuxi'].includes(s.place)||districtStatus(s,s.place).closed||r.place!==null&&(r.place!==s.place||r.until>=s.day)||s.minute<480||s.minute+15>1080)return fail(s,'租摊08—18时，需留足15分钟；到街市或柳溪正常营业时接洽，旧摊须先收摊，同地到期可续租。');
  const holder=s.place==='market'?'merchant':'stallholder',p=s.npcWorld.individuals[holder];if(!present(s,holder,15)||s.coins<6||p.coins>999994||r.cost>9999994)return fail(s,'摊位主须在岗；租金6文实际转付，租今天起3日，不自动续扣。');
  return transact(s,'租用三日小摊',15,0,()=>{s.coins-=6;p.coins+=6;r.cost+=6;r.place=s.place;r.until=s.day+2;s.result.push('最多寄存8份货。亲自备货定价、每次营业1小时；每日最多3次。没人自动替你赚钱。到期货物保留。');},advance);
 }
 if(!r.place||s.place!==r.place)return fail(s,'需沿道路回自己的摊位地点，不远程存取或经营。');
 if(action==='take'||action==='close'){
  if(Object.entries(stock).some(([k,n])=>s.bag[k]>1000000-n))return fail(s,'背包容量不足，全部货物留在摊上，不吞物。');
  return transact(s,action==='close'?'收摊退出':'取回全部摊货',15,0,()=>{for(const [k,n] of Object.entries(stock)){s.bag[k]+=n;stock[k]=0;}if(action==='close'){r.place=null;r.until=0;}s.result.push('自己的余货原数返回；租金不退，营业历史保留。');},advance);
 }
 if(r.until<s.day||districtStatus(s,r.place).closed||s.minute<480||s.minute+(action==='stock'?15:60)>1080)return fail(s,'摊位已到期、当地商铺暂停客单或不在08—18时作业时段；货物保留，可续租或取回。');
 if(!Object.hasOwn(stock,item))return fail(s,'摊铺只经营干粮、药材与蔬菜。');
 if(action==='stock'){
  if(s.bag[item]<1||Object.values(stock).reduce((a,b)=>a+b,0)>=8)return fail(s,'需自己的货物和摊上空位，总容量8份。');
  return transact(s,'备摊货 · '+items[item],15,1,()=>{s.bag[item]--;stock[item]++;},advance);
 }
 if(!['low','fair','high'].includes(action)||stock[item]<1||r.sessionDay===s.day&&r.sessions>=3)return fail(s,'需实际存货及今日营业次数；每天最多3次。');
 const price=stallPrice(s,item,action),cash=s.commerce.budget[r.place],shelf=s.commerce.stock[r.place];if(cash<price||shelf[item]>=30||s.coins>10000000-price||r.revenue>10000000-price||r.lost>=10000000)return fail(s,'当地客单资金或收货容量不足，整次未开张，不掷结果，存货保留。');
 return transact(s,'摆摊 · '+items[item],60,8,()=>{if(r.sessionDay!==s.day){r.sessionDay=s.day;r.sessions=0;}r.sessions++;const chance=Math.min(.95,({low:.85,fair:.6,high:.3}[action])+(s.skills.trade>=20?.05:0)-(s.weather==='雨'?.15:0));if(rng()<chance){stock[item]--;shelf[item]++;s.commerce.budget[r.place]-=price;s.coins+=price;r.revenue+=price;xp(s,'trade',2);s.result.push('实际售出1份，收入'+price+'文由当地客单资金支付；存货转入当地商铺。');}else s.result.push('没有成交，货物保留；时间精力已花费，租金仍是成本。');if(stock[item]&&rng()<(s.weather==='雨'?.2:.05)){stock[item]--;r.lost++;s.result.push('摆摊期间一份货物受潮或损坏，库存-1，损失已保存。');}s.result.push('累计租金'+r.cost+'文，收入'+r.revenue+'文；货物成本另由你实际采购或制作承担，差额不是净利润。');},advance);
}
function eventAction(s,id,action,h){const d=COUNTY_EVENTS[id],e=s.adventures.life.events,r=e.records[id],{present,transact,advance,rng}=h;if(!d)return fail(s,'没有这项县境事件。');const begin=e.startDay+d.offset,end=begin+d.days;
 if(action==='cargo'){
  if(!r.cargo||!['failed','left'].includes(r.status)||s.bag.herb>999999)return fail(s,'没有可取回药材或背包已满。');return transact(s,'取回事件留存药材',0,0,()=>{s.bag.herb+=r.cargo;r.cargo=0;},advance);
 }
 if(action==='claim'){
  if(r.status!=='ready'||s.place!=='county'||s.minute<480||s.minute+15>1080||s.commerce.budget.market<8||s.coins>9999992)return fail(s,'需完成事件后白天回县衙；实际资金不足时成果保留，不重掷。');
  return transact(s,'交代 · '+d.name,15,0,()=>{s.commerce.budget.market-=8;s.coins+=8;r.status='done';r.paid=8;s.result.push('已完成的公共作业实际领款8文；立场、经历与旧案保留，不重复结算。');},advance);
 }
 if(s.day<begin||s.day>end||!['new','active'].includes(r.status))return fail(s,'事件尚未开放、已经结束或成果待交代；不重复开启。');
 if(action==='accept'){
  if(r.status!=='new'||s.place!=='county'||s.minute<480||s.minute+15>1080)return fail(s,'事件开放后白天到县城自主领取。');return transact(s,'介入 · '+d.name,15,0,()=>{r.status='active';r.accepted=s.day;s.result.push(d.description,'截止第'+end+'日，可不介入或撤回。');},advance);
 }
 if(r.status!=='active')return fail(s,'先在县城领取，不自动替你介入。');
 if(action==='leave')return transact(s,'退出县境事件',0,0,()=>{r.status='left';s.result.push('投入保留，未交代不领钱；乡邻按期限自行收尾。留存药材可领回。');},advance);
 if(action.startsWith('ask:')){
  const actor=action.split(':')[1];if(!(id==='patrol'?['master','farmer']:['merchant','doctor']).includes(actor)||r.heard.includes(actor)||!present(s,actor,15))return fail(s,'请当面询问尚未问过的相关人，各方仅一次。');
  return transact(s,'查问 · '+people[actor].name,15,0,()=>{r.heard.push(actor);s.result.push(({master:'周师傅主张先察看官道，再修渡口路标。',farmer:'陈农户希望两门共同劳动，不把护路变成争名。',merchant:'柳掌柜担心货源断续，要求药材实际到柳溪再交代。',doctor:'沈医者需要你自己的干粮2份留村照料病人、药材1份送集；不靠空口承诺。'})[actor]);},advance);
 }
 if(action==='survey'&&id==='patrol'&&r.step===0){if(s.place!=='road'||s.hp<25)return fail(s,'到官道实际察看，需气血25；不强迫交手。');return transact(s,'察看官道',45,8,()=>{r.step=1;xp(s,'forage',2);s.result.push('已察看通行位置，去旧渡口自备木料1份修路标。');},advance);}
 if(action==='prepare'&&id==='relief'&&r.step===0){const doctor=s.npcWorld.individuals.doctor;if(!present(s,'doctor',30)||s.bag.food<2||s.bag.herb<1||doctor.food>98)return fail(s,'在村中医者可接洽时，需自己干粮2份、药材1份及收粮容量。');return transact(s,'备粮与药',30,4,()=>{s.bag.food-=2;s.bag.herb--;doctor.food+=2;r.cargo=1;r.step=1;rememberExperience(s,'doctor','event',true);s.result.push('干粮实际交给医者，药材1份独立留存，沿道路送到柳溪。不再从背包扣第二次。');},advance);}
 if(action==='work'&&r.step===1){
  if(id==='patrol'?(s.place!=='ferry'||s.bag.wood<1||s.hp<25):(s.place!=='liuxi'||r.cargo!==1||s.commerce.stock.liuxi.herb>=30))return fail(s,'护路到渡口需木料1和气血25；互济到柳溪需留存药材及收货空位。');
  if(s.minute<480||s.minute+45>1080)return fail(s,'现场08—18时作业，需留足45分钟。');
  return transact(s,'实际作业 · '+d.name,45,8,()=>{if(id==='patrol')s.bag.wood--;else{r.cargo=0;s.commerce.stock.liuxi.herb++;}r.step=2;xp(s,id==='patrol'?'carry':'trade',2);s.result.push('现场步骤已成，回县城选择处理立场；尚未自动收款或和解。');},advance);
 }
 if(['school','river','joint'].includes(action)&&r.step===2){
  if(s.place!=='county'||s.minute<480||s.minute+30>1080||id==='relief'&&action!=='joint')return fail(s,'回县城白天交代；粮药互济只按双方核验办理，不涉及门派站队。');
  return transact(s,'处理县境立场',30,4,()=>{r.route=action;const ok=action!=='joint'||rng()<(r.heard.length===2?.9:.4);r.status=ok?'ready':'failed';if(id==='patrol'){s.adventures.factions.standing.school=Math.max(-6,Math.min(6,s.adventures.factions.standing.school+(ok?(action==='river'?-2:action==='school'?2:1):-1)));relation(s,'master',ok?(action==='river'?-1:action==='school'?2:1):-1);relation(s,'farmer',ok?(action==='school'?-1:action==='river'?2:1):-1);if(ok&&s.adventures.mentor.member&&action!=='river')s.adventures.mentor.trust=clamp(s.adventures.mentor.trust+1);if(ok&&s.adventures.life.sect.river&&action!=='school')s.adventures.life.sect.trust=clamp(s.adventures.life.sect.trust+1);}else{rememberExperience(s,'merchant','event',ok);relation(s,'merchant',ok?1:-1);s.adventures.factions.standing.caravan=Math.max(-6,Math.min(6,s.adventures.factions.standing.caravan+(ok?1:-1)));}s.result.push(ok?'事件协调完成，相关临时道路/购价影响解除；县衙有钱时另领实际工钱。':'协调未成，材料与时间不退，无工钱；乡邻之后自行收尾，临时影响按预告结束。');},advance);
 }
 return fail(s,'当前事件地点或步骤不符。');
}
export function countyLifeAction(s,id,h){const [kind,key,...rest]=id.split(':');if(kind==='sect')return sectAction(s,[key,...rest].join(':'),h);if(kind==='bond')return bondAction(s,key,rest.join(':'),h);if(kind==='stall')return stallAction(s,key,rest[0],h);return eventAction(s,key,rest.join(':'),h);}
export function countyLifeOptions(s){const l=s.adventures.life,out=[],add=(id,label,preview)=>out.push({id,label,preview});
 if(s.place==='fields'){if(!l.sect.river)add('sect:join','加入 · 河湾习武会','已学刀或棍法、陈农户关系3，先退出周门；30分钟，无赠物。');else{add('sect:guide','河湾指点 · 4文','选用刀/棍法，无伤气血25；1小时/精力12，熟练24、领悟8；本人精力和钱款真实结算，每日一次。');add('sect:leave','退出 · 河湾习武会','15分钟，信任-1，武学与历史保留。');}}
 for(const side of ['school','river']){if(!(side==='school'?s.adventures.mentor.member:l.sect.river))continue;const source=side==='school'?'school':'fields',dest=side==='school'?'fields':'school',state=l.sect.letters[side];if(state==='none'&&s.place===source)add('sect:letter:'+side,'门人接洽 · 两门交换函','一次函件，交另一门授艺者，无报酬；实际交付才加信任。');if(state==='carried'&&s.place===dest)add('sect:deliver:'+side,'交付 · 两门交换函','30分钟/精力2，本门信任+1，对方关系+1。');}
 for(const [id,d] of Object.entries(BONDS)){const r=l.bonds[id],prefix='bond:'+id+':';if(r.promise?.status==='active')add(prefix+'withdraw','撤回约定 · '+d.name,'关系与合作信任-1，不罚钱；下一游戏日仍可再约。');if(s.place!==d.place)continue;if(r.meetDay!==s.day)add(prefix+'meet','盘点近况 · '+d.name,'需关系3，对方精力2；15分钟/精力2，每日一次，无钱物奖励。');if(r.promise?.status==='active')add(prefix+'work','共同作业 · '+d.work,'自己的'+items[d.item]+'1份，1小时/精力10，对方精力8；成功率70%（信任4为85%），失败保留材料损失与关系代价；截止第'+r.promise.due+'日。');else if(r.promise?.status==='ready')add(prefix+'claim','交代合作 · '+d.name,'真实工钱'+d.reward+'文来自本人余额；不足保留成果，不重掷。');else if(r.trust>=2)add(prefix+'promise','再次约定 · '+d.work,'每人每天最多新约一次；两游戏日内实际备料作业，可能失败。');}
 const st=l.stall;if(['market','liuxi'].includes(s.place)&&(!st.place||st.place===s.place&&st.until<s.day))add('stall:rent',st.place?'续租 · 三日小摊':'租用 · 三日小摊','08—18时需留足15分钟，6文转付摊位主；租今天起3日，总容量8份，不自动续扣或赚钱。');if(st.place===s.place){add('stall:take','取回全部摊货','自己的存货回背包，容量不足整笔保留。');add('stall:close','收摊退出','取回全部余货，租金不退，历史保留。');if(st.until>=s.day)for(const k of Object.keys(st.stock)){add('stall:stock:'+k,'备货 · '+items[k],'自己的1份，15分钟/精力1，最多8份货。');if(st.stock[k])for(const mode of ['low','fair','high'])add('stall:'+mode+':'+k,({low:'低价',fair:'平价',high:'高价'})[mode]+'摆摊 · '+items[k]+' · '+stallPrice(s,k,mode)+'文','一小时/精力8，每日最多3次；成交率'+({low:85,fair:60,high:30}[mode])+'%，雨天-15个百分点，可能损货；收入扣租金差额还未扣实际货物成本。');}}
 for(const [id,d] of Object.entries(COUNTY_EVENTS)){const r=l.events.records[id],prefix='countyEvent:'+id+':',begin=l.events.startDay+d.offset,end=begin+d.days;if(['failed','left'].includes(r.status)&&r.cargo)add(prefix+'cargo','领回药材 · '+d.name,'独立留存自己的药材1份，不重复领取。');if(r.status==='ready'&&s.place==='county')add(prefix+'claim','交代 · '+d.name,'实际工钱8文由县城现有资金支付；不足保留成果。');if(s.day<begin||s.day>end||!['new','active'].includes(r.status))continue;if(r.status==='new'){if(s.place==='county')add(prefix+'accept','介入 · '+d.name,d.description+' 第'+begin+'—'+end+'日。');continue;}add(prefix+'leave','退出 · '+d.name,'投入不退，留存药材可领回；世界临时影响仍按期限收尾。');for(const actor of id==='patrol'?['master','farmer']:['merchant','doctor'])if(!r.heard.includes(actor)&&s.place===people[actor].place)add(prefix+'ask:'+actor,'查问事件 · '+people[actor].name,'当面15分钟，双方查问后协调成功率90%，否则40%；仅一次。');if(!r.step&&s.place===(id==='patrol'?'road':'village'))add(prefix+(id==='patrol'?'survey':'prepare'),id==='patrol'?'察看 · 联合护路':'备粮药 · 县境互济',id==='patrol'?'45分钟/精力8，气血25；随后到渡口备木料1。':'自己干粮2份、药材1份；医者在岗，干粮交村中、药材留存送柳溪。');if(r.step===1&&s.place===(id==='patrol'?'ferry':'liuxi'))add(prefix+'work','现场作业 · '+d.name,'45分钟/精力8；护路用木料1份，互济交留存药材1份；随后回县城。');if(r.step===2&&s.place==='county')for(const choice of id==='patrol'?['school','river','joint']:['joint'])add(prefix+choice,({school:'支持青河武馆',river:'支持河湾习武会',joint:'协调双方'})[choice]+' · '+d.name,'30分钟/精力4；协调可能失败，查问双方后90%；立场影响两门关系与本门信任，不清旧案。');}
 return out.map(o=>({...o,blocker:countyLifeBlocker(s,o.id)}));
}
export function countyLifeSummary(s){const l=s.adventures.life,st=l.stall;return ['两门身份：'+(s.adventures.mentor.member?'青河武馆周门':l.sect.river?'河湾习武会':'独自求学')+'；周门信任'+s.adventures.mentor.trust+'/10、河湾信任'+l.sect.trust+'/10，交换函及退出经历保留。',...Object.entries(l.bonds).filter(([,r])=>r.history.length||r.promise).map(([id,r])=>BONDS[id].name+'：合作信任'+r.trust+'/10，近期共同经历'+r.history.length+'条：'+r.history.slice(0,3).map(h=>'第'+h.day+'日'+({meeting:'盘点',promise:'再次合作',cooperation:'同行合作',event:'县境协作'})[h.kind]+(h.success?'履行':'未成')).join('、')+(r.promise?'；再次约定'+({active:'待作业',ready:'成果待领款',done:'已结算',failed:'未成，可另日再约'})[r.promise.status]:'')),st.place?'小摊：'+places[st.place].name+'，租至第'+st.until+'日，存货'+Object.values(st.stock).reduce((a,b)=>a+b,0)+'/8；累计租金'+st.cost+'、收入'+st.revenue+'文，损货'+st.lost+'份；货物成本另计。':st.cost||st.revenue||st.lost?'已收摊；经营历史：累计租金'+st.cost+'文、收入'+st.revenue+'文、损货'+st.lost+'份；货物采购与制作成本另计，收入减租金不等于净利润。':'尚无租用摊位，可自备货物在街市或柳溪经营。',...Object.entries(COUNTY_EVENTS).map(([id,d])=>{const r=l.events.records[id],begin=l.events.startDay+d.offset;return d.name+'：第'+begin+'—'+(begin+d.days)+'日；'+({new:s.day<begin?'预告':'可介入',active:'进行中',ready:'协调完成待领款',done:'已结算',failed:'未成',ignored:'乡邻自行收尾',left:'已退出'})[r.status]+'；'+d.description;})];}
export function countyLifeTasks(s){
 const l=s.adventures.life,tasks=[];
 const add=(title,place,next,due,group,goods='',action=null)=>tasks.push({title,place,next,due,group,goods,blocker:action&&s.place===place?countyLifeBlocker(s,action):null});
 for(const [side,status] of Object.entries(l.sect.letters))if(status==='carried')add('两门交换函',side==='school'?'fields':'school','交给另一门授艺者。',0,'sects','','sect:deliver:'+side);
 for(const [id,r] of Object.entries(l.bonds))if(['active','ready'].includes(r.promise?.status))add('再次合作 · '+BONDS[id].name,BONDS[id].place,r.promise.status==='active'?'自备'+items[BONDS[id].item]+'1份，实际作业。':'成果保留，等本人实际付款。',r.promise.status==='active'?r.promise.due:0,'bonds','','bond:'+id+':'+(r.promise.status==='active'?'work':'claim'));
 if(l.stall.place)add('自己的三日小摊',l.stall.place,l.stall.until<s.day?'货物保留，可续租或取回。':'自备货物、定价营业或收摊。',l.stall.until<s.day?0:l.stall.until,'stalls','租金'+l.stall.cost+'、收入'+l.stall.revenue+'文；货物成本另计。',l.stall.until<s.day?'stall:rent':null);
 for(const [id,d] of Object.entries(COUNTY_EVENTS)){
  const r=l.events.records[id];
  if(['active','ready'].includes(r.status)){
   const place=r.status==='ready'||r.step===2?'county':id==='patrol'?r.step?'ferry':'road':r.step?'liuxi':'village';
   const action=r.status==='ready'?'claim':r.step===2?'joint':r.step===1?'work':id==='patrol'?'survey':'prepare';
   add(d.name,place,r.status==='ready'?'等待实际资金交代。':r.step===2?'选择立场或协调；先问双方更可靠。':'查问双方并完成现场步骤；可撤回。',r.status==='ready'?0:l.events.startDay+d.offset+d.days,'countyEvents',r.cargo?'留存自己的药材1份。':'','countyEvent:'+id+':'+action);
  }else if(r.cargo)add('领回药材 · '+d.name,s.place,'取回自己药材，需背包空位。',0,'countyEvents','','countyEvent:'+id+':cargo');
 }
 return tasks;
}

export function countyEventNotices(s){const e=s.adventures.life.events;return Object.entries(COUNTY_EVENTS).filter(([id,d])=>s.day<=e.startDay+d.offset+d.days+2&&!['ready','done'].includes(e.records[id].status)).map(([id,d])=>{const begin=e.startDay+d.offset,end=begin+d.days;return d.name+'：第'+begin+'—'+end+'日可介入；'+(s.day<begin?'尚未发生，届时':'当前')+(id==='patrol'?'官道、渡口行程各多15分钟':'县城、柳溪的粮食和药材购价各多1文')+'，最迟第'+(end+3)+'日起乡邻恢复。可忽略，县城查看处理方式。';});}

// Reuse the same pre-transaction checks. The settlement callback is never executed.
export function countyLifeBlocker(s,id){
 if(s.dead)return '人生已结束，不能继续行动。';
 if(s.pending||s.combat)return '先处理眼前选择或交手。';
 if(s.adventures.law.pursuit)return '先处理县城拦查。';
 const probe={...s,result:[]};
 const ok=countyLifeAction(probe,id,{present:contactPresent,transact:(state,title,minutes,energy)=>{if(state.energy<energy){state.result=['精力不足，需'+energy+'点；可先免费歇息。'];return false;}return true;},advance:()=>{throw Error('预览不能推进时间');},rng:()=>{throw Error('预览不能掷结果');}});
 return ok?null:probe.result[0]??'当前条件不足，进度保留。';
}
export function countyLifeOverview(s){return countyLifeSummary(s).filter(t=>!Object.values(COUNTY_EVENTS).some(d=>t.startsWith(d.name)));}
