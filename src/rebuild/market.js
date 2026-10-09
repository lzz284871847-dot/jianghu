// 一笔买卖须在同一营业时段内完成；批量仍是一笔15分钟交易。
export const marketHours={open:8*60,close:20*60,minutes:15};
export function marketBlocker(s){
 if(s.place!=='town')return '请在08:00–20:00到街市买卖。';
 if(s.minute<marketHours.open||s.minute>=marketHours.close)return '请在08:00–20:00到街市买卖。';
 if(s.minute+marketHours.minutes>marketHours.close)return '街市即将闭市，本笔需15分钟，最晚19:45开始；整笔未成交。';
 return null;
}
export function marketStatus(s){
 if(s.place!=='town')return '买卖需到青石镇街市进行。';
 if(s.minute<marketHours.open)return `尚未开门：08:00营业，还有${marketHours.open-s.minute}分钟；可等候或另作安排。`;
 if(s.minute>=marketHours.close)return '街市已闭市：明日08:00再来。';
 if(s.minute+marketHours.minutes>marketHours.close)return '今日已停止接单：每笔需15分钟，最晚19:45开始。';
 return `营业中：距20:00闭市还有${marketHours.close-s.minute}分钟；每笔需15分钟，最晚19:45开始。`;
}
