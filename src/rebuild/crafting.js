import {items,skills,recipes} from './content.js?v=1.0.47';
import {progress,maxXP} from './progression.js?v=1.0.47';
// 配方与引擎共用条件检查，界面不能绕过缺料或技能门槛。
export function recipeBlockers(s,r){
 const reasons=[];
 if(r.knowledge&&!s[r.knowledge])reasons.push('先与沈医者交谈，学习基础制药');
 for(const [key,n] of Object.entries(r.input))if(s.bag[key]<n)reasons.push(`${items[key]}不足，需要${n}，现有${s.bag[key]}`);
 if(r.level&&progress(s.skills[r.skill]).level<r.level)reasons.push(`需要${skills[r.skill]} Lv${r.level}，当前Lv${progress(s.skills[r.skill]).level}`);
 if(s.energy<r.energy)reasons.push(`精力不足，需要${r.energy}，现有${s.energy}`);
 return reasons;
}
export function recipeMaterials(s,r){return Object.entries(r.input).map(([key,n])=>`${items[key]}×${n}（现有${s.bag[key]}）`).join('、')}
export function recipeOutput(r){return Object.entries(r.output).map(([key,n])=>`${items[key]}×${n}`).join('、')}
export function recipePractice(s,r){const p=progress(s.skills[r.skill]);return p.complete?`${skills[r.skill]}已完成，不再增加经验`:`相关练习：${skills[r.skill]} +${Math.min(maxXP-s.skills[r.skill],s.energy-r.energy<20?1:2)}（当前Lv${p.level}：${p.xp}/${p.cap}；临近封顶按实际剩余额度结算）`}

export function recipesAt(place){return Object.entries(recipes).filter(([,r])=>(r.place||'forge')===place)}
