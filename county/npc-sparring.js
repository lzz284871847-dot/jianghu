import {travelBusy} from './npc-journeys.js?v=4.30.0';
import {bondBetween} from './npc-social.js?v=4.30.0';
import {alive} from './npc-mortality.js?v=4.30.0';
import {NPC_ART} from './npc-martial.js?v=4.30.0';
import {useMove,usableMoves} from './martial-moves.js?v=4.30.0';
const ready=(p,day)=>alive(p)&&p.age>=16&&p.age<65&&!p.retirement.active&&p.hunger<40&&!p.injuryDays&&!p.life.sickDays&&p.life.restDay!==day&&p.energy>=40&&p.study.learnedDay>0&&p.study.learnedDay<day&&p.study.practice>=120&&p.study.lastSparDay<day&&!Object.values(p.study.otherArts).some(a=>a.learnedDay===day);
const adapter=p=>({hp:100,energy:p.energy,dead:false,injuries:{},martial:{known:{[NPC_ART]:true},equipped:NPC_ART,practice:{[NPC_ART]:p.study.practice},insight:{[NPC_ART]:p.study.insight},experience:{[NPC_ART]:p.study.experience},mastery:{[NPC_ART]:p.study.mastery}}});
const record=(p,day,text)=>{p.history=['第'+day+'日'+text,...p.history].slice(0,8);};
export function npcSparringDay(s,day){
 if(day%14)return [];
 const originals=Object.values(s.npcWorld.individuals).filter(p=>p.id!=='master');
 const pupils=originals.filter(p=>!travelBusy(s,p.id)&&ready(p,day)).sort((a,b)=>a.id.localeCompare(b.id));
 const notes=[];
 const willing=(a,b)=>{const id=bondBetween(s,a.id,b.id),bond=id&&s.npcWorld.social.bonds[id];return !bond||bond.trust>=20&&bond.resentment<60;};
 while(pupils.length>1){
  const left=pupils.find(p=>pupils.some(q=>q!==p&&bondBetween(s,p.id,q.id)&&willing(p,q)))||pupils[0];
  pupils.splice(pupils.indexOf(left),1);const candidates=pupils.filter(p=>willing(left,p));
  const right=candidates.find(p=>bondBetween(s,left.id,p.id))||candidates[0];
  if(!right)continue;
  pupils.splice(pupils.indexOf(right),1);
  const pair=[left,right],fighters=pair.map(adapter),energies=pair.map(p=>p.energy),gains=[{experience:0,mastery:0},{experience:0,mastery:0}];
  // Bounded, unarmed exercise. Stop at 75 HP or less; no opponent template, cash prize or lethal response.
  let seed=day;for(const p of pair)for(const ch of p.id)seed=(Math.imul(seed,31)+ch.charCodeAt(0))>>>0;
  const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const first=Math.floor(day/14)%2;
  for(let round=0;round<3&&fighters.every(x=>x.hp>75);round++){
   for(const turn of [first,1-first]){
    if(fighters.some(x=>x.hp<=75))break;
    const p=pair[turn],attacker=fighters[turn],defender=fighters[1-turn],moves=usableMoves(attacker);
    const move=p.outlook.temperament==='enterprising'?moves.at(-1):p.outlook.temperament==='cautious'?(moves.find(m=>m.rank===2)||moves[0]):moves[0];
    if(attacker.energy<move.energy)continue;
    const combat={martial:NPC_ART,distance:1,enemyHp:defender.hp,enemyGuard:defender.guard||0};
    useMove(attacker,combat,move.id,rng);gains[turn].experience+=2;
    if(combat.enemyHp<defender.hp)gains[turn].mastery++;
    defender.hp=combat.enemyHp;attacker.guard=combat.playerGuard||0;
   }
  }
  pair.forEach((p,k)=>{
   p.energy=fighters[k].energy;p.injuryDays=Math.max(p.injuryDays,fighters[k].hp<=75?2:0);
   p.study.lastDay=Math.max(p.study.lastDay,day);p.study.lastSparDay=day;
   const oldExperience=p.study.experience,oldMastery=p.study.mastery;
   p.study.experience=Math.min(2400,oldExperience+gains[k].experience);p.study.mastery=Math.min(2400,oldMastery+gains[k].mastery);
   record(p,day,'与'+pair[1-k].name+'点到为止切磋，实战积累+'+(p.study.experience-oldExperience)+'、掌握+'+(p.study.mastery-oldMastery)+'；消耗精力'+(energies[k]-fighters[k].energy)+(p.injuryDays?'，轻伤，进入休养。':'。'));
   if(p.source){p.source.energy=p.energy;p.source.injuryDays=p.injuryDays;p.source.history=p.history;}
  });
  const bondId=bondBetween(s,pair[0].id,pair[1].id);
  if(bondId){
   const b=s.npcWorld.social.bonds[bondId],hurt=pair.some(p=>p.injuryDays>0);
   b.trust=Math.max(0,Math.min(100,b.trust+(hurt?-2:1)));b.resentment=Math.max(0,Math.min(100,b.resentment+(hurt?(b.kind==='competitor'?3:2):-1)));
   b.lastEventDay=day;b.history=[pair[0].name+'与'+pair[1].name+(hurt?'切磋中有人轻伤，彼此信任下降，留下隔阂。':'平安收手，彼此信任增加，旧有隔阂稍缓。'),...b.history].slice(0,6);
  }
  notes.push(pair[0].name+'与'+pair[1].name+'自行到武馆点到为止切磋，按实际出招积累经验。');
 }
 return notes;
}
