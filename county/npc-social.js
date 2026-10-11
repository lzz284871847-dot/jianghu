import {alive} from './npc-mortality.js?v=4.7.0';
// Named, persistent relationships rather than globally uniform NPC reputation.
export const BONDS=Object.freeze({
 'farmhand01:shopassistant':{a:'farmhand01',b:'shopassistant',kind:'friend'},
 'dockhand01:carter':{a:'dockhand01',b:'carter',kind:'competitor'},
 'merchant:shopassistant':{a:'merchant',b:'shopassistant',kind:'employer'},
 'smith:smithapprentice':{a:'smith',b:'smithapprentice',kind:'mentor'},
 'herbalist:hunter':{a:'herbalist',b:'hunter',kind:'neighbor'}
});
const validInt=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export function makeSocial(day=1){
 return {lastDay:day,bonds:Object.fromEntries(Object.entries(BONDS).map(([id,b])=>[id,{kind:b.kind,trust:b.kind==='competitor'?35:55,resentment:b.kind==='competitor'?20:0,lastEventDay:day,history:[]}]))};
}
export function socialValid(s){
 const social=s.npcWorld?.social;
 if(!social||typeof social!=='object'||Array.isArray(social)||!validInt(social.lastDay,s.day)||social.lastDay<1||!social.bonds||typeof social.bonds!=='object'||Array.isArray(social.bonds))return false;
 if(Object.keys(social.bonds).length!==Object.keys(BONDS).length)return false;
 return Object.entries(BONDS).every(([id,spec])=>{
  const b=social.bonds[id];
  return b&&typeof b==='object'&&!Array.isArray(b)&&b.kind===spec.kind&&validInt(b.trust,100)&&validInt(b.resentment,100)&&validInt(b.lastEventDay,s.day)&&b.lastEventDay>=1&&Array.isArray(b.history)&&b.history.length<=6&&b.history.every(x=>typeof x==='string'&&x.length<=160);
 });
}
export function bondBetween(s,a,b){
 return Object.entries(BONDS).find(([,x])=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a))?.[0]??null;
}
function event(b,day,text){
 b.history=[text,...b.history].slice(0,6);b.lastEventDay=day;
}
export function socialDay(s,day){
 if(s.npcWorld.social.lastDay>=day)return [];
 const notes=[];
 for(const [id,spec] of Object.entries(BONDS)){
  const b=s.npcWorld.social.bonds[id],left=s.npcWorld.individuals[spec.a],right=s.npcWorld.individuals[spec.b];
  if(!alive(left)||!alive(right))continue;
  if(b.kind==='friend'&&left.coins<=4&&left.hunger>=50&&right.coins>=12&&b.trust>=40){
   // A friend really pays. This is not a free rescue or random wealth creation.
   right.coins-=3;left.coins+=3;b.trust=Math.min(100,b.trust+3);
   event(b,day,right.name+'帮助'+left.name+'3文，友情更深。');
   notes.push(right.name+'救济了困顿的朋友'+left.name+'。');
  }else if(b.kind==='friend'&&left.coins<=4&&left.hunger>=50&&right.coins>=12&&b.trust<40&&day%3===0){
   // Low trust has a concrete consequence: help is refused, with no transfer.
   b.resentment=Math.min(100,b.resentment+1);
   event(b,day,right.name+'因彼此信任不足，拒绝借钱给'+left.name+'。');
   notes.push(left.name+'向朋友求助未果。');
  }else if(b.kind==='friend'&&left.hunger<40&&left.coins>=8&&b.resentment>0&&day%7===0){
   // Reconciliation follows improved circumstances; it does not mint supplies.
   b.resentment=Math.max(0,b.resentment-1);b.trust=Math.min(100,b.trust+1);
   event(b,day,left.name+'生活稍有起色，与'+right.name+'的旧日隔阂渐渐缓和。');
  }else if(b.kind==='competitor'&&left.workDays>0&&right.unemployedDays>=3&&day%3===0){
   b.resentment=Math.min(100,b.resentment+2);b.trust=Math.max(0,b.trust-1);
   event(b,day,right.name+'因'+left.name+'较容易获得活计而心生不满。');
   notes.push('码头工人因谋生机会发生竞争。');
  }else if(b.kind==='competitor'&&left.unemployedDays===0&&right.unemployedDays===0&&b.resentment>0&&day%6===0){
   b.resentment=Math.max(0,b.resentment-1);b.trust=Math.min(100,b.trust+1);
   event(b,day,'双方都重新有了活计，谋生竞争暂时缓和。');
  }else if(b.kind==='employer'&&right.unemployedDays>=3&&day%4===0){
   b.trust=Math.max(0,b.trust-2);b.resentment=Math.min(100,b.resentment+1);
   event(b,day,'连续停工使雇佣关系承压。');
  }else if(b.kind==='employer'&&right.unemployedDays===0&&b.resentment>0&&day%6===0){
   b.resentment=Math.max(0,b.resentment-2);b.trust=Math.min(100,b.trust+1);
   event(b,day,'恢复稳定工作后，雇佣双方逐渐消除旧怨。');
  }else if(b.kind==='mentor'&&right.careerSkills.craft>=20&&b.trust<90&&day%8===0){
   const improvement=right.careerSkills.craft>=40?2:1;
   b.trust=Math.min(100,b.trust+improvement);
   if(right.careerSkills.craft>=40)b.resentment=Math.max(0,b.resentment-1);
   event(b,day,'学徒凭已掌握的锻造技艺逐渐重新赢得师傅认可。');
  }
 }
 s.npcWorld.social.lastDay=day;
 return notes.slice(0,2);
}

// Preferences influence voluntary career choices; survival-driven job searches remain.
const OUTLOOKS={
 farmhand01:['steadfast','forage'],smithapprentice:['steadfast','craft'],
 shopassistant:['cautious','stability'],dockhand01:['enterprising','trade'],
 carter:['cautious','stability'],'chen-child-1':['steadfast','forage'],'chen-child-2':['enterprising','trade']
};
export const makeOutlook=(id,day=1)=>({temperament:OUTLOOKS[id]?.[0]??'steadfast',ambition:OUTLOOKS[id]?.[1]??'stability',achievedDay:0,lastDay:day});
export const outlookValid=(o,day)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===4&&
 ['cautious','enterprising','steadfast'].includes(o.temperament)&&['stability','craft','trade','forage'].includes(o.ambition)&&
 validInt(o.lastDay,day)&&o.lastDay>=1&&validInt(o.achievedDay,o.lastDay);
const TEMPERAMENTS={cautious:'谨慎',enterprising:'进取',steadfast:'守成'};
const AMBITIONS={stability:'稳定生计',craft:'精进手艺',trade:'经营熟手',forage:'采收熟手'};
export function outlookSummary(p){const o=p.outlook;return '性格'+TEMPERAMENTS[o.temperament]+' · 志向'+AMBITIONS[o.ambition]+(o.achievedDay?'（第'+o.achievedDay+'日曾达成）':'（积累中）');}
export function voluntaryShopSearch(p,day){
 const o=p.outlook;if(!o||!['original','carrier'].includes(p.occupation)||p.hunger>=40||p.injuryDays||p.energy<20||p.unemployedDays||day%7!==0)return false;
 if(o.temperament==='enterprising'&&o.ambition==='trade')return p.workDays>=10&&p.coins>=40;
 if(o.temperament==='cautious'&&o.ambition==='stability'&&(p.occupation==='carrier'||p.careerSkills.carry>0))return p.workDays>=20&&p.coins>=60;
 return false;
}
export function ambitionDay(s,p,day,applyShop){
 const o=p.outlook;if(!alive(p)||o.lastDay>=day)return false;o.lastDay=day;
 if(p.life?.sickDays>0||p.life?.restDay===day)return false;
 const record=text=>{p.history=['第'+day+'日'+text,...p.history].slice(0,8);};
 // Applications consume a real vacancy and leave the first salary for the next day.
 if(voluntaryShopSearch(p,day)&&applyShop(s,p,day))record('依照'+TEMPERAMENTS[o.temperament]+'性格，选择转入商铺谋生，保留原有经验与积蓄。');
 const reached=o.ambition==='stability'?p.workDays>=20&&p.unemployedDays===0&&p.coins>=60:
  p.workDays>=20&&p.careerSkills[o.ambition]>=40;
 if(!o.achievedDay&&reached){o.achievedDay=day;record('凭实际劳动与积累达成志向：'+AMBITIONS[o.ambition]+'。');return true;}
 return false;
}
