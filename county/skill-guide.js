import {sharedWork} from './county-life.js?v=5.71.0';
import {ARTISANS} from './professional-data.js?v=5.71.0';
import {BUSINESSES} from './business.js?v=5.71.0';
import {CAREERS} from './adventure-data.js?v=5.71.0';
import {ASSESSMENTS,assessmentArtValid} from './assessments.js?v=5.71.0';
import {bodyStats} from './mobility.js?v=5.71.0';
import {COOPERATIONS} from './companions.js?v=5.71.0';
import {craftPlan} from './crafts.js?v=5.71.0';
import {MEALS} from './kitchen.js?v=5.71.0';
import {MEDICINES} from './medicine.js?v=5.71.0';
import {EQUIPMENT,artisanRecipeKnown} from './equipment.js?v=5.71.0';
import {wreckRecipeKnown} from './wreck.js?v=5.71.0';
import {ALL_ARTISAN_ORDERS} from './artisan-orders.js?v=5.71.0';
import {MARTIAL_ARTS} from './martial-data.js?v=5.71.0';
import {milestoneHint} from './skill-milestones.js?v=5.71.0';
import {artisanSkillGoal} from './artisan-orders.js?v=5.71.0';
import {skills,places,people,items,markets,resources,recipes} from './content.js?v=5.71.0';
import {progress,MAX} from './progression.js?v=5.71.0';
import {nextRoad} from './task-handbook.js?v=5.71.0';
import {initialMarket,marketPrice} from './commerce.js?v=5.71.0';
import {CRAFTS} from './crafts.js?v=5.71.0';
export const SKILL_GROUPS=[
 {id:'living',name:'生活与采集',keys:['carry','forage','herb','fish','mining','hunt','farming','cook']},
 {id:'crafting',name:'手艺与生产',keys:['smelt','medicine','tailor','leatherwork','woodwork']},
 {id:'exploring',name:'江湖与探索',keys:['fist','battle','navigation','tracking','awareness']},
 {id:'knowledge',name:'往来与知识',keys:['trade','negotiation','literacy','accounting']},
 {id:'culture',name:'文化技艺',keys:['calligraphy','chess','music']}
];
const SOURCES={
 carry:{place:'county',panel:'field',text:'白天短工，完成实际劳动'},
 forage:{place:'foot',panel:'resources',text:'拾柴采集，消耗真实资源次数'},
 herb:{place:'village',panel:'resources',text:'寻找药材，高级药材另有门槛'},
 fish:{place:'dock',panel:'resources',text:'持钓竿实际钓鱼'},
 mining:{place:'mine',panel:'resources',text:'持矿镐采矿，有受伤风险'},
 hunt:{place:'bamboo',panel:'resources',text:'持猎具实际狩猎，有失败风险'},
 farming:{place:'fields',panel:'events',groups:['business'],text:'田间短工、照看与收获小畦'},
 cook:{place:'workshop',panel:'events',groups:['kitchen'],text:'公用灶烹饪；普通加工在背包'},
 smelt:{place:'workshop',panel:'bag',text:'背包作坊加工：炼铁与锻造'},
 medicine:{place:'village',teacher:'doctor',panel:'events',groups:['medicine'],text:'学方后使用自己的材料制药'},
 tailor:{place:'workshop',teacher:'tailor',panel:'events',groups:['professionals','craft','advancedOrders'],text:'师傅练习课，或自行裁缝制作'},
 leatherwork:{place:'workshop',teacher:'tanner',panel:'events',groups:['professionals','craft','advancedOrders'],text:'师傅练习课，或自行鞣皮制作'},
 woodwork:{place:'workshop',teacher:'carpenter',panel:'events',groups:['professionals','craft','advancedOrders'],text:'从零经验实作委托或自行制作入手；课程可选'},
 fist:{place:'school',panel:'martial',text:'武馆求学与基础练习，武学成长另列'},
 battle:{place:'school',panel:'martial',text:'实际陪练或交手，实战可能致命'},
 navigation:{place:'foot',panel:'events',groups:['field'],text:'辨认路势，帮助当天当地相关行动'},
 tracking:{place:'bamboo',panel:'events',groups:['field'],text:'追查足迹，帮助狩猎与失物搜寻'},
 awareness:{place:'foot',panel:'events',groups:['field'],text:'察看危险，仍可能受伤或失败'},
 trade:{place:'market',panel:'bag',text:'实际出售、供货或摆摊，收入需扣成本；经商6起使菜货分拣成功率提高5个百分点'},
 negotiation:{place:'market',panel:'events',groups:['civic'],text:'真实议价，每日尝试有限'},
 literacy:{place:'market',teacher:'scribe',panel:'events',groups:['civic'],text:'付费学认字，经验6后可核读告示'},
 accounting:{place:'county',teacher:'bookkeeper',panel:'events',groups:['civic'],text:'需识字6，付费学账算或核对账目'},
 calligraphy:{place:'market',teacher:'scribe',panel:'events',groups:['culture'],text:'需识字6、自备纸墨；学习与练字'},
 chess:{place:'inn',teacher:'chessfriend',panel:'events',groups:['culture'],text:'学棋与三回合文字对弈，无赌钱'},
 music:{place:'inn',teacher:'musician',panel:'events',groups:['culture'],text:'自备竹箫，学吹箫、实际练习'}
};
// Read-only display projections. Opening these never learns, purchases, or advances time.
export function skillOverview(s){const row=key=>{const source=SOURCES[key],p=source.teacher?s.npcWorld.individuals[source.teacher]:null,v=progress(s.skills[key]);const closed=p&&(p.life.deathDay||p.retirement.active||p.life.sickDays||p.life.restDay===s.day||p.injuryDays);return {goal:milestoneHint(s,key)+(artisanSkillGoal(s,key)?' '+artisanSkillGoal(s,key):''),key,name:skills[key],total:s.skills[key],level:v.level,xp:v.xp,cap:v.cap,complete:s.skills[key]===MAX,source:{...source,groups:[...(source.groups||[])],label:(source.teacher?people[source.teacher].name+' · ':'')+places[source.place].name,notice:closed?'老师当前休工、休养或无法接洽，已学技能保留。':source.teacher?'老师营业'+people[source.teacher].open/60+'—'+people[source.teacher].close/60+'时，需留足行动时长。':'',road:nextRoad(s,source.place)}};};return {trained:Object.keys(skills).filter(k=>s.skills[k]>0).map(row),untrained:SKILL_GROUPS.map(g=>({id:g.id,name:g.name,rows:g.keys.filter(k=>s.skills[k]===0).map(row)})).filter(g=>g.rows.length)};}
export function plannedRestock(s,place,key){if(!Object.hasOwn(markets[place]?.buy||{},key)||!(initialMarket()[place]?.[key]>0))return null;let day=s.day+1;if(day%2===0)day++;if(place==='liuxi'&&day%11===7)day+=2;return day;}
export function stockHint(s,place,key){const n=s.commerce.stock[place]?.[key];if(n===undefined||!Object.hasOwn(markets[place]?.buy||{},key))return '';const day=plannedRestock(s,place,key);return n===0?'已售空'+(day?'，下一批计划第'+day+'日补货':'')+'；仍受实际补货与营业影响。':'实际存货'+n+'份；购买仍需钱款、容量和营业时间。';}
export const MATERIAL_KEYS=['paper','ink','bamboo_flute','grain','wood','cloth','fine_cloth','hide','leather','hardwood','cord','iron','rod','pick','trap'];
export function materialSources(s,key){const out=[];for(const [place,m] of Object.entries(markets))if(Object.hasOwn(m.buy,key))out.push(places[place].name+'：单份原价'+marketPrice(s,place,'buy',key)+'文，'+stockHint(s,place,key));for(const [id,d] of Object.entries(resources))if(resourceKnown(s,id)&&Object.hasOwn(d.output,key))out.push(d.places.map(p=>places[p].name).join('、')+'：'+d.name+'，尝试有限，可能失败。');for(const d of Object.values(recipes))if(Object.hasOwn(d.output,key))out.push('作坊街：'+d.name+'，自己的'+Object.entries(d.input).map(([k,n])=>items[k]+'×'+n).join('、')+'，耗时间精力。');for(const [id,d] of Object.entries(CRAFTS))if(activityKnown(s,'craft:make:'+id)&&d.output&&Object.hasOwn(d.output,key))out.push('作坊街：'+d.name+'，使用自己的'+Object.entries(d.input).map(([k,n])=>items[k]+'×'+n).join('、')+'、台位费'+d.fee+'文，可能做坏。');return out;}

// Discovery affects presentation only; the original action validators remain authoritative.
export function resourceKnown(s,key){const need={hardwood:['forage',30],aromatic_herb:['herb',10],mountain_root:['herb',30],cliff_bloom:['herb',60],fine_ore:['mining',30],cold_ore:['mining',60],meteor_ore:['mining',100]}[key];return !need||s.skills[need[0]]>=need[1];}
export function activityKnown(s,id){const [kind,action,key]=id.split(':');
 if(kind==='civic'&&['accounting','read','audit'].includes(action))return s.skills.literacy>=6;
 if(kind==='culture'){const record=s.culture.records[action];if(['active','claim'].includes(record.status)&&['draft','perform','claim','withdraw'].includes(key))return true;if(key==='lesson'&&action==='calligraphy')return s.skills.literacy>=6;if(['practice','play'].includes(key))return s.skills[action]>=3;if(key==='accept')return record.status!=='none'||s.skills[action]>=6&&s.relations[{calligraphy:'scribe',chess:'chessfriend',music:'musician'}[action]]>=1;return true;}
 if(kind==='craft'){if(action==='repair'&&Object.hasOwn(s.equipment.owned,key))return true;const d=craftPlan(s,key,action);return !!d&&(!d.recipeOrder||artisanRecipeKnown(s,key))&&(!d.wreckRecipe||wreckRecipeKnown(s))&&(!d.fortRecipe||s.fort.known)&&s.skills[d.skill]>=d.required&&(!d.extraSkill||s.skills[d.extraSkill]>=d.extraRequired);}
 if(kind==='kitchen'&&action==='cook'){const d=MEALS[key];return !!d&&s.skills.cook>=d.required&&s.skills.herb>=(d.herb||0);}
 if(kind==='medicine'&&action==='learn'){const d=MEDICINES[key];return !!d&&s.skills.herb>=d.herb&&s.skills.medicine>=d.practice;}
 if(kind==='professional'&&ALL_ARTISAN_ORDERS[action]){const d=ALL_ARTISAN_ORDERS[action],record=s.professionals.advanced[action];return record.status!=='none'||s.skills[d.skill]>=d.required&&s.relations[d.teacher]>=d.trust;}
 if(kind==='professional'&&ARTISANS[action]&&['guide','accept'].includes(key))return s.skills[ARTISANS[action].skill]>=6&&s.relations[action]>=2;
 if(kind==='bond'){
  if(key==='meet')return s.relations[action]>=3;
  if(key==='promise'){const r=s.adventures.life.bonds[action],shared=sharedWork(s,action);return ['boatman','merchant'].includes(action)?shared||r.trust>=2&&r.history.some(h=>h.success):s.relations[action]>=3&&shared;}
 }
 if(kind==='business'&&key==='accept'){const d=BUSINESSES[action];return !!d&&s.skills[d.skill]>=d.required&&(!(d.kind==='farm'&&d.t===4)||s.skills.herb>=10);}
 if(kind==='career'){const d=CAREERS[action];return !!d&&s.skills[d.skill]>=d.required;}
 if(kind==='assessment'){const d=ASSESSMENTS[action],r=s.assessments.records[action],m=s.martial,art=m.equipped;if(key==='lesson')return !!r.wins&&!r.lessonArt;return s.relations[action]>=d.trust&&!!m.known[art]&&assessmentArtValid(action,art)&&(m.practice[art]||0)>=d.required&&(m.experience[art]||0)>=6;}
 if(kind==='sect'&&action==='join')return s.relations.farmer>=3&&['wood_knife','staff'].some(k=>s.martial.known[k]);
 if(kind==='sect'&&action==='guide')return s.adventures.life.sect.trust>=2&&['wood_knife','staff'].includes(s.martial.equipped)&&!!s.martial.known[s.martial.equipped];
 if(kind==='mentor'&&action==='join')return s.relations.master>=3&&Object.keys(s.martial.known).length>0;
 if(kind==='companion'&&action==='peer'&&key==='invite')return Object.keys(s.martial.known).length>0&&!!s.npcWorld.individuals[COOPERATIONS.peer.actor].study.learnedDay;
 if(kind==='trial')return !!s.martial.known[s.martial.equipped];
 if(kind==='wreck'&&action==='brace')return s.skills.woodwork>=12;
 if(kind==='dungeon'&&action==='lash')return s.skills.woodwork>=24;
 if(kind==='raid'){
  if(action==='climb')return (bodyStats(s)?.points||0)>=30;
  if(action==='tools')return s.skills.woodwork>=6;
  if(action==='sling')return s.skills.tailor>=24;
 }
 if(kind==='vignette'&&action==='herb_dispute'&&key==='inspect')return s.skills.herb>=12;
 if((['raid','fort'].includes(kind)&&['gateFight','doorFight','pursuitFight'].includes(action))||(kind==='vignette'&&action==='herb_dispute'&&key==='fight')||(kind==='outing'&&action==='road'&&key==='fight'))return !!s.martial.known[s.martial.equipped];
 if(kind==='fort'){
  if(action==='enter')return s.skills.woodwork>=12||s.skills.awareness>=12||Object.keys(s.martial.known).some(k=>(s.martial.practice[k]||0)>=120);
  if(['tools','disarm'].includes(action))return s.skills.woodwork>=12;
  if(action==='climb')return (bodyStats(s)?.points||0)>=120;
  if(action==='herbal')return s.skills.herb>=30;
 }
 return true;
}
export function equipmentKnown(s,id){const d=EQUIPMENT[id];if(Object.hasOwn(s.equipment.owned,id))return true;if(!d||d.foundOnly||s.place!=='workshop')return false;if(d.recipeOrder)return artisanRecipeKnown(s,id);return d.tier<3||(s.relations.smith||0)>=(d.tier-2)*8;}
export function martialKnown(s,id){const art=MARTIAL_ARTS[id];if(!art)return false;if(s.martial.known[id])return true;if(s.place!==(art.source==='village'?'village':'school'))return false;if(art.tier===1)return true;return (s.relations.master||0)>=(art.tier===2?5:12)&&Object.entries(s.martial.known).filter(([k,v])=>v&&MARTIAL_ARTS[k].tier===art.tier-1&&(s.martial.practice[k]||0)>=120).length>=2;}
