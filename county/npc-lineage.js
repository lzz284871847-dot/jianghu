import {travelBusy} from './npc-journeys.js?v=4.28.0';
import {makeStudy,studyValid,studySummary,npcStudyDay} from './npc-martial.js?v=4.28.0';
import {makeOutlook,outlookValid,outlookSummary,ambitionDay,recordSiblingBond,recordFamilyBond} from './npc-social.js?v=4.28.0';
import {npcHealthDay,healthSummary} from './npc-health.js?v=4.28.0';
import {makeLife,lifeValid,alive,mortality,recoveryFor} from './npc-mortality.js?v=4.28.0';
import {npcCareerDay,npcBuyFood,npcCareer,npcApplyShop,makeRetirement,retirementValid,retirementSummary,npcRetirementDay} from './npc-economy.js?v=4.28.0';
import {familyOf} from './npc-households.js?v=4.28.0';
// This first batch follows one established, unrelated friendship. No invented spouses
// or retrospective births are injected into existing households or population totals.
export const UNION_ID='farmhand01:shopassistant';
export const makeLineage=(day=1)=>({lastDay:day,courtshipDay:0,marriedDay:0,conceivedDay:0,children:[]});
export const makeChildLivelihood=(id='chen-child-1',day=1)=>({retirement:makeRetirement(day),study:makeStudy(day),outlook:makeOutlook(id,day),coins:0,food:0,cargo:0,energy:100,workDays:0,unemployedDays:0,injuryDays:0,occupation:'original',careerSkills:{craft:0,trade:0,carry:0,forage:0},history:[]});
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const integer=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
export const childAge=(c,day)=>Math.floor(((c.life?.deathDay||day)-c.bornDay)/360);
export const childStage=(c,day)=>{const age=childAge(c,day);return age<3?'幼儿':age<6?'孩童':age<16?'少年':'成年';};
export function lineageValid(s){
 const l=s.npcWorld?.lineage;
 if(!obj(l)||Object.keys(l).length!==5||!integer(l.lastDay,s.day)||l.lastDay<1||
 !['courtshipDay','marriedDay','conceivedDay'].every(k=>integer(l[k],l.lastDay))||
 !Array.isArray(l.children)||l.children.length>2)return false;
 if(l.marriedDay&&(!l.courtshipDay||l.marriedDay-l.courtshipDay<30))return false;
 if(l.conceivedDay&&(!l.marriedDay||l.conceivedDay<l.marriedDay+30))return false;
 return l.children.every((c,i)=>obj(c)&&Object.keys(c).length===7&&lifeValid(c.life,l.lastDay)&&(!c.life.deathDay||c.life.deathDay>=c.bornDay)&&childLivelihoodValid(c.livelihood,l.lastDay)&&c.id==='chen-child-'+(i+1)&&
 integer(c.bornDay,l.lastDay)&&c.bornDay>=l.marriedDay+300&&l.marriedDay>0&&
 (!i||c.bornDay>=l.children[i-1].bornDay+360)&&integer(c.hunger,100)&&integer(c.learning,500)&&
 integer(c.lastDay,l.lastDay)&&c.lastDay>=c.bornDay)&&
 (!l.conceivedDay||!l.children.length||l.conceivedDay>=l.children.at(-1).bornDay+90)&&
 (!l.conceivedDay||l.children.length<2);
}
function childLivelihoodValid(v,day){
 return obj(v)&&Object.keys(v).length===13&&retirementValid(v.retirement,day)&&studyValid(v.study,day)&&outlookValid(v.outlook,day)&&integer(v.cargo,5)&&integer(v.coins,1000000)&&integer(v.food,100)&&integer(v.energy,100)&&
 integer(v.workDays,100000)&&integer(v.unemployedDays,100000)&&integer(v.injuryDays,30)&&
 ['original','carrier','shopworker','farmer'].includes(v.occupation)&&obj(v.careerSkills)&&Object.keys(v.careerSkills).length===4&&
 ['craft','trade','carry','forage'].every(k=>integer(v.careerSkills[k],500))&&Array.isArray(v.history)&&v.history.length<=8&&v.history.every(t=>typeof t==='string'&&t.length<=180);
}
const parents=s=>[s.npcWorld.individuals.farmhand01,s.npcWorld.individuals.shopassistant].filter(alive);
const record=(p,day,text)=>{p.history=['第'+day+'日'+text,...p.history].slice(0,8);};
function ready(s){
 const ps=parents(s),bond=s.npcWorld.social.bonds[UNION_ID];
 return ps.length===2&&bond.trust>=70&&bond.resentment<20&&ps.every(p=>!travelBusy(s,p.id)&&p.age>=18&&p.age<=55&&p.hunger<40&&p.injuryDays===0&&p.workDays>=20)&&ps.reduce((n,p)=>n+p.coins,0)>=60;
}
function feed(s,c,day){
 if(c.livelihood.food>0){c.livelihood.food--;return true;}
 if(travelBusy(s,c.id))return false;
 for(const p of parents(s))if(!travelBusy(s,p.id)&&p.food>0){p.food--;recordFamilyBond(s,p.id,c.id,day,p.name+'分出口粮1份供养子女。');return true;}
 for(const id of ['farmhand01','shopassistant']){const h=s.npcWorld.households[familyOf(id)];if(!travelBusy(s,id)&&h.food>0){h.food--;return true;}}
 return false;
}
// Orphan support moves existing balances before health bills and the daily meal.
function siblingCare(s,c,day){
 if(childAge(c,day)>=16||parents(s).length||travelBusy(s,c.id))return;
 const donor=s.npcWorld.lineage.children.find(x=>x!==c&&alive(x)&&childAge(x,day)>=16&&!travelBusy(s,x.id)&&x.hunger<40&&!x.life.sickDays&&x.life.restDay!==day&&!x.livelihood.injuryDays&&x.livelihood.energy>=20);
 if(!donor)return;
 const from=donor.livelihood,to=c.livelihood,aid=[];
 const reserve=['farmhand01','shopassistant'].some(id=>!travelBusy(s,id)&&s.npcWorld.households[familyOf(id)].food>0);
 if(!to.food&&!reserve&&from.food>=2){from.food--;to.food++;aid.push('口粮1份');}
 if(c.life.sickDays&&to.coins<8&&from.coins>=20){const fee=8-to.coins;from.coins-=fee;to.coins+=fee;aid.push('诊金'+fee+'文');}
 if(aid.length){const name='陈家孩子'+(s.npcWorld.lineage.children.indexOf(c)+1);record(from,day,'父母俱亡后分出'+aid.join('、')+'扶养'+name+'。');record(to,day,'得到成年兄姐分来的'+aid.join('、')+'，用于生活与就医。');recordSiblingBond(s,donor.id,c.id,day,'成年兄姐分出'+aid.join('、')+'扶养'+name+'。');}
}
export function lineageDay(s,day){
 const l=s.npcWorld.lineage;if(l.lastDay>=day)return [];
 const ps=parents(s),bond=s.npcWorld.social.bonds[UNION_ID],notes=[];
 // Existing friendship slowly deepens when both lives are stable; hunger cannot buy intimacy.
 if(!l.marriedDay&&day%7===0&&bond.resentment<20&&ps.length===2&&ps.every(p=>!travelBusy(s,p.id)&&p.hunger<40&&p.workDays>0))bond.trust=Math.min(100,bond.trust+1);
 if(!l.marriedDay){
  if(!ready(s))l.courtshipDay=0;
  else if(!l.courtshipDay){l.courtshipDay=day;ps.forEach(p=>record(p,day,'开始与'+ps.find(x=>x!==p).name+'商议成家。'));}
  else if(day-l.courtshipDay>=30){l.marriedDay=day;ps.forEach(p=>record(p,day,'与'+ps.find(x=>x!==p).name+'结为夫妻，保留原有亲属互助。'));notes.push('陈二与小莲结亲，开始共同养家的生活。');}
 }
 if(!alive(s.npcWorld.individuals.shopassistant))l.conceivedDay=0;
 if(l.marriedDay){
  // Spousal aid is a transfer between existing balances, once per simulated day.
  const needy=ps.find(p=>p.food===0&&p.hunger>=40),donor=ps.find(p=>p!==needy&&p.food>=2);
  if(needy&&donor&&!travelBusy(s,needy.id)&&!travelBusy(s,donor.id)){donor.food--;needy.food++;record(needy,day,'得到配偶分来的一份口粮。');}
  const latest=l.children.at(-1);
  if(!l.conceivedDay&&l.children.length<2&&day-l.marriedDay>=30&&(!latest||day-latest.bornDay>=90)&&ready(s)&&ps.reduce((n,p)=>n+p.food,0)>=2){
   l.conceivedDay=day;notes.push('陈二与小莲准备迎接孩子，养育将消耗家中实际口粮。');
  }else if(l.conceivedDay&&day-l.conceivedDay>=270){
   l.children.push({life:makeLife(),livelihood:makeChildLivelihood('chen-child-'+(l.children.length+1),day),id:'chen-child-'+(l.children.length+1),bornDay:day,hunger:0,learning:0,lastDay:day});l.conceivedDay=0;
   ps.forEach(p=>record(p,day,'孩子出生，开始承担养育责任。'));notes.push('陈二与小莲的孩子出生。');
  }
 }
 for(const c of l.children){
  if(c.lastDay>=day)continue;
  if(!alive(c)){c.lastDay=day;continue;}
  const age=childAge(c,day);
  if(mortality(c,age,c.hunger,day)){c.lastDay=day;notes.push('陈家孩子'+(l.children.indexOf(c)+1)+'去世，停止谋生，钱粮转交在世家人。');continue;}
  siblingCare(s,c,day);
  const v=c.livelihood;
  const patient={...v,life:c.life,id:c.id,name:'陈家孩子'+(l.children.indexOf(c)+1),hunger:c.hunger};
  const health=npcHealthDay(s,patient,age,day,ps);notes.push(...health.notes);
  for(const key of Object.keys(v))v[key]=patient[key];
  if(!alive(c)){c.lastDay=day;continue;}
  if(age>=16){
   const retiree={...v,life:c.life,id:c.id,hunger:c.hunger};
   npcRetirementDay(s,retiree,age,day);
   for(const key of Object.keys(v))v[key]=retiree[key];
   // One real family farm slot, released by death or retirement. No copied skill.
   const father=s.npcWorld.individuals.farmhand01,canSeekFarm=v.occupation==='original'||v.occupation==='carrier'&&v.unemployedDays>=3;
   if(!travelBusy(s,c.id)&&!health.resting&&!v.retirement.active&&!v.injuryDays&&c.hunger<80&&(!alive(father)||father.retirement.active)&&c.learning>=20&&canSeekFarm&&!l.children.some(x=>x!==c&&alive(x)&&!x.livelihood.retirement.active&&x.livelihood.occupation==='farmer')){
    v.occupation='farmer';v.unemployedDays=0;
    v.history=['第'+day+'日接手'+(alive(father)?'父亲退养后空出的':'父亲留下的')+'农事岗位，从自己的采收经验开始。',...v.history].slice(0,8);
    notes.push('陈家孩子'+(l.children.indexOf(c)+1)+'接手家中农事，能否收成与出售仍有风险。');
   }
   if(v.injuryDays>0){v.injuryDays--;v.energy=Math.min(100,v.energy+12);}else v.energy=Math.min(100,v.energy+recoveryFor(age));
   // The adapter uses the child's persisted purse and skills. No new NPC wallet is minted.
   const worker={...v,life:c.life,id:c.id,name:'陈家孩子'+(l.children.indexOf(c)+1),home:'market',level:'ordinary',hunger:c.hunger};
   if(!travelBusy(s,c.id)){if(!health.resting&&!v.retirement.active)npcCareerDay(s,worker,day);npcBuyFood(s,worker,day);}
   ambitionDay(s,worker,day,npcApplyShop);
   npcStudyDay(s,worker,age,day);
   for(const key of Object.keys(v))v[key]=worker[key];
   const needy=ps.find(p=>!travelBusy(s,p.id)&&(p.age>=60||p.injuryDays>=2||p.unemployedDays>=4||p.hunger>=55)&&(p.coins<12||p.food===0));
   if(!travelBusy(s,c.id)&&needy&&c.hunger<40){
    if(v.food>=2&&needy.food===0){v.food--;needy.food++;record(needy,day,'成年子女分来一份口粮赡养。');recordFamilyBond(s,c.id,needy.id,day,'成年子女分出口粮1份赡养'+needy.name+'。');}
    if(v.coins>=15&&needy.coins<12){const aid=Math.min(3,12-needy.coins);v.coins-=aid;needy.coins+=aid;record(needy,day,'成年子女接济'+aid+'文赡养。');recordFamilyBond(s,c.id,needy.id,day,'成年子女接济'+aid+'文赡养'+needy.name+'。');}
   }
  }
  c.hunger=feed(s,c,day)?Math.max(0,c.hunger-12):Math.min(100,c.hunger+22);
  const canTeach=p=>!travelBusy(s,p.id)&&!p.life.sickDays&&p.life.restDay!==day&&!p.injuryDays&&p.energy>=20&&p.hunger<40;
  const teacher=ps.find(canTeach);
  if(!health.resting&&!v.injuryDays&&!travelBusy(s,c.id)&&age>=6&&age<16&&c.hunger<40&&c.learning<500&&day%3===0){
   if(teacher){teacher.energy-=2;c.learning++;recordFamilyBond(s,teacher.id,c.id,day,teacher.name+'耗费精力2教导子女，学习积累增加1。');}
   else if(!ps.length){
    const sibling=l.children.find(x=>x!==c&&alive(x)&&childAge(x,day)>=16&&x.learning>=20&&canTeach({...x.livelihood,id:x.id,life:x.life,hunger:x.hunger}));
    if(sibling){
     sibling.livelihood.energy-=2;c.learning++;
     const student='陈家孩子'+(l.children.indexOf(c)+1),tutor='陈家孩子'+(l.children.indexOf(sibling)+1);
     record(sibling.livelihood,day,'耗费精力2教养'+student+'，传授日常见识。');
     record(v,day,'随成年兄姐学习日常见识，学习积累增加1。');
     recordSiblingBond(s,sibling.id,c.id,day,tutor+'耗费精力2教养'+student+'，学习积累增加1。');
     notes.push(tutor+'耗费精力教养'+student+'，学习积累增加1。');
    }
   }
  }
  if(age>=16&&childAge(c,c.lastDay)<16)notes.push('陈二与小莲的孩子成年，开始自行寻找谋生岗位。');
  c.lastDay=day;
 }
 l.lastDay=day;return notes;
}
export function lineageSummary(s){
 const l=s.npcWorld.lineage;
 return [...parents(s).map(p=>p.name+' · '+p.age+'岁 · '+(p.age>=65?'老年，体力恢复减慢':'在世')+' · 衰弱'+p.life.frailty+'/100 · '+healthSummary(p,s.day)+' · '+outlookSummary(p)+' · '+studySummary(p)+' · '+retirementSummary(p)+'。'),...['farmhand01','shopassistant'].filter(id=>!alive(s.npcWorld.individuals[id])).map(id=>s.npcWorld.individuals[id].name+'：第'+s.npcWorld.individuals[id].life.deathDay+'日去世，原有经历保留；未转交钱粮'+s.npcWorld.individuals[id].coins+'文、'+s.npcWorld.individuals[id].food+'份；原有待售产物'+s.npcWorld.individuals[id].cargo+'份保留在遗物中。'),l.marriedDay?'陈二与小莲：夫妻，第'+l.marriedDay+'日结亲。':l.courtshipDay?'陈二与小莲：正在商议成家。':'陈二与小莲：尚未结亲，关系和生计条件仍需积累。',
 ...(l.conceivedDay?['正在孕育孩子，预计第'+(l.conceivedDay+270)+'日出生。']:[]),
 ...l.children.map((c,i)=>'孩子'+(i+1)+' · '+childAge(c,s.day)+'岁 · '+(alive(c)?childStage(c,s.day):'已故，第'+c.life.deathDay+'日去世')+' · '+(c.hunger>=60?'缺粮':c.hunger>=40?'口粮不足':'饮食尚稳')+' · '+healthSummary(c,s.day)+' · '+outlookSummary(c.livelihood)+' · '+studySummary(c.livelihood)+' · '+retirementSummary(c.livelihood)+' · 学习积累'+c.learning+(!alive(c)?' · 未转交钱粮'+c.livelihood.coins+'文、'+c.livelihood.food+'份':childAge(c,s.day)>=16?' · '+({original:'求职中',carrier:'运输短工',shopworker:'商铺伙计',farmer:'接班农户'}[c.livelihood.occupation])+' · '+npcCareer({...c.livelihood,id:c.id}).label+' · 积蓄'+c.livelihood.coins+'文 · 劳动'+c.livelihood.workDays+'日 · 待售蔬菜'+c.livelihood.cargo+'份':'')+'。')];
}
