import {skills} from './content.js?v=0.1.0';
export const caps=[100,200,400,600,800],MAX=2100;
export function progress(total){let xp=total,level=1;for(const cap of caps.slice(0,-1))if(xp>=cap){xp-=cap;level++;}else break;return {level,xp,cap:caps[level-1]};}
export function gain(s,key,n){const before=s.skills[key],add=Math.min(MAX-before,n);if(!add)return null;s.skills[key]+=add;const a=progress(before),b=progress(s.skills[key]);return `${skills[key]} Lv${a.level}：${a.xp}/${a.cap} → ${a.level===b.level?'':`Lv${b.level}：`}${b.xp}/${b.cap}（+${add}）${s.skills[key]===MAX?'【完成】':''}`;}
export function date(s){return `江湖历${Math.floor((s.day-1)/360)+1}年${Math.floor((s.day-1)%360/30)+1}月${(s.day-1)%30+1}日 · ${String(Math.floor(s.minute/60)).padStart(2,'0')}:${String(s.minute%60).padStart(2,'0')}`;}
