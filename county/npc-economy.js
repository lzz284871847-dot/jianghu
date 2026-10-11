import {marketPrice,stockAt,budgetAt} from './commerce.js?v=1.3.0';
import {MARKET_LIMIT} from './commerce.js?v=1.3.0';
import {districtStatus} from './society.js?v=1.3.0';
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

// Individual production enters the same shop inventory as player sales. Unaccepted goods
// remain in the producer's limited personal stock, never disappear for free.
export const PRODUCERS=Object.freeze({
 farmhand01:{market:'market',item:'vegetable',interval:3,effort:18},
 farmhand02:{market:'market',item:'vegetable',interval:3,effort:18},
 fisher:{market:'liuxi',item:'fish',interval:2,effort:20},
 hunter:{market:'liuxi',item:'meat',interval:3,effort:25},
 herbalist:{market:'market',item:'herb',interval:3,effort:16}
});
export const TRANSPORTERS=Object.freeze({dockhand01:'market',dockhand02:'liuxi',carter:'market',laborer:'market'});
export function npcProduce(s,p,day){
 const job=PRODUCERS[p.id];if(!job||day%job.interval!==0||p.energy<job.effort||p.hunger>=80||p.cargo>=5)return false;
 p.energy-=job.effort;
 // Deterministic risk based on the game seed and day, without extra RNG side effects.
 const succeeds=(day+p.id.length)%5!==0 && !(s.weather==='雨'&&job.item==='meat');
 if(!succeeds){remember(p,'第'+day+'日外出劳作，没有收获。');return false;}
 p.cargo++;remember(p,'第'+day+'日采获'+job.item+'，等待集市收购。');return true;
}
export function npcSellProduce(s,p,day){
 const job=PRODUCERS[p.id];if(!job||p.cargo<=0)return false;
 const shop=job.market,price=marketPrice(s,shop,'sell',job.item);
 if(districtStatus(s,shop).closed||price===null||stockAt(s,shop,job.item)>=MARKET_LIMIT||budgetAt(s,shop)<price)return false;
 p.cargo--;s.commerce.stock[shop][job.item]++;s.commerce.budget[shop]-=price;p.coins+=price;p.workDays++;
 remember(p,'第'+day+'日在集市售出'+job.item+'，得到'+price+'文。');return true;
}
export function npcTransport(s,p,day){
 const shop=TRANSPORTERS[p.id];
 if(!shop||p.energy<22||p.hunger>=80||districtStatus(s,shop).closed||budgetAt(s,shop)<30)return false;
 // Merchant pays documented carriage charges; no cargo is conjured into existence.
 const pay=3;s.commerce.budget[shop]-=pay;p.coins+=pay;p.energy-=22;p.workDays++;
 if(p.workDays===1||p.workDays%10===0)remember(p,'第'+day+'日替商户搬运现有货物，领到'+pay+'文运费。');
 return true;
}
export function npcFindWork(s,p,day){
 if(p.coins>12||p.hunger<40||p.energy<22||p.workDays>0)return false;
 // Last-resort carrier work is funded by an actual solvent merchant; no guaranteed handouts.
 return npcTransport(s,p,day);
}
