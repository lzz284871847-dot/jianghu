import {tradeRouteBlocked} from './world-feedback.js?v=5.52.0';
import {marketPrice} from './commerce.js?v=5.52.0';
import {districtStatus} from './society.js?v=5.52.0';
import {practiceAward,growthPreview} from './practice-growth.js?v=5.52.0';
// Three ways to perform the existing boatman's promise, with no new saved lifecycle.
export const BOAT_METHODS={
 work:{name:'自备新木修货架',input:{wood:1},minutes:60,energy:10,chance:.7,xp:12},
 work_buy:{name:'按现价购木再修架',input:{},minutes:90,energy:12,chance:.7,xp:12},
 work_salvage:{name:'绳线整修旧木',input:{cord:1},minutes:90,energy:14,chance:.6,xp:16}
};
// Only new promises depend on present demand; accepted jobs and earned wages survive.
export const boatDemandBlocker=s=>tradeRouteBlocked(s)?'柳溪货队暂缓通行，贺船工先忙栈道，暂不追加货架整修；通行恢复后可再约。可帮忙修栈道，也可等乡邻自行收尾；已有约定和工钱保留。':null;
export function boatWorkPlan(s,action='work'){
 const d=BOAT_METHODS[action];if(!d)return null;
 const stock=s.commerce.stock.market.wood,price=action==='work_buy'?marketPrice(s,'market','buy','wood'):0;
 const trust=s.adventures.life.bonds.boatman.trust,rain=s.weather==='雨';
 const chance=Math.min(.95,d.chance+(trust>=4?.15:0)+Math.min(.1,s.skills.woodwork/2000)-(rain?.1:0));
 let materialBlocker=null;
 if(action==='work_buy'){
  if(districtStatus(s,'market').closed||s.minute<480||s.minute+30>1080)materialBlocker='县城木料铺未营业，不能代购；可自备材料。';
  else if(stock<1)materialBlocker='县城木料已售罄，不能代购；可自备新木或用绳线整修旧木。';
  else if(s.coins<price)materialBlocker='购木需自己先付'+price+'文，没有预支工钱。';
  else if(s.commerce.budget.market>1000000-price)materialBlocker='木料铺收款容量不足，暂不购料。';
 }else if(Object.entries(d.input).some(([k,n])=>s.bag[k]<n))materialBlocker=action==='work_salvage'?'需自己的绳线1份，旧木不另外产出。':'需自己的木料1份；可比较现价购料或整修旧木。';
 const input=action==='work_buy'?'自己付'+price+'文购木1份，实际扣县城货架（现存'+stock+'份），购来即用于本单':action==='work_salvage'?'自己的绳线1份，利用本单旧木，不赠木料':'自己的木料1份';
 const context=(stock<=3?'县城新木货源紧，现存'+stock+'份。':'')+(rain?'雨天木料受潮，成功率降低10个百分点。':'');
 const shortInput=action==='work_buy'?'自己付'+price+'文购木1份':action==='work_salvage'?'自己的绳线1份':'自己的木料1份';
 return {...d,action,price,stock,chance,materialBlocker,brief:shortInput+'；'+d.minutes+'分钟/精力'+d.energy+'；成功率'+Math.round(chance*100)+'%。工钱5文另领，失败耗投入。',successXP:practiceAward(s,d.energy,d.xp),failureXP:practiceAward(s,d.energy,4),
  preview:context+input+'；'+d.minutes+'分钟/精力'+d.energy+'，船工精力8；当前成功率'+Math.round(chance*100)+'%。失败耗全部投入，信任及关系-1；成功后另领实际5文，材料成本另计。'+growthPreview(s,'woodwork',d.energy,d.xp,4)};
}
