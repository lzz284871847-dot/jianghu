import {progress} from './progression.js?v=1.0.40';
import {jobs,locations,items,skills,people} from './content.js?v=1.0.40';
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

export function jobMinutes(job){return job.hours?job.hours*60:30}
export function jobTimeLeft(s){return s.job?Math.max(0,(s.job.deadline-s.day+1)*1440-s.minute):0}
export function jobDeadline(s){if(!s.job)return '';const left=jobTimeLeft(s);return `须在第${s.job.deadline}日结束前完成；剩余${Math.floor(left/60)}小时${left%60}分钟。`}
// 界面与执行共用交付条件；开工不等于完成，需留足整段时间。
export function jobDeliveryBlocker(s,job){
 const work=jobWorkBlocker(s,job);if(work)return work;
 if(s.job&&jobMinutes(job)>=jobTimeLeft(s))return `本次需要${jobMinutes(job)}分钟，会到达或超过截止时刻；可放弃约定另作安排。`;
 if(job.route&&s.job.progress<job.route.length)return '护送路程尚未完成。'+escortStatus(s);
 if(s.place!==job.place)return '请前往'+locations[job.place].name+'完成约定。';
 for(const [k,n] of Object.entries(job.needs||{}))if(s.bag[k]<n)return `${items[k]}不足，需要${n}。`;
 if(s.energy<(job.energy||2))return '精力不足，请歇息或睡觉。';
 return null;
}

export function jobEntryBlocker(s,job){
 const skill=jobSkillBlocker(s,job);if(skill)return skill;
 if(job.partner&&s.relations[job.partner]<job.relation)return `需与${people[job.partner].name}关系${job.relation}，当前${s.relations[job.partner]}/100。`;
 return null;
}
