// First mortality batch covers the established Chen/Xiao-Lian family only.
export const TRACKED_PARENTS=['farmhand01','shopassistant'];
export const makeLife=()=>({frailty:0,starvationDays:0,deathDay:0});
export const alive=p=>!p?.life?.deathDay;
export const lifeValid=(v,day)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===3&&
 [['frailty',100],['starvationDays',30],['deathDay',day]].every(([k,max])=>Number.isSafeInteger(v[k])&&v[k]>=0&&v[k]<=max)&&
 (!v.deathDay||v.frailty===100||v.starvationDays===30);
export const recoveryFor=(age,injured=false)=>injured?12:age>=75?12:age>=65?18:25;
export function mortality(p,age,hunger,day){
 const v=p.life;if(!alive(p))return false;
 v.starvationDays=hunger>=100?Math.min(30,v.starvationDays+1):0;
 const period=age>=75?10:30;
 if(age>=65&&day%period===0)v.frailty=Math.min(100,v.frailty+1);
 if(v.frailty<100&&v.starvationDays<30)return false;
 v.deathDay=day;return true;
}
export function parentMortality(s,day){
 const notes=[];
 for(const id of TRACKED_PARENTS){const p=s.npcWorld.individuals[id];
  if(p.lastDay>=day||!alive(p))continue;
  if(mortality(p,p.age,p.hunger,day)){
   p.history=['第'+day+'日因'+(p.life.starvationDays===30?'长期断粮':'衰老')+'去世，留下真实的钱粮与经历。',...p.history].slice(0,8);
   notes.push(p.name+'去世，停止劳作，遗留钱粮将在清算借款后交给家人。');
  }
 }
 return notes;
}
// Transfers never exceed receiver capacity. Any excess stays in the deceased purse,
// not lost or copied. Shared household reserves are never treated as private estates.
export function settleEstates(s){
 const l=s.npcWorld.lineage,parents=TRACKED_PARENTS.map(id=>s.npcWorld.individuals[id]);
 const children=l.children;
 const transfer=(source,heirs)=>{
  for(const [key,cap] of [['coins',1000000],['food',100]]){
   for(let i=0;i<heirs.length;i++){
    const heir=heirs[i],amount=Math.min(Math.ceil(source[key]/(heirs.length-i)),cap-heir[key]);
    source[key]-=amount;heir[key]+=amount;
   }
  }
 };
 for(const p of parents.filter(p=>!alive(p))){
  const spouse=l.marriedDay?parents.filter(x=>x!==p&&alive(x)):[];
  transfer(p,[...spouse,...children.filter(alive).map(c=>c.livelihood)]);
 }
 for(const c of children.filter(c=>!alive(c)))transfer(c.livelihood,[...parents.filter(alive),...children.filter(alive).map(x=>x.livelihood)]);
}
