import {progress} from './progression.js?v=1.0.23';
import {jobs,locations,items,skills} from './content.js?v=1.0.23';
// 普通招工常驻；采购按日轮换，不运行商人资产或店铺账目模拟。
export function postedJobs(s){return Object.entries(jobs).filter(([,job])=>job.boardDay===undefined||job.boardDay===(s.day-1)%3)}
export function dailyContract(s){return postedJobs(s).find(([,job])=>job.boardDay!==undefined)}
export function procurementNews(s){const [,job]=dailyContract(s);return `【可靠消息】青石镇今日采购：${job.name}，到${locations[job.place].name}交货，报酬${job.reward}文。无人接手时由买家另找货源。`}
export function jobMaterials(s,job){return Object.entries(job.needs||{}).map(([key,n])=>`${items[key]}×${n}（现有${s.bag[key]}）`).join('、')}

export function jobDestination(s){const job=jobs[s.job?.id];return job?.route?.[s.job.progress]||job?.place}
export function escortStatus(s){const job=jobs[s.job?.id];if(!job?.route)return '';return `封好药包随身保管（委托货物，不能出售或使用）；路程${s.job.progress}/${job.route.length}：${s.job.progress<job.route.length?'下一站'+locations[jobDestination(s)].name:'已走完，等待在'+locations[job.place].name+'交付'}。`}
export function recordEscortStep(s,to){const job=jobs[s.job?.id];if(job?.route&&job.route[s.job.progress]===to){s.job.progress++;s.result.push('护送抵达交接点：'+locations[to].name+'。',escortStatus(s));}}

export function jobSkillBlocker(s,job){for(const [key,level] of Object.entries(job.requires||{}))if(progress(s.skills[key]).level<level)return `需要${skills[key]} Lv${level}，当前Lv${progress(s.skills[key]).level}。`;return null}
export function jobWorkBlocker(s,job){
 const skill=jobSkillBlocker(s,job);if(skill)return skill;
 if(!job.hours)return null;
 if(s.hp<25)return '受伤太重，先休养再做重活。';
 if(job.shift&&(s.minute<job.shift[0]*60||s.minute+job.hours*60>job.shift[1]*60))return `此活需在${String(job.shift[0]).padStart(2,'0')}:00–${job.shift[1]}:00内做完，共${job.hours}小时；请另选合适开工时间。`;
 return null;
}
