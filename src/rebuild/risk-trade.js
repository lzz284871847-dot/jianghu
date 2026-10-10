import {marketBlocker} from './market.js?v=1.0.57';
export const tradeScenarios={surge:{name:'茶货紧缺',price:22,capacity:6},steady:{name:'货价平稳',price:14,capacity:3},glut:{name:'外地茶货到集，买家压价',price:5,capacity:6}};
export const tradeOffer='茶货每包10文，可买1、3或6包，每日最多进一批。柳溪集本日可能缺货（20%，22文/包，最多6包）、平稳（50%，14文/包，最多3包）或货多（30%，5文/包，最多6包）。路途不耗精力；买卖各15分钟/精力1。行情在进货时确定并保存，不因读档重抽；每过一日柳溪报价减2文，最低2文。镇上随时按6文/包回收止损；河湾村最多收本批1包，货多时12文、否则8文。均须营业时成交，没有保本承诺。';
export function scenarioFor(roll){return roll<.2?'surge':roll<.7?'steady':'glut';}
export function tradeQuote(s){
 const t=s.tradeRun;if(!t||!t.remaining)return null;
 if(s.place==='town')return {price:6,capacity:t.remaining,name:'镇上回收商'};
 if(s.place==='village')return {price:t.kind==='glut'?12:8,capacity:1-t.soldAlt,name:'村中茶摊'};
 if(s.place==='liuxi'){const def=tradeScenarios[t.kind];return {price:Math.max(2,def.price-(s.day-t.day)*2),capacity:Math.max(0,def.capacity-t.soldMain),name:'柳溪茶商'};}
 return null;
}
export function tradeBlocker(s,type,quantity){
 if(type==='buy'){
  if(s.place!=='town')return '请在青石镇进茶货。';
  if(![1,3,6].includes(quantity))return '本批只可进1、3或6包。';
  if(s.tradeRun?.remaining)return '手里的茶货还没售完，不叠加新批次。';
  if(s.tradeDay===s.day)return '今日已经进过茶货，不能反复重抽行情。';
  if(s.coins<quantity*10)return '本金不足，整笔未成交。';
 }else{
  const q=tradeQuote(s);if(!q)return '这里没有收购本批茶货的商人。';
  if(!Number.isInteger(quantity)||quantity<1||quantity>s.tradeRun.remaining)return '出售数量不正确，整笔未成交。';
  if(quantity>q.capacity)return '买家只剩'+q.capacity+'包收购额度，余货需另找买家或回镇止损。';
 }
 if(s.place==='village'){if(s.minute<480||s.minute+15>1080)return '村中茶摊08:00–18:00收货，本笔需15分钟。';}
 else {const closed=marketBlocker(s);if(closed)return closed;}
 if(s.energy<1)return '精力不足，请先歇息。';
 return null;
}
export function tradeStatus(s){
 const t=s.tradeRun;if(!t)return '尚未尝试茶货贸易，可自由忽略。';
 const net=t.revenue-t.qty*10;
 if(!t.remaining)return '本批已结束：本金'+t.qty*10+'文，收回'+t.revenue+'文，'+(net>=0?'盈利':'亏损')+Math.abs(net)+'文。';
 return '本批茶货：'+t.remaining+'/'+t.qty+'包；本金'+t.qty*10+'文，已收回'+t.revenue+'文。'+(t.heard?'已知行情：'+tradeScenarios[t.kind].name+'。':'柳溪行情尚未核实，可先小批试水。')+'余货不会自动卖出，收购额度与每天报价变化都要考虑。';
}
export function tradeNews(s){const t=s.tradeRun;return t&&t.remaining?tradeScenarios[t.kind].name+'；今日柳溪报价'+Math.max(2,tradeScenarios[t.kind].price-(s.day-t.day)*2)+'文/包，剩余额度'+Math.max(0,tradeScenarios[t.kind].capacity-t.soldMain)+'包。回镇6文止损；村里最多收本批1包。':'本批已经结束。';}
export function validTrade(s){
 const t=s.tradeRun,int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 if(!int(s.tradeDay,0,s.day))return false;
 if(!t)return s.bag.tea===0&&s.pending?.type!=='trade';
 if(!Object.hasOwn(tradeScenarios,t.kind)||!int(t.day,1,s.day)||s.tradeDay!==t.day||![1,3,6].includes(t.qty)||!int(t.remaining,0,t.qty)||s.bag.tea!==t.remaining||!int(t.soldAlt,0,1)||!int(t.soldMain,0,tradeScenarios[t.kind].capacity)||t.soldAlt+t.soldMain>t.qty-t.remaining||!int(t.revenue,0,t.qty*22)||typeof t.heard!=='boolean')return false;
 return s.pending?.type!=='trade'||t.remaining>0&&t.heard&&s.place==='bamboo';
}
