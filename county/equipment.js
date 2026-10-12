import {MARTIAL_ARTS} from './martial-data.js?v=5.5.1';
// 青河县装备系统：数据、穿戴、耐久与锻造独立于人物经济/战斗层。
export const EQUIPMENT=Object.freeze({
 wood_staff:{name:'木棍',slot:'weapon',kind:'棍法',tier:1,attack:2,defense:0,durability:35,materials:{wood:2},fee:2},
 farm_knife:{name:'柴刀',slot:'weapon',kind:'刀法',tier:1,attack:3,defense:0,durability:40,materials:{wood:1,iron:1},fee:3},
 iron_sword:{name:'铁剑',slot:'weapon',kind:'剑法',tier:2,attack:6,defense:0,durability:55,materials:{iron:3,wood:1},fee:10},
 ash_spear:{name:'白蜡枪',slot:'weapon',kind:'枪法',tier:2,attack:6,defense:0,durability:50,materials:{wood:3,iron:2},fee:10},
 steel_blade:{name:'精钢刀',slot:'weapon',kind:'刀法',tier:3,attack:10,defense:0,durability:70,materials:{iron:8,wood:2},fee:30},
 refined_sword:{name:'百炼剑',slot:'weapon',kind:'剑法',tier:3,attack:11,defense:0,durability:75,materials:{iron:10,wood:2},fee:35},
 river_spear:{name:'追风长枪',slot:'weapon',kind:'枪法',tier:4,attack:15,defense:0,durability:85,materials:{iron:16,wood:5},fee:80},
 master_blade:{name:'名匠断水刀',slot:'weapon',kind:'刀法',tier:4,attack:17,defense:0,durability:90,materials:{iron:18,wood:4},fee:95},
 heirloom_sword:{name:'镇岳古剑',slot:'weapon',kind:'剑法',tier:5,attack:22,defense:0,durability:100,materials:{iron:32,wood:8},fee:180},
 dragon_staff:{name:'玄铁重棍',slot:'weapon',kind:'棍法',tier:5,attack:20,defense:0,durability:110,materials:{iron:35,wood:5},fee:170},
 coarse_cloth:{name:'粗布衣',slot:'armor',kind:'',tier:1,attack:0,defense:1,durability:30,materials:{wood:1},fee:2},
 padded_coat:{name:'厚棉袄',slot:'armor',kind:'',tier:1,attack:0,defense:2,durability:35,materials:{wood:2},fee:3},
 leather_vest:{name:'皮背心',slot:'armor',kind:'',tier:2,attack:0,defense:4,durability:45,materials:{wood:3},fee:9},
 iron_vest:{name:'铁片护胸',slot:'armor',kind:'',tier:2,attack:0,defense:5,durability:55,materials:{iron:4},fee:12},
 guard_armor:{name:'镖局轻甲',slot:'armor',kind:'',tier:3,attack:0,defense:8,durability:65,materials:{iron:7,wood:2},fee:27},
 scale_armor:{name:'鱼鳞甲',slot:'armor',kind:'',tier:3,attack:0,defense:9,durability:70,materials:{iron:10},fee:35},
 steel_armor:{name:'精钢护甲',slot:'armor',kind:'',tier:4,attack:0,defense:12,durability:85,materials:{iron:20},fee:90},
 guard_robe:{name:'名匠护身衣',slot:'armor',kind:'',tier:4,attack:0,defense:13,durability:85,materials:{iron:16,wood:6},fee:85},
 iron_scale:{name:'玄铁鳞甲',slot:'armor',kind:'',tier:5,attack:0,defense:18,durability:105,materials:{iron:34},fee:185},
 hero_robe:{name:'百工护身袍',slot:'armor',kind:'',tier:5,attack:0,defense:16,durability:100,materials:{iron:25,wood:10},fee:165}
});

const RARE_MATERIAL=Object.freeze({3:{fine_ore:2},4:{cold_ore:2},5:{meteor_ore:2}});
for(const item of Object.values(EQUIPMENT))if(item.tier>=3)Object.assign(item.materials,RARE_MATERIAL[item.tier]);
export const craftFailureChance=item=>item.tier<=2?0:Math.min(.35,.08+(item.tier-3)*.10);
export const equipmentWorkCost=(item,kind)=>({minutes:kind==='craft'?45+15*item.tier:20+10*item.tier,energy:kind==='craft'?4+2*item.tier:2+item.tier});
export const makeEquipment=()=>({owned:{},quality:{},equipped:{weapon:null,armor:null}});
export function ensureEquipment(s){s.equipment??=makeEquipment();return s.equipment;}
export function equipmentValid(s){const e=s.equipment;if(!e||typeof e!=='object'||Array.isArray(e)||!e.owned||typeof e.owned!=='object'||Array.isArray(e.owned)||!e.equipped||typeof e.equipped!=='object'||Array.isArray(e.equipped))return false;
 if(!e.quality||typeof e.quality!=='object'||Array.isArray(e.quality))return false;
 for(const [id,d] of Object.entries(e.owned))if(!EQUIPMENT[id]||!Number.isSafeInteger(d)||d<0||d>EQUIPMENT[id].durability)return false;
 for(const [id,q] of Object.entries(e.quality))if(!Object.hasOwn(e.owned,id)||![1,2].includes(q))return false;
 for(const slot of ['weapon','armor']){const id=e.equipped[slot];if(id!==null&&(!EQUIPMENT[id]||EQUIPMENT[id].slot!==slot||!Object.hasOwn(e.owned,id)))return false;}return true;
}
export function equipmentBonuses(s,martialId=s.martial?.equipped){const e=ensureEquipment(s);let attack=0,defense=0;const martialKind=martialId&&MARTIAL_ARTS[martialId]?.category;for(const id of Object.values(e.equipped)){const item=EQUIPMENT[id];if(item&&e.owned[id]>0){if(item.slot==='weapon'&&item.kind===martialKind)attack+=item.attack+(e.quality[id]===2?1:0);if(item.slot==='armor')defense+=item.defense+(e.quality[id]===2?1:0);}}return {attack,defense};}
export function equipmentAction(s,kind,id,rng=()=>.5){const e=ensureEquipment(s),item=EQUIPMENT[id];if(!item){s.result=['没有这种装备。'];return false;}
 if(kind==='equip'){if(!Object.hasOwn(e.owned,id)||e.owned[id]===0){s.result=['装备不存在或已损坏。'];return false;}e.equipped[item.slot]=id;s.result=['已装备'+item.name];if(item.slot==='weapon'&&item.kind!==MARTIAL_ARTS[s.martial?.equipped]?.category)s.result.push('当前武学与兵器不适配，无法获得武器攻击加成。');return true;}
 if(kind==='unequip'){if(e.equipped[item.slot]!==id){s.result=['目前没有穿戴此物。'];return false;}e.equipped[item.slot]=null;s.result=['已卸下'+item.name];return true;}
 if(!['craft','repair'].includes(kind)){s.result=['未知装备行动。'];return false;}
 if(s.place!=='workshop'){s.result=['请到作坊街使用铁匠炉。'];return false;}
 if(s.combat||s.pending||s.dead){s.result=['当前无法操作装备。'];return false;}
 if(kind==='craft'&&Object.hasOwn(e.owned,id)){s.result=['背包已有此装备，暂不支持重复制备。'];return false;}
 if(kind==='repair'&&(!Object.hasOwn(e.owned,id)||e.owned[id]===item.durability)){s.result=['没有需要修理的装备。'];return false;}
 const work=equipmentWorkCost(item,kind);
 if(s.minute<420||s.minute+work.minutes>1080){s.result=['铁匠铺07:00–18:00营业，剩余时间不足以完成本次'+(kind==='craft'?'打造':'修理')+'。'];return false;}
 if(s.energy<work.energy){s.result=['精力不足以完成装备作业，需要'+work.energy+'点精力。'];return false;}
 // Rare ores define the original forging recipe; routine repairs use common stock.
 const materials=kind==='repair'?Object.entries(item.materials).filter(([k])=>!['fine_ore','cold_ore','meteor_ore'].includes(k)).map(([k,n])=>[k,Math.max(1,Math.ceil(n/3))]):Object.entries(item.materials);
 const fee=kind==='repair'?Math.max(1,Math.ceil(item.fee/4)):item.fee;
 if(s.coins<fee||materials.some(([k,n])=>(s.bag[k]||0)<n)){s.result=['铜钱或材料不足。'];return false;}
 // High tier equipment is in the world catalogue but requires expert trust and preparation.
 if(item.tier>=3&&(s.relations?.smith||0)<(item.tier-2)*8){s.result=['高阶打造需要铁匠信任与技艺认可。'];return false;}
 for(const [k,n] of materials)s.bag[k]-=n;s.coins-=fee;
 if(kind==='craft'){
  const roll=rng(),failure=craftFailureChance(item);
  if(roll<failure){s.result=['锻造'+item.name+'失败，投入的材料和工钱已经损失。','失败概率'+Math.round(failure*100)+'%；矿材不会退还。'];return true;}
  e.owned[id]=item.durability;e.quality[id]=roll>=.95?2:1;
  s.result=['锻造'+item.name+'成功，品质：'+(e.quality[id]===2?'精良':'普通')+'。','消耗'+fee+'文和投入材料。'];return true;
 }
 e.owned[id]=item.durability;s.result=['修复'+item.name+'成功。','花费'+fee+'文，材料已扣除；原有品质保留。'];return true;
}
export function wearEquipment(s,slot,amount=1){const e=ensureEquipment(s),id=e.equipped[slot];if(!id||e.owned[id]<=0)return null;e.owned[id]=Math.max(0,e.owned[id]-amount);return e.owned[id]===0?EQUIPMENT[id].name+'耐久耗尽，已失效。':null;}
