import {jobs,locations,items} from './content.js?v=1.0.10';
// 普通招工常驻；采购按日轮换，不运行商人资产或店铺账目模拟。
export function postedJobs(s){return Object.entries(jobs).filter(([,job])=>job.boardDay===undefined||job.boardDay===(s.day-1)%3)}
export function dailyContract(s){return postedJobs(s).find(([,job])=>job.boardDay!==undefined)}
export function procurementNews(s){const [,job]=dailyContract(s);return `【可靠消息】青石镇今日采购：${job.name}，到${locations[job.place].name}交货，报酬${job.reward}文。无人接手时由买家另找货源。`}
export function jobMaterials(s,job){return Object.entries(job.needs||{}).map(([key,n])=>`${items[key]}×${n}（现有${s.bag[key]}）`).join('、')}
