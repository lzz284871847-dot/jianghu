import {alive} from './npc-mortality.js?v=5.56.0';
import {bondBetween} from './npc-social.js?v=5.56.0';
import {marketPrice,stockAt,budgetAt} from './commerce.js?v=5.56.0';
import {MARKET_LIMIT} from './commerce.js?v=5.56.0';
import {districtStatus} from './society.js?v=5.56.0';
// Positions are permanent shop jobs, NOT the player's separately posted casual day-work slots.
export const POSITIONS=Object.freeze({
 shopassistant:{market:'market',pay:4},
 smithapprentice:{market:'market',pay:4},
 stallholder:{market:'liuxi',pay:4}
});
const remember=(p,text)=>{p.history=[text,...p.history].slice(0,8);};
const train=(p,key,amount=1)=>{p.careerSkills[key]=Math.min(500,p.careerSkills[key]+amount);};
// Rank uses persisted, actually earned skills; restoring an old save grants no money.
export function npcCareer(p){
 const key=p.occupation==='carrier'?'carry':p.occupation==='shopworker'?'trade':
 p.id==='smithapprentice'?'craft':POSITIONS[p.id]?'trade':TRANSPORTERS[p.id]?'carry':producerOf(p)?'forage':null;
 const skill=key?p.careerSkills[key]:0;
 const rank=skill>=100?2:skill>=40?1:0;
 return {key,rank,label:['初入行','熟手','资深'][rank],bonus:key==='forage'?0:rank};
}
export function npcWork(s,p,day){
 if(!alive(p)||p.retirement?.active||p.life?.sickDays>0||p.life?.restDay===day)return false;
 const pos=p.occupation==='shopworker'?{market:p.home==='liuxi'?'liuxi':'market',pay:4}:['original','craftsman'].includes(p.occupation)?POSITIONS[p.id]:null;
 const effort=p.careerSkills.trade>=20?13:15;
 if(!pos||p.injuryDays>0||p.energy<Math.max(20,effort)||p.hunger>=80)return false;
 const shop=pos.market,craft=p.id==='smithapprentice'&&p.occupation==='craftsman';
 const pay=(craft?6:pos.pay)+npcCareer(p).bonus;
 if(districtStatus(s,shop).closed||budgetAt(s,shop)<pay+25)return false;
 // Craft assessments have genuine failures: effort is spent, but no wage or skill is awarded.
 if(p.id==='smithapprentice'&&p.occupation==='original'){
  const skill=p.careerSkills.craft;
  const badWeather=s.weather==='雨'?1:0;
  const tired=p.energy<50?1:0;
  // Practice reduces assessment errors, but rain and fatigue still carry risk.
  const threshold=Math.max(2,7+Math.min(3,Math.floor(skill/20))-badWeather-tired);
  if((day+p.id.length)%threshold===0){
   p.energy=Math.max(0,p.energy-12);
   remember(p,'第'+day+'日锻造工序失误，未通过验收；耗费精力，未得工钱。');
   return false;
  }
 }
 // An employer spends its own cash, so no money is created by this action.
 s.commerce.budget[shop]-=pay;p.coins+=pay;
 p.workDays++;p.energy=Math.max(0,p.energy-effort);
 train(p,p.id==='smithapprentice'?'craft':'trade');
 if(p.workDays===1||p.workDays%10===0)remember(p,'第'+day+'日在'+(shop==='market'?'县城':'柳溪')+'商铺做工，领到'+pay+'文。');
 return true;
}
export function npcBuyFood(s,p,day){
 if(!alive(p))return false;
 const shop=p.home==='liuxi'?'liuxi':'market';
 if(districtStatus(s,shop).closed)return false;
 // The same shop stock and player purchase quote are used for NPCs.
 const key='grain',price=marketPrice(s,shop,'buy',key);
 if(price===null||stockAt(s,shop,key)<1||p.coins<price||p.food>0)return false;
 s.commerce.stock[shop][key]--;s.commerce.budget[shop]+=price;
 p.coins-=price;p.food++;remember(p,'第'+day+'日在'+(shop==='market'?'县城街市':'柳溪集')+'买粮1份，支出'+price+'文。');
 return true;
}

// Individual production enters the same shop inventory as player sales. Unaccepted goods
// remain in the producer's limited personal stock, never disappear for free.
export const PRODUCERS=Object.freeze({
 farmhand01:{market:'market',item:'vegetable',interval:3,effort:18},
 farmhand02:{market:'market',item:'vegetable',interval:3,effort:18},
 fisher:{market:'liuxi',item:'fish',interval:2,effort:20},
 hunter:{market:'liuxi',item:'meat',interval:3,effort:25},
 herbalist:{market:'market',item:'herb',interval:3,effort:16}
});
export function producerOf(p){return PRODUCERS[p.id]??(/^chen-child-[12]$/.test(p.id)?PRODUCERS.farmhand01:null);}
export const TRANSPORTERS=Object.freeze({dockhand01:'market',dockhand02:'liuxi',carter:'market',laborer:'market'});
export function npcProduce(s,p,day){
 if(!alive(p)||p.retirement?.active||p.life?.sickDays>0||p.life?.restDay===day)return false;
 const job=producerOf(p);const effort=job?Math.max(12,job.effort-(p.careerSkills.forage>=20?2:0)):0;
 if(!job||/^chen-child-/.test(p.id)&&p.occupation!=='farmer'||p.injuryDays>0||day%job.interval!==0||p.energy<effort||p.hunger>=80||p.cargo>=5)return false;
 p.energy-=effort;
 // Deterministic risk based on the game seed and day, without extra RNG side effects.
 const succeeds=(day+p.id.length)%5!==0 && !(s.weather==='雨'&&job.item==='meat');
 if(!succeeds){remember(p,'第'+day+'日外出劳作，没有收获。');return false;}
 p.cargo++;train(p,'forage');remember(p,'第'+day+'日采获'+job.item+'，等待集市收购。');return true;
}
export function npcSellProduce(s,p,day){
 if(!alive(p)||p.retirement?.active||p.life?.sickDays>0||p.life?.restDay===day)return false;
 const job=producerOf(p);if(!job||p.cargo<=0)return false;
 const shop=job.market,price=marketPrice(s,shop,'sell',job.item);
 if(districtStatus(s,shop).closed||price===null||stockAt(s,shop,job.item)>=MARKET_LIMIT||budgetAt(s,shop)<price)return false;
 p.cargo--;s.commerce.stock[shop][job.item]++;s.commerce.budget[shop]-=price;p.coins+=price;p.workDays++;
 remember(p,'第'+day+'日在集市售出'+job.item+'，得到'+price+'文。');return true;
}
export function npcTransport(s,p,day){
 if(!alive(p)||p.retirement?.active||p.life?.sickDays>0||p.life?.restDay===day)return false;
 const shop=TRANSPORTERS[p.id];
 const effort=p.careerSkills.carry>=20?20:22;
 const injuryPeriod=p.careerSkills.carry>=40?23:17;
 if(!shop||p.injuryDays>0||p.energy<effort||p.hunger>=80||districtStatus(s,shop).closed||budgetAt(s,shop)<30)return false;
 // Merchant pays documented carriage charges; no cargo is conjured into existence.
 const pay=3+npcCareer(p).bonus;if(budgetAt(s,shop)<pay+27)return false;s.commerce.budget[shop]-=pay;p.coins+=pay;p.energy-=effort;p.workDays++;train(p,'carry');
 if((day+p.id.length)%injuryPeriod===0){p.injuryDays=3;remember(p,'第'+day+'日搬运时扭伤，需休养三日。');}
 if(p.workDays===1||p.workDays%10===0)remember(p,'第'+day+'日替商户搬运现有货物，领到'+pay+'文运费。');
 return true;
}
export function npcFindWork(s,p,day){
 if(p.coins>12||p.hunger<40||p.energy<22||p.workDays>0)return false;
 // Last-resort carrier work is funded by an actual solvent merchant; no guaranteed handouts.
 return npcTransport(s,p,day);
}

// Vacancy is derived from persisted employees; applications do not invent jobs.
export const SHOP_CAPACITY=Object.freeze({market:3,liuxi:2});
export function npcApplyShop(s,p,day){
 if(!alive(p)||p.retirement?.active)return false;
 if(p.level!=='ordinary'||!['original','carrier'].includes(p.occupation)||p.hunger>=80)return false;
 const shop=p.home==='liuxi'?'liuxi':'market';
 if(districtStatus(s,shop).closed||budgetAt(s,shop)<70)return false;
 const manager=shop==='market'?'merchant':'stallholder',bondKey=bondBetween(s,manager,p.id);
 if(bondKey){
  const bond=s.npcWorld.social.bonds[bondKey];
  if(bond.trust<30||bond.resentment>=70)return false;
 }
 const employees=[...Object.values(s.npcWorld.individuals),...(s.npcWorld.lineage?.children??[]).filter(c=>alive(c)&&s.day-c.bornDay>=16*360).map(c=>({...c.livelihood,home:'market'}))].filter(n=>alive(n)&&!n.retirement?.active).filter(n=>
  n.occupation==='shopworker'&&(n.home==='liuxi'?'liuxi':'market')===shop||
  n.occupation==='original'&&POSITIONS[n.id]?.market===shop||
  n.occupation==='craftsman'&&n.id==='smithapprentice'&&shop==='market'
 ).length;
 if(employees>=SHOP_CAPACITY[shop])return false;
 p.occupation='shopworker';p.unemployedDays=0;
 remember(p,'第'+day+'日应聘成功，成为'+(shop==='market'?'县城':'柳溪')+'商铺伙计。');
 return true;
}
// Skilled masters use a small amount of shop material budget to mentor apprentices.
// No salary or skill is conjured without real training costs.
export function npcMentor(s,p,day){
 if(!alive(p)||p.retirement?.active||p.life?.sickDays>0||p.life?.restDay===day)return false;
 if(p.id!=='smith'||day%4!==0||p.injuryDays>0||p.energy<20||districtStatus(s,'market').closed||budgetAt(s,'market')<27)return false;
 const apprentice=s.npcWorld.individuals.smithapprentice;
 if(!apprentice||apprentice.retirement?.active||apprentice.life?.sickDays>0||apprentice.life?.restDay===day||apprentice.occupation!=='original'||apprentice.injuryDays>0||apprentice.careerSkills.craft>=500)return false;
 const bond=s.npcWorld.social.bonds[bondBetween(s,'smith','smithapprentice')];
 if(bond.trust<30)return false; // A broken apprenticeship stops consuming materials or awarding skill.
 s.commerce.budget.market-=2;
 p.energy-=10;train(apprentice,'craft');
 remember(apprentice,'第'+day+'日跟许师傅学会一项锻造要领，作坊耗材2文。');
 return true;
}
export function npcCareerDay(s,p,day){
 if(!alive(p)||p.retirement?.active||p.life?.sickDays>0||p.life?.restDay===day)return false;
 if(p.id==='smith')npcMentor(s,p,day);
 const before=p.workDays,rankBefore=npcCareer(p).rank;
 if(p.occupation==='shopworker'||p.occupation==='craftsman'){
  npcWork(s,p,day);
 }else if(p.occupation==='carrier'){
  // Career conversion has the same finite merchant payroll as normal carters.
  const shop=p.home==='liuxi'?'liuxi':'market',pay=3+npcCareer(p).bonus;
  const rivalId=p.id==='dockhand01'?'carter':p.id==='carter'?'dockhand01':null;
  const rivalry=rivalId?s.npcWorld.social.bonds[bondBetween(s,p.id,rivalId)]:null;
  const refusesSharedRoute=rivalry&&rivalry.resentment>=70&&day%2===0;
  if(refusesSharedRoute){remember(p,'第'+day+'日因与同行积怨过深，避开共同搬运的短工。');}
  const effort=p.careerSkills.carry>=20?20:22;
  const injuryPeriod=p.careerSkills.carry>=40?23:17;
  if(!refusesSharedRoute&&p.injuryDays===0&&p.energy>=effort&&p.hunger<80&&!districtStatus(s,shop).closed&&budgetAt(s,shop)>=pay+27){
   s.commerce.budget[shop]-=pay;p.coins+=pay;p.energy-=effort;p.workDays++;train(p,'carry');
   if((day+p.id.length)%injuryPeriod===0){p.injuryDays=3;remember(p,'第'+day+'日搬运时受伤，需休养三日。');}
   if(p.workDays%10===0)remember(p,'第'+day+'日做搬运短工，得到'+pay+'文。');
  }
 }else{
  npcWork(s,p,day);
  npcProduce(s,p,day);
  npcSellProduce(s,p,day);
  npcTransport(s,p,day);
 }
 if(p.id==='smithapprentice'&&p.occupation==='original'&&p.workDays>=20&&p.careerSkills.craft>=20){p.occupation='craftsman';remember(p,'第'+day+'日学徒完成二十次合格工序并积累足够技艺，成为正式铁匠，工钱随手艺提升。');}
 if(/^chen-child-/.test(p.id)&&['carrier','shopworker'].includes(p.occupation))npcSellProduce(s,p,day);
 if(p.workDays>before){p.unemployedDays=0;if(npcCareer(p).rank>rankBefore)remember(p,'第'+day+'日凭实际劳作晋升为'+npcCareer(p).label+'，今后工钱按熟练程度结算。');return true;}
 p.unemployedDays=Math.min(100000,p.unemployedDays+1);
 // Only an unfunded/closed employer releases shop employees; illness alone is not dismissal.
 if(p.occupation==='shopworker'&&p.unemployedDays>=7){
  const shop=p.home==='liuxi'?'liuxi':'market';
  if(districtStatus(s,shop).closed||budgetAt(s,shop)<29+npcCareer(p).bonus){
   p.occupation='original';
   remember(p,'第'+day+'日商铺长期停工，离职另寻生计，保留已学手艺与积蓄。');
   return false;
  }
 }
 const searchAfter=3;
 // An injured worker can seek less strenuous shop work, but cannot earn wages without being hired.
 const injuryJobSearch=p.injuryDays>0&&p.unemployedDays>=1;
 // Repeated unemployment and a real injury lead to more urgent job searches, not free wages.
 const recoverySearch=p.injuryDays>=2&&p.unemployedDays>=2;
 if(['original','carrier'].includes(p.occupation)&&(p.unemployedDays>=searchAfter||recoverySearch||injuryJobSearch)&&npcApplyShop(s,p,day))return false;
 const prolongedSearch=p.unemployedDays>=7&&p.coins<=20;
 if(p.occupation==='farmer'&&prolongedSearch){p.occupation='carrier';remember(p,'第'+day+'日家中农事连续无法变现，暂转运输短工谋生。');return false;}
 if(p.occupation==='carrier'&&prolongedSearch&&p.level==='ordinary'&&day%3===0){
  p.occupation='original';
  remember(p,'第'+day+'日搬运短工长期无着，重新尝试本行与其他谋生门路。');
  return false;
 }
 // Repeated failure and a stable work history affect willingness to change jobs.
 const establishedWorker=p.workDays>=20;
 const reconsiderDays=Math.min(12,5+p.history.filter(x=>/搬运短工长期无着/.test(x)).length*2+(establishedWorker?3:0));
 const recentlyReconsidered=p.history.some(x=>{const match=x.match(/^第(\d+)日搬运短工长期无着/);return match&&day-Number(match[1])<reconsiderDays;});
 // Recent injury makes a recovered worker hesitate before returning to heavy carriage work.
 const injuryCautionDays=7;
 const recentInjury=p.history.some(x=>{const match=x.match(/^第(\d+)日搬运时(?:扭伤|受伤)/);return match&&day-Number(match[1])<injuryCautionDays;});
 if(p.occupation==='original'&&p.level==='ordinary'&&p.injuryDays===0&&!recentlyReconsidered&&!recentInjury&&p.unemployedDays>=searchAfter&&p.coins<=35&&p.energy>=22){
  p.occupation='carrier';p.unemployedDays=0;
  remember(p,'第'+day+'日连续无法谋生，改找运输短工；能否领工钱仍取决于商铺资金。');
 }
 return false;
}

// Legacy retirement schema only; automatic retirement has been removed.
export const makeRetirement=(day=1)=>({active:false,retiredDay:0,lastDay:day});
export const retirementValid=(r,day)=>!!r&&typeof r==='object'&&!Array.isArray(r)&&Object.keys(r).length===3&&typeof r.active==='boolean'&&
 Number.isSafeInteger(r.lastDay)&&r.lastDay>=1&&r.lastDay<=day&&Number.isSafeInteger(r.retiredDay)&&r.retiredDay>=0&&r.retiredDay<=r.lastDay&&(!r.active||r.retiredDay>0);
