import {villageTeacher,villageCanTeach} from './npc-village-school.js?v=5.27.0';
import {travelBusy} from './npc-journeys.js?v=5.27.0';
import {schoolTeacher,schoolCanTeach,saveSchoolTeacher} from './npc-school.js?v=5.27.0';
import {alive} from './npc-mortality.js?v=5.27.0';
import {MARTIAL_ARTS} from './martial-data.js?v=5.27.0';
import {canLearn,learn,train} from './martial-progression.js?v=5.27.0';
import {people} from './content.js?v=5.27.0';
export const NPC_ART='qinghe_fist';
export const makeMentor=()=>({joinedDay:0,endedDay:0,lastAidDay:0,aidCount:0});
export const makeStudy=(day=1)=>({learnedDay:0,practice:0,insight:0,lastDay:day,otherArts:{},teacherTrust:0,experience:0,mastery:0,lastSparDay:0,mentor:makeMentor()});
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const bounded=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export const studyValid=(v,day)=>obj(v)&&Object.keys(v).length===10&&
 ['learnedDay','practice','insight','lastDay'].every(k=>bounded(v[k],['practice','insight'].includes(k)?2400:day))&&
 v.lastDay>=1&&v.learnedDay<=v.lastDay&&mentorValid(v.mentor,v)&&bounded(v.experience,2400)&&bounded(v.mastery,2400)&&bounded(v.lastSparDay,v.lastDay)&&(!v.lastSparDay||v.lastSparDay>=v.learnedDay)&&bounded(v.teacherTrust,100)&&obj(v.otherArts)&&
 Object.entries(v.otherArts).every(([id,a])=>Object.hasOwn(MARTIAL_ARTS,id)&&id!==NPC_ART&&obj(a)&&Object.keys(a).length===3&&a.learnedDay>=v.learnedDay&&a.learnedDay>0&&bounded(a.learnedDay,v.lastDay)&&bounded(a.practice,2400)&&bounded(a.insight,2400))&&
 (v.learnedDay>0||v.practice===0&&v.insight===0&&v.teacherTrust===0&&v.experience===0&&v.mastery===0&&v.lastSparDay===0&&Object.keys(v.otherArts).length===0);
const mentorValid=(m,v)=>obj(m)&&Object.keys(m).length===4&&['joinedDay','endedDay','lastAidDay'].every(k=>bounded(m[k],v.lastDay))&&bounded(m.aidCount,100000)&&(!m.joinedDay?m.endedDay===0&&m.lastAidDay===0&&m.aidCount===0:v.learnedDay>0&&m.joinedDay>=v.learnedDay&&v.practice>=120&&v.teacherTrust>=12&&(!m.endedDay||m.endedDay>=m.joinedDay)&&(!m.lastAidDay||m.lastAidDay>=m.joinedDay)&&(!m.endedDay||m.lastAidDay<=m.endedDay)&&(m.aidCount===0?m.lastAidDay===0:m.lastAidDay>0));
const arts=v=>v.learnedDay?[[NPC_ART,v],...Object.entries(v.otherArts)]:[];
export const studySummary=p=>p.id==='master'?'武馆教习':p.study.learnedDay?arts(p.study).map(([id,a])=>MARTIAL_ARTS[id].name+' · 熟练'+a.practice+' · 领悟'+a.insight).join('；')+' · 实战'+p.study.experience+' · 掌握'+p.study.mastery+' · 教习信任'+p.study.teacherTrust+(p.study.mentor.joinedDay?' · 师承周师傅（第'+p.study.mentor.joinedDay+'日拜师'+(p.study.mentor.endedDay?'，师傅已故':'')+'，救济'+p.study.mentor.aidCount+'次）':'')+(p.study.lastSparDay?' · 最近切磋第'+p.study.lastSparDay+'日':''):'尚未习武';
const record=(p,day,line)=>{p.history=['第'+day+'日'+line,...p.history].slice(0,8);};
function mentorshipDay(s,p,age,day){
 const v=p.study,m=v.mentor,t=s.npcWorld.individuals.master;
 if(p.id==='master')return false;
 if(m.joinedDay&&!m.endedDay&&!alive(t)){m.endedDay=Math.max(m.joinedDay,t.life.deathDay);record(p,day,'周师傅去世，保留师承与已学武艺，不再求教或转交救济。');return false;}
 if(m.endedDay||age<16||day%7||p.hunger>=40||p.injuryDays||p.life.sickDays||p.life.restDay===day||p.energy<30)return false;
 if(!m.joinedDay){
  if(age<16||age>=65||p.retirement.active||v.practice<120||v.teacherTrust<12||!alive(t)||t.retirement.active||t.injuryDays||t.life.sickDays||t.life.restDay===day||t.energy<4)return false;
  m.joinedDay=day;p.energy-=4;t.energy-=4;record(p,day,'凭既有武艺和教习信任正式拜周师傅为师，双方精力各消耗4；不赠钱粮或武学。');record(t,day,'认可'+p.name+'已有的练武积累，正式收徒；消耗精力4。');return true;
 }
 if(m.lastAidDay===day||m.aidCount>=100000)return false;
 const reserve={enterprising:40,cautious:80,steadfast:60}[p.outlook.temperament];let gift='';
 if(t.coins<=4&&p.coins>=reserve+3){p.coins-=3;t.coins+=3;gift='3文';}
 else if(t.food===0&&t.hunger>=40&&p.food>=3){p.food--;t.food++;gift='1份口粮';}
 if(!gift)return false;
 p.energy-=4;m.lastAidDay=day;m.aidCount++;record(p,day,'自行探望困顿的师傅，转交'+gift+'；消耗精力4。');record(t,day,'收到徒弟'+p.name+'转交的'+gift+'，来源为徒弟自身积蓄。');return true;
}
export function npcStudyDay(s,p,age,day){
 const v=p.study;if(!alive(p)||v.lastDay>=day)return false;v.lastDay=day;
 if(!travelBusy(s,p.id)&&mentorshipDay(s,p,age,day))return true;
 if(travelBusy(s,p.id)||p.id==='master'||age<16||p.hunger>=40||p.injuryDays||p.life?.sickDays||p.life?.restDay===day||p.energy<30)return false;
 const known=arts(v),adapter={place:'school',hp:100,coins:p.coins,energy:p.energy,relations:{master:v.teacherTrust},martial:{known:Object.fromEntries(known.map(([id])=>[id,true])),equipped:NPC_ART,practice:Object.fromEntries(known.map(([id,a])=>[id,a.practice])),insight:Object.fromEntries(known.map(([id,a])=>[id,a.insight])),experience:{},mastery:{}}};
 // Only actual paid lessons build trust. Higher tiers reuse the player's two-art prerequisite.
 if(!v.learnedDay||v.practice>=120){
  const village=p.outlook.ambition==='forage'&&p.id!==s.npcWorld.villageSchool.holder?Object.keys(MARTIAL_ARTS).filter(id=>MARTIAL_ARTS[id].source==='village'&&villageCanTeach(s,id)):[];
  const school=Object.keys(MARTIAL_ARTS).filter(id=>MARTIAL_ARTS[id].source!=='village'&&schoolCanTeach(s,id)).sort((a,b)=>MARTIAL_ARTS[b].tier-MARTIAL_ARTS[a].tier);
  const target=!v.learnedDay?NPC_ART:[...village,...school].find(id=>{adapter.place=MARTIAL_ARTS[id].source==='village'?'village':'school';return !canLearn(adapter,id);});
  const reserve={enterprising:40,cautious:80,steadfast:60}[p.outlook.temperament];
  const teacherId=target&&MARTIAL_ARTS[target].source==='village'?'farmer':'master';
  const teacher=teacherId==='master'?schoolTeacher(s):villageTeacher(s),hours=people[teacherId],fee=target?MARTIAL_ARTS[target].tier*8:0;
  if(target&&teacher&&teacher.id!==p.id&&(teacherId==='master'?schoolCanTeach(s,target):villageCanTeach(s,target))&&day%7===0&&age<65&&p.workDays>=10&&p.coins>=reserve&&alive(teacher)&&!teacher.retirement?.active&&!teacher.injuryDays&&!teacher.life.sickDays&&teacher.life.restDay!==day&&teacher.energy>=20&&teacher.coins<=1000000-fee&&hours.open<=480&&hours.close>=600&&learn(adapter,target)){
   p.coins=adapter.coins;teacher.coins+=fee;teacher.energy-=20;teacher.workDays=Math.min(100000,teacher.workDays+1);
   if(target===NPC_ART)v.learnedDay=day;else v.otherArts[target]={learnedDay:day,practice:0,insight:0};
   if(teacherId==='master')v.teacherTrust=Math.min(100,v.teacherTrust+5);
   record(p,day,'自行到'+(teacherId==='master'?'武馆':'河湾村')+'付费'+fee+'文，向'+teacher.name+'学习'+MARTIAL_ARTS[target].name+'，招式还需练习。');
   record(teacher,day,'教授'+p.name+MARTIAL_ARTS[target].name+'，收学费'+fee+'文。');saveSchoolTeacher(teacher);return true;
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
