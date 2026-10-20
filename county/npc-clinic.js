import {travelBusy} from './npc-journeys.js?v=5.40.0';
import {alive} from './npc-mortality.js?v=5.40.0';
import {namedResidents,saveResident} from './npc-residents.js?v=5.40.0';
import {marketPrice,stockAt} from './commerce.js?v=5.40.0';
import {districtStatus} from './society.js?v=5.40.0';
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
 return !travelBusy(s,payer.id)&&fit(doctor,s.day)&&!travelBusy(s,doctor.id)&&doctor.energy>=10&&payer.coins>=8&&!districtStatus(s,'market').closed&&quote!==null&&stockAt(s,'market','herb')>0&&doctor.coins+8-quote>=0&&doctor.coins+8-quote<=1000000&&s.commerce.budget.market+quote<=1000000?quote:null;
}
export function payClinic(s,payer,doctor){
 const quote=clinicQuote(s,payer,doctor);if(quote===null)return null;
 payer.coins-=8;doctor.coins+=8-quote;doctor.energy-=10;doctor.workDays=Math.min(100000,doctor.workDays+1);s.commerce.budget.market+=quote;s.commerce.stock.market.herb--;saveResident(doctor);return quote;
}
export function clinicSummary(s){const d=clinicDoctor(s);return [d&&alive(d)?'河湾村医者：'+d.name+(d.retirement.active?'，旧档中的休养记录。':d.life.sickDays||d.life.restDay===s.day||d.injuryDays?'，今日休养，暂停诊治。':'')+(d.id==='doctor'?'，原有医者。':'，第'+s.npcWorld.clinic.appointedDay+'日接任。'):'河湾村医者空缺，旧档记录保留，本版不自动接班。'];}
