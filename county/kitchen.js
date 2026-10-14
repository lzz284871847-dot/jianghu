import {items} from './content.js?v=5.34.0';
export const MEALS={
 vegetable_congee:{name:'菜粥',required:0,input:{vegetable:1,grain:1,wood:1},quantity:1,minutes:45,energy:8,chance:.85,restoreEnergy:22,hp:6},
 fish_rice:{name:'鱼饭',required:6,input:{fish:1,grain:1,wood:1},quantity:1,minutes:60,energy:10,chance:.80,restoreEnergy:32,hp:10},
 jerky:{name:'肉干',required:12,input:{meat:1,wood:2},quantity:2,minutes:90,energy:12,chance:.80,restoreEnergy:18,hp:4},
 herbal_meal:{name:'养身药膳',required:24,herb:10,input:{grain:2,vegetable:1,herb:1,wood:2},quantity:1,minutes:90,energy:14,chance:.75,restoreEnergy:24,hp:18}
};
export const MEAL_ITEMS=Object.keys(MEALS);
export const makeKitchen=()=>({nextMeal:0});
const now=s=>(s.day-1)*1440+s.minute;
export function kitchenValid(s){const k=s.kitchen;return !!k&&typeof k==='object'&&!Array.isArray(k)&&Object.keys(k).length===1&&Number.isSafeInteger(k.nextMeal)&&k.nextMeal>=0&&k.nextMeal<=now(s)+120;}
export const mealChance=(s,key)=>Math.min(.95,MEALS[key].chance+Math.min(.10,s.skills.cook*.002))*(s.energy-MEALS[key].energy<20?.75:1);
export function mealDescription(key){const d=MEALS[key];return '精力最多+'+d.restoreEnergy+'、气血最多+'+d.hp+'；15分钟，进阶饭食共用两小时间隔，不治疗伤势或止血。';}
export function kitchenBlocker(s,key,kind){const d=MEALS[key];if(!d||!['cook','eat'].includes(kind))return '没有这项烹饪或进食行动。';if(s.dead||s.pending||s.combat||s.adventures.law.pursuit)return '先处理眼前选择或交手；死亡后不能进食。';if(kind==='eat'){if(!s.bag[key])return '没有这种饭食。';if(now(s)<s.kitchen.nextMeal)return '进阶饭食需间隔两小时，还需'+(s.kitchen.nextMeal-now(s))+'分钟。';if(s.hp===100&&s.energy===100)return '身体无需恢复，不消耗饭食。';return null;}
 if(s.place!=='workshop'||s.minute<420||s.minute+d.minutes>1080)return '作坊公用灶07:00–18:00，需留足'+d.minutes+'分钟。';if(s.hp<25||s.energy<d.energy)return '需气血25、精力'+d.energy+'，先休息。';if(s.skills.cook<d.required||s.skills.herb<(d.herb||0))return '需烹饪经验'+d.required+(d.herb?'、采药经验'+d.herb:'')+'。';if(s.bag[key]>1000000-d.quantity)return '饭食库存已满，不消耗材料。';for(const [k,n] of Object.entries(d.input))if(s.bag[k]<n)return items[k]+'不足，未消耗材料。';return null;
}
export function kitchenAction(s,id,{settle,rng}){const parts=String(id).split(':');if(parts.length!==3){s.result=['没有这项烹饪行动。'];return false;}const [,kind,key]=parts,why=kitchenBlocker(s,key,kind);if(why){s.result=[why];return false;}const d=MEALS[key];if(kind==='eat')return settle(s,'吃'+d.name,15,0,()=>{s.bag[key]--;s.hp=Math.min(100,s.hp+d.hp);s.energy=Math.min(100,s.energy+d.restoreEnergy);s.kitchen.nextMeal=now(s)+120;s.result.push(mealDescription(key),'失血与重伤仍须用药或就医。');});const success=rng()<mealChance(s,key);return settle(s,'烹饪 · '+d.name,d.minutes,d.energy,()=>{for(const [k,n] of Object.entries(d.input))s.bag[k]-=n;if(success){s.bag[key]+=d.quantity;s.result.push('做成'+d.name+'×'+d.quantity+'，没有自动吃掉。');}else s.result.push('火候失误，饭食做坏；材料、时间与精力已付出，没有成品。');},{cook:success?3:1});}
export function kitchenOptions(s){if(s.place!=='workshop')return [];return Object.entries(MEALS).map(([key,d])=>({id:'kitchen:cook:'+key,label:'烹饪 · '+d.name,preview:'需烹饪'+d.required+(d.herb?'、采药'+d.herb:'')+'；'+Object.entries(d.input).map(([k,n])=>items[k]+'×'+n).join('、')+' → '+d.name+'×'+d.quantity+'；'+d.minutes+'分钟 / 精力'+d.energy+'，当前成功率'+Math.round(mealChance(s,key)*100)+'%。'+mealDescription(key),blocker:kitchenBlocker(s,key,'cook')}));}
