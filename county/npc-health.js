import {alive} from './npc-mortality.js?v=4.14.0';
import {people} from './content.js?v=4.14.0';
import {marketPrice,stockAt} from './commerce.js?v=4.14.0';
import {districtStatus} from './society.js?v=4.14.0';
const record=(p,text)=>{p.history=[text,...p.history].slice(0,8);};
// Daily appointments are simulated inside the doctor's existing 08:00–18:00 hours.
// Rain/undernutrition can cause a short illness; no extra world RNG is consumed.
export function npcHealthDay(s,p,age,day,guardians=[]){
 const life=p.life;
 if(!alive(p)||life.healthDay>=day)return {resting:alive(p)&&life.restDay===day,notes:[]};
 life.healthDay=day;const notes=[];
 if(!life.sickDays&&(s.weather==='雨'||p.hunger>=60)&&(day+p.id.length)%31===0){
  life.sickDays=age>=65?6:4;
  record(p,'第'+day+'日因'+(s.weather==='雨'?'雨天受寒':'长期口粮不足')+'染病，暂歇劳作。');
  notes.push(p.name+'染病，暂时休养。');
 }
 if(life.illnessDays)life.illnessDays=Math.min(30,life.illnessDays+1);
 else if(life.sickDays&&(p.hunger>=80||p.injuryDays>=2||age>=75&&life.frailty>=50)){
  life.illnessDays=1;record(p,'第'+day+'日病情转重，需完成三次真实诊治；病程满30日仍未治愈可能死亡。');
  notes.push(p.name+'病情转重，需要持续就医。');
 }
 const resting=life.sickDays>0;
 if(resting){
  life.restDay=day;
  p.energy=Math.max(0,p.energy-12);
  const doctor=s.npcWorld.individuals.doctor,clinic=people.doctor,quote=marketPrice(s,'market','buy','herb');
  const payer=age<16?guardians.find(g=>alive(g)&&g.coins>=8)??p:p;
  // The eight-coin fee goes to the doctor; the doctor purchases one real herb
  // from the market at its current quote. The consumed herb is never duplicated.
  if(payer.coins>=8&&alive(doctor)&&!doctor.retirement?.active&&!doctor.life.sickDays&&doctor.injuryDays===0&&doctor.energy>=10&&clinic.open<=600&&clinic.close>=660&&
   !districtStatus(s,'market').closed&&quote!==null&&stockAt(s,'market','herb')>0&&doctor.coins+8-quote>=0&&doctor.coins+8-quote<=1000000&&s.commerce.budget.market+quote<=1000000){
   payer.coins-=8;doctor.energy-=10;doctor.workDays=Math.min(100000,doctor.workDays+1);doctor.coins+=8-quote;s.commerce.budget.market+=quote;s.commerce.stock.market.herb--;
   record(doctor,'第'+day+'日为'+p.name+'诊治，收诊金8文，购药耗费'+quote+'文并用去药材1份。');
   if(life.illnessDays)life.careDays++;else life.sickDays=Math.max(0,life.sickDays-3);p.energy=Math.max(0,p.energy-10);
   record(p,'第'+day+'日到河湾村付诊金8文，医者购入并消耗常见药材1份；今日继续休养。');
   notes.push(p.name+'付费就医，消耗现有药材，今日仍休养。');
  }
  if(life.illnessDays){
   if(life.careDays>=3){life.illnessDays=0;life.careDays=0;life.sickDays=0;}
   else if(life.illnessDays>=30){life.deathDay=day;record(p,'第'+day+'日重病未能治愈而去世，停止劳作，遗留钱粮待清算后交给家人。');notes.push(p.name+'因重病去世。');}
   else life.sickDays=Math.max(1,life.sickDays-1);
  }else life.sickDays=Math.max(0,life.sickDays-1);
  if(!life.sickDays)record(p,'第'+day+'日病情缓解，明日起可恢复劳作。');
 }
 return {resting,notes};
}
export const healthSummary=(p,day)=>p.life.illnessDays?'重病第'+p.life.illnessDays+'日 · 已就医'+p.life.careDays+'/3次（病程满30日未治愈可能死亡）':p.life.sickDays?'染病休养，尚需'+p.life.sickDays+'日':p.life.restDay===day?'病情缓解，今日休养':'健康';
