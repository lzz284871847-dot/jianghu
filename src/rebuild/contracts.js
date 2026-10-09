import {jobs,locations,items} from './content.js?v=1.0.21';
// 普通招工常驻；采购按日轮换，不运行商人资产或店铺账目模拟。
export function postedJobs(s){return Object.entries(jobs).filter(([,job])=>job.boardDay===undefined||job.boardDay===(s.day-1)%3)}
export function dailyContract(s){return postedJobs(s).find(([,job])=>job.boardDay!==undefined)}
export function procurementNews(s){const [,job]=dailyContract(s);return `【可靠消息】青石镇今日采购：${job.name}，到${locations[job.place].name}交货，报酬${job.reward}文。无人接手时由买家另找货源。`}
export function jobMaterials(s,job){return Object.entries(job.needs||{}).map(([key,n])=>`${items[key]}×${n}（现有${s.bag[key]}）`).join('、')}

export function jobDestination(s){const job=jobs[s.job?.id];return job?.route?.[s.job.progress]||job?.place}
export function escortStatus(s){const job=jobs[s.job?.id];if(!job?.route)return '';return `封好药包随身保管（委托货物，不能出售或使用）；路程${s.job.progress}/${job.route.length}：${s.job.progress<job.route.length?'下一站'+locations[jobDestination(s)].name:'已走完，等待在'+locations[job.place].name+'交付'}。`}
export function recordEscortStep(s,to){const job=jobs[s.job?.id];if(job?.route&&job.route[s.job.progress]===to){s.job.progress++;s.result.push('护送抵达交接点：'+locations[to].name+'。',escortStatus(s));}}
