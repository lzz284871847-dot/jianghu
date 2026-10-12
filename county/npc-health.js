import {travelBusy} from './npc-journeys.js?v=5.9.0';
import {clinicDoctor,payClinic} from './npc-clinic.js?v=5.9.0';
import {saveResident} from './npc-residents.js?v=5.9.0';
import {alive} from './npc-mortality.js?v=5.9.0';
import {people} from './content.js?v=5.9.0';
import {marketPrice} from './commerce.js?v=5.9.0';
const record=(p,text)=>{p.history=[text,...p.history].slice(0,8);};
// Daily appointments are simulated inside the doctor's existing 08:00–18:00 hours.
// Rain/undernutrition can cause a short illness; no extra world RNG is consumed.
export function npcHealthDay(s,p,_age,day){
 const life=p.life;
 if(!alive(p)||life.healthDay>=day)return {resting:alive(p)&&life.restDay===day,notes:[]};
 life.healthDay=day;const notes=[];
 if(!life.sickDays&&(s.weather==='雨'||p.hunger>=60)&&(day+p.id.length)%31===0){
  life.sickDays=4;
  record(p,'第'+day+'日因'+(s.weather==='雨'?'雨天受寒':'长期口粮不足')+'染病，暂歇劳作。');
  notes.push(p.name+'染病，暂时休养。');
 }
 // Old severe-illness counters no longer drive long disease or death.
 life.illnessDays=0;life.careDays=0;
 const resting=life.sickDays>0;
 if(resting){
  life.restDay=day;
  p.energy=Math.max(0,p.energy-12);
  const doctor=clinicDoctor(s),clinic=people.doctor,quote=marketPrice(s,'market','buy','herb');
  const payer=p;
  // The eight-coin fee goes to the doctor; the doctor purchases one real herb
  // from the market at its current quote. The consumed herb is never duplicated.
  const paid=!travelBusy(s,p.id)&&clinic.open<=600&&clinic.close>=660?payClinic(s,payer,doctor):null;
  if(paid!==null){
   record(doctor,'第'+day+'日为'+p.name+'诊治，收诊金8文，购药耗费'+quote+'文并用去药材1份。');
   saveResident(doctor);
   life.sickDays=Math.max(0,life.sickDays-3);p.energy=Math.max(0,p.energy-10);
   record(p,'第'+day+'日到河湾村付诊金8文，医者购入并消耗常见药材1份；今日继续休养。');
   notes.push(p.name+'付费就医，消耗现有药材，今日仍休养。');
  }
  life.sickDays=Math.max(0,life.sickDays-1);
  if(!life.sickDays)record(p,'第'+day+'日病情缓解，明日起可恢复劳作。');
 }
 return {resting,notes};
}
export const healthSummary=(p,day)=>p.life.sickDays?'染病休养，尚需'+p.life.sickDays+'日':p.life.restDay===day?'病情缓解，今日休养':'健康';
