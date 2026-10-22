import {items} from './content.js?v=5.66.0';
import {addInjury} from './injury.js?v=5.66.0';
// A single short expedition on the existing ferry map; its only recipe uses ordinary cord.
export const makeWreck=()=>({status:'new',stage:0,route:null,branch:null,found:false});
export const wreckRecipeKnown=s=>s.wreck?.status==='done'&&s.wreck.branch==='stern'&&s.wreck.found;
const active=s=>s.wreck?.status==='active';
const cargo={cloth:1,cord:2};
const labels={enter:'查看河岸废船',brace:'凭木工加固跳板',board:'踩旧跳板登船',cargo:'搜寻货舱旧物',stern:'查看船尾绳具',exit:'带着所得返回河岸',withdraw:'放弃继续，退回河岸'};
const descriptions=['','芦苇边搁着一艘弃用的浅底船，船身尚稳，跳板却已朽。可以自己加固，也可以踩旧板过去；不登船也能退回。','舱口拖着破包，船尾留着绕绳架。货舱可能有普通布绳；船尾的匣中夹着船工合股绳图。船内腐板不宜久留，只查看一处，然后返回。','船身又轻轻一晃，该沿来路回岸了。只有真正带回岸上的东西才归入背包，图样也要带出后才能用于制作。'];
export function wreckPlan(s,key){return ({enter:{stage:0,minutes:15,energy:0},brace:{stage:1,minutes:45,energy:8,input:{wood:1,cord:1},skill:'woodwork'},board:{stage:1,minutes:15,energy:6,risk:.25,damage:8,skill:'navigation'},cargo:{stage:2,minutes:60,energy:10,chance:.8,risk:.1,damage:6,skill:'awareness'},stern:{stage:2,minutes:45,energy:8,risk:.15,damage:8,skill:'tailor'},exit:{stage:3,minutes:30,energy:0},withdraw:{stage:s.wreck.stage,minutes:30,energy:0}})[key]??null;}
export function wreckBlocker(s,key){
 const r=s.wreck,p=wreckPlan(s,key);
 if(!p)return '没有这项废船行动。';
 if(s.dead||s.pending||s.combat||s.adventures.law.pursuit)return '先处理眼前选择或交手；永久死亡后不能探索。';
 if([s.fort,s.raid,s.dungeon].some(x=>x.status==='active'))return '先结束当前副本，再来河岸废船。';
 if(s.place!=='ferry')return '需到旧渡口河岸，不能隔地探索废船。';
 if(key==='enter')return r.status!=='new'||s.hp<25||s.energy<8||s.adventures.companions.active!==null||s.dungeon.guide==='joined'||s.raid.guide==='joined'?'废船仅探一次，需气血25、精力8；先结束同行，本次独自登船。':null;
 if(!active(s)||r.stage!==p.stage)return '请按废船当前一段选择；已结束不重开，已选支路不能更换。';
 if(key==='brace'&&s.skills.woodwork<12)return '加固跳板需木工累计12，以及自己的木料1、绳线1；可走旧跳板或返回。';
 if(!['exit','withdraw'].includes(key)&&s.hp<25)return '气血不足25，仍可零精力退回河岸。';
 if(s.energy<p.energy)return '精力不足'+p.energy+'，仍可零精力退回河岸。';
 if(Object.entries(p.input||{}).some(([k,n])=>s.bag[k]<n))return '需自己的'+Object.entries(p.input).map(([k,n])=>items[k]+'×'+n).join('、')+'；未消耗材料。';
 if(key==='exit'&&r.branch==='cargo'&&r.found&&Object.entries(cargo).some(([k,n])=>s.bag[k]>1000000-n))return '背包布绳容量不足，收获留在本次记录中，不部分转移或重复发放。';
 return null;
}
export function wreckAction(s,id,{settle,rng}){
 const parts=String(id).split(':'),key=parts[1],why=parts.length!==2?'没有这项废船行动。':wreckBlocker(s,key);
 if(why){s.result=[why];return false;}const p=wreckPlan(s,key),r=s.wreck;
 return settle(s,'河岸废船 · '+labels[key],p.minutes,p.energy,()=>{
  for(const [k,n] of Object.entries(p.input||{}))s.bag[k]-=n;
  if(key==='enter'){r.status='active';r.stage=1;s.result.push(descriptions[1]);}
  else if(['brace','board'].includes(key)){r.route=key;r.stage=2;s.result.push(key==='brace'?'用自己的木料和绳线撑住跳板，稳妥登船；材料留在跳板上，不再收回。':'你踏着朽板挪上船，失足可能擦伤；已登船，不重选走法。',descriptions[2]);}
  else if(['cargo','stern'].includes(key)){r.branch=key;r.found=key==='stern'||rng()<p.chance;r.stage=3;s.result.push(key==='stern'?'船尾匣里留着普通船工的合股绳图：一份粗布可编出绳线三份，较原法费工；没有额外成品，带回岸上后才能在作坊制作。':r.found?'货舱找到粗布1、绳线2，已留存，回岸再放入背包；船尾这次不再查看。':'舱里的布绳已经霉烂，没有合用材料；搜寻机会已用完，不改搜船尾。');}
  else if(key==='exit'){if(r.branch==='cargo'&&r.found)for(const [k,n] of Object.entries(cargo))s.bag[k]+=n;r.status='done';s.result.push(r.branch==='stern'?'你将合股绳图带回岸边。可在作坊亲手编制，仍需裁缝12、自己的粗布、台位费与工时；不额外赠送成品。':r.found?'粗布1、绳线2实际放入背包。':'空手返回河岸，废船不再搜寻。');}
  else if(key==='withdraw'){r.status='left';s.result.push(r.stage===3?'你放下这次收获，空手退回河岸；图样和材料不会补发，废船不重开。':'你回到旧渡口河岸，放弃本次废船余下探索；没有收获，不影响正常钓鱼与过路。');}
  if(p.risk&&rng()<p.risk){s.hp=Math.max(0,s.hp-p.damage);addInjury(s,'bruise');s.result.push('船板失足，气血 -'+p.damage+'，新增瘀伤；投入保留。');if(!s.hp){s.dead=true;r.status='died';s.result.push('你在废船伤重身亡，未带出的图样与材料不发放，不能自动复活。');}}
 },p.skill?{[p.skill]:2}:{});
}
export function wreckSummary(s){const r=s.wreck;return r.status==='new'?null:'河岸废船 · '+({active:'第'+r.stage+'/3段 · '+['','登船','船舱与船尾','返回河岸'][r.stage],done:'已返回',left:'已放弃',died:'身亡'}[r.status])+'；'+(r.branch==='stern'?(wreckRecipeKnown(s)?'合股绳图已带出，作坊可用':'合股绳图未带出'):r.branch==='cargo'?(r.found?(r.status==='done'?'粗布1、绳线2已带出':r.status==='left'?'布绳已留在船中':'布绳尚未带出'):'货舱无合用材料'):'尚未搜寻船内')+'；一次探索，不刷新。';}
export function wreckScene(s){const r=s.wreck;if(s.place!=='ferry')return null;return {title:r.status==='active'?'河岸废船 · 第'+r.stage+'/3段':'芦苇边的废船',text:r.status==='new'?'沿岸浅滩搁着一艘无人使用的旧船。可查看跳板与舱口；这不是过河的船，不收船费，也不通往新地图。':active(s)?descriptions[r.stage]+' '+wreckSummary(s):wreckSummary(s)};}
export function wreckOptions(s){if(s.place!=='ferry'||s.dead)return [];const r=s.wreck,keys=r.status==='new'?['enter']:active(s)?r.stage===1?['brace','board','withdraw']:r.stage===2?['cargo','stern','withdraw']:['exit','withdraw']:[];
 return keys.map(key=>{const p=wreckPlan(s,key);return {id:'wreck:'+key,label:labels[key],blocker:wreckBlocker(s,key),preview:p.minutes+'分钟/精力'+p.energy+'；'+(p.input?'自己的'+Object.entries(p.input).map(([k,n])=>items[k]+'×'+n).join('、')+'；':'')+(p.risk?Math.round(p.risk*100)+'%失足损失'+p.damage+'气血并瘀伤。':'本步骤无直接伤害。')+(key==='enter'?'三段短探索；气血25、精力8。加固跳板需木工12、木料1绳线1，也可冒险踩旧板。船内只选货舱布绳或船尾合股绳图；带出后才取得，不必习武、没有强制交手。':key==='brace'?'需木工累计12，登船不用掷成功率；耗去材料与工时。':key==='board'?'无需木工或材料，较快，但失足伤势保留。':key==='cargo'?'80%找到粗布1、绳线2；失败也用完本次搜寻。与船尾二选一，不刷新。':key==='stern'?'确定找到船工合股绳图；带出解锁裁缝12的省料制绳法：粗布1→绳线3，60分钟/精力8、台位费1文，仍可能做坏。与货舱二选一。':key==='exit'?'按原路返回旧渡口，实际取得本次留存成果；不回血、不自动使用，未选支路不再搜寻。':r.stage===3?'放下本次留存图样或布绳，空手退回；这些收获不再补发。':'放弃余下探索，回到旧渡口；不回血或发钱。')};});
}
export function wreckValid(s){const r=s.wreck,e=makeWreck();if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==5||Object.keys(e).some(k=>!Object.hasOwn(r,k))||!['new','active','done','left','died'].includes(r.status)||!Number.isSafeInteger(r.stage)||r.stage<0||r.stage>3||![null,'brace','board'].includes(r.route)||![null,'cargo','stern'].includes(r.branch)||typeof r.found!=='boolean')return false;
 if(r.status==='new')return Object.entries(e).every(([k,v])=>r[k]===v);
 if(!r.stage||r.stage===1&&r.route!==null||r.stage>=2&&r.route===null||r.stage<3&&(r.branch!==null||r.found)||r.stage===3&&r.branch===null||r.branch==='stern'&&!r.found||r.status==='done'&&r.stage!==3||r.status==='died'&&!s.dead)return false;
 if(active(s)&&(s.place!=='ferry'||s.dead||s.pending||s.combat||[s.fort,s.raid,s.dungeon].some(x=>x.status==='active')||s.adventures.companions.active!==null||s.dungeon.guide==='joined'||s.raid.guide==='joined'))return false;return true;}
