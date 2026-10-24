import {tradeRouteBlocked} from './world-feedback.js?v=5.73.0';
import {countyEventSurcharge} from './county-life.js?v=5.73.0';
import {societyDay} from './society.js?v=5.73.0';
import {farmDelivery} from './agriculture.js?v=5.73.0';
import {markets} from './content.js?v=5.73.0';
// Goods exist independently from the player. Fixed daily arrivals represent local producers.
export const MARKET_LIMIT=30;
export const MARKET_SURPLUS=24;
export const INITIAL_BUDGET=Object.freeze({market:160,liuxi:110});
export const initialMarket=()=>({market:{paper:8,ink:6,bamboo_flute:2,food:10,grain:16,wood:12,herb:8,rod:3,pick:3,trap:3,cloth:8,hide:4,leather:3,fine_cloth:2,cord:4},liuxi:{food:7,grain:12,wood:9,herb:7,cloth:6,hide:3,leather:2,fine_cloth:1,cord:3}});
export const makeCommerce=()=>({stock:Object.fromEntries(Object.entries(markets).map(([place,m])=>[place,Object.fromEntries([...new Set([...Object.keys(m.buy),...Object.keys(m.sell)])].map(key=>[key,initialMarket()[place][key]??0]))])),budget:{...INITIAL_BUDGET},lastDay:1});
export function ensureCommerce(s){s.commerce??=makeCommerce();return s.commerce;}
export function commerceValid(s){
 const c=s.commerce;if(!c||typeof c!=='object'||Array.isArray(c)||!Number.isSafeInteger(c.lastDay)||c.lastDay<1||c.lastDay>s.day||!c.stock||typeof c.stock!=='object'||Array.isArray(c.stock))return false;
 return c.budget&&typeof c.budget==='object'&&!Array.isArray(c.budget)&&Object.keys(c.budget).length===Object.keys(markets).length&&Object.entries(c.budget).every(([k,n])=>Object.hasOwn(markets,k)&&Number.isSafeInteger(n)&&n>=0&&n<=1000000)&&Object.entries(markets).every(([place,m])=>c.stock[place]&&typeof c.stock[place]==='object'&&!Array.isArray(c.stock[place])&&Object.keys(c.stock[place]).length===new Set([...Object.keys(m.buy),...Object.keys(m.sell)]).size&&Object.entries(c.stock[place]).every(([key,n])=>Object.hasOwn(m.buy,key)||Object.hasOwn(m.sell,key)?Number.isSafeInteger(n)&&n>=0&&n<=MARKET_LIMIT:false));
}
export function budgetAt(s,place){return ensureCommerce(s).budget[place]??0;}
export function stockAt(s,place,key){return ensureCommerce(s).stock[place]?.[key]??0;}
// Only staple goods get stock-sensitive prices in this first market cycle.
// Prices are recalculated before a transaction, preventing stale UI quotes.
const PRICE_GOODS=new Set(['food','grain','herb','wood','vegetable']);
export function marketPrice(s,place,type,key){
 const base=markets[place]?.[type]?.[key],surcharge=type==='buy'?countyEventSurcharge(s,place,key):0;
 if(base===undefined)return null;
 if(!PRICE_GOODS.has(key))return base;
 const quantity=stockAt(s,place,key);
 if(type==='buy'){
  if(quantity<=3)return Math.max(1,Math.ceil(base*1.5))+surcharge;
  if(quantity>=MARKET_SURPLUS)return Math.max(1,Math.floor(base*.85))+surcharge;
  return base+surcharge;
 }
 if(place==='liuxi'&&tradeRouteBlocked(s)&&quantity<=3&&['grain','herb','wood'].includes(key))return (quantity<=2?Math.ceil(base*1.15):base)+1;
 if(quantity>=MARKET_SURPLUS)return Math.max(1,Math.floor(base*.7));
 if(quantity<=2)return Math.max(1,Math.ceil(base*1.15));
 return base;
}
export function transactionStock(s,type,key,n,price=0){
 const c=ensureCommerce(s),shelf=c.stock[s.place];
 if(type==='buy'&&shelf[key]<n)return '商铺存货不足，本笔不成交。';
 if(type==='sell'&&shelf[key]+n>MARKET_LIMIT)return '商铺收购容量已满，本笔不成交。';
 if(type==='sell'&&c.budget[s.place]<price*n)return '商铺今日收购资金不足，整笔不成交。';
 return null;
}
export function recordTrade(s,type,key,n,price=0){const c=ensureCommerce(s),shelf=c.stock[s.place];shelf[key]+=(type==='buy'?-n:n);c.budget[s.place]+=(type==='buy'?1:-1)*price*n;}
export function dailyCommerce(s){
 const commerce=ensureCommerce(s),messages=[];
 for(let day=commerce.lastDay+1;day<=s.day;day++){
  const arrived=[],delayed=[];
  for(const [place,m] of Object.entries(markets)){
   const shelf=commerce.stock[place],initial=initialMarket()[place];
   // Households purchase staples; caravans replenish basic shop goods every other day.
   for(const key of ['food','grain','herb'])if(Object.hasOwn(shelf,key))shelf[key]=Math.max(0,shelf[key]-(place==='market'?2:1));
   // Residents independently buy fish, meat, vegetables and building inputs brought in by traders.
   // Proceeds return to the shop's purse. The stock is consumed rather than accumulating indefinitely.
   const localDemand={market:{vegetable:3,fish:2,meat:1,wood:1,iron:1,aromatic_herb:1,mountain_root:1,cliff_bloom:1,stop_powder:1,wound_salve:1,inner_decoction:1,rescue_pill:1,vegetable_congee:1,fish_rice:1,jerky:1,herbal_meal:1},liuxi:{vegetable:2,fish:2,meat:1,wood:1,iron:1,aromatic_herb:1,mountain_root:1,cliff_bloom:1,stop_powder:1,wound_salve:1,inner_decoction:1,rescue_pill:1,vegetable_congee:1,fish_rice:1,jerky:1,herbal_meal:1}}[place];
   for(const [key,wanted] of Object.entries(localDemand))if(Object.hasOwn(shelf,key)){
    const sold=Math.min(wanted,shelf[key]);shelf[key]-=sold;
    commerce.budget[place]=Math.min(1000000,commerce.budget[place]+sold*(m.sell[key]||1));
   }
   // Only acquired stock above the baseline is cleared, so new shelf goods do not grant extra opening cash.
   for(const key of ['cloth','hide','leather','fine_cloth','hardwood','cord','paper','ink','bamboo_flute','calligraphy_sheet']){if(!Object.hasOwn(shelf,key))continue;const sold=Math.min(1,Math.max(0,(shelf[key]||0)-(initial[key]||0)));shelf[key]-=sold;commerce.budget[place]=Math.min(1000000,commerce.budget[place]+sold*(m.sell[key]||1));}
   if(day%2===1){
    if(place==='liuxi'&&tradeRouteBlocked(s,day)){delayed.push(place);continue;}
    for(const [key,quantity] of Object.entries(initial))shelf[key]=Math.min(MARKET_LIMIT,shelf[key]+Math.max(1,Math.ceil(quantity/2)));
    arrived.push(place);
    // Independent itinerant peddlers exchange goods and cash, not infinite merchant money.
    commerce.budget[place]=Math.min(1000000,commerce.budget[place]+(place==='market'?24:18));
   }
  }
  const deliveryNews=farmDelivery(s,day,s.weather,MARKET_LIMIT);
  if(day%2===1)deliveryNews.push([arrived.length?arrived.map(p=>p==='liuxi'?'柳溪':'县城').join('和')+'商贩补充了一批实际到货；居民照常购买粮药。':'',delayed.length?'旧渡口栈道受阻，柳溪原定补货延迟；县城货队不受此路段影响，未参与时乡邻也会自行收尾。':''].filter(Boolean).join(' '));
  if(deliveryNews.length)messages.push(deliveryNews.join(' '));
  messages.push(...societyDay(s,day));
 }
 commerce.lastDay=s.day;
 return messages.slice(-2);
}

