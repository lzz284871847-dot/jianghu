import {alive} from './npc-mortality.js?v=4.9.0';
// Stable household links and accountable mutual aid; no new goods or cash are minted.
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
export function familySupport(s,p,day){
 if(!alive(p))return false;
 const id=familyOf(p.id);if(!id)return false;
 const household=s.npcWorld.households[id];
 // Contribute actual private surplus to a family-managed store.
 if(p.food>=3&&household.food<90){p.food--;household.food++;household.trust=Math.min(100,household.trust+1);p.history=['第'+day+'日主动向家中储粮贡献一份口粮。',...p.history].slice(0,8);}
 if(p.coins>=50&&household.coins<=999990){p.coins-=5;household.coins+=5;household.trust=Math.min(100,household.trust+1);p.history=['第'+day+'日主动向家中积蓄贡献5文。',...p.history].slice(0,8);}
 if(p.food===0&&household.food>0){
  household.food--;p.food++;p.hunger=Math.max(0,p.hunger-12);household.trust=Math.min(100,household.trust+1);
  p.history=['第'+day+'日从家中领取一份口粮。',...p.history].slice(0,8);return true;
 }
 if(p.food===0&&p.coins<4&&household.coins>=4){
  household.coins-=4;p.coins+=4;household.trust=Math.min(100,household.trust+1);
  p.history=['第'+day+'日得到家中接济4文。',...p.history].slice(0,8);return true;
 }
 return false;
}

/** A relative can pay another relative's recovery or food costs, never mint currency. */
export function familyResponsibility(s,day){
 const notes=[];
 for(const [family,ids] of Object.entries(HOUSEHOLD_MEMBERS)){
  const h=s.npcWorld.households[family],members=ids.map(id=>s.npcWorld.individuals[id]).filter(alive);
  const needy=members.find(p=>p.injuryDays>=2||p.hunger>=55||p.unemployedDays>=4);
  if(!needy){
   h.hardshipDays=Math.max(0,h.hardshipDays-1);
   if(h.hardshipDays===0&&h.trust>=80&&day%7===0){
    for(const member of members){member.history=['第'+day+'日家中生计安稳，家人彼此信赖。',...member.history].slice(0,8);}
    notes.push(family+'家庭生计稳定，家人关系更加稳固。');
   }
   continue;
  }
  h.hardshipDays=Math.min(100000,h.hardshipDays+1);
  const foodDonor=members.find(p=>p!==needy&&p.food>=2);
  if(needy.food===0&&foodDonor){
   foodDonor.food--;needy.food++;needy.hunger=Math.max(0,needy.hunger-12);
   h.trust=Math.min(100,h.trust+2);h.hardshipDays=Math.max(0,h.hardshipDays-1);
   foodDonor.history=['第'+day+'日分给家人'+needy.name+'一份口粮。',...foodDonor.history].slice(0,8);
   needy.history=['第'+day+'日得到'+foodDonor.name+'分来的一份口粮。',...needy.history].slice(0,8);
   notes.push(foodDonor.name+'分粮接济'+needy.name+'，缓解家庭缺粮。');
   continue;
  }
  const donor=members.find(p=>p!==needy&&p.coins>=(h.trust>=70?10:12));
  if(donor&&needy.coins<12){
   const amount=Math.min(3,donor.coins-(h.trust>=70?7:9),12-needy.coins);
   if(amount>0){
    donor.coins-=amount;needy.coins+=amount;
    h.trust=Math.min(100,h.trust+2);h.hardshipDays=Math.max(0,h.hardshipDays-1);
    donor.history=['第'+day+'日接济家人'+needy.name+amount+'文。',...donor.history].slice(0,8);
    needy.history=['第'+day+'日得到'+donor.name+'帮助'+amount+'文。',...needy.history].slice(0,8);
    notes.push(donor.name+'接济家人'+needy.name+'，缓解生活困难。');
    continue;
   }
  }
  if(h.hardshipDays>=5&&h.trust>=40&&h.coins>=6&&needy.coins<6){
   // A household chooses to spend its existing reserve during prolonged hardship.
   h.coins-=3;needy.coins+=3;h.trust=Math.min(100,h.trust+1);
   needy.history=['第'+day+'日家中动用积蓄3文，帮助渡过长期困境。',...needy.history].slice(0,8);
   notes.push(needy.name+'得到家庭积蓄支持，家中储备相应减少。');
   continue;
  }
  if(h.hardshipDays>=3&&h.hardshipDays%3===0){
   const loss=h.hardshipDays>=9?2:1;
   h.trust=Math.max(0,h.trust-loss);
   for(const member of members){member.history=['第'+day+'日家中长期生计困难，家人关系承受压力。',...member.history].slice(0,8);}
   notes.push(family+'家庭连续面临困难，成员之间的压力有所增加。');
  }
 }
 return notes.slice(0,2);
}
