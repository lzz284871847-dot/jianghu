import {travelBusy} from './npc-journeys.js?v=5.12.0';
import {namedResidents,saveResident} from './npc-residents.js?v=5.12.0';
import {alive} from './npc-mortality.js?v=5.12.0';
import {MARTIAL_ARTS} from './martial-data.js?v=5.12.0';
export const makeSchool=(day=1)=>({holder:'master',appointedDay:0,lastDay:day});
const qualified=p=>p.study.mentor.joinedDay>0&&p.study.practice>=120&&p.study.teacherTrust>=12&&Object.entries(p.study.otherArts).filter(([id,a])=>MARTIAL_ARTS[id].tier===2&&a.practice>=120).length>=2;
export const schoolTeacher=s=>namedResidents(s).find(p=>p.id===s.npcWorld.school.holder);
export function schoolValid(s){
 const v=s.npcWorld.school;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==3||typeof v.holder!=='string'||!['appointedDay','lastDay'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0&&v[k]<=s.day)||v.lastDay<1||v.appointedDay>v.lastDay)return false;
 const p=schoolTeacher(s);return v.holder===''||!!p&&(p.id==='master'&&v.appointedDay===0||p.id!=='master'&&v.appointedDay>0&&qualified(p));
}
export const saveSchoolTeacher=saveResident;
export function schoolCanTeach(s,id){
 const p=schoolTeacher(s);if(!p||!alive(p)||travelBusy(s,p.id)||p.retirement.active||p.life.sickDays||p.life.restDay===s.day||p.injuryDays)return false;
 return p.id==='master'||(id==='qinghe_fist'?p.study.practice>=120:p.study.otherArts[id]?.practice>=120);
}
export function schoolSummary(s){const p=schoolTeacher(s);return p&&alive(p)?'武馆教习：'+p.name+(p.retirement.active?'，旧档中的休养记录。':p.life.sickDays||p.life.restDay===s.day||p.injuryDays?'，今日休养，暂停授课。':'')+(p.id==='master'?'，原有教习。':'，第'+s.npcWorld.school.appointedDay+'日接任；仅教授已练熟的武艺。'):'武馆教习空缺，旧档记录保留，本版不自动接班。';}
