import {PRACTICE_XP,growthPreview} from './practice-growth.js?v=5.48.0';
import {forestBonus,useUtility} from './equipment.js?v=5.48.0';
import {skills} from './content.js?v=5.48.0';
import {gain} from './progression.js?v=5.48.0';
export const FIELD_SKILLS=['navigation','tracking','awareness'];
export const FIELD_ACTIONS={
 navigation:{name:'辨认路势',minutes:20,energy:3,places:['foot','bamboo','hill','ferry','road','oldroad','mine'],use:'岔路抄近路、轻功通过或旧址搜寻'},
 tracking:{name:'追查足迹',minutes:30,energy:5,places:['bamboo','hill'],use:'狩猎或竹林失物搜寻'},
 awareness:{name:'察看危险',minutes:30,energy:5,places:['foot','bamboo','hill','ferry','road','oldroad','mine'],use:'危险采集、旧址深入搜寻或矿洞救工'}
};
export const makeFieldSkills=()=>Object.fromEntries(FIELD_SKILLS.map(k=>[k,{}]));
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function fieldSkillsValid(s){const f=s.fieldSkills;return obj(f)&&Object.keys(f).length===3&&FIELD_SKILLS.every(key=>obj(f[key])&&Object.entries(f[key]).every(([place,r])=>FIELD_ACTIONS[key].places.includes(place)&&obj(r)&&Object.keys(r).length===3&&Number.isSafeInteger(r.day)&&r.day>=1&&r.day<=s.day&&typeof r.success==='boolean'&&typeof r.used==='boolean'&&(!r.used||r.success)));}
export function activeFieldClue(s,key){const r=s.fieldSkills?.[key]?.[s.place];return !!r&&r.day===s.day&&r.success&&!r.used;}
export const fieldBonus=(s,key)=>Math.min(.12,(s.skills?.[key]||0)/1500)+(activeFieldClue(s,key)?key==='awareness'&&s.fort?.probe?.day===s.day&&s.fort.probe.place===s.place&&!s.fort.probe.used?.2:.08:0);
export const fieldChance=(s,key,base)=>Math.min(.95,base+fieldBonus(s,key));
export const fieldRisk=(s,base)=>base*Math.max(.5,1-fieldBonus(s,'awareness')*2);
export function useFieldClue(s,key){if(!activeFieldClue(s,key))return false;s.fieldSkills[key][s.place].used=true;if(key==='awareness'&&s.fort?.probe?.day===s.day&&s.fort.probe.place===s.place)s.fort.probe.used=true;const line=gain(s,key,1);s.result.push(skills[key]+'线索用于本次实际行动，后续不能重复用这份线索。');if(line)s.result.push(line);return true;}
export function fieldCheckChance(s,key){const d=FIELD_ACTIONS[key];return Math.max(.20,Math.min(.90,.65+(key==='navigation'?forestBonus(s):0)+Math.min(.20,(s.skills[key]||0)/1500)-(s.weather==='雨'?.15:0)-(s.energy-d.energy<20?.15:0)));}
export function fieldBlocker(s,key){const d=FIELD_ACTIONS[key];if(!d||!d.places.includes(s.place))return '这里没有这项野外判断行动。';if(s.dead||s.combat||s.pending||s.adventures.law.pursuit)return '先处理眼前选择或交手；死亡后不能行动。';if(s.fieldSkills[key][s.place]?.day===s.day)return '今日在这里已判断过，不重复尝试；既有记录保留。';if(s.minute<360||s.minute+d.minutes>1080)return '野外判断需在06:00–18:00内完成。';if(s.hp<25||s.energy<d.energy)return '需气血25、精力'+d.energy+'，先养伤或休息。';return null;}
export function fieldAction(s,id,{settle,rng}){const parts=String(id).split(':');if(parts.length!==2){s.result=['没有这项野外判断行动。'];return false;}const key=parts[1],why=fieldBlocker(s,key);if(why){s.result=[why];return false;}const d=FIELD_ACTIONS[key],success=rng()<fieldCheckChance(s,key),day=s.day,place=s.place;return settle(s,d.name,d.minutes,d.energy,()=>{if(key==='navigation'&&forestBonus(s))useUtility(s,'forest_staff');s.fieldSkills[key][place]={day,success,used:false};s.result.push(success?'找到可参考的'+skills[key]+'线索；仅当天本地有效，可用于一次'+d.use+'。':'路势或痕迹不清，没取得有效线索；时间精力已付出，今日不能重掷。','经验只能提高判断与成功机会，不提供必胜、必得物资或免伤；雨天更难判断。');},{[key]:success?PRACTICE_XP.field:PRACTICE_XP.failure});}
export function fieldOptions(s){return Object.entries(FIELD_ACTIONS).filter(([,d])=>d.places.includes(s.place)).map(([key,d])=>{const r=s.fieldSkills[key][s.place];return {id:'field:'+key,label:d.name,preview:d.minutes+'分钟 / 精力'+d.energy+'；当前判断成功率'+Math.round(fieldCheckChance(s,key)*100)+'%。'+d.use+'可受益；每地点每日一次，无钱物奖励。'+growthPreview(s,key,d.energy,PRACTICE_XP.field,PRACTICE_XP.failure)+(r?.day===s.day?(r.success?(r.used?'今天线索已用于行动。':'今天有一份未使用的线索。'):'今天判断未能取得线索。'):''),blocker:fieldBlocker(s,key)};});}
