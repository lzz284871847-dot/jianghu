import {milestoneHint} from './skill-milestones.js?v=5.50.0';
import {artisanSkillGoal} from './artisan-orders.js?v=5.50.0';
import {skills,places,people,items,markets,resources,recipes} from './content.js?v=5.50.0';
import {progress,MAX} from './progression.js?v=5.50.0';
import {nextRoad} from './task-handbook.js?v=5.50.0';
import {initialMarket,marketPrice} from './commerce.js?v=5.50.0';
import {CRAFTS} from './crafts.js?v=5.50.0';
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
 trade:{place:'market',panel:'bag',text:'实际出售、供货或摆摊，收入需扣成本'},
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
export function materialSources(s,key){const out=[];for(const [place,m] of Object.entries(markets))if(Object.hasOwn(m.buy,key))out.push(places[place].name+'：单份原价'+marketPrice(s,place,'buy',key)+'文，'+stockHint(s,place,key));for(const d of Object.values(resources))if(Object.hasOwn(d.output,key))out.push(d.places.map(p=>places[p].name).join('、')+'：'+d.name+(key==='hardwood'?'，需实际采集经验30':'')+'，尝试有限，可能失败。');for(const d of Object.values(recipes))if(Object.hasOwn(d.output,key))out.push('作坊街：'+d.name+'，自己的'+Object.entries(d.input).map(([k,n])=>items[k]+'×'+n).join('、')+'，耗时间精力。');for(const d of Object.values(CRAFTS))if(d.output&&Object.hasOwn(d.output,key))out.push('作坊街：'+d.name+'，需'+skills[d.skill]+d.required+'、'+Object.entries(d.input).map(([k,n])=>items[k]+'×'+n).join('、')+'、台位费'+d.fee+'文，可能做坏。');return out;}
