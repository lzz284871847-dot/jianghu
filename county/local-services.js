// Project existing controls into a local facility. No actions or state are created here.
const FIELD_ACTIONS={
 jobs:['work'],work:['work'],loading:['work'],rooms:['sleep'],lodging:['sleep'],training:['train']
};
const GROUPS={
 office:['law','countyEvents'],stalls:['stalls'],gathering:['contacts'],
 bench:['craft'],stove:['kitchen'],challenge:['challenge'],roadside:['explore','outings'],
 clinic:['medicine'],site:['explore'],trail:['field','forest'],dungeon:['dungeon'],fort:['fort'],raid:['raid']
};
export function facilitySources(facility,roots){
 if(facility.panel==='field')return [...roots.actions.children].filter(n=>FIELD_ACTIONS[facility.id]?.includes(n.dataset.actionKey));
 if(facility.panel==='resources')return [...roots.resources.children];
 if(facility.panel==='bag')return [...roots.market.children].filter(n=>!n.classList.contains('material-sources'));
 if(facility.panel==='equipment')return [...roots.equipment.children];
 const groups=GROUPS[facility.id]??[facility.group];
 // Person-specific teaching and paid work belong to their real contact, never a proxy facility.
 return [...roots.activities.querySelectorAll('[data-action-id]')].filter(n=>groups.includes(n.dataset.group)&&(!n.dataset.npcContact||facility.id==='office'));
}
