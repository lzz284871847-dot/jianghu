import {alive} from './npc-mortality.js?v=4.11.0';
import {MARTIAL_ARTS} from './martial-data.js?v=4.11.0';
import {canLearn,learn,train} from './martial-progression.js?v=4.11.0';
import {people} from './content.js?v=4.11.0';
export const NPC_ART='qinghe_fist';
export const makeStudy=(day=1)=>({learnedDay:0,practice:0,insight:0,lastDay:day,otherArts:{},teacherTrust:0});
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const bounded=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export const studyValid=(v,day)=>obj(v)&&Object.keys(v).length===6&&
 ['learnedDay','practice','insight','lastDay'].every(k=>bounded(v[k],['practice','insight'].includes(k)?2400:day))&&
 v.lastDay>=1&&v.learnedDay<=v.lastDay&&bounded(v.teacherTrust,100)&&obj(v.otherArts)&&
 Object.entries(v.otherArts).every(([id,a])=>Object.hasOwn(MARTIAL_ARTS,id)&&id!==NPC_ART&&MARTIAL_ARTS[id].source!=='village'&&obj(a)&&Object.keys(a).length===3&&a.learnedDay>=v.learnedDay&&a.learnedDay>0&&bounded(a.learnedDay,v.lastDay)&&bounded(a.practice,2400)&&bounded(a.insight,2400))&&
 (v.learnedDay>0||v.practice===0&&v.insight===0&&v.teacherTrust===0&&Object.keys(v.otherArts).length===0);
const arts=v=>v.learnedDay?[[NPC_ART,v],...Object.entries(v.otherArts)]:[];
export const studySummary=p=>p.id==='master'?'武馆教习':p.study.learnedDay?arts(p.study).map(([id,a])=>MARTIAL_ARTS[id].name+' · 熟练'+a.practice+' · 领悟'+a.insight).join('；')+' · 教习信任'+p.study.teacherTrust:'尚未习武';
const record=(p,day,line)=>{p.history=['第'+day+'日'+line,...p.history].slice(0,8);};
export function npcStudyDay(s,p,age,day){
 const v=p.study;if(!alive(p)||v.lastDay>=day)return false;v.lastDay=day;
 if(p.id==='master'||age<16||p.hunger>=40||p.injuryDays||p.life?.sickDays||p.life?.restDay===day||p.energy<30)return false;
 const known=arts(v),adapter={place:'school',hp:100,coins:p.coins,energy:p.energy,relations:{master:v.teacherTrust},martial:{known:Object.fromEntries(known.map(([id])=>[id,true])),equipped:NPC_ART,practice:Object.fromEntries(known.map(([id,a])=>[id,a.practice])),insight:Object.fromEntries(known.map(([id,a])=>[id,a.insight])),experience:{},mastery:{}}};
 // Only actual paid lessons build trust. Higher tiers reuse the player's two-art prerequisite.
 if(!v.learnedDay||v.practice>=120){
  const target=!v.learnedDay?NPC_ART:Object.keys(MARTIAL_ARTS).filter(id=>MARTIAL_ARTS[id].source!=='village').sort((a,b)=>MARTIAL_ARTS[b].tier-MARTIAL_ARTS[a].tier).find(id=>!canLearn(adapter,id));
  const reserve={enterprising:40,cautious:80,steadfast:60}[p.outlook.temperament];
  const teacher=s.npcWorld.individuals.master,fee=target?MARTIAL_ARTS[target].tier*8:0;
  if(target&&day%7===0&&age<65&&p.workDays>=10&&p.coins>=reserve&&alive(teacher)&&!teacher.retirement?.active&&!teacher.injuryDays&&!teacher.life.sickDays&&teacher.life.restDay!==day&&teacher.energy>=20&&teacher.coins<=1000000-fee&&people.master.open<=480&&people.master.close>=600&&learn(adapter,target)){
   p.coins=adapter.coins;teacher.coins+=fee;teacher.energy-=20;teacher.workDays=Math.min(100000,teacher.workDays+1);
   if(target===NPC_ART)v.learnedDay=day;else v.otherArts[target]={learnedDay:day,practice:0,insight:0};
   v.teacherTrust=Math.min(100,v.teacherTrust+5);
   record(p,day,'自行到武馆付费'+fee+'文，向周师傅学习'+MARTIAL_ARTS[target].name+'，招式还需练习。');
   record(teacher,day,'教授'+p.name+MARTIAL_ARTS[target].name+'，收学费'+fee+'文。');return true;
  }
 }
 // Practise the least trained known art; exactly one real energy charge each training day.
 const next=known.filter(([,a])=>a.practice<2400||a.insight<2400).sort((a,b)=>a[1].practice-b[1].practice||a[1].insight-b[1].insight)[0];
 if(day%3||!next)return false;
 const [id,a]=next;if(!train(adapter,id))return false;
 p.energy=adapter.energy;a.practice=adapter.martial.practice[id];a.insight=adapter.martial.insight[id];
 if(a.practice===12||a.practice%120===0)record(p,day,'自行练习'+MARTIAL_ARTS[id].name+'，熟练'+a.practice+'、领悟'+a.insight+'；消耗精力12。');
 return true;
}
