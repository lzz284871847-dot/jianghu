import {namedResidents,saveResident} from './npc-residents.js?v=5.68.0';
import {alive} from './npc-mortality.js?v=5.68.0';
import {travelBusy} from './npc-journeys.js?v=5.68.0';
const qualified=p=>p.study.practice>=120&&['wood_knife','staff'].every(id=>p.study.otherArts[id]?.practice>=120);
export const makeVillageSchool=(day=1)=>({holder:'farmer',appointedDay:0,lastDay:day});
export const villageTeacher=s=>namedResidents(s).find(p=>p.id===s.npcWorld.villageSchool.holder);
export function villageSchoolValid(s){
 const v=s.npcWorld.villageSchool;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==3||typeof v.holder!=='string'||!['appointedDay','lastDay'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0&&v[k]<=s.day)||v.lastDay<1||v.appointedDay>v.lastDay)return false;
 const p=villageTeacher(s);return v.holder===''||!!p&&(p.id==='farmer'&&v.appointedDay===0||p.id!=='farmer'&&v.appointedDay>0&&qualified(p));
}
export function villageCanTeach(s,id){const p=villageTeacher(s);return !!p&&['wood_knife','staff'].includes(id)&&alive(p)&&!p.retirement.active&&!p.life.sickDays&&p.life.restDay!==s.day&&!p.injuryDays&&!travelBusy(s,p.id)&&(p.id==='farmer'||p.study.otherArts[id]?.practice>=120);}
export function villageSchoolSummary(s){const p=villageTeacher(s);return p&&alive(p)?'河湾村授艺者：'+p.name+(p.retirement.active?'，旧档中的休养记录。':p.life.sickDays||p.life.restDay===s.day||p.injuryDays?'，今日休养，暂停授艺。':p.id==='farmer'?'，原有授艺者。':'，第'+s.npcWorld.villageSchool.appointedDay+'日接任。'):'河湾村授艺岗位空缺，旧档记录保留，本版不自动接班。';}
