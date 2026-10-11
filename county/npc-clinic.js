import {alive} from './npc-mortality.js?v=4.18.0';
import {namedResidents,saveResident} from './npc-residents.js?v=4.18.0';
import {marketPrice,stockAt} from './commerce.js?v=4.18.0';
import {districtStatus} from './society.js?v=4.18.0';
export const makeClinic=(day=1)=>({holder:'doctor',appointedDay:0,lastDay:day,learners:{}});
export const clinicDoctor=s=>namedResidents(s).find(p=>p.id===s.npcWorld.clinic.holder);
const fit=(p,day)=>!!p&&alive(p)&&!p.retirement.active&&!p.life.sickDays&&!p.injuryDays&&p.life.restDay!==day;
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export function clinicValid(s){
 const c=s.npcWorld.clinic;if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).length!==4||typeof c.holder!=='string'||!integer(c.lastDay,s.day)||c.lastDay<1||!integer(c.appointedDay,c.lastDay)||!c.learners||typeof c.learners!=='object'||Array.isArray(c.learners))return false;
 const residents=namedResidents(s);if(!Object.entries(c.learners).every(([id,v])=>residents.some(p=>p.id===id)&&v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===2&&integer(v.practice,500)&&v.practice>0&&integer(v.lastDay,s.day)&&v.lastDay>=1))return false;
 return c.holder===''||residents.some(p=>p.id===c.holder)&&(c.holder==='doctor'?c.appointedDay===0:c.appointedDay>0&&c.learners[c.holder]?.practice>=20);
}
export function clinicQuote(s,payer,doctor){
 const quote=marketPrice(s,'market','buy','herb');
 return fit(doctor,s.day)&&doctor.energy>=10&&payer.coins>=8&&!districtStatus(s,'market').closed&&quote!==null&&stockAt(s,'market','herb')>0&&doctor.coins+8-quote>=0&&doctor.coins+8-quote<=1000000&&s.commerce.budget.market+quote<=1000000?quote:null;
}
export function payClinic(s,payer,doctor){
 const quote=clinicQuote(s,payer,doctor);if(quote===null)return null;
 payer.coins-=8;doctor.coins+=8-quote;doctor.energy-=10;doctor.workDays=Math.min(100000,doctor.workDays+1);s.commerce.budget.market+=quote;s.commerce.stock.market.herb--;saveResident(doctor);return quote;
}
const record=(p,day,text)=>{p.history=['第'+day+'日'+text,...p.history].slice(0,8);saveResident(p);};
export function clinicDay(s,day){
 const c=s.npcWorld.clinic;if(c.lastDay>=day)return [];c.lastDay=day;const old=clinicDoctor(s);if(old&&alive(old))return [];
 c.holder='';const p=namedResidents(s).filter(p=>fit(p,day)&&p.age>=16&&p.age<65&&p.hunger<40&&c.learners[p.id]?.practice>=20).sort((a,b)=>c.learners[b.id].practice-c.learners[a.id].practice||a.id.localeCompare(b.id))[0];
 if(!p)return [];c.holder=p.id;c.appointedDay=day;record(p,day,'凭自己已完成的'+c.learners[p.id].practice+'次实际跟诊接任河湾村医者；不获额外医术、药材或钱物。');return [p.name+'凭真实跟诊积累接任河湾村医者。'];
}
export function clinicTrainingDay(s,day){
 if(day%7)return [];const c=s.npcWorld.clinic,notes=[];
 for(const p of namedResidents(s)){
  const progress=c.learners[p.id];if(p.id===c.holder||progress?.lastDay>=day||progress?.practice>=500||!(p.id==='herbalist'||p.id.startsWith('chen-child-')&&['forage','craft'].includes(p.outlook.ambition))||!fit(p,day)||p.age<16||p.age>=65||p.hunger>=40||p.food<2||p.workDays<40||p.energy<24)continue;
  const reserve={enterprising:40,cautious:80,steadfast:60}[p.outlook.temperament];if(p.coins<reserve+8)continue;
  const doctor=clinicDoctor(s),quote=payClinic(s,p,doctor);if(quote===null)continue;
  p.energy-=12;c.learners[p.id]={practice:(progress?.practice||0)+1,lastDay:day};record(p,day,'自行付费8文跟诊，实际消耗药材1份、精力12，跟诊积累'+c.learners[p.id].practice+'次。');record(doctor,day,'指导'+p.name+'跟诊，收学费8文，购药'+quote+'文、用药1份，消耗精力10。');notes.push(p.name+'自行到河湾村付费跟诊学习。');
 }
 return notes;
}
export function clinicSummary(s){const d=clinicDoctor(s);return [d&&alive(d)?'河湾村医者：'+d.name+(d.id==='doctor'?'，原有医者。':'，第'+s.npcWorld.clinic.appointedDay+'日接任。'):'河湾村医者空缺，等待已有20次实际跟诊积累的在世居民接任。',...Object.entries(s.npcWorld.clinic.learners).map(([id,v])=>namedResidents(s).find(p=>p.id===id).name+' · 跟诊积累'+v.practice+'次 · 最近跟诊第'+v.lastDay+'日')];}
