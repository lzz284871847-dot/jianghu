import {makingGrowth,growthPreview} from './practice-growth.js?v=5.67.0';
import {items} from './content.js?v=5.67.0';
import {clinicDoctor} from './npc-clinic.js?v=5.67.0';
import {travelBusy} from './npc-journeys.js?v=5.67.0';
import {npcPlace} from './world.js?v=5.67.0';
import {treatInjury} from './injury.js?v=5.67.0';
export const MEDICINES=Object.freeze({
 stop_powder:{name:'止血散',tier:1,herb:0,practice:0,fee:4,minutes:45,energy:8,chance:.85,input:{herb:2,wood:1},hp:12,injuries:['cut'],reduce:2,description:'气血最多+12，切伤减轻2级；不能处理危重出血。'},
 wound_salve:{name:'舒筋膏',tier:1,herb:10,practice:6,fee:6,minutes:60,energy:10,chance:.80,input:{herb:2,aromatic_herb:1,wood:1},hp:25,injuries:['strain','bruise'],reduce:1,description:'气血最多+25，拉伤或挫伤中现存的一种减轻1级。'},
 inner_decoction:{name:'调息汤',tier:2,herb:30,practice:18,fee:10,minutes:90,energy:14,chance:.70,input:{herb:2,mountain_root:1,wood:2},hp:15,injuries:['internal'],reduce:1,description:'气血最多+15，内伤减轻1级；不能接骨。'},
 rescue_pill:{name:'护命丸',tier:3,herb:60,practice:36,fee:16,minutes:120,energy:18,chance:.60,input:{herb:3,mountain_root:1,cliff_bloom:1,wood:2},hp:10,injuries:['critical'],reduce:1,description:'气血最多+10，危重伤减轻1级，剩余伤势仍会出血；不能复活或接骨。'}
});
export const MEDICINE_ITEMS=[...Object.keys(MEDICINES),'aromatic_herb','mountain_root','cliff_bloom'];
export const makeMedicine=()=>({known:[],nextUse:0});
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function medicineValid(s){const m=s.medicine;return obj(m)&&Object.keys(m).length===2&&Array.isArray(m.known)&&m.known.length<=4&&new Set(m.known).size===m.known.length&&m.known.every(k=>Object.hasOwn(MEDICINES,k))&&Number.isSafeInteger(m.nextUse)&&m.nextUse>=0&&m.nextUse<=(s.day-1)*1440+s.minute+60;}
const now=s=>(s.day-1)*1440+s.minute;
export const medicineChance=(s,key)=>Math.min(.95,MEDICINES[key].chance+Math.min(.15,s.skills.medicine*.002))*(s.energy-MEDICINES[key].energy<20?.75:1);
export function medicineBlocker(s,kind,key){
 const d=MEDICINES[key];if(!d)return '没有这张药方。';
 if(s.dead)return '这段人生已结束，药品不能复活。';
 if(s.pending||s.combat||s.adventures?.law?.pursuit)return '先处理眼前选择、交手或捕快拦查。';
 if(kind==='use'){
  if(!s.bag[key])return '背包没有这种成药。';
  if(now(s)<s.medicine.nextUse)return '成药需间隔一小时，尚需'+(s.medicine.nextUse-now(s))+'分钟。';
  if(s.hp===100&&!d.injuries.some(k=>s.injuries[k]))return '当前无需这种药，不消耗物品。';
  return null;
 }
 if(!['learn','craft'].includes(kind))return '没有这项制药行动。';
 if(kind==='learn'&&s.medicine.known.includes(key))return '已经学过，不重复收取学费。';
 if(kind==='craft'&&!s.medicine.known.includes(key))return '先向沈医者学习这张药方。';
 const minutes=kind==='learn'?60:d.minutes;
 if(s.place!=='village'||s.minute<480||s.minute+minutes>1080)return '河湾村药铺08:00–18:00，需留足'+minutes+'分钟。';
 if(s.hp<25)return '先养伤至气血25，再学方或制药。';
 if(kind==='learn'){
  const doctor=clinicDoctor(s);
  if(!doctor||doctor.id!=='doctor'||doctor.life.deathDay||doctor.retirement.active||doctor.life.sickDays||doctor.life.restDay===s.day||doctor.injuryDays||travelBusy(s,doctor.id)||npcPlace(s,doctor.id)!==s.place)return '沈医者今日不在岗；已学药方仍可自行制作。';
  if(s.skills.herb<d.herb||s.skills.medicine<d.practice)return '需采药经验'+d.herb+'、制药经验'+d.practice+'。';
  if(s.coins<d.fee)return '学方需'+d.fee+'文。';
  if(doctor.coins>1000000-d.fee)return '医者暂时无法收款。';
 }else{
  if(s.energy<d.energy)return '精力不足，先休息。';
  if(s.bag[key]>=1000000)return '成药库存已满，不消耗材料。';
  for(const [k,n] of Object.entries(d.input))if(s.bag[k]<n)return items[k]+'不足，未消耗材料。';
 }
 return null;
}
export function medicineAction(s,id,{settle,rng}){
 const parts=String(id).split(':');if(parts.length!==3){s.result=['没有这项制药行动。'];return false;}const [,kind,key]=parts;const why=medicineBlocker(s,kind,key);if(why){s.result=[why];return false;}
 const d=MEDICINES[key];
 if(kind==='learn')return settle(s,'学方 · '+d.name,60,0,()=>{s.coins-=d.fee;clinicDoctor(s).coins+=d.fee;s.medicine.known.push(key);s.result.push('学费'+d.fee+'文实际交给沈医者；已学药方可独立制作。');});
 if(kind==='craft'){
  const chance=medicineChance(s,key),success=rng()<chance;
  return settle(s,'制作 · '+d.name,d.minutes,d.energy,()=>{for(const [k,n] of Object.entries(d.input))s.bag[k]-=n;if(success){s.bag[key]++;s.result.push('配药成功，获得'+d.name+'1份。');}else s.result.push('火候或配伍失误，药材报废；本次没有成药，时间与材料已付出。');},{medicine:success?makingGrowth(d).success:makingGrowth(d).failure});
 }
 return settle(s,'使用 · '+d.name,15,0,()=>{s.bag[key]--;s.hp=Math.min(100,s.hp+d.hp);const injury=d.injuries.find(k=>s.injuries[k]);if(injury)for(let n=0;n<d.reduce&&s.injuries[injury];n++)s.result.push(treatInjury(s,injury,'prepared'));s.medicine.nextUse=now(s)+60;s.result.push(d.description,'成药一小时内不能再次使用；危重剩余出血仍需及时就医。');});
}
export function medicineOptions(s){if(s.place!=='village')return [];return Object.entries(MEDICINES).flatMap(([key,d])=>[{id:'medicine:learn:'+key,label:'学方 · '+d.name,preview:'第'+d.tier+'阶；采药'+d.herb+' / 制药'+d.practice+'，学费'+d.fee+'文，1小时。'+d.description,blocker:medicineBlocker(s,'learn',key)},...(s.medicine.known.includes(key)?[{id:'medicine:craft:'+key,label:'制作 · '+d.name,preview:Object.entries(d.input).map(([k,n])=>items[k]+'×'+n).join('、')+'；'+d.minutes+'分钟 / 精力'+d.energy+'；当前成功率'+Math.round(medicineChance(s,key)*100)+'%，失败损失全部材料。'+growthPreview(s,'medicine',d.energy,makingGrowth(d).success,makingGrowth(d).failure),blocker:medicineBlocker(s,'craft',key)}]:[])]);}
