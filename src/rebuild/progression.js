import {skills} from './content.js?v=1.0.3';
const caps=[100,200,400,600,800];
export const maxXP=caps.reduce((a,b)=>a+b,0);
export function progress(total){let xp=total,level=1;for(let i=0;i<caps.length-1&&xp>=caps[i];i++){xp-=caps[i];level++}return {level,xp,cap:caps[level-1],complete:total===maxXP}}
export function gain(s,key,amount){const before=s.skills[key],add=Math.min(maxXP-before,Math.max(0,Math.floor(amount)));if(add===0)return null;s.skills[key]=before+add;const a=progress(before),b=progress(s.skills[key]);return `${skills[key]} Lv${a.level}：${a.xp}/${a.cap} → ${a.level===b.level?'':`Lv${b.level}：`}${b.xp}/${b.cap}（+${add}）${b.complete?'【完成】':''}`}
export function skillLines(s){return Object.entries(skills).map(([k,n])=>{const p=progress(s.skills[k]);return `${n} Lv${p.level}：${p.xp}/${p.cap}${p.complete?'【完成】':''}`})}
export function date(s){const d=s.day-1;return `江湖历${Math.floor(d/360)+1}年${Math.floor(d%360/30)+1}月${d%30+1}日 · ${String(Math.floor(s.minute/60)).padStart(2,'0')}:${String(s.minute%60).padStart(2,'0')}`}
