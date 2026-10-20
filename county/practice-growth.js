import {skills} from './content.js?v=5.38.0';
import {MAX} from './progression.js?v=5.38.0';
// Real work only. No global XP multiplier, trade bonus, or save migration grant.
export const PRACTICE_XP={work:12,lesson:12,lessonFailure:4,civicLesson:8,practice:6,failure:2,field:6,repair:3,order:24,orderFailure:6};
export function resourceGrowth(d){return {success:d.risk>=.3?12:d.minutes>=150?10:d.minutes>=120?8:6,failure:d.risk>=.3?4:2};}
export function makingGrowth(d){const rank=d.required??d.practice??0;return {success:rank>=300?24:rank>=60||d.tier>=3?20:rank>=12?12:8,failure:rank>=60||d.tier>=3?4:2};}
export function practiceAward(s,energy,n){return Math.max(1,Math.floor(n*(s.energy-energy<20?.5:1)));}
export function growthPreview(s,skill,energy,success,failure){const amount=n=>Math.max(0,Math.min(MAX-s.skills[skill],practiceAward(s,energy,n)));return skills[skill]+'经验：'+(failure===undefined?'+'+amount(success):'成功+'+amount(success)+' / 失败+'+amount(failure))+(s.energy-energy<20?'（本次疲惫减半）':'')+'。';}
