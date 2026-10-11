import {makeVillageSchool,villageSchoolValid,villageSchoolDay} from './npc-village-school.js?v=4.24.0';
import {saveResident} from './npc-residents.js?v=4.24.0';
import {makeJourneys,journeysValid,journeySteps,journeyDepartures,travelBusy} from './npc-journeys.js?v=4.24.0';
import {makeClinic,clinicValid,clinicDay,clinicTrainingDay,clinicDoctor} from './npc-clinic.js?v=4.24.0';
import {makeSchool,schoolValid,schoolDay} from './npc-school.js?v=4.24.0';
import {npcSparringDay} from './npc-sparring.js?v=4.24.0';
import {makeStudy,studyValid,npcStudyDay} from './npc-martial.js?v=4.24.0';
import {npcHealthDay} from './npc-health.js?v=4.24.0';
import {makeLife,lifeValid,alive,parentMortality,settleEstates,recoveryFor} from './npc-mortality.js?v=4.24.0';
import {makeLineage,lineageValid,lineageDay} from './npc-lineage.js?v=4.24.0';
import {makeContracts,contractsValid,settleContracts,autonomousLoans,applyContractReputation} from './npc-contracts.js?v=4.24.0';
import {makeSocial,socialValid,socialDay,makeOutlook,outlookValid,ambitionDay} from './npc-social.js?v=4.24.0';
import {makeHouseholds,householdsValid,familySupport,familyResponsibility} from './npc-households.js?v=4.24.0';
import {npcWork,npcBuyFood,npcProduce,npcSellProduce,npcTransport,npcCareerDay,npcApplyShop,makeRetirement,retirementValid,npcRetirementDay} from './npc-economy.js?v=4.24.0';
import {people,places} from './content.js?v=4.24.0';
// Individual NPCs persist. Background residents remain aggregates until promoted.
const ordinary=[
 ['farmhand01','陈二','fields','农户',19],['farmhand02','田嫂','fields','农户',34],
 ['dockhand01','阿旺','dock','船工',26],['dockhand02','鲁六','dock','脚夫',39],
 ['smithapprentice','许小成','workshop','学徒',17],['shopassistant','小莲','market','伙计',23],
 ['herbalist','罗采药','village','采药人',42],['carter','齐三','road','车夫',31],
 ['fisher','秦老七','ferry','渔人',55],['hunter','蒋猎户','bamboo','猎户',37],
 ['laborer','石根','county','杂役',28],['stallholder','魏婶','liuxi','摊贩',47]
];
export const NPC_LEVELS=['detailed','ordinary','background'];
const bounded=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const makePerson=(id,name,home,role,age,level)=>({life:makeLife(),retirement:makeRetirement(),study:makeStudy(),outlook:makeOutlook(id),id,name,home,place:home,role,age,level,coins:30,food:3,cargo:0,occupation:'original',unemployedDays:0,injuryDays:0,careerSkills:{craft:0,trade:0,carry:0,forage:0},energy:100,hunger:0,workDays:0,lastDay:1,history:[]});
export function makeNPCWorld(day=1){
 const individuals={};
 for(const [id,p] of Object.entries(people))individuals[id]=makePerson(id,p.name,p.off,p.role,p.age,'detailed');
 for(const [id,name,place,role,age] of ordinary)individuals[id]=makePerson(id,name,place,role,age,'ordinary');
 for(const person of Object.values(individuals)){person.lastDay=day;person.retirement.lastDay=day;person.study.lastDay=day;person.outlook.lastDay=day;person.age+=Math.floor((day-1)/360);}
 return {villageSchool:makeVillageSchool(day),journeys:makeJourneys(day),clinic:makeClinic(day),school:makeSchool(day),individuals,lineage:makeLineage(day),households:makeHouseholds(),social:makeSocial(day),contracts:makeContracts(day),background:{county:{population:1200,families:360},village:{population:700,families:210},liuxi:{population:350,families:100}},lastDay:day};
}
export function npcWorldValid(s){
 const root=s.npcWorld;if(!root||typeof root!=='object'||Array.isArray(root)||!bounded(root.lastDay,s.day)||root.lastDay<1||!root.individuals||typeof root.individuals!=='object'||Array.isArray(root.individuals))return false;
 if(!lineageValid(s)||!householdsValid(s)||!socialValid(s)||!contractsValid(root.contracts,s.day))return false;
 const canonical=makeNPCWorld();
 if(Object.keys(root.individuals).length!==Object.keys(canonical.individuals).length)return false;
 for(const [id,p] of Object.entries(root.individuals)){
  const init=canonical.individuals[id];
  if(!init||!p||!lifeValid(p.life,s.day)||!retirementValid(p.retirement,s.day)||!studyValid(p.study,s.day)||!outlookValid(p.outlook,s.day)||p.id!==id||p.name!==init.name||p.home!==init.home||p.role!==init.role||!Object.hasOwn(places,p.place)||!NPC_LEVELS.includes(p.level)||!bounded(p.age,130)||!bounded(p.coins,1000000)||!bounded(p.food,100)||!bounded(p.cargo,5)||!['original','carrier','shopworker','craftsman'].includes(p.occupation)||!bounded(p.unemployedDays,100000)||!bounded(p.injuryDays,30)||!p.careerSkills||typeof p.careerSkills!=='object'||Array.isArray(p.careerSkills)||Object.keys(p.careerSkills).length!==4||!['craft','trade','carry','forage'].every(k=>bounded(p.careerSkills[k],500))||!bounded(p.energy,100)||!bounded(p.hunger,100)||!bounded(p.workDays,100000)||!bounded(p.lastDay,s.day)||p.lastDay<1||!Array.isArray(p.history)||p.history.length>8||p.history.some(t=>typeof t!=='string'||t.length>180))return false;
 }
 if(!villageSchoolValid(s)||!schoolValid(s)||!clinicValid(s)||!journeysValid(s))return false;
 if(!root.background||typeof root.background!=='object'||Array.isArray(root.background)||Object.keys(root.background).length!==3)return false;
 return Object.entries(canonical.background).every(([area])=>{const b=root.background[area];return !!b&&bounded(b.population,1000000)&&bounded(b.families,300000)&&b.families<=b.population;});
}
export function npcAt(s,place){return Object.values(s.npcWorld.individuals).filter(p=>alive(p)&&p.place===place);}
const record=(p,line)=>{p.history=[line,...p.history].slice(0,8);};
export function tickNPCs(s,day){
 if(s.npcWorld.lastDay>=day)return [];
 for(const p of Object.values(s.npcWorld.individuals))if(p.lastDay<day&&alive(p)&&day%360===1&&day>1)p.age=Math.min(130,p.age+1);
 const notes=parentMortality(s,day);
 notes.push(...villageSchoolDay(s,day),...schoolDay(s,day),...clinicDay(s,day));
 const residents=Object.values(s.npcWorld.individuals);
 // Recover before finite clinical effort is spent; the current doctor settles
 // their own health first, so an ill doctor cannot treat earlier-loop patients.
 for(const p of residents){
  if(p.lastDay>=day||!alive(p))continue;
  if(p.injuryDays>0){p.injuryDays--;p.energy=Math.min(100,p.energy+12);}else p.energy=Math.min(100,p.energy+recoveryFor(p.age));
 }
 const doctor=clinicDoctor(s);
 if(doctor?.source){notes.push(...npcHealthDay(s,doctor,doctor.age,day).notes);saveResident(doctor);}
 for(const p of [...residents].sort((a,b)=>Number(b.id===doctor?.id)-Number(a.id===doctor?.id)))if(p.lastDay<day&&alive(p))notes.push(...npcHealthDay(s,p,p.age,day).notes);
 notes.push(...journeySteps(s,day));
 for(const p of residents){
  if(p.lastDay>=day)continue;
  const health={resting:p.life.restDay===day};
  if(!alive(p)){p.lastDay=day;continue;}
  if(p.food>0){p.food--;p.hunger=Math.max(0,p.hunger-12);}
  else p.hunger=Math.min(100,p.hunger+22);

  if(travelBusy(s,p.id)){p.lastDay=day;continue;}
  npcRetirementDay(s,p,p.age,day);
  if(!health.resting&&!p.retirement.active)npcCareerDay(s,p,day);
  familySupport(s,p,day);
  const bought=npcBuyFood(s,p,day);
  if(!bought&&p.hunger>=60&&p.hunger<82)record(p,'第'+day+'日缺粮，决定寻找新的谋生办法。');
  // No fictional workDays gain on days without an actual paid job.
  if(p.level==='ordinary'&&p.hunger>=80){p.level='detailed';record(p,'第'+day+'日经历严重缺粮，转入重要人物跟踪。');}
  ambitionDay(s,p,day,npcApplyShop);
  npcStudyDay(s,p,p.age,day);
  p.lastDay=day;
  if(p.hunger>=60&&p.history[0]?.includes('缺粮'))notes.push(p.name+'近日缺粮，正在寻求活计。');
 }
 notes.push(...familyResponsibility(s,day));
 notes.push(...socialDay(s,day));
 notes.unshift(...lineageDay(s,day));
 notes.push(...npcSparringDay(s,day));
 notes.push(...clinicTrainingDay(s,day));
 notes.push(...journeyDepartures(s,day));
 notes.push(...settleContracts(s,s.npcWorld.contracts,day));
 notes.push(...applyContractReputation(s,s.npcWorld.contracts,day));
 notes.push(...autonomousLoans(s,s.npcWorld.contracts,day));
 settleEstates(s);
 s.npcWorld.lastDay=day;
 return notes.slice(0,2);
}
