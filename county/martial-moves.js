import {MARTIAL_ARTS} from './martial-data.js?v=0.2.0';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const CATEGORY={拳掌:{reach:1,damage:9,accuracy:.83,guard:1},腿法:{reach:2,damage:10,accuracy:.78,guard:0},刀法:{reach:2,damage:13,accuracy:.73,guard:0},剑法:{reach:2,damage:10,accuracy:.87,guard:1},棍法:{reach:3,damage:10,accuracy:.77,guard:2},枪法:{reach:3,damage:13,accuracy:.76,guard:1},身法:{reach:0,damage:0,accuracy:1,guard:3},内功:{reach:0,damage:0,accuracy:1,guard:2}};
export function moveStats(artId,moveId){
 const art=MARTIAL_ARTS[artId];if(!art)throw Error('未知武学');
 const move=art.moves.find(m=>m.id===moveId);if(!move)throw Error('未知招式');
 const base=CATEGORY[art.category],i=move.rank-1;
 // Every move has a distinct persistent ID and a reproducible tactical profile.
 // Rank 1: reliable opening; rank 2: reach/guard utility; rank 3: costly finishing option.
 const utility=art.category==='身法'||art.category==='内功';
 return {id:move.id,name:move.name,category:art.category,rank:move.rank,reach:base.reach+(i===1&&!utility?1:0),damage:utility?0:base.damage+(i===2?8:i===1?2:0),accuracy:clamp(base.accuracy-(i===2?.13:0)+(i===1?.03:0),.15,.98),energy:4+i*4,guard:base.guard+(i===1?3:0)+(utility?2:0),distanceShift:art.category==='身法'?(i===2?2:1):0,restore:art.category==='内功'?5+i*4:0};
}
export function usableMoves(s){
 const m=s.martial,art=m&&MARTIAL_ARTS[m.equipped];if(!art||!m.known?.[m.equipped])return [];
 const id=m.equipped,points=(m.practice[id]||0)+(m.insight[id]||0)+(m.experience[id]||0)+(m.mastery[id]||0);
 return art.moves.filter((x,i)=>i===0||points>=i*120).map(x=>moveStats(id,x.id));
}
export function useMove(s,c,moveId,rng=()=>.5){
 const move=usableMoves(s).find(x=>x.id===moveId);
 if(!move)throw Error('招式尚未解锁或未学会');
 if(s.dead||!c||c.ended)throw Error('当前不能出招');
 if(s.energy<move.energy)throw Error('精力不足');
 const log=[];s.energy-=move.energy;
 if(move.restore){s.energy=Math.min(100,s.energy+move.restore);c.playerGuard=move.guard;log.push(move.name+'：调息并稳固防守。');}
 else if(move.distanceShift){c.distance=clamp(c.distance+move.distanceShift,0,4);c.stance='游走';c.playerGuard=move.guard;log.push(move.name+'：拉开距离，准备应变。');}
 else if(c.distance>move.reach){log.push(move.name+'：距离不够，招式落空。');}
 else {const penalty=(s.injuries?.strain||0)*.05+(s.injuries?.fracture||0)*.09;const chance=clamp(move.accuracy-penalty-(c.enemyGuard||0)*.025,.08,.95);if(rng()<chance){const dmg=Math.max(1,move.damage-(c.enemyGuard||0));c.enemyHp=Math.max(0,c.enemyHp-dmg);log.push(move.name+'命中，伤害'+dmg+'。');if(!c.enemyHp)c.ended='victory';}else log.push(move.name+'未命中。');c.playerGuard=move.guard;}
 return {move:move.id,log,ended:c.ended||null,enemyHp:c.enemyHp,energy:s.energy,distance:c.distance};
}
export function moveCatalogValid(){return Object.entries(MARTIAL_ARTS).every(([id,art])=>art.moves.every(m=>{const d=moveStats(id,m.id);return d.energy>0&&d.accuracy>0&&d.reach>=0&&d.damage>=0;}));}
