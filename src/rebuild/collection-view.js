import {items,skills} from './content.js?v=1.0.28';
import {skillLines} from './progression.js?v=1.0.28';
// 只整理展示，不修改库存、技能或存档。
const groups={恢复用品:['food','herb','salve'],兵器:['staff','sword'],工具:['tool','rod','trap'],原料与种子:['iron','wood','fish','ore','meat','seed','vegetable']};
function node(doc,tag,value,className=''){const el=doc.createElement(tag);el.textContent=value;if(className)el.className=className;return el}
function groupedItems(s,doc,includeEmpty){
 const nodes=[];
 for(const [title,keys] of Object.entries(groups)){
  const owned=keys.filter(key=>includeEmpty||s.bag[key]>0);if(!owned.length)continue;
  const section=doc.createElement('section');section.className='inventory-group';section.append(node(doc,'h3',title));
  const row=doc.createElement('div');row.className='row';
  for(const key of owned)row.append(node(doc,'span',items[key]+' ×'+s.bag[key],'pill'));
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
