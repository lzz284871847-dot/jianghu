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
  }else if(b.kind==='competitor'&&left.workDays>0&&right.unemployedDays>=3&&day%3===0){
   b.resentment=Math.min(100,b.resentment+2);b.trust=Math.max(0,b.trust-1);
   event(b,day,right.name+'因'+left.name+'较容易获得活计而心生不满。');
   notes.push('码头工人因谋生机会发生竞争。');
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
