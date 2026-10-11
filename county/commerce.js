import {markets} from './content.js?v=0.4.0';
// Goods exist independently from the player. Fixed daily arrivals represent local producers.
export const MARKET_LIMIT=30;
export const initialMarket=()=>({market:{food:10,grain:16,wood:12,herb:8,rod:3,pick:3,trap:3},liuxi:{food:7,grain:12,wood:9,herb:7}});
export const makeCommerce=()=>({stock:Object.fromEntries(Object.entries(markets).map(([place,m])=>[place,Object.fromEntries([...new Set([...Object.keys(m.buy),...Object.keys(m.sell)])].map(key=>[key,initialMarket()[place][key]??0]))])),lastDay:1});
export function ensureCommerce(s){s.commerce??=makeCommerce();return s.commerce;}
export function commerceValid(s){
 const c=s.commerce;if(!c||typeof c!=='object'||Array.isArray(c)||!Number.isSafeInteger(c.lastDay)||c.lastDay<1||c.lastDay>s.day||!c.stock||typeof c.stock!=='object'||Array.isArray(c.stock))return false;
 return Object.entries(markets).every(([place,m])=>c.stock[place]&&typeof c.stock[place]==='object'&&!Array.isArray(c.stock[place])&&Object.keys(c.stock[place]).length===new Set([...Object.keys(m.buy),...Object.keys(m.sell)]).size&&Object.entries(c.stock[place]).every(([key,n])=>Object.hasOwn(m.buy,key)||Object.hasOwn(m.sell,key)?Number.isSafeInteger(n)&&n>=0&&n<=MARKET_LIMIT:false));
}
export function stockAt(s,place,key){return ensureCommerce(s).stock[place]?.[key]??0;}
export function transactionStock(s,type,key,n){
 const c=ensureCommerce(s),shelf=c.stock[s.place];
 if(type==='buy'&&shelf[key]<n)return '商铺存货不足，本笔不成交。';
 if(type==='sell'&&shelf[key]+n>MARKET_LIMIT)return '商铺收购容量已满，本笔不成交。';
 return null;
}
export function recordTrade(s,type,key,n){const shelf=ensureCommerce(s).stock[s.place];shelf[key]+=(type==='buy'?-n:n);}
export function dailyCommerce(s){
 const commerce=ensureCommerce(s),messages=[];
 for(let day=commerce.lastDay+1;day<=s.day;day++){
  for(const [place,m] of Object.entries(markets)){
   const shelf=commerce.stock[place],initial=initialMarket()[place];
   // Households purchase staples; caravans replenish basic shop goods every other day.
   for(const key of ['food','grain','herb'])if(Object.hasOwn(shelf,key))shelf[key]=Math.max(0,shelf[key]-(place==='market'?2:1));
   if(day%2===1)for(const [key,quantity] of Object.entries(initial))shelf[key]=Math.min(MARKET_LIMIT,shelf[key]+Math.max(1,Math.ceil(quantity/2)));
  }
  if(day%2===1)messages.push('县城和柳溪的商贩补充了一批日常货物；居民也会自行购买粮药。');
 }
 commerce.lastDay=s.day;
 return messages.slice(-2);
}
