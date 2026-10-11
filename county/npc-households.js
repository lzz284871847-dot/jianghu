// Stable household links and accountable mutual aid; no new goods or cash are minted.
export const HOUSEHOLD_MEMBERS=Object.freeze({
  chen:['farmhand01','farmhand02'],
  xu:['smith','smithapprentice'],
  dock:['dockhand01','dockhand02'],
  market:['merchant','shopassistant'],
  liuxi:['stallholder','fisher']
});
export const makeHouseholds=()=>Object.fromEntries(Object.keys(HOUSEHOLD_MEMBERS).map(id=>[id,{coins:0,food:0}]));
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export function householdsValid(s){
 const h=s.npcWorld?.households;
 return !!h&&typeof h==='object'&&!Array.isArray(h)&&
 Object.keys(h).length===Object.keys(HOUSEHOLD_MEMBERS).length&&
 Object.keys(HOUSEHOLD_MEMBERS).every(id=>{
  const v=h[id];return v&&typeof v==='object'&&!Array.isArray(v)&&
  Object.keys(v).length===2&&integer(v.coins,1000000)&&integer(v.food,100);
 });
}
export function familyOf(id){return Object.keys(HOUSEHOLD_MEMBERS).find(k=>HOUSEHOLD_MEMBERS[k].includes(id))??null;}
export function familySupport(s,p,day){
 const id=familyOf(p.id);if(!id)return false;
 const household=s.npcWorld.households[id];
 // Contribute actual private surplus to a family-managed store.
 if(p.food>=3&&household.food<90){p.food--;household.food++;}
 if(p.coins>=50&&household.coins<=999990){p.coins-=5;household.coins+=5;}
 if(p.food===0&&household.food>0){
  household.food--;p.food++;p.hunger=Math.max(0,p.hunger-12);
  p.history=['第'+day+'日从家中领取一份口粮。',...p.history].slice(0,8);return true;
 }
 if(p.food===0&&p.coins<4&&household.coins>=4){
  household.coins-=4;p.coins+=4;
  p.history=['第'+day+'日得到家中接济4文。',...p.history].slice(0,8);return true;
 }
 return false;
}
