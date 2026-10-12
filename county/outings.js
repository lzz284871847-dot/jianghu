// Six finite regional adventures using existing skills, tools, actors and combat.
import {gain} from './progression.js?v=5.13.0';
import {addInjury} from './injury.js?v=5.13.0';
import {factionFriendly} from './factions.js?v=5.13.0';
export const OUTINGS={
 boat:{name:'浅滩搁船',place:'ferry',holder:'boatman',tier:'初期',reward:8,skill:'carry',routes:['push','wood','leave'],outcomes:['new','claim','done','failed','left','died'],info:'船底卡在浅滩；用木料垫底更稳，雨天推船更难。完成后去码头找贺船工，报酬8文来自其现有余额。'},
 flood:{name:'雨后渡口受阻',place:'dock',holder:'boatman',tier:'初期',reward:0,skill:'carry',routes:['repair','bypass','leave'],outcomes:['new','done','failed','left','settled'],info:'渡口受阻期间进出旧渡口多走15分钟；修补需自己的木料2份。若不处理，乡邻三日后自行清理。没有钱物奖励。'},
 traps:{name:'猎具归属争端',place:'bamboo',holder:'hunter',tier:'初中期',reward:6,skill:'hunt',routes:['talk','repair','leave'],outcomes:['new','claim','done','failed','left','died'],info:'猎户的旧猎具阻了小径；懂狩猎、带猎具或问清经过有利于谈妥，也可交木料1份修补。谈妥或修好后找蒋猎户结算6文。'},
 lost:{name:'林间迷路与脱困',place:'foot',holder:'farmer',tier:'初期',reward:0,skill:'forage',routes:['safe','shortcut','return','leave'],outcomes:['new','done','lost','left','died'],info:'旧岔路容易走错。采集积累20或先问陈农户，抄近路成功率80%，否则50%。原路走90分钟更稳；失向后仍可零精力退回，无奖励。'},
 mine:{name:'矿洞塌落救工',place:'mine',holder:'smith',tier:'中后期',reward:10,skill:'mining',routes:['safe','risk','leave'],outcomes:['new','claim','done','failed','left','died'],info:'稳妥支撑需矿镐和木料2份；采矿积累30或问清塌落情况更有把握。冒险搬石25%损失30气血并拉伤，可能死亡。救出后回作坊找许铁匠，报酬10文来自其余额。'},
 road:{name:'旧道拦路团伙',place:'oldroad',holder:'merchant',tier:'后期',reward:12,skill:'battle',routes:['bypass','talk','pay','fight','leave'],outcomes:['new','claim','done','failed','left','paid','fighting','escaped','died'],info:'旧道尽头还有一伙拦路人。可绕行、交涉、交4文退开或主动与山贼头目实战。谈妥或实际胜利后回街市找柳掌柜结算12文；交钱留下道路勒索记录，可取证报案。'}
};
export const makeOutings=()=>({floodDay:0,records:Object.fromEntries(Object.keys(OUTINGS).map(id=>[id,{outcome:'new',informed:false,route:null}]))});
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
export function outingsValid(s){const x=s.adventures.outings;if(!obj(x)||Object.keys(x).length!==2||!Number.isSafeInteger(x.floodDay)||x.floodDay<0||x.floodDay>s.day||!obj(x.records)||Object.keys(x.records).length!==6)return false;
 return Object.entries(OUTINGS).every(([id,d])=>{const r=x.records[id];if(!obj(r)||Object.keys(r).length!==3||!d.outcomes.includes(r.outcome)||typeof r.informed!=='boolean'||r.route!==null&&!d.routes.includes(r.route)||r.outcome==='new'&&r.route!==null||r.outcome!=='new'&&r.route===null&&!(id==='flood'&&r.outcome==='settled'))return false;
  if(id==='flood'&&!x.floodDay&&(r.outcome!=='new'||r.informed||r.route!==null))return false;
  if(id==='road'&&r.outcome==='fighting'&&(r.route!=='fight'||s.place!=='oldroad'||s.combat?.opponent!=='chief'||s.combat.practice))return false;
  if(id==='road'&&r.outcome==='paid'&&(r.route!=='pay'||s.adventures.law.incidents.toll.loss!==4))return false;
  if(id==='lost'&&r.outcome==='lost'&&(r.route!=='shortcut'||s.place!=='foot'))return false;
  return true;
 });
}
export function noticeOutings(s){const x=s.adventures?.outings;if(!x)return;if(!x.floodDay&&s.weather==='雨'){x.floodDay=s.day;s.news.unshift('雨后渡口受阻：进出旧渡口多走15分钟，可到码头修补；乡邻三日后自行清理。');s.news.length=Math.min(20,s.news.length);}if(x.floodDay&&s.day>=x.floodDay+3&&['new','failed','left'].includes(x.records.flood.outcome)){x.records.flood.outcome='settled';s.news.unshift('渡口泥障已由乡邻清理，新增绕行时间取消；没有给你补发奖励。');s.news.length=Math.min(20,s.news.length);}if(s.dead)for(const r of Object.values(x.records))if(['fighting','lost','claim'].includes(r.outcome))r.outcome='died';}
export const outingDelay=(s,to)=>{const x=s.adventures.outings;return (x.floodDay||s.weather==='雨')&&['new','failed','left'].includes(x.records.flood.outcome)&&(to==='ferry'||s.place==='ferry')?15:0;};
export const outingMovementBlocker=s=>s.adventures.outings.records.lost.outcome==='lost'&&s.place==='foot'?'先沿原路退回；“脱困返回”不耗精力，即使疲惫受伤也可使用。':null;
export function outingPlan(s,id,route){const r=s.adventures.outings.records[id];
 if(id==='boat'&&['push','wood'].includes(route)){const wood=route==='wood';return {minutes:wood?60:90,energy:wood?12:s.skills.carry>=12?18:24,chance:Math.min(.95,(wood?.95:r.informed?.85:.7)-(s.weather==='雨'?.1:0)),risk:wood?.05:.2,damage:8,injury:'bruise',input:wood?{wood:2}:{}};}
 if(id==='flood'&&route==='repair')return {minutes:60,energy:14,chance:s.skills.carry>=12||r.informed?.9:.7,risk:s.weather==='雨'?.2:.05,damage:8,injury:'bruise',input:{wood:2}};
 if(id==='traps'&&['talk','repair'].includes(route)){const repair=route==='repair';return {minutes:repair?45:30,energy:repair?8:6,chance:repair?(r.informed?.95:.8):s.bag.trap||s.skills.hunt>=12||r.informed?.9:.55,risk:0,damage:0,input:repair?{wood:1}:{}};}
 if(id==='lost'&&['safe','shortcut'].includes(route))return {minutes:route==='safe'?90:30,energy:route==='safe'?4:10,chance:route==='safe'?1:s.skills.forage>=20||r.informed?.8:.5,risk:0,damage:6,input:{}};
 if(id==='mine'&&['safe','risk'].includes(route)){const safe=route==='safe';return {minutes:safe?120:60,energy:safe?20:24,chance:safe?Math.min(.95,.8+(r.informed?.1:0)+(s.skills.mining>=30?.05:0)):s.skills.mining>=30||r.informed?.75:.5,risk:safe?.05:.25,damage:safe?8:30,injury:safe?'bruise':'strain',input:safe?{wood:2}:{},tool:safe?'pick':null};}
 if(id==='road'&&route==='talk')return {minutes:45,energy:10,chance:r.informed||s.adventures.org.id==='caravan'||factionFriendly(s,'caravan')||s.relations.merchant>=3?.75:.4,risk:0,damage:0,input:{}};
 return null;
}
export function outingFightBlocker(s){if(s.place!=='oldroad'||s.adventures.outings.records.road.outcome!=='new')return '请到旧道尚未处理的团伙处。';if(s.dead||s.pending||s.combat)return '先处理眼前选择或交手；死亡后不能继续。';if(!s.martial.known[s.martial.equipped]||s.hp<25||s.energy<20)return '主动实战需已学并选用武艺、气血25、精力20；可绕行或交涉。';return null;}
export function settleOutingCombat(s,c,log){const r=s.adventures?.outings?.records.road;if(r?.outcome!=='fighting'||c.opponent!=='chief'||c.practice)return;r.outcome=c.ended==='victory'?'claim':c.ended==='death'?'died':'escaped';log.push(r.outcome==='claim'?'团伙败退，可回街市找柳掌柜交代；未自动发钱或掉装备。':r.outcome==='died'?'旧道团伙冒险：战败身亡。':'已撤离团伙交手，伤势与消耗保留；不重新开战，不发报酬。');}
export function outingAction(s,id,{present,transact,advance,rng}){
 const [,key,route]=id.split(':'),x=s.adventures.outings,fail=t=>{s.result=[t];return false;};if(!Object.hasOwn(OUTINGS,key))return fail('没有这项县境冒险。');const d=OUTINGS[key],r=x.records[key],localPresent=(who,n)=>present(s,who,n)&&(who!=='hunter'||s.npcWorld.individuals.hunter.place===s.place);
 if(key==='flood'&&!x.floodDay)return fail('需实际出现雨天后，才有渡口泥障；不会编造过去的灾情。');
 if(route==='claim'){if(r.outcome!=='claim'||!d.reward||!localPresent(d.holder,15))return fail('需实际完成冒险，并回付款人在场时交代；不会重复发钱。');const p=s.npcWorld.individuals[d.holder];if(p.coins<d.reward||s.coins>10000000-d.reward)return fail('付款人现有余额不足或自己无法收款，成果保留，可稍后再来。');return transact(s,'交代：'+d.name,15,0,()=>{p.coins-=d.reward;s.coins+=d.reward;r.outcome='done';s.result.push('报酬'+d.reward+'文来自当事人余额，仅支付一次；没有装备或隐藏奖励。');},advance);}
 if(route==='inquire'){if(r.outcome!=='new'||r.informed||!localPresent(d.holder,15))return fail('请在尚未处理冒险且知情人在场时打听，只问一次。');return transact(s,'打听：'+d.name,15,0,()=>{r.informed=true;s.result.push(d.info,'情报保留，但不保证成功；现场选择显示当前概率与成本。');},advance);}
 if(key==='lost'&&route==='return'){if(s.place!=='foot'||r.outcome!=='lost')return fail('没有待脱困的岔路。');return transact(s,'沿原路脱困返回',60,0,()=>{r.outcome='done';r.route='return';s.result.push('回到南山脚主路，没有瞬移到其他地点；不恢复气血精力，不发奖励。');},advance);}
 if(s.place!==d.place||r.outcome!=='new'||!d.routes.includes(route))return fail('需到冒险现场且尚未处理；再访保留结果，不刷新收益。');
 if(['leave','bypass'].includes(route)){const minutes=route==='bypass'?(key==='flood'?45:60):15;return transact(s,'避开：'+d.name,minutes,route==='bypass'?4:0,()=>{r.route=route;r.outcome='left';s.result.push(key==='flood'?'你选择避开泥障；阻碍仍在，乡邻会在三日后自行清理。':'你退回现有主路，无收益，不强迫战斗；此次冒险结束。');},advance);}
 if(key==='road'&&route==='pay'){const caseRecord=s.adventures.law.incidents.toll;if(caseRecord.status!=='new'||s.coins<4)return fail('需自己的4文且道路勒索记录尚未发生；与官道案件共用损失，不重复造案。');return transact(s,'交钱退开旧道团伙',15,0,()=>{s.coins-=4;Object.assign(caseRecord,{status:'open',loss:4,held:4,witness:false,reportTier:0});r.route='pay';r.outcome='paid';s.result.push('实际损失4文，写入道路勒索案件；可去码头问证、县衙报案，不保证追回。无报酬或强迫战斗。');},advance);}
 if(route==='fight')return fail('请通过实际团伙交手入口开始战斗。');
 const plan=outingPlan(s,key,route);if(!plan)return fail('没有这个冒险处理方式。');if(key==='traps'&&route==='talk'&&!localPresent(d.holder,plan.minutes))return fail('蒋猎户暂不在场或不能接洽，无法交涉；仍可准备材料修补或改日再来。');if(s.hp<25||plan.tool&&!s.bag[plan.tool]||Object.entries(plan.input).some(([id,n])=>s.bag[id]<n))return fail('需气血25及说明中的实际工具、材料；不足时不消耗尝试，可离开或准备后再来。');
 return transact(s,'冒险：'+d.name,plan.minutes,plan.energy,()=>{for(const [id,n] of Object.entries(plan.input))s.bag[id]-=n;r.route=route;const success=rng()<plan.chance;r.outcome=success?(d.reward?'claim':'done'):key==='lost'?'lost':'failed';
  if(key==='lost'&&!success){s.hp-=6;s.result.push('抄近路失向并擦伤6气血；可原路脱困，60分钟/精力0，不会困死。');}
  else if(plan.risk&&rng()<plan.risk){s.hp=Math.max(0,s.hp-plan.damage);addInjury(s,plan.injury);s.result.push('意外受伤，气血-'+plan.damage+'，新增'+(plan.injury==='strain'?'拉伤':'瘀伤')+'。');if(!s.hp){s.dead=true;r.outcome='died';s.result.push('伤重身亡，这段人生永久结束；不发报酬。');}}
  if(!s.dead){const line=gain(s,d.skill,success?2:1);if(line)s.result.push(line);s.result.push(success?(d.reward?'实际处理完成；需回当事人处交代才有报酬。':key==='flood'?'泥障已清，新增15分钟绕行取消；无钱物奖励。':'回到已知主路，无钱物奖励。'):key==='flood'?'修补没成功，材料与精力已消耗；乡邻三日后接手，未发奖励。':key==='lost'?'脱困入口始终保留，仍可休息或处理伤势。':'没能解决，时间、材料与精力已付出；其他人接手，此项不重开。');}
 },advance);
}
const routeNames={push:'徒手合力推船',wood:'垫木推船',repair:'交木料修补',talk:'交涉',safe:'稳妥处理',shortcut:'冒险抄近路',risk:'冒险搬石',bypass:'绕行避开',pay:'交钱退开',fight:'实际交手',leave:'不参与并离开',return:'沿原路脱困'};
export function outingOptions(s){const x=s.adventures.outings,out=[],add=(id,label,preview)=>out.push({id:'outing:'+id,label,preview});for(const [key,d] of Object.entries(OUTINGS)){const r=x.records[key];if(key==='flood'&&!x.floodDay)continue;
  const holderPlace={boatman:'dock',hunter:'bamboo',farmer:'fields',smith:'workshop',merchant:'market'}[d.holder];if(r.outcome==='new'&&!r.informed&&s.place===holderPlace)add(key+':inquire','打听 · '+d.name,'15分钟，知情人须在场；'+d.info);
  if(r.outcome==='claim'&&s.place===holderPlace)add(key+':claim','交代 · '+d.name,'15分钟；报酬'+d.reward+'文来自当事人实际余额；资金不足保留成果，不重复结算。');
  if(key==='lost'&&r.outcome==='lost'&&s.place==='foot'){add('lost:return','脱困返回 · 林间岔路','60分钟/精力0；疲惫受伤仍可返回主路，不回血或瞬移，不发奖励。');continue;}
  if(s.place!==d.place||r.outcome!=='new')continue;
  for(const route of d.routes){if(route==='return')continue;if(route==='pay'&&s.adventures.law.incidents.toll.status!=='new')continue;const p=outingPlan(s,key,route);let preview=d.info;
   if(p)preview=p.minutes+'分钟/精力'+p.energy+'；成功率'+Math.round(p.chance*100)+'%；'+Object.entries(p.input).map(([id,n])=>'木料'+n+'份').join('、')+(p.tool?'，需矿镐':'')+'；'+(key==='lost'&&route==='shortcut'?'失败损失6气血并失向，可零精力脱困。':p.risk?Math.round(p.risk*100)+'%损失'+p.damage+'气血并受伤'+(p.damage>=25?'，可能永久死亡。':'。'):'无本分支身体伤害。')+(d.reward?'成功后回当事人处结算'+d.reward+'文，可能因缺钱暂不能付款。':'无钱物奖励。');
   else if(route==='leave')preview='15分钟/精力0，结束本项，无奖励或强迫战斗。';else if(route==='bypass')preview=(key==='flood'?45:60)+'分钟/精力4，无报酬或战斗；'+(key==='flood'?'泥障仍在，三日后乡邻清理。':'本项结束，正常移动仍可用。');else if(route==='pay')preview='15分钟/精力0，交自己的4文；与官道勒索共用一次损失记录，可取证报案，不保证追回。';else if(route==='fight')preview='县境山贼头目实战：强攻；需已学选用武艺、气血25、精力20。可能受伤、撤退失败或永久死亡；胜利后回街市交代，不掉神装。';
   add(key+':'+route,routeNames[route]+' · '+d.name,preview);
  }
 }return out;}
const outcomeNames={new:'尚未处理',claim:'完成，待交代',done:'已完成',failed:'未解决，其他人接手',left:'未参与',paid:'交钱退开，损失可报案',fighting:'正在实战',escaped:'已败逃，伤势保留',died:'冒险身亡',lost:'失向，待原路脱困',settled:'乡邻已清理'};
export function outingSummary(s){const x=s.adventures.outings;return Object.entries(OUTINGS).map(([id,d])=>d.name+' · '+d.tier+' · '+(id==='flood'&&!x.floodDay?'等待实际雨天':outcomeNames[x.records[id].outcome])+' · '+(x.records[id].route?routeNames[x.records[id].route]:'未选路线')+'；'+(x.records[id].informed?'已打听':'未打听')+'。');}
