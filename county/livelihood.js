import {stockAt,budgetAt} from './commerce.js?v=4.11.0';
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
 return {shortage,lowFunds,slots:Math.max(1,JOBS[place]?.slots-(shortage&&['fields','county'].includes(place)?1:0)-(lowFunds?1:0))};
}
export function jobAvailability(s){const job=JOBS[s.place];if(!job)return '这里没有招工。';const record=ensureLivelihood(s).workDays[s.place];const pressure=livelihoodPressure(s);if(record?.day===s.day&&record.count>=pressure.slots)return '今天此处短工名额已用完，明天可再来。';return null;}
export function jobOutcome(s,rng){const job=JOBS[s.place],record=ensureLivelihood(s).workDays[s.place];const count=record?.day===s.day?record.count:0;
 ensureLivelihood(s).workDays[s.place]={day:s.day,count:count+1};
 const pressure=livelihoodPressure(s);const chance=Math.max(.3,job.success-(s.weather==='雨'&&['dock','fields'].includes(s.place)?.18:0)-(s.energy<40?.1:0)-(pressure.shortage&&['fields','county'].includes(s.place)?.12:0)-(pressure.lowFunds?.16:0));
 const roll=rng();
 // 不足额结算：工期仍已付出；未满额工作的雇主支付最低劳务费，避免随机归零。
 const paid=roll<chance?job.base:4;
 s.coins+=paid;
 s.result.push(roll<chance?'雇主验收合格，结清'+paid+'文。':'活计受天气、工序或验收影响，只结算'+paid+'文；并非每次都有满额收入。');
 s.result.push('今日本处已完成'+(count+1)+'/'+pressure.slots+'次短工。');if(pressure.shortage&&['fields','county'].includes(s.place))s.result.push('粮食紧缺，雇主缩减用工并提高验收要求。');if(pressure.lowFunds)s.result.push('商户周转资金紧张，雇主缩减用工。');
 return paid;
}
