// 各地固定行情；每笔15分钟，不运行供需或店铺账目模拟。
export const prices={food:4,herb:4,iron:5,wood:2,rod:6,staff:12,sword:24,tool:20,salve:8,trap:12,seed:3};
export const salePrices={herb:3,fish:5,tool:18,salve:6,meat:6,vegetable:2};
export const marketHours={open:8*60,close:20*60,minutes:15};
const markets={town:{name:'青石镇街市',...marketHours,buy:prices,sell:salePrices},liuxi:{name:'柳溪集',open:8*60,close:18*60,minutes:15,buy:{food:5,herb:5,wood:3,seed:3},sell:{fish:7,vegetable:3,tool:21,salve:7}}};
const hour=n=>String(n/60).padStart(2,'0')+':00';
export function marketFor(s){return markets[s.place]||null}
export function marketPrices(s,type){return marketFor(s)?.[type==='buy'?'buy':'sell']||{}}
export function marketBlocker(s){
 const m=marketFor(s);if(!m)return '请在08:00–20:00到青石镇街市，或08:00–18:00到柳溪集买卖。';
 if(s.minute<m.open||s.minute>=m.close)return `请在${hour(m.open)}–${hour(m.close)}到街市买卖。`;
 if(s.minute+m.minutes>m.close)return `街市即将闭市，本笔需15分钟，最晚${String(Math.floor((m.close-15)/60)).padStart(2,'0')}:45开始；整笔未成交。`;
 return null;
}
export function marketStatus(s){
 const m=marketFor(s);if(!m)return '买卖需到青石镇街市或柳溪集进行。';
 if(s.minute<m.open)return `尚未开门：${hour(m.open)}营业，还有${m.open-s.minute}分钟；可等候或另作安排。`;
 if(s.minute>=m.close)return `街市已闭市：明日${hour(m.open)}再来。`;
 const last=String(Math.floor((m.close-15)/60)).padStart(2,'0')+':45';
 if(s.minute+m.minutes>m.close)return `今日已停止接单：每笔需15分钟，最晚${last}开始。`;
 return `营业中：距${hour(m.close)}闭市还有${m.close-s.minute}分钟；每笔需15分钟，最晚${last}开始。`;
}
