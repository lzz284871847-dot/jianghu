import {tradeRouteBlocked} from './world-feedback.js?v=5.57.0';
import {stockAt,budgetAt,ensureCommerce} from './commerce.js?v=5.57.0';
// 青河县生计：每日短工名额、雇主履约和天气影响，不由玩家操作自动保底收益。
export const JOBS=Object.freeze({
 county:{name:'县城杂役',slots:2,base:12,success:.83},
 workshop:{name:'作坊帮工',slots:2,base:12,success:.88},
 fields:{name:'田间短工',slots:2,base:12,success:.85},
 dock:{name:'码头搬运',slots:2,base:12,success:.78},
 liuxi:{name:'集市脚夫',slots:2,base:12,success:.82}
});
export const makeLivelihood=()=>({workDays:{}});
export function ensureLivelihood(s){s.livelihood??=makeLivelihood();return s.livelihood;}
export function livelihoodValid(s){const data=s.livelihood;if(!data||typeof data!=='object'||Array.isArray(data)||!data.workDays||typeof data.workDays!=='object'||Array.isArray(data.workDays))return false;
 return Object.entries(data.workDays).every(([place,d])=>Object.hasOwn(JOBS,place)&&d&&typeof d==='object'&&!Array.isArray(d)&&Number.isSafeInteger(d.day)&&d.day>=1&&d.day<=s.day&&Number.isSafeInteger(d.count)&&d.count>=1&&d.count<=JOBS[place].slots);
}
export function livelihoodPressure(s,place=s.place){
 const grain=stockAt(s,place==='liuxi'?'liuxi':'market','grain');
 const shortage=grain<=3;
 const merchant=place==='liuxi'?'liuxi':'market';
 const lowFunds=['liuxi','workshop'].includes(place)&&budgetAt(s,merchant)<25;
 const routeBlocked=place==='liuxi'&&tradeRouteBlocked(s);
 return {shortage,lowFunds,routeBlocked,slots:Math.max(1,JOBS[place]?.slots-(shortage&&['fields','county'].includes(place)?1:0)-(lowFunds?1:0)-(routeBlocked?1:0))};
}
// One current plan supplies the UI and settlement; no extra employer ledger or retroactive wage debt.
export function jobPlan(s,place=s.place){
 const job=JOBS[place];if(!job)return null;const record=s.livelihood?.workDays[place],count=record?.day===s.day?record.count:0,pressure=livelihoodPressure(s,place),payer=place==='liuxi'?'liuxi':'market';
 const chance=Math.max(.3,job.success-(s.weather==='雨'&&['dock','fields'].includes(place)?.18:0)-(s.energy<40?.1:0)-(pressure.shortage&&['fields','county'].includes(place)?.12:0)-(pressure.lowFunds?.16:0)-(count>0&&['dock','liuxi'].includes(place)?.12:0));
 return {name:job.name,payer,funds:budgetAt(s,payer),count,pressure,chance,full:job.base,fallback:4,remaining:Math.max(0,pressure.slots-count),accidentRisk:['dock','workshop'].includes(place)?.03:0};
}
export function jobAvailability(s){const p=jobPlan(s);if(!p)return '这里没有招工。';if(!p.remaining)return '今天此处短工名额已用完，明天可再来。';if(p.funds<p.full)return '本地劳务资金现有'+p.funds+'文，不足本班满额'+p.full+'文，暂缓招工；交易或后续正常到货可恢复资金，不做无钱可付的活。';if(s.coins>10000000-p.full)return '自己的钱袋装不下本班满额工钱，先处理铜钱再接活。';return null;}
export function jobBlocker(s,energy=24){const reason=jobAvailability(s);if(reason)return reason;if(s.hp<25)return '先养伤，气血至少25再做重活。';const open=s.place==='fields'||s.place==='dock'?360:420;if(s.minute<open||s.minute+180>1080)return '短工需在白天营业时段内做完3小时。';if(s.energy<energy)return '精力不足'+energy+'，可先免费歇息；尚未开始短工。';return null;}
export function jobPreview(s,energy=24){const p=jobPlan(s);if(!p)return '';const info=(p.pressure.shortage&&['fields','county'].includes(s.place)?'缺粮缩减用工并提高验收要求。':'')+(p.pressure.lowFunds?'商户资金紧张，名额和满额机会下降。':'')+(p.pressure.routeBlocked?'栈道受阻，到货减少，柳溪脚夫名额缩减。':'')+(p.count>0&&['dock','liuxi'].includes(s.place)?'后一班竞争更激烈。':'')+(s.weather==='雨'&&['dock','fields'].includes(s.place)?'雨天降低满额机会。':'')+(s.energy<40?'当前疲惫，满额机会下降。':'');
 return (s.place==='fields'||s.place==='dock'?'06':'07')+'—18时；3小时/精力'+energy+'；满额'+p.full+'文概率'+Math.round(p.chance*100)+'%，未满额'+p.fallback+'文；今日还可接'+p.remaining+'班，已做'+p.count+'班。'+info+'本地劳务资金现有'+p.funds+'文，工资实际从中扣除。'+(p.accidentRisk?'3%搬运擦伤4气血，验收与伤势一并结算。':'');
}
export function jobSceneHint(s){const p=jobPlan(s);if(!p)return '';return !p.remaining?'今日名额已满':p.funds<p.full?'资金不足 · 暂缓招工':'还招'+p.remaining+'班短工';}
export function jobOutcome(s,rng){const blocked=jobAvailability(s);if(blocked){s.result.push(blocked);return 0;}const plan=jobPlan(s),{count,pressure,chance}=plan;
 ensureLivelihood(s).workDays[s.place]={day:s.day,count:count+1};
 const roll=rng();
 // 不足额结算：工期仍已付出；未满额工作的雇主支付最低劳务费，避免随机归零。
 const paid=roll<chance?plan.full:plan.fallback;
 ensureCommerce(s).budget[plan.payer]-=paid;s.coins+=paid;
 s.result.push(roll<chance?'雇主验收合格，结清'+paid+'文。':'活计受天气、工序或验收影响，只结算'+paid+'文；并非每次都有满额收入。');
 if(count>0&&['dock','liuxi'].includes(s.place))s.result.push('同一雇主今日已有前一班短工，后续活计竞争更激烈，满额验收机会下降。');
 if(['dock','workshop'].includes(s.place)&&roll>=.97){const injury=4;s.hp=Math.max(1,s.hp-injury);s.result.push('短工意外：搬运时擦伤，气血 -'+injury+'；工时与验收结果照常结算，伤势不会自动恢复。');}
 s.result.push('实际工钱'+paid+'文从本地劳务资金扣除，余'+ensureCommerce(s).budget[plan.payer]+'文；没有预付或欠薪。');
 s.result.push('今日本处已完成'+(count+1)+'/'+pressure.slots+'次短工。');if(pressure.shortage&&['fields','county'].includes(s.place))s.result.push('粮食紧缺，雇主缩减用工并提高验收要求。');if(pressure.routeBlocked)s.result.push('栈道受阻，到货减少，柳溪雇主缩减脚夫名额。');if(pressure.lowFunds)s.result.push('商户周转资金紧张，雇主缩减用工。');
 return paid;
}
