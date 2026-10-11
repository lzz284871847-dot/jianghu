// Nearby farms are autonomous local producers; no player interaction is required.
export const HARVEST_CYCLE=3;
export const harvestFor=(day,weather)=>{
 if(!Number.isInteger(day)||day<1||day%HARVEST_CYCLE!==0)return null;
 const season=Math.floor((day-1)/30)%4;
 const factor=weather==='雨'?.5:1;
 const summer=season===1?2:season===3?-1:0;
 const amount=(base)=>Math.max(1,Math.floor((base+summer)*factor));
 return {market:{grain:amount(6),vegetable:amount(4)},liuxi:{grain:amount(4),vegetable:amount(3)}};
};
export function farmDelivery(s,day,weather,max=30){
 const deliveries=harvestFor(day,weather);
 if(!deliveries)return [];
 const messages=[];
 for(const [place,goods] of Object.entries(deliveries)){
  const shelf=s.commerce.stock[place];
  for(const [key,n] of Object.entries(goods)){
   const room=Math.max(0,max-(shelf[key]??0));
   const delivered=Math.min(room,n);
   if(delivered>0){shelf[key]+=delivered;messages.push((place==='market'?'县城街市':'柳溪集')+'收到农户送来的'+(key==='grain'?'粮食':'蔬菜')+'×'+delivered+'。');}
  }
 }
 return messages;
}
