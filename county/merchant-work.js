import {MARKET_LIMIT} from './commerce.js?v=5.71.0';
import {MAX} from './progression.js?v=5.71.0';
// Alternative execution of the existing promise. No second contract or saved quote.
export const MERCHANT_METHODS={
 work:{name:'照常整货',minutes:60,energy:10,chance:.7,trustBonus:.15},
 work_careful:{name:'细拣缓装',minutes:90,energy:14,chance:.85,trustBonus:.05}
};
export function merchantWorkPlan(s,action='work'){
 const d=MERCHANT_METHODS[action];if(!d)return null;
 const trust=s.adventures.life.bonds.merchant.trust,skilled=s.skills.trade>=6;
 const chance=Math.min(.95,d.chance+(trust>=4?d.trustBonus:0)+(skilled?.05:0));
 const materialBlocker=s.bag.vegetable<1?'缺自己的蔬菜1份；可先采集、种植或购买。':s.commerce.stock.market.vegetable>=MARKET_LIMIT?'当地菜货容量已满，约定保留。':null;
 const remaining=Math.max(0,MAX-s.skills.trade);
 return {...d,chance,materialBlocker,
  brief:d.name+'：'+d.minutes+'分钟 · 精力'+d.energy+' · 成功率'+Math.round(chance*100)+'%。',
  preview:'自己的蔬菜1份；'+d.minutes+'分钟/精力'+d.energy+'，掌柜精力8。当前成功率'+Math.round(chance*100)+'%；经商6点起提高5个百分点'+(skilled?'（已生效）':'（尚未达到）')+'，合作信任4也会提高把握。成功才入库1份，另领原定4文；失败耗菜但不入库、不付工钱，关系及信任-1，本单不重试。经商经验：成功+'+Math.min(2,remaining)+' / 失败+'+Math.min(1,remaining)+'。'};
}
