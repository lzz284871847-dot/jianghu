import {npcWork,npcBuyFood,npcProduce,npcSellProduce,npcTransport,npcCareerDay} from './npc-economy.js?v=1.5.0';
import {people,places} from './content.js?v=1.5.0';
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
const makePerson=(id,name,home,role,age,level)=>({id,name,home,place:home,role,age,level,coins:30,food:3,cargo:0,occupation:'original',unemployedDays:0,careerSkills:{craft:0,trade:0,carry:0,forage:0},energy:100,hunger:0,workDays:0,lastDay:1,history:[]});
export function makeNPCWorld(day=1){
 const individuals={};
 for(const [id,p] of Object.entries(people))individuals[id]=makePerson(id,p.name,p.off,p.role,p.age,'detailed');
 for(const [id,name,place,role,age] of ordinary)individuals[id]=makePerson(id,name,place,role,age,'ordinary');
 for(const person of Object.values(individuals)){person.lastDay=day;person.age+=Math.floor((day-1)/360);}
 return {individuals,background:{county:{population:1200,families:360},village:{population:700,families:210},liuxi:{population:350,families:100}},lastDay:day};
}
export function npcWorldValid(s){
 const root=s.npcWorld;if(!root||typeof root!=='object'||Array.isArray(root)||!bounded(root.lastDay,s.day)||root.lastDay<1||!root.individuals||typeof root.individuals!=='object'||Array.isArray(root.individuals))return false;
 const canonical=makeNPCWorld();
 if(Object.keys(root.individuals).length!==Object.keys(canonical.individuals).length)return false;
 for(const [id,p] of Object.entries(root.individuals)){
  const init=canonical.individuals[id];
  if(!init||!p||p.id!==id||p.name!==init.name||p.home!==init.home||p.role!==init.role||!Object.hasOwn(places,p.place)||!NPC_LEVELS.includes(p.level)||!bounded(p.age,130)||!bounded(p.coins,1000000)||!bounded(p.food,100)||!bounded(p.cargo,5)||!['original','carrier','shopworker','craftsman'].includes(p.occupation)||!bounded(p.unemployedDays,100000)||!p.careerSkills||typeof p.careerSkills!=='object'||Array.isArray(p.careerSkills)||Object.keys(p.careerSkills).length!==4||!['craft','trade','carry','forage'].every(k=>bounded(p.careerSkills[k],500))||!bounded(p.energy,100)||!bounded(p.hunger,100)||!bounded(p.workDays,100000)||!bounded(p.lastDay,s.day)||p.lastDay<1||!Array.isArray(p.history)||p.history.length>8||p.history.some(t=>typeof t!=='string'||t.length>180))return false;
 }
 if(!root.background||typeof root.background!=='object'||Array.isArray(root.background)||Object.keys(root.background).length!==3)return false;
 return Object.entries(canonical.background).every(([area])=>{const b=root.background[area];return !!b&&bounded(b.population,1000000)&&bounded(b.families,300000)&&b.families<=b.population;});
}
export function npcAt(s,place){return Object.values(s.npcWorld.individuals).filter(p=>p.place===place);}
const record=(p,line)=>{p.history=[line,...p.history].slice(0,8);};
export function tickNPCs(s,day){
 const notes=[];
 for(const p of Object.values(s.npcWorld.individuals)){
  if(p.lastDay>=day)continue;
  p.energy=Math.min(100,p.energy+25);
  if(p.food>0){p.food--;p.hunger=Math.max(0,p.hunger-12);}
  else p.hunger=Math.min(100,p.hunger+22);
  // Work and food are settled against real merchant funds and market inventories.
  // A closed or insolvent shop cannot pay wages or sell grain.
  npcCareerDay(s,p,day);
  const bought=npcBuyFood(s,p,day);
  if(!bought&&p.hunger>=60&&p.hunger<82)record(p,'第'+day+'日缺粮，决定寻找新的谋生办法。');
  // No fictional workDays gain on days without an actual paid job.
  if(day%360===1&&day>1)p.age=Math.min(130,p.age+1);
  if(p.level==='ordinary'&&p.hunger>=80){p.level='detailed';record(p,'第'+day+'日经历严重缺粮，转入重要人物跟踪。');}
  p.lastDay=day;
  if(p.hunger>=60&&p.history[0]?.includes('缺粮'))notes.push(p.name+'近日缺粮，正在寻求活计。');
 }
 s.npcWorld.lastDay=day;
 return notes.slice(0,2);
}
