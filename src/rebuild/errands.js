import {jobs,locations} from './content.js?v=1.0.56';
// 有限步骤与真实结算，不添加任务链、临时剧情或独立奖励货币。
const leave={id:'leave',label:'退出这份委托',minutes:0,energy:0,end:true,result:'你退出了约定，没有罚款或奖励。'};
export const errands={
 lostPouch:[
  {place:'road',title:'账袋的线索',text:'茶摊的人见柳掌柜在竹林入口整理包袱，建议沿落叶小径找找。',choices:[{id:'clue',label:'问清失物特征',minutes:30,energy:3,next:1,result:'问清袋上的补丁与走过的小径，下一步到竹林寻找。'},leave]},
  {place:'bamboo',title:'落叶里的账袋',text:'按线索搜寻一遍，65%找到；没有找到也可回镇报告，不重复搜索刷奖励。',choices:[{id:'search',label:'沿小径寻找',minutes:60,energy:8,next:2,miss:3,chance:.65,xp:{forage:1},result:'找到了带补丁的账袋，暂代保管，回青石镇交还。',empty:'搜过落叶和路旁，仍没有找到；回镇如实报告。'},leave]},
  {place:'town',title:'交还账袋',text:'柳掌柜核对补丁与账册，酬谢24文、关系+2，另有15%赠干粮1。',choices:[{id:'return',label:'交还失物',minutes:30,energy:2,end:true,coins:24,relation:'merchant',change:2,bonus:.15,output:{food:1},result:'账袋与账册已归还失主，这件小事到此结束。'},leave]},
  {place:'town',title:'失物未寻获',text:'如实说明搜寻经过，柳掌柜支付6文路费，关系+1；不补送失物。',choices:[{id:'report',label:'报告没有找到',minutes:30,energy:2,end:true,coins:6,relation:'merchant',change:1,result:'柳掌柜决定再托别人寻找，没有后续任务。'},leave]}
 ],
 herbalEscort:[
  {place:'hill',title:'接到采药人',text:'采药人背着药篓等在坡下。平路费时间但安全；陡坡可多带药材，可能擦伤，绝不自动选择。',choices:[{id:'bypass',label:'陪同绕平路',minutes:60,energy:0,next:1,result:'你与采药人绕过陡坡，接下来回河湾村交接。'},{id:'protect',label:'守护陡坡采药',minutes:45,energy:12,minHp:50,next:2,risk:.25,damage:8,result:'你帮采药人留意落石、稳住药篓，随后准备回村。'},{id:'retreat',label:'放弃采药，陪同撤回',minutes:0,energy:0,next:3,result:'采药人决定收工，你们可回村报告，只支付路费。'},leave]},
  {place:'village',title:'采药人平安回村',text:'支付20文、草药1，护送经验+2。',choices:[{id:'finish',label:'交接平路护送',minutes:30,energy:2,end:true,coins:20,output:{herb:1},xp:{escort:2},relation:'doctor',change:2,result:'采药人回家歇息，草药是约定酬劳的一部分。'},leave]},
  {place:'village',title:'药篓送抵村里',text:'支付28文、草药2，护送经验+2；没有额外战斗经验。',choices:[{id:'finish',label:'交接陡坡护送',minutes:30,energy:2,end:true,coins:28,output:{herb:2},xp:{escort:2},relation:'doctor',change:2,result:'药篓交给村里，采药人支付工钱并分出草药。'},leave]},
  {place:'village',title:'提前撤回',text:'只支付6文路费，无物品或护送经验奖励。',choices:[{id:'report',label:'报告提前撤回',minutes:30,energy:2,end:true,coins:6,result:'你如实说明已提前收工，约定结束。'},leave]}
 ],
 neighbourDispute:[
  {place:'dock',title:'卸货数量之争',text:'阿平说已卸十二袋，货主记的是十一袋。先听完双方，不能直接替他们裁定。',choices:[{id:'listen',label:'听双方说法',minutes:30,energy:2,next:1,result:'双方愿意协商；你可直接谈补偿，或去镇上找记账人作证。'},leave]},
  {place:'dock',title:'选择调解方式',text:'直接劝和酬谢10文、关系+1；查证再调解18文、关系+3，多花往返和问话时间。',choices:[{id:'settle',label:'商量折中补偿',minutes:30,energy:4,end:true,coins:10,relation:'porter',change:1,xp:{trade:1},result:'双方同意平分争议的一袋工钱，不认定任何人偷货。'},{id:'witness',label:'去镇上找人作证',minutes:0,energy:0,next:2,result:'记账人在青石镇；询问后再回码头。'},leave]},
  {place:'town',title:'询问记账人',text:'记账人可以核对当时的货单，问话半小时、精力2。',choices:[{id:'testimony',label:'核对货单与证词',minutes:30,energy:2,next:3,xp:{trade:1},result:'货单写了十二袋，其中一袋由货主亲自搬走。带着核对结果回码头。'},leave]},
  {place:'dock',title:'凭证词调解',text:'解释货单差异，酬谢18文、阿平关系+3、经商经验+1。',choices:[{id:'mediate',label:'说明事实并劝和',minutes:30,energy:4,end:true,coins:18,relation:'porter',change:3,xp:{trade:1},result:'双方核对后结清工钱，各自继续做事，没有阴谋或后续主线。'},leave]}
 ]
};
export function errandStage(s){return errands[s.job?.id]?.[s.job.phase];}
export function errandDestination(s){return errandStage(s)?.place;}
export function errandStatus(s){const step=errandStage(s);return step?step.title+'：前往'+locations[step.place].name+'，参与或退出由你决定。':'';}
export function errandBlocker(s,c){
 if(!errandStage(s)||s.place!==errandStage(s).place)return '请先到当前委托地点。';
 if(c.id==='leave')return null;
 if(s.day>s.job.deadline||s.minute+c.minutes>=(s.job.deadline-s.day+1)*1440)return '时间已不足，无法在截止前完成这一步；可以退出。';
 if(s.energy<c.energy)return '精力不足；可退出，或暂缓处理后歇息。';
 if(c.minHp&&s.hp<c.minHp)return '气血至少需要'+c.minHp+'；可以绕平路或撤回。';
 return null;
}
export function validErrand(s){
 if(!s.job)return s.pending?.type!=='errand';
 if(jobs[s.job.id]?.errand){if(!Number.isInteger(s.job.phase)||!errandStage(s)||s.job.progress!==undefined)return false;}
 else if(s.job.phase!==undefined)return false;
 return s.pending?.type!=='errand'||!!errandStage(s)&&s.pending.id===s.job.id&&errandDestination(s)===s.place;
}
