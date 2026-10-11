import {familyOf} from './npc-households.js?v=4.2.0';
// This first batch follows one established, unrelated friendship. No invented spouses
// or retrospective births are injected into existing households or population totals.
export const UNION_ID='farmhand01:shopassistant';
export const makeLineage=(day=1)=>({lastDay:day,courtshipDay:0,marriedDay:0,conceivedDay:0,children:[]});
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const integer=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
export const childAge=(c,day)=>Math.floor((day-c.bornDay)/360);
export const childStage=(c,day)=>{const age=childAge(c,day);return age<3?'幼儿':age<6?'孩童':age<16?'少年':'成年';};
export function lineageValid(s){
 const l=s.npcWorld?.lineage;
 if(!obj(l)||Object.keys(l).length!==5||!integer(l.lastDay,s.day)||l.lastDay<1||
 !['courtshipDay','marriedDay','conceivedDay'].every(k=>integer(l[k],l.lastDay))||
 !Array.isArray(l.children)||l.children.length>2)return false;
 if(l.marriedDay&&(!l.courtshipDay||l.marriedDay-l.courtshipDay<30))return false;
 if(l.conceivedDay&&(!l.marriedDay||l.conceivedDay<l.marriedDay+30))return false;
 return l.children.every((c,i)=>obj(c)&&Object.keys(c).length===5&&c.id==='chen-child-'+(i+1)&&
 integer(c.bornDay,l.lastDay)&&c.bornDay>=l.marriedDay+300&&l.marriedDay>0&&
 (!i||c.bornDay>=l.children[i-1].bornDay+360)&&integer(c.hunger,100)&&integer(c.learning,500)&&
 integer(c.lastDay,l.lastDay)&&c.lastDay>=c.bornDay)&&
 (!l.conceivedDay||!l.children.length||l.conceivedDay>=l.children.at(-1).bornDay+90)&&
 (!l.conceivedDay||l.children.length<2);
}
const parents=s=>[s.npcWorld.individuals.farmhand01,s.npcWorld.individuals.shopassistant];
const record=(p,day,text)=>{p.history=['第'+day+'日'+text,...p.history].slice(0,8);};
function ready(s){
 const ps=parents(s),bond=s.npcWorld.social.bonds[UNION_ID];
 return bond.trust>=70&&bond.resentment<20&&ps.every(p=>p.age>=18&&p.age<=55&&p.hunger<40&&p.injuryDays===0&&p.workDays>=20)&&ps.reduce((n,p)=>n+p.coins,0)>=60;
}
function feed(s){
 for(const p of parents(s))if(p.food>0){p.food--;return true;}
 for(const p of parents(s)){const h=s.npcWorld.households[familyOf(p.id)];if(h.food>0){h.food--;return true;}}
 return false;
}
export function lineageDay(s,day){
 const l=s.npcWorld.lineage;if(l.lastDay>=day)return [];
 const ps=parents(s),bond=s.npcWorld.social.bonds[UNION_ID],notes=[];
 // Existing friendship slowly deepens when both lives are stable; hunger cannot buy intimacy.
 if(!l.marriedDay&&day%7===0&&bond.resentment<20&&ps.every(p=>p.hunger<40&&p.workDays>0))bond.trust=Math.min(100,bond.trust+1);
 if(!l.marriedDay){
  if(!ready(s))l.courtshipDay=0;
  else if(!l.courtshipDay){l.courtshipDay=day;ps.forEach(p=>record(p,day,'开始与'+ps.find(x=>x!==p).name+'商议成家。'));}
  else if(day-l.courtshipDay>=30){l.marriedDay=day;ps.forEach(p=>record(p,day,'与'+ps.find(x=>x!==p).name+'结为夫妻，保留原有亲属互助。'));notes.push('陈二与小莲结亲，开始共同养家的生活。');}
 }
 if(l.marriedDay){
  // Spousal aid is a transfer between existing balances, once per simulated day.
  const needy=ps.find(p=>p.food===0&&p.hunger>=40),donor=ps.find(p=>p!==needy&&p.food>=2);
  if(needy&&donor){donor.food--;needy.food++;record(needy,day,'得到配偶分来的一份口粮。');}
  const latest=l.children.at(-1);
  if(!l.conceivedDay&&l.children.length<2&&day-l.marriedDay>=30&&(!latest||day-latest.bornDay>=90)&&ready(s)&&ps.reduce((n,p)=>n+p.food,0)>=2){
   l.conceivedDay=day;notes.push('陈二与小莲准备迎接孩子，养育将消耗家中实际口粮。');
  }else if(l.conceivedDay&&day-l.conceivedDay>=270){
   l.children.push({id:'chen-child-'+(l.children.length+1),bornDay:day,hunger:0,learning:0,lastDay:day});l.conceivedDay=0;
   ps.forEach(p=>record(p,day,'孩子出生，开始承担养育责任。'));notes.push('陈二与小莲的孩子出生。');
  }
 }
 for(const c of l.children){
  if(c.lastDay>=day)continue;
  c.hunger=feed(s)?Math.max(0,c.hunger-12):Math.min(100,c.hunger+22);
  const age=childAge(c,day),teacher=ps.find(p=>p.energy>=20&&p.hunger<40);
  if(age>=6&&age<16&&c.hunger<40&&teacher&&day%3===0){teacher.energy-=2;c.learning=Math.min(500,c.learning+1);}
  if(age>=16&&childAge(c,c.lastDay)<16)notes.push('陈二与小莲的孩子成年；职业接替尚待后续开放。');
  c.lastDay=day;
 }
 l.lastDay=day;return notes;
}
export function lineageSummary(s){
 const l=s.npcWorld.lineage;
 return [l.marriedDay?'陈二与小莲：夫妻，第'+l.marriedDay+'日结亲。':l.courtshipDay?'陈二与小莲：正在商议成家。':'陈二与小莲：尚未结亲，关系和生计条件仍需积累。',
 ...(l.conceivedDay?['正在孕育孩子，预计第'+(l.conceivedDay+270)+'日出生。']:[]),
 ...l.children.map((c,i)=>'孩子'+(i+1)+' · '+childAge(c,s.day)+'岁 · '+childStage(c,s.day)+' · '+(c.hunger>=60?'缺粮':c.hunger>=40?'口粮不足':'饮食尚稳')+' · 学习积累'+c.learning+'。')];
}
