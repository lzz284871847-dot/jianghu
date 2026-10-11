import {HOUSEHOLD_MEMBERS,familyOf} from './npc-households.js?v=4.26.0';
import {marketPrice,stockAt,budgetAt,MARKET_LIMIT} from './commerce.js?v=4.26.0';
import {districtStatus} from './society.js?v=4.26.0';
// The Chen family retains its spouse/child succession; all other named NPCs age daily.
export const TRACKED_PARENTS=['farmhand01','shopassistant'];
export const makeLife=()=>({frailty:0,starvationDays:0,deathDay:0,estateDay:0,sickDays:0,healthDay:0,restDay:0,illnessDays:0,careDays:0});
export const alive=p=>!p?.life?.deathDay;
export const lifeValid=(v,day)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===9&&
 [['frailty',100],['starvationDays',30],['deathDay',day],['estateDay',day],['sickDays',6],['healthDay',day],['restDay',day],['illnessDays',30],['careDays',2]].every(([k,max])=>Number.isSafeInteger(v[k])&&v[k]>=0&&v[k]<=max)&&
 (v.restDay<=v.healthDay)&&(v.illnessDays>0?v.sickDays>0:v.careDays===0)&&(!v.deathDay||v.frailty===100||v.starvationDays===30||v.illnessDays===30)&&(!v.estateDay||v.deathDay>0&&v.estateDay>=v.deathDay);
export const recoveryFor=(age,injured=false)=>injured?12:age>=75?12:age>=65?18:25;
export function mortality(p,age,hunger,day){
 const v=p.life;if(!alive(p))return false;
 v.starvationDays=hunger>=100?Math.min(30,v.starvationDays+1):0;
 const period=age>=75?10:30;
 if(age>=65&&day%period===0)v.frailty=Math.min(100,v.frailty+1);
 if(v.frailty<100&&v.starvationDays<30&&v.illnessDays<30)return false;
 v.deathDay=day;return true;
}
export function parentMortality(s,day){
 const notes=[];
 for(const p of Object.values(s.npcWorld.individuals)){
  if(p.lastDay>=day||!alive(p))continue;
  if(mortality(p,p.age,p.hunger,day)){
   p.history=['第'+day+'日因'+(p.life.illnessDays===30?'重病未能治愈':p.life.starvationDays===30?'长期断粮':'衰老')+'去世，留下真实的钱粮与经历。',...p.history].slice(0,8);
   notes.push(p.name+'去世，停止劳作；钱粮在清算借款后转交已有在世家人，无继承人的遗物保留。');
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
 const liquidate=(source,life,heirs)=>{
  if(life.estateDay>=s.day)return;
  life.estateDay=s.day;
  const price=marketPrice(s,'market','sell','vegetable');
  const room=heirs.reduce((n,h)=>n+1000000-h.coins,0);
  if(!source.cargo||!heirs.length||price===null||room<price||source.coins>1000000-price||districtStatus(s,'market').closed||stockAt(s,'market','vegetable')>=MARKET_LIMIT||budgetAt(s,'market')<price)return;
  // A living heir sells exactly one existing inherited ration of produce per day.
  source.cargo--;s.commerce.stock.market.vegetable++;s.commerce.budget.market-=price;source.coins+=price;
 };
 for(const p of parents.filter(p=>!alive(p))){
  const spouse=l.marriedDay?parents.filter(x=>x!==p&&alive(x)):[];
  const heirs=[...spouse,...children.filter(alive).map(c=>c.livelihood)];
  transfer(p,heirs);if(p.id==='farmhand01')liquidate(p,p.life,heirs);transfer(p,heirs);
 }
 for(const p of Object.values(s.npcWorld.individuals).filter(p=>!alive(p)&&!TRACKED_PARENTS.includes(p.id))){
  const family=familyOf(p.id),heirs=family?HOUSEHOLD_MEMBERS[family].filter(id=>id!==p.id).map(id=>s.npcWorld.individuals[id]).filter(alive):[];
  transfer(p,heirs);
 }
 for(const c of children.filter(c=>!alive(c))){const heirs=[...parents.filter(alive),...children.filter(alive).map(x=>x.livelihood)];transfer(c.livelihood,heirs);liquidate(c.livelihood,c.life,heirs);transfer(c.livelihood,heirs);}
}

export function mortalitySummary(s){
 const people=Object.values(s.npcWorld.individuals).filter(p=>p.age>=65||!alive(p));
 return people.length?people.map(p=>p.name+' · '+p.age+'岁 · '+(alive(p)?'在世，衰弱'+p.life.frailty+'/100':'第'+p.life.deathDay+'日去世；未转交遗物'+p.coins+'文、'+p.food+'份口粮、'+p.cargo+'份待售产物')):['目前没有年满65岁的具名居民或死亡记录。'];
}
