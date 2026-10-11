import {namedResidents,saveResident} from './npc-residents.js?v=4.25.0';
import {alive} from './npc-mortality.js?v=4.25.0';
import {travelBusy} from './npc-journeys.js?v=4.25.0';
const qualified=p=>p.study.practice>=120&&['wood_knife','staff'].every(id=>p.study.otherArts[id]?.practice>=120);
export const makeVillageSchool=(day=1)=>({holder:'farmer',appointedDay:0,lastDay:day});
export const villageTeacher=s=>namedResidents(s).find(p=>p.id===s.npcWorld.villageSchool.holder);
export function villageSchoolValid(s){
 const v=s.npcWorld.villageSchool;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==3||typeof v.holder!=='string'||!['appointedDay','lastDay'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0&&v[k]<=s.day)||v.lastDay<1||v.appointedDay>v.lastDay)return false;
 const p=villageTeacher(s);return v.holder===''||!!p&&(p.id==='farmer'&&v.appointedDay===0||p.id!=='farmer'&&v.appointedDay>0&&qualified(p));
}
export function villageCanTeach(s,id){const p=villageTeacher(s);return !!p&&['wood_knife','staff'].includes(id)&&alive(p)&&!p.retirement.active&&!p.life.sickDays&&p.life.restDay!==s.day&&!p.injuryDays&&!travelBusy(s,p.id)&&(p.id==='farmer'||p.study.otherArts[id]?.practice>=120);}
export function villageSchoolDay(s,day){
 const v=s.npcWorld.villageSchool;if(v.lastDay>=day)return [];v.lastDay=day;const old=villageTeacher(s);if(old&&alive(old)&&!old.retirement.active)return [];
 v.holder='';const p=namedResidents(s).filter(p=>alive(p)&&!p.retirement.active&&p.age>=16&&p.age<65&&!p.life.sickDays&&p.life.restDay!==day&&!p.injuryDays&&!travelBusy(s,p.id)&&p.hunger<40&&qualified(p)).sort((a,b)=>b.study.otherArts.staff.practice-a.study.otherArts.staff.practice||a.id.localeCompare(b.id))[0];
 if(!p)return [];v.holder=p.id;v.appointedDay=day;p.history=['第'+day+'日凭自己练熟的柴刀与棍法接任河湾村授艺者，不获额外武学、钱粮或遗产。',...p.history].slice(0,8);saveResident(p);return [p.name+'接任河湾村授艺者。'];
}
export function villageSchoolSummary(s){const p=villageTeacher(s);return p&&alive(p)?'河湾村授艺者：'+p.name+(p.retirement.active?'，已退养，等待接班。':p.life.sickDays||p.life.restDay===s.day||p.injuryDays?'，今日休养，暂停授艺。':p.id==='farmer'?'，原有授艺者。':'，第'+s.npcWorld.villageSchool.appointedDay+'日接任。'):'河湾村授艺岗位空缺，等待已练熟柴刀与棍法的现有居民。';}
