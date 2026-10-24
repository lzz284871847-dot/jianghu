import {wreckRecipeKnown} from './wreck.js?v=5.73.0';
import {PRACTICE_XP,makingGrowth,growthPreview} from './practice-growth.js?v=5.73.0';
import {craftGuidance,useCraftGuidance} from './professionals.js?v=5.73.0';
import {items} from './content.js?v=5.73.0';
import {EQUIPMENT,equipmentWorkCost,artisanRecipeKnown} from './equipment.js?v=5.73.0';
import {gain} from './progression.js?v=5.73.0';
export const CRAFT_SKILLS=['tailor','leatherwork','woodwork'];
export const CRAFT_ITEMS=['cloth','hide','leather','fine_cloth','hardwood','cord','trap_probe'];
const gear=(skill,required,input,fee,chance,extra={})=>({skill,required,input,fee,chance,gear:true,...extra});
export const CRAFTS={
 boat_cord:{name:'船工合股制绳',skill:'tailor',required:12,input:{cloth:1},output:{cord:3},fee:1,chance:.90,minutes:60,energy:8,wreckRecipe:true},
 forest_staff:gear('woodwork',300,EQUIPMENT.forest_staff.materials,8,.75,{recipeOrder:'carpenter_frame'}),
 rain_cloak:gear('tailor',300,EQUIPMENT.rain_cloak.materials,10,.75,{recipeOrder:'tailor_outfit'}),
 hunting_vest:gear('leatherwork',300,EQUIPMENT.hunting_vest.materials,9,.75,{recipeOrder:'tanner_pack'}),
 trap_probe:{name:'组装机关探具（3枚）',skill:'woodwork',required:12,input:{wood:2,iron:1,cord:1},output:{trap_probe:3},fee:3,chance:.8,minutes:75,energy:10,fortRecipe:true},
 bamboo_flute:{name:'制作竹箫',skill:'woodwork',required:6,input:{wood:2,cord:1},output:{bamboo_flute:1},fee:1,chance:.85,minutes:60,energy:8},
 cord:{name:'裁布搓绳线',skill:'tailor',required:0,input:{cloth:1},output:{cord:2},fee:1,chance:.90,minutes:45,energy:6},
 tanning:{name:'鞣制熟皮',skill:'leatherwork',required:0,input:{hide:1,wood:1},output:{leather:1},fee:1,chance:.85,minutes:90,energy:12},
 fine_cloth:{name:'整理细布',skill:'tailor',required:12,input:{cloth:3,wood:1},output:{fine_cloth:1},fee:1,chance:.80,minutes:90,energy:10},
 rod:{name:'制作钓竿',skill:'woodwork',required:0,input:{wood:2,cord:1},output:{rod:1},fee:1,chance:.90,minutes:60,energy:8},
 trap:{name:'制作猎具',skill:'woodwork',required:12,input:{wood:2,iron:1,leather:1,cord:1},output:{trap:1},fee:2,chance:.80,minutes:90,energy:12},
 pick:{name:'制作矿镐',skill:'woodwork',required:24,extraSkill:'smelt',extraRequired:6,input:{wood:2,iron:2},output:{pick:1},fee:3,chance:.80,minutes:90,energy:12},
 coarse_cloth:gear('tailor',0,{cloth:1,cord:1},1,.90),
 padded_coat:gear('tailor',6,{cloth:2,cord:1},2,.85),
 leather_vest:gear('leatherwork',18,{leather:2,cloth:1,cord:1},3,.80),
 guard_robe:gear('tailor',60,{cloth:4,fine_cloth:2,leather:2,cord:2,iron:16,cold_ore:2},20,.70,{extraSkill:'leatherwork',extraRequired:18}),
 hero_robe:gear('tailor',120,{cloth:4,fine_cloth:4,leather:4,cord:3,iron:25,meteor_ore:2},45,.60,{extraSkill:'leatherwork',extraRequired:36}),
 wood_staff:gear('woodwork',0,{wood:2},1,.90),
 ash_spear:gear('woodwork',30,{wood:3,iron:2},4,.80),
 river_spear:gear('woodwork',60,{wood:5,hardwood:1,iron:16,cold_ore:2},25,.70,{extraSkill:'smelt',extraRequired:30}),
 dragon_staff:gear('woodwork',120,{wood:5,hardwood:2,iron:35,meteor_ore:2},50,.60,{extraSkill:'smelt',extraRequired:60})
};
const label=key=>EQUIPMENT[key]?.name||({cord:'绳线',tanning:'熟皮',fine_cloth:'细布',rod:'钓竿',trap:'猎具',pick:'矿镐',bamboo_flute:'竹箫'}[key])||CRAFTS[key]?.name;
export function craftPlan(s,key,kind='make'){
 const d=CRAFTS[key];if(!d||!['make','repair'].includes(kind)||kind==='repair'&&!d.gear)return null;
 const repair=kind==='repair',work=d.gear?equipmentWorkCost(EQUIPMENT[key],repair?'repair':'craft'):{minutes:d.minutes,energy:d.energy};
 return {...d,...work,name:label(key),required:repair?Math.ceil(d.required/2):d.required,extraRequired:repair?Math.ceil((d.extraRequired||0)/2):d.extraRequired,input:repair?Object.fromEntries(Object.entries(d.input).filter(([k])=>!['fine_ore','cold_ore','meteor_ore'].includes(k)).map(([k,n])=>[k,Math.max(1,Math.ceil(n/3))])):d.input,fee:repair?Math.max(1,Math.ceil(d.fee/4)):d.fee,chance:repair?1:Math.min(.95,d.chance+Math.min(.1,(s.skills[d.skill]||0)*.001)+(craftGuidance(s,d.skill)?.05:0))*(s.energy-work.energy<20?.75:1)};
}
export function craftBlocker(s,key,kind='make'){
 const d=craftPlan(s,key,kind);if(!d)return '没有这项手艺作业。';
 if(d.recipeOrder&&!artisanRecipeKnown(s,key))return '需完成并交付Lv3高级订单解锁'+d.name+'独有配方；市场与铁匠不能代替。';
 if(d.wreckRecipe&&!wreckRecipeKnown(s))return '需从河岸废船的船尾实际带出船工合股绳图；市场不能购买配方。';
 if(d.fortRecipe&&!s.fort?.known)return '需从旧堡工艺室实际带出机关探具图页；市场不能购买配方。';
 if(s.dead||s.pending||s.combat||s.adventures.law.pursuit)return '先处理眼前选择或交手；死亡后不能作业。';
 if(s.place!=='workshop'||s.minute<420||s.minute+d.minutes>1080)return '作坊07:00–18:00，需留足'+d.minutes+'分钟。';
 if(s.hp<25||s.energy<d.energy)return '需气血25、精力'+d.energy+'，先休息或疗伤。';
 if(s.skills[d.skill]<d.required||d.extraSkill&&s.skills[d.extraSkill]<d.extraRequired)return '需'+({tailor:'裁缝',leatherwork:'制革',woodwork:'木工'}[d.skill])+'经验'+d.required+(d.extraSkill?'，'+({smelt:'冶炼',leatherwork:'制革'}[d.extraSkill])+'经验'+d.extraRequired:'')+'。';
 const own=Object.hasOwn(s.equipment.owned,key);
 if(d.gear&&kind==='make'&&own)return '已有同名装备，不覆盖耐久或品质。';
 if(kind==='repair'&&(!own||s.equipment.owned[key]===EQUIPMENT[key].durability))return '没有需要修理的这件装备。';
 if(!d.gear&&Object.entries(d.output).some(([k,n])=>s.bag[k]>1000000-n))return '库存已满，不消耗钱物。';
 const smith=s.npcWorld.individuals.smith;if(smith.life.deathDay||smith.coins>1000000-d.fee)return '作坊主人无法收取工具与台位费，暂不能作业。';
 if(s.coins<d.fee)return '台位与工具费'+d.fee+'文不足。';
 for(const [k,n] of Object.entries(d.input))if(s.bag[k]<n)return items[k]+'不足，未消耗材料。';
 return null;
}
export function craftAction(s,id,{settle,rng}){
 const parts=String(id).split(':');if(parts.length!==3){s.result=['没有这项手艺作业。'];return false;}const [,kind,key]=parts,why=craftBlocker(s,key,kind);if(why){s.result=[why];return false;}
 const d=craftPlan(s,key,kind),repair=kind==='repair',roll=repair?0:rng(),success=repair||roll<d.chance;
 return settle(s,(repair?'自行修理 · ':'亲手制作 · ')+d.name,d.minutes,d.energy,()=>{
  for(const [k,n] of Object.entries(d.input))s.bag[k]-=n;s.coins-=d.fee;s.npcWorld.individuals.smith.coins+=d.fee;
  if(!repair)useCraftGuidance(s,d.skill);if(success){if(d.gear){s.equipment.owned[key]=EQUIPMENT[key].durability;if(!repair)s.equipment.quality[key]=roll<.05?2:1;}else for(const [k,n] of Object.entries(d.output))s.bag[k]+=n;s.result.push(repair?'修理完成，原品质与穿戴状态保留。':'制作成功，不自动穿戴或使用。');}
  else s.result.push('手艺或材料处理失误，本次失败，投入材料与台位费不退，没有成品。');
  s.result.push('台位与工具费'+d.fee+'文实际支付给许铁匠。');
 },{[d.skill]:repair?PRACTICE_XP.repair:success?makingGrowth(d).success:makingGrowth(d).failure});
}
export function craftOptions(s){if(s.place!=='workshop')return [];return Object.entries(CRAFTS).flatMap(([key,d])=>['make',...(d.gear&&Object.hasOwn(s.equipment.owned,key)?['repair']:[])].map(kind=>{const p=craftPlan(s,key,kind);return {id:'craft:'+kind+':'+key,label:(kind==='repair'?'自行修理 · ':'亲手制作 · ')+p.name,preview:(d.wreckRecipe?'废船独有配方'+(wreckRecipeKnown(s)?'已解锁':'未解锁')+'；粗布1制绳线3，较原制绳法多1份、更费工时；不保证成功。 ':'')+(d.recipeOrder?'独有配方'+(artisanRecipeKnown(s,key)?'已解锁':'未解锁')+'；'+EQUIPMENT[key].use+' ':'')+'需'+({tailor:'裁缝',leatherwork:'制革',woodwork:'木工'}[p.skill])+p.required+(p.extraSkill?' / '+({smelt:'冶炼',leatherwork:'制革'}[p.extraSkill])+p.extraRequired:'')+'；'+Object.entries(p.input).map(([k,n])=>items[k]+'×'+n).join('、')+'；台位费'+p.fee+'文，'+p.minutes+'分钟 / 精力'+p.energy+'；成功率'+Math.round(p.chance*100)+'%，制作失败损失全部投入。'+growthPreview(s,p.skill,p.energy,kind==='repair'?PRACTICE_XP.repair:makingGrowth(p).success,kind==='repair'?undefined:makingGrowth(p).failure),blocker:craftBlocker(s,key,kind)};}));}

