import {items,skills,homePrice,recipes,locations,people,jobs,events} from './content.js?v=1.0.49';
import {skillLines} from './progression.js?v=1.0.49';
import {resources} from './resources.js?v=1.0.49';
import {weapons} from './equipment.js?v=1.0.49';
// 只整理展示，不修改库存、技能或存档。
const groups={恢复用品:['food','herb','salve'],兵器:['staff','sword'],工具:['tool','rod','trap'],原料与种子:['iron','wood','fish','ore','meat','seed','vegetable']};
function node(doc,tag,value,className=''){const el=doc.createElement(tag);el.textContent=value;if(className)el.className=className;return el}
export function itemUseLines(s,key){
 if(!Object.hasOwn(items,key))return [];
 const lines=[],recovery={food:'吃一份：精力+12、气血+5，上限100；不需要维持饱食或饮水。',herb:'用一份处理伤口：气血+25，上限100。',salve:'用一份药膏：气血+35，上限100。'};
 if(recovery[key])lines.push(recovery[key]);
 if(key==='ore')lines.push('铁矿石需先炼成铁料，不能直接打造工具或铁剑。');
 if(key==='seed')lines.push('河湾村播种：菜种1、借地2文；七个游戏日成熟，不照料也有基础收成。');
 if(weapons[key])lines.push(`在背包装备区换用后，练习与出招增长${skills[weapons[key].skill]}；获得兵器不会自动装备。`);
 for(const [id,r] of Object.entries(resources))if(r.tool===key){const places=Object.values(locations).filter(l=>l.actions.includes(id)).map(l=>l.name).join('、');lines.push(`${places}：${r.name}需要此工具，可重复使用，不消耗工具；可能空手而归。`);}
 for(const r of Object.values(recipes))if(r.input[key]){const input=Object.entries(r.input).map(([k,n])=>items[k]+'×'+n).join('、'),output=Object.entries(r.output).map(([k,n])=>items[k]+'×'+n).join('、');lines.push(`${locations[r.place||'forge'].name} · ${r.name}：${input} → ${output}${r.level?`；需${skills[r.skill]}Lv${r.level}`:''}${r.knowledge&&!s[r.knowledge]?'；尚需向沈医者学习基础制药':''}。`);}
 const giftees=Object.values(people).filter(p=>p.gift===key).map(p=>p.name);if(giftees.length)lines.push('可赠给：'+giftees.join('、')+'；到场后自行决定，每人每日一次。');
 const job=s.job&&jobs[s.job.id];if(job?.needs?.[key])lines.push(`当前约定 · ${job.name}：需要${items[key]}×${job.needs[key]}，到${locations[job.place].name}完成。`);
 for(const e of s.events.filter(e=>e.status==='open')){const def=events[e.kind];if(def.choices.some(c=>c.input?.[key]))lines.push(`当前事件 · ${locations[def.place].name}：${def.title}可能用到${items[key]}，参与前查看选择条件。`);}
 return lines;
}
function groupedItems(s,doc,includeEmpty){
 const nodes=[];
 for(const [title,keys] of Object.entries(groups)){
  const owned=keys.filter(key=>includeEmpty||s.bag[key]>0);if(!owned.length)continue;
  const section=doc.createElement('section');section.className='inventory-group';section.append(node(doc,'h3',title));
  const row=doc.createElement('div');row.className='row';
  for(const key of owned){const entry=doc.createElement('details');entry.className='item-use';entry.dataset.item=key;entry.append(node(doc,'summary',items[key]+' ×'+s.bag[key]+' · 用途'),...itemUseLines(s,key).map(line=>node(doc,'p',line,'muted')));row.append(entry);}
  section.append(row);nodes.push(section);
 }
 return nodes;
}
export function inventoryView(s,doc=document){
 const owned=groupedItems(s,doc,false),all=doc.createElement('details');all.className='inventory-group';
 all.append(node(doc,'summary','查看全部物品（含零库存）'),...groupedItems(s,doc,true));
 return [...(owned.length?owned:[node(doc,'p','背包里暂时没有物品。','muted')]),all];
}
export function skillsView(s,doc=document){
 const practiced=[],unpracticed=[],lines=skillLines(s);
 Object.keys(skills).forEach((key,i)=>(s.skills[key]>0?practiced:unpracticed).push(node(doc,'p',lines[i])));
 const result=practiced.length?practiced:[node(doc,'p','尚未积累技能经验。做事、练习或请教后会在这里记录。','muted')];
 if(unpracticed.length){const more=doc.createElement('details');more.append(node(doc,'summary',`尚无经验的技能（${unpracticed.length}项）`),...unpracticed);result.push(more)}
 return result;
}

export function housingStatus(s){return s.homeDay?`住所：青石镇旧屋（第${s.homeDay}日购得）。可在镇上睡觉，无住宿费。`:`住所：尚无自住房。可在青石镇花${homePrice}文买一间旧屋；也可继续住店或借宿，不强制置业。`}
