export const namedResidents=s=>[...Object.values(s.npcWorld.individuals),...s.npcWorld.lineage.children.map((c,i)=>({...c.livelihood,id:c.id,name:'陈家孩子'+(i+1),age:Math.floor((s.day-c.bornDay)/360),life:c.life,hunger:c.hunger,source:c.livelihood}))];
export const saveResident=p=>{if(p?.source)for(const key of Object.keys(p.source))p.source[key]=p[key];};
