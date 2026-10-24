import {BUSINESSES} from './business.js?v=5.71.1';
import {CRAFTS} from './crafts.js?v=5.71.1';
import {EQUIPMENT} from './equipment.js?v=5.71.1';
import {MEDICINES} from './medicine.js?v=5.71.1';
import {MEALS} from './kitchen.js?v=5.71.1';
import {ALL_ARTISAN_ORDERS as ARTISAN_ORDERS} from './artisan-orders.js?v=5.71.1';
import {resources,skills} from './content.js?v=5.71.1';
import {progress,MAX} from './progression.js?v=5.71.1';
function skillTargets(s,key){
 const targets=[],add=(required,name)=>{if(required>0)targets.push({required,name,remaining:required-s.skills[key]});};
 const gates={forage:{hardwood:30},herb:{aromatic_herb:10,mountain_root:30,cliff_bloom:60},mining:{fine_ore:30,cold_ore:60,meteor_ore:100}};
 for(const [id,n] of Object.entries(gates[key]||{}))add(n,resources[id].name);
 for(const [id,d] of Object.entries(CRAFTS)){const name=EQUIPMENT[id]?.name||d.name||({cord:'绳线',tanning:'熟皮'}[id])||id;if(d.skill===key)add(d.required,name);if(d.extraSkill===key)add(d.extraRequired,name+'（协同手艺）');}
 for(const d of Object.values(MEDICINES)){if(key==='herb')add(d.herb,'学方 · '+d.name);if(key==='medicine')add(d.practice,'学方 · '+d.name);}
 for(const d of Object.values(MEALS)){if(key==='cook')add(d.required,'烹饪 · '+d.name);if(key==='herb')add(d.herb||0,'烹饪 · '+d.name);}
 for(const [id,d] of Object.entries(ARTISAN_ORDERS))if(d.skill===key&&s.professionals.advanced[id].status==='none')add(d.required,d.name+'（还需关系'+d.trust+'）');
 for(const [id,d] of Object.entries(BUSINESSES))if(d.skill===key&&s.adventures.business.records[id].status==='none')add(d.required,d.name);
 if(key==='literacy')add(6,'核读告示、学习账算与书法');if(key==='accounting')add(6,'估算饭食实际成本');if(key==='woodwork'){add(6,'制作竹箫');add(24,'矿道绑扎旧撑（需实际察看成功与绳线）');}if(key==='carry')add(12,'熟手搬运职业验收');if(key==='tailor'&&['new','ready','active'].includes(s.raid?.status)&&s.raid.person==='sealed')add(24,'匪寨缝制担带救脚夫（需自备细布与绳线）');
 if(['calligraphy','chess','music'].includes(key)&&s.culture.records[key].status==='none')add(6,'接洽对应文化小事（还需关系1）');
 return targets.sort((a,b)=>a.required-b.required);
}
export function nextSkillMilestone(s,key){return skillTargets(s,key).find(t=>t.remaining>0)||null;}
export function milestoneHint(s,key){const targets=skillTargets(s,key),next=targets.find(t=>t.remaining>0),ready=targets.filter(t=>t.remaining<=0).at(-1),known=ready?'经验已满足：'+ready.name+'；仍需现场条件。':'';if(next)return known+ '下一用途：'+next.name+'；'+skills[key]+'累计'+next.required+'，还差'+next.remaining+'经验。仍需满足材料、关系、配方及现场条件。';if(s.skills[key]===MAX)return known+ '本技能经验已满；现有用途与作业条件保留。';const p=progress(s.skills[key]);return known+ (p.level===5?'距离本级练满还差':'距离Lv'+(p.level+1)+'还差')+(p.cap-p.xp)+'经验；现有用途继续可用。';}

