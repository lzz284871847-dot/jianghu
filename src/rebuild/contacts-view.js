import {relationshipSummary,relationshipBenefit} from './relationships.js?v=1.0.42';
import {people,locations} from './content.js?v=1.0.42';
import {npcPlace,npcScheduleText} from './world.js?v=1.0.42';
import {findRoute} from './routes.js?v=1.0.42';
export function contactsView(s,onTravel,doc=document){
 const node=(tag,value)=>{const el=doc.createElement(tag);el.textContent=value;return el};
 return Object.entries(people).map(([id,p])=>{
  const place=npcPlace(s,id),route=findRoute(s,place),card=doc.createElement('div');card.className='person';
  card.append(node('h3',p.name+' · '+p.role),node('p',`目前：${locations[place].name} · ${relationshipSummary(s,id)}`));
  const details=doc.createElement('details');details.append(node('summary','作息与喜好'),node('p',npcScheduleText(id)),node('p',`性格：${p.personality}；兴趣：${p.interest}。`));details.append(node('p',relationshipBenefit(s,id)));card.append(details);
  const button=node('button',s.place===place?'当前就在此处':`前往${p.name}所在处${route?' · 预计'+route.minutes+'分钟':''}`);button.type='button';
  button.disabled=s.dead||!!s.pending||!!s.combat||s.place===place||!route;
  button.onclick=()=>onTravel(npcPlace(s,id));card.append(button);return card;
 });
}
