import {alive} from './npc-mortality.js?v=4.20.0';
import {namedResidents,saveResident} from './npc-residents.js?v=4.20.0';
import {places} from './content.js?v=4.20.0';
import {train} from './martial-progression.js?v=4.20.0';
export const makeJourneys=(day=1)=>({lastDay:day,records:{}});
export const travelling=(s,id)=>{const v=s.npcWorld.journeys?.records[id];return !!v&&v.departedDay>v.returnedDay;};
export const travelBusy=(s,id)=>travelling(s,id)||s.npcWorld.journeys?.records[id]?.returnedDay===s.day;
export const travelPlace=(s,id)=>{const v=s.npcWorld.journeys?.records[id];return travelling(s,id)?s.day>v.departedDay?'liuxi':'road':null;};
const integer=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
export function journeysValid(s){
 const j=s.npcWorld.journeys;if(!j||typeof j!=='object'||Array.isArray(j)||Object.keys(j).length!==2||!integer(j.lastDay,s.day)||j.lastDay<1||!j.records||typeof j.records!=='object'||Array.isArray(j.records))return false;
 return Object.entries(j.records).every(([id,v])=>namedResidents(s).some(p=>p.id===id)&&v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===4&&integer(v.departedDay,s.day)&&v.departedDay>0&&integer(v.returnedDay,s.day)&&integer(v.completed,100000)&&Object.hasOwn(places,v.home)&&(v.home==='county'||places[v.home].routes.includes('county'))&&(v.returnedDay>=v.departedDay?v.completed>0&&v.returnedDay>=v.departedDay+2:v.returnedDay===0?v.completed===0:v.completed>0));
}
const record=(p,day,text)=>{p.history=['第'+day+'日'+text,...p.history].slice(0,8);saveResident(p);};
export function journeySteps(s,day){
 const j=s.npcWorld.journeys;if(j.lastDay>=day)return [];j.lastDay=day;const notes=[];
 for(const p of namedResidents(s)){
  const v=j.records[p.id];if(!v||!travelling(s,p.id)||!alive(p)||day<=v.departedDay)continue;
  if(day>=v.departedDay+2){v.returnedDay=day;v.completed=Math.min(100000,v.completed+1);if(!p.source)p.place=v.home;record(p,day,'沿柳溪集、官道与县城的原路归来，今日休整；没有游历钱物奖励。');notes.push(p.name+'结束柳溪短途游历，回到原居处。');continue;}
  if(!p.source)p.place='liuxi';
  const host=s.npcWorld.individuals.stallholder;
  if(alive(host)&&!travelBusy(s,host.id)&&!host.life.sickDays&&!host.injuryDays&&host.life.restDay!==day&&!host.retirement.active&&host.food>=1&&host.energy>=2&&host.coins<=999995&&p.coins>=5&&p.food<100){
   p.coins-=5;host.coins+=5;host.food--;p.food++;host.energy-=2;record(host,day,'为游历的'+p.name+'准备一份现有饭食，收5文、消耗精力2。');record(p,day,'到达柳溪集，向魏婶付5文换得现有口粮1份。');
  }else record(p,day,'到达柳溪集，未能购得饭食，继续使用自带口粮。');
  if(!p.life.sickDays&&!p.injuryDays&&p.life.restDay!==day&&p.energy>=12&&(p.study.practice<2400||p.study.insight<2400)){
   const adapter={hp:100,energy:p.energy,martial:{known:{qinghe_fist:true},practice:{qinghe_fist:p.study.practice},insight:{qinghe_fist:p.study.insight}}};
   const practice=p.study.practice,insight=p.study.insight;
   if(train(adapter,'qinghe_fist')){p.energy=adapter.energy;p.study.practice=adapter.martial.practice.qinghe_fist;p.study.insight=adapter.martial.insight.qinghe_fist;record(p,day,'游历途中自行练拳，消耗精力12，熟练+'+(p.study.practice-practice)+'、领悟+'+(p.study.insight-insight)+'。');}
  }
  saveResident(p);
 }
 return notes;
}
export function journeyDepartures(s,day){
 if(day%30)return [];const notes=[];
 for(const p of namedResidents(s)){
  const old=s.npcWorld.journeys.records[p.id],home=p.home||'market';
  if(!alive(p)||travelBusy(s,p.id)||old&&day-old.departedDay<60||old?.completed>=100000||p.id===s.npcWorld.school.holder||p.id===s.npcWorld.clinic.holder||p.outlook.temperament!=='enterprising'||p.age<18||p.age>=60||p.retirement.active||p.life.sickDays||p.life.restDay===day||p.injuryDays||p.hunger>=40||p.energy<50||p.food<3||p.coins<80||p.workDays<40||p.study.practice<120||p.study.experience<6||!(home==='county'||places[home].routes.includes('county')))continue;
  s.npcWorld.journeys.records[p.id]={departedDay:day,returnedDay:old?.returnedDay||0,completed:old?.completed||0,home};if(!p.source)p.place='road';record(p,day,'自行带现有口粮沿县城官道赴柳溪集游历，预计两日后归来；暂停原岗位，步行精力消耗0。');notes.push(p.name+'带上自己的口粮出门，沿官道短途游历。');
 }
 return notes;
}
export function journeySummary(s){const entries=Object.entries(s.npcWorld.journeys.records);return entries.length?entries.map(([id,v])=>{const p=namedResidents(s).find(p=>p.id===id);return p.name+' · '+(!alive(p)?'途中或归来后去世，游历记录保留':travelling(s,id)?'游历中：'+places[travelPlace(s,id)].name+'，第'+(v.departedDay+2)+'日预计归来':'第'+v.returnedDay+'日已归来')+' · 已完成'+v.completed+'次短途游历';}):['目前没有居民出发游历。'];}
