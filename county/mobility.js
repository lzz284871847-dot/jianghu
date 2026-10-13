import {fieldBonus} from './field-skills.js?v=5.23.0';
import {places} from './content.js?v=5.23.0';
import {MARTIAL_ARTS} from './martial-data.js?v=5.23.0';
import {injuryEffects} from './injury.js?v=5.23.0';
export const BODY_ARTS=['footwork','cloud_step'];
export const makeMobility=()=>({art:null});
export function mobilityValid(s){const m=s.mobility;return !!m&&typeof m==='object'&&!Array.isArray(m)&&Object.keys(m).length===1&&(m.art===null||BODY_ARTS.includes(m.art)&&s.martial?.known[m.art]===true);}
export function bodyStats(s){const id=s.mobility?.art;if(!BODY_ARTS.includes(id)||!s.martial?.known[id])return null;const m=s.martial,points=['practice','insight','experience','mastery'].reduce((sum,k)=>sum+(m[k]?.[id]||0),0);return {id,name:MARTIAL_ARTS[id].name,points,tier:MARTIAL_ARTS[id].tier,stage:points>=720?'精熟':points>=240?'熟练':points>=120?'稳健':'初习'};}
const pairs=[
 ['county','village','run',30,10,8,8],['county','road','run',30,15,10,8],['village','foot','run',30,10,8,8],['road','liuxi','run',90,15,12,10],
 ['foot','hill','climb',120,20,14,12],['bamboo','hill','climb',240,20,16,15],['dock','ferry','climb',120,15,14,12],['hill','oldroad','climb',360,25,20,22]
];
export const MOBILITY_ROUTES=Object.fromEntries(pairs.flatMap(([from,to,kind,required,saving,energy,damage])=>[[from+':'+to,{kind,required,saving,energy,damage}],[to+':'+from,{kind,required,saving,energy,damage}]]));
export function mobilityPlan(s,to){const d=MOBILITY_ROUTES[s.place+':'+to],b=bodyStats(s);if(!d)return null;return {...d,saving:Math.min(d.saving,Math.max(0,places[to].minutes-15)),chance:Math.max(.15,Math.min(.92,(d.kind==='run'?.78:.65)+Math.min(.15,(b?.points||0)/2400)+(b?.tier===3?.08:0)+fieldBonus(s,'navigation')-(s.weather==='雨'?.15:0)-(s.energy-d.energy<20?.10:0)-injuryEffects(s).movementPenalty*.03))};}
const legBlock=s=>s.injuries?.fracture||s.injuries?.critical||s.injuries?.strain>=2;
export function mobilityBlocker(s,to,confirmed=false){
 if(s.dead)return '这段人生已经结束，轻功不能复活。';
 if(s.combat||s.adventures?.law?.pursuit||s.pending&&!(confirmed&&s.pending.type==='mobility'&&s.pending.to===to))return '先处理眼前选择、交手或捕快拦查。';
 const d=mobilityPlan(s,to),b=bodyStats(s);if(!d||!places[s.place].routes.includes(to))return '这条相邻道路没有轻功路线。';
 if(!b)return '先学会并独立选用基础步法或流云步。';
 if(s.adventures.companions.active)return '同行时按普通道路一起走，不独自运轻功离队。';
 if(s.hp<25||legBlock(s))return '需气血25，且无骨折、危重伤或二级以上拉伤。';
 if(b.points<d.required)return '需所选身法积累'+d.required+'点，目前'+b.points+'点。';
 if(s.energy<d.energy)return '运轻功需精力'+d.energy+'，普通步行仍不耗精力。';
 return null;
}
export function mobilityPreview(s,to){const d=mobilityPlan(s,to);return d?(d.kind==='run'?'运身赶路':'攀越险段')+'：精力'+d.energy+'，成功率'+Math.round(d.chance*100)+'%，成功少走'+d.saving+'分钟；失败留在原处，多耗15分钟、气血-'+d.damage+'，越障还会拉伤。雨天及事件延误仍计入；旧道遭遇不会被跳过。':'';}
export function bodyFleeBlocker(s){if(!s.combat||Object.hasOwn(s.combat,'hp')||s.combat.practice)return '身法撤退只用于真实战术交手，陪练可直接收手。';const b=bodyStats(s);if(!b||b.points<30)return '先选用已学身法，并积累30点。';if(s.dead||s.hp<25||legBlock(s))return '伤势不允许运身法撤退；仍可尝试普通撤离。';if(s.energy<12)return '身法撤退需精力12；仍可尝试普通撤离。';return null;}
export function bodyFleeBonus(s){const b=bodyStats(s);return b?Math.min(.18,.04+b.points/4000+(b.tier===3?.04:0)):0;}
export function gainBodyUse(s,challenging=false){const b=bodyStats(s);if(!b)return;const m=s.martial,id=b.id;m.practice[id]=Math.min(m.experience[id]<6?Math.max(120,m.practice[id]):2400,m.practice[id]+2);m.insight[id]=Math.min(2400,m.insight[id]+1);if(challenging)m.experience[id]=Math.min(2400,m.experience[id]+2);s.result?.push(b.name+'实际运用：熟练+2、领悟+1'+(challenging?'、身法运用经验+2':'')+'（封顶不再增加）。');}
export function mobilityOptions(s){const out=[];if(s.place==='school')out.push({id:'mobility:guide',label:'了解轻功与身法',preview:'人物页学习基础步法（8文），独立选用身法并练习；30点可赶路、120点可初步越障。可配合刀剑使用；精力不足或腿伤仍能普通步行。'});return out;}
