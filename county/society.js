// 乡里生计由市场真实库存与现金推动，按日更新并写入存档。
export const DISTRICTS=['market','liuxi'];
export const makeSociety=()=>({districts:Object.fromEntries(DISTRICTS.map(k=>[k,{hardship:0,cashStress:0,closedUntil:0}]))});
export function societyValid(s){
 const x=s.society;if(!x||typeof x!=='object'||Array.isArray(x)||!x.districts||typeof x.districts!=='object'||Array.isArray(x.districts)||Object.keys(x.districts).length!==2)return false;
 return DISTRICTS.every(k=>{const d=x.districts[k];return d&&typeof d==='object'&&!Array.isArray(d)&&['hardship','cashStress','closedUntil'].every(v=>Number.isSafeInteger(d[v])&&d[v]>=0&&d[v]<=100000)&&d.hardship<=30&&d.cashStress<=30&&d.closedUntil<=s.day+2;});
}
export function districtStatus(s,place){const key=place==='liuxi'?'liuxi':'market';const d=s.society?.districts?.[key];return {district:key,hardship:d?.hardship||0,closed:!!d&&d.closedUntil>=s.day};}
export function societyDay(s,day){
 const news=[];
 for(const place of DISTRICTS){
  const state=s.society.districts[place],stock=s.commerce.stock[place],cash=s.commerce.budget[place],label=place==='market'?'县城街市':'柳溪集';
  const previousHardship=state.hardship;const wasClosed=state.closedUntil===day-1;
  state.hardship=stock.grain<=2?Math.min(30,state.hardship+1):Math.max(0,state.hardship-1);
  state.cashStress=cash<30?Math.min(30,state.cashStress+1):0;
  if(previousHardship<2&&state.hardship>=2)news.push(label+'粮食连续紧缺，部分居民减少非必需开销，并四处询问短工。');
  if(previousHardship>=2&&state.hardship<2)news.push(label+'粮食供应改善，居民恢复日常采买。');
  if(state.cashStress===2&&state.closedUntil<day){
   state.closedUntil=day+1;news.push(label+'商户连日资金周转不灵，暂停营业至第'+(day+2)+'日，其他地方仍可交易。');
  }
  if(wasClosed&&cash>=30)news.push(label+'商户筹到周转资金，恢复营业。');
 }
 return news;
}
