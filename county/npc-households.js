// Legacy household balances retained for save compatibility; no daily family transfers.
export const HOUSEHOLD_MEMBERS=Object.freeze({
  chen:['farmhand01','farmhand02'],
  xu:['smith','smithapprentice'],
  dock:['dockhand01','dockhand02'],
  market:['merchant','shopassistant'],
  liuxi:['stallholder','fisher']
});
export const makeHouseholds=()=>Object.fromEntries(Object.keys(HOUSEHOLD_MEMBERS).map(id=>[id,{coins:0,food:0,trust:50,hardshipDays:0}]));
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export function householdsValid(s){
 const h=s.npcWorld?.households;
 return !!h&&typeof h==='object'&&!Array.isArray(h)&&
 Object.keys(h).length===Object.keys(HOUSEHOLD_MEMBERS).length&&
 Object.keys(HOUSEHOLD_MEMBERS).every(id=>{
  const v=h[id];return v&&typeof v==='object'&&!Array.isArray(v)&&
  Object.keys(v).length===4&&integer(v.coins,1000000)&&integer(v.food,100)&&integer(v.trust,100)&&integer(v.hardshipDays,100000);
 });
}
export function familyOf(id){return Object.keys(HOUSEHOLD_MEMBERS).find(k=>HOUSEHOLD_MEMBERS[k].includes(id))??null;}
