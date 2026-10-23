import {makeStudy,studyValid} from './npc-martial.js?v=5.68.0';
import {makeOutlook,outlookValid} from './npc-social.js?v=5.68.0';
import {lifeValid} from './npc-mortality.js?v=5.68.0';
import {makeRetirement,retirementValid} from './npc-economy.js?v=5.68.0';
// Legacy save schema only. Marriage, births, descendants and succession no longer run.
export const UNION_ID='farmhand01:shopassistant';
export const makeLineage=(day=1)=>({lastDay:day,courtshipDay:0,marriedDay:0,conceivedDay:0,children:[]});
export const makeChildLivelihood=(id='chen-child-1',day=1)=>({retirement:makeRetirement(day),study:makeStudy(day),outlook:makeOutlook(id,day),coins:0,food:0,cargo:0,energy:100,workDays:0,unemployedDays:0,injuryDays:0,occupation:'original',careerSkills:{craft:0,trade:0,carry:0,forage:0},history:[]});
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const integer=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
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
