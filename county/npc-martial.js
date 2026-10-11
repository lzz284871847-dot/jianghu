import {alive} from './npc-mortality.js?v=4.10.0';
import {MARTIAL_ARTS} from './martial-data.js?v=4.10.0';
import {learn,train} from './martial-progression.js?v=4.10.0';
import {people} from './content.js?v=4.10.0';
export const NPC_ART='qinghe_fist';
export const makeStudy=(day=1)=>({learnedDay:0,practice:0,insight:0,lastDay:day});
export const studyValid=(v,day)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===4&&
 ['learnedDay','practice','insight','lastDay'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0&&v[k]<=(['practice','insight'].includes(k)?2400:day))&&
 v.lastDay>=1&&v.learnedDay<=v.lastDay&&(v.learnedDay>0||v.practice===0&&v.insight===0);
export const studySummary=p=>p.id==='master'?'武馆教习':p.study.learnedDay?MARTIAL_ARTS[NPC_ART].name+' · 熟练'+p.study.practice+' · 领悟'+p.study.insight:'尚未习武';
const record=(p,day,line)=>{p.history=['第'+day+'日'+line,...p.history].slice(0,8);};
export function npcStudyDay(s,p,age,day){
 const v=p.study;if(!alive(p)||v.lastDay>=day)return false;v.lastDay=day;
 if(p.id==='master'||age<16||p.hunger>=40||p.injuryDays||p.life?.sickDays||p.life?.restDay===day||p.energy<30)return false;
 const adapter={place:'school',hp:100,coins:p.coins,energy:p.energy,relations:{},martial:{known:v.learnedDay?{[NPC_ART]:true}:{},equipped:NPC_ART,practice:{[NPC_ART]:v.practice},insight:{[NPC_ART]:v.insight},experience:{},mastery:{}}};
 if(!v.learnedDay){
  const reserve={enterprising:40,cautious:80,steadfast:60}[p.outlook.temperament];
  const teacher=s.npcWorld.individuals.master,fee=MARTIAL_ARTS[NPC_ART].tier*8;
  if(day%7||age>=65||p.workDays<10||p.coins<reserve||!alive(teacher)||teacher.retirement?.active||teacher.injuryDays||teacher.life.sickDays||teacher.life.restDay===day||teacher.energy<20||teacher.coins>1000000-fee||people.master.open>480||people.master.close<600)return false;
  if(!learn(adapter,NPC_ART))return false;
  p.coins=adapter.coins;teacher.coins+=fee;teacher.energy-=20;teacher.workDays=Math.min(100000,teacher.workDays+1);
  v.learnedDay=day;record(p,day,'自行到武馆付费'+fee+'文，向周师傅学习'+MARTIAL_ARTS[NPC_ART].name+'，招式还需练习。');
  record(teacher,day,'教授'+p.name+MARTIAL_ARTS[NPC_ART].name+'，收学费'+fee+'文。');return true;
 }
 if(day%3||v.practice===2400&&v.insight===2400)return false;
 if(!train(adapter,NPC_ART))return false;
 p.energy=adapter.energy;v.practice=adapter.martial.practice[NPC_ART];v.insight=adapter.martial.insight[NPC_ART];
 if(v.practice===12||v.practice%120===0)record(p,day,'自行练习'+MARTIAL_ARTS[NPC_ART].name+'，熟练'+v.practice+'、领悟'+v.insight+'；消耗精力12。');
 return true;
}
