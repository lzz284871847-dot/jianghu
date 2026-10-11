// Legacy lifespan fields are validated for old saves; no aging/death/estate simulation.
export const makeLife=()=>({frailty:0,starvationDays:0,deathDay:0,estateDay:0,sickDays:0,healthDay:0,restDay:0,illnessDays:0,careDays:0});
export const alive=p=>!p?.life?.deathDay;
export const lifeValid=(v,day)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===9&&
 [['frailty',100],['starvationDays',30],['deathDay',day],['estateDay',day],['sickDays',6],['healthDay',day],['restDay',day],['illnessDays',30],['careDays',2]].every(([k,max])=>Number.isSafeInteger(v[k])&&v[k]>=0&&v[k]<=max)&&
 (v.restDay<=v.healthDay)&&(v.illnessDays>0?v.sickDays>0:v.careDays===0)&&(!v.deathDay||v.frailty===100||v.starvationDays===30||v.illnessDays===30)&&(!v.estateDay||v.deathDay>0&&v.estateDay>=v.deathDay);
export const recoveryFor=(_age,injured=false)=>injured?12:25;
