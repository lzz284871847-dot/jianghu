import {locations,jobs,recipes,skills} from './content.js?v=1.0.43';
import {currentWeapon} from './equipment.js?v=1.0.43';
import {dailyContract,jobDestination,escortStatus,jobDeliveryBlocker,jobDeadline} from './contracts.js?v=1.0.43';
import {farmBlocker,farmStatus} from './farming.js?v=1.0.43';
import {recipeBlockers} from './crafting.js?v=1.0.43';
import {npcPlace} from './world.js?v=1.0.43';
// 建议只读取实际状态，不执行行动、不替玩家做选择。
export function todoSuggestions(s){
 if(s.dead)return [{text:'这段人生已经结束。可在系统页导出记录或创建新角色。'}];
 if(s.pending||s.combat)return [{text:'先处理眼前的事件或交手，也可以选择离开；待办不会替你决定。'}];
 const rows=[];
 const at=(place,key,text,label)=>rows.push({text,kind:s.place===place?'act':'travel',key:s.place===place?key:place,label:s.place===place?label:'列路线：'+locations[place].name});
 if(s.plan.length)rows.push({text:`已有安排${s.plan.length}项，遇事、精力不足或跨日会暂停。`,kind:'plan',label:'继续已有安排'});
 if(s.energy<30)rows.push({text:'精力偏低，歇息2小时可恢复30；时间仍会流逝。',kind:'act',key:'rest',label:'歇息恢复精力'});
 if(s.hp<50)at(npcPlace(s,'doctor'),'treat','伤势需要恢复，可找沈医者治疗；治疗有诊金。','请医者治疗');
 if(s.job){const job=jobs[s.job.id],place=jobDestination(s),blocked=jobDeliveryBlocker(s,job);at(place,'deliver',job.route?escortStatus(s)+jobDeadline(s):`${job.name}：${job.hours||0.5}小时 / 精力${job.energy||2}，报酬${job.reward}文。${jobDeadline(s)}${blocked||''}`,job.hours?'开始约定的工作':'交付当前约定');}
 if(s.plot){const key=s.day>=s.plot.readyDay?'harvest':'tend';if(!farmBlocker(s,key))at('village',key,farmStatus(s),key==='harvest'?'收获成熟蔬菜':'照料这茬菜地');}
 else if(s.bag.seed&&!farmBlocker(s,'plant'))at('village','plant','菜地空闲，可用菜种1、借地2文播种。','借地播种');
 for(const key of ['brew','smelt','cookMeat','cookVegetables','cook']){const recipe=recipes[key];if(!recipeBlockers(s,recipe).length)at(recipe.place||'forge',key,`${recipe.name}：${recipe.hours}小时 / 精力${recipe.energy}，会实际消耗配方材料。`,recipe.name);}
 if(!s.job){const [key,job]=dailyContract(s);if(s.jobsDone[key]!==s.day){if(s.place==='town')rows.push({text:`今日采购：${job.name}，${job.reward}文，可接可不接。`,kind:'job',key,label:'接今日采购约定'});else rows.push({text:`今日采购：${job.name}；到街市看看其他活也可以。`,kind:'travel',key:'town',label:'列路线：青石镇'});}}
 if(s.hp>=25&&s.energy>=12&&s.bag.wood<2)at('bamboo','collectWood','木料较少，竹林可拾柴整理木料；2小时 / 精力12。','拾柴补充木料');
 if(s.hp>=25&&s.energy>=18){const skill=skills[currentWeapon(s).skill],place=locations[s.place].actions.includes('train')?s.place:'road';at(place,'train',`练习基础${skill}：2小时 / 精力18，只增长相关武学。`,'练习当前武学');}
 const unique=new Map();for(const row of rows){const key=row.kind+':'+row.key;if(!unique.has(key))unique.set(key,row)}return [...unique.values()].slice(0,6);
}
