import {marketPrice,stockAt,budgetAt} from './commerce.js?v=1.2.0';
import {districtStatus} from './society.js?v=1.2.0';
// Positions are permanent shop jobs, NOT the player's separately posted casual day-work slots.
export const POSITIONS=Object.freeze({
 shopassistant:{market:'market',pay:4},
 smithapprentice:{market:'market',pay:4},
 stallholder:{market:'liuxi',pay:4}
});
const remember=(p,text)=>{p.history=[text,...p.history].slice(0,8);};
export function npcWork(s,p,day){
 const pos=POSITIONS[p.id];if(!pos||p.energy<20||p.hunger>=80)return false;
 const shop=pos.market;
 if(districtStatus(s,shop).closed||budgetAt(s,shop)<pos.pay+25)return false;
 // An employer spends its own cash, so no money is created by this action.
 s.commerce.budget[shop]-=pos.pay;p.coins+=pos.pay;
 p.workDays++;p.energy=Math.max(0,p.energy-15);
 if(p.workDays===1||p.workDays%10===0)remember(p,'第'+day+'日在'+(shop==='market'?'县城':'柳溪')+'商铺做工，领到'+pos.pay+'文。');
 return true;
}
export function npcBuyFood(s,p,day){
 const shop=p.home==='liuxi'?'liuxi':'market';
 if(districtStatus(s,shop).closed)return false;
 // The same shop stock and player purchase quote are used for NPCs.
 const key='grain',price=marketPrice(s,shop,'buy',key);
 if(price===null||stockAt(s,shop,key)<1||p.coins<price||p.food>0)return false;
 s.commerce.stock[shop][key]--;s.commerce.budget[shop]+=price;
 p.coins-=price;p.food++;remember(p,'第'+day+'日在'+(shop==='market'?'县城街市':'柳溪集')+'买粮1份，支出'+price+'文。');
 return true;
}
