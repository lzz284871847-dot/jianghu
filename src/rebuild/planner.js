import {findRoute} from './routes.js?v=1.0.20';
import {locations} from './content.js?v=1.0.20';
import {command,parseCommand} from './commands.js?v=1.0.20';
import {date} from './progression.js?v=1.0.20';
export const planLimit=8;
function readPlan(input){
 const raw=String(input).split(/[；;、，,\n]+/).map(x=>x.trim()).filter(Boolean),steps=[];
 for(const value of raw){
  const match=value.match(/^(.+?)(?:\s*[×x*]\s*([0-9]+)|\s*([0-9一二两三四五六七八九十]+)\s*次)[。！!]?$/);
  if(!match){steps.push(value)}
  else{
   const countText=match[2]||match[3],count=/^[0-9]+$/.test(countText)?Number(countText):countText==='两'?2:countText.length===1?'一二三四五六七八'.indexOf(countText)+1:0;
   if(!Number.isSafeInteger(count)||count<1||count>planLimit)return {steps:[],error:'重复次数需为1–8，整份计划最多8项行动。'};
   const action=match[1].trim(),parsed=parseCommand(action);
   if(!parsed||!['act','practice','trade'].includes(parsed.kind))return {steps:[],error:'重复安排只支持已实装的日常行动、练习和买卖；移动、接活、装备请单独列出。'};
   for(let i=0;i<count;i++)steps.push(action);
  }
  if(steps.length>planLimit)return {steps:[],error:'整份计划最多8项行动，请减少次数或拆开安排。'};
 }
 return {steps,error:''};
}
export function splitPlan(input){return readPlan(input).steps}
export function isPlanInput(input){return /[；;、，,\n×x*]/.test(String(input))||/[0-9一二两三四五六七八九十]+\s*次[。！!]?\s*$/.test(String(input))}
export function setPlan(s,input){
 const {steps,error}=readPlan(input);let reason='';
 if(s.dead)reason='这段人生已结束，不能安排新的行动。';
 else if(s.plan?.length)reason='已有未完成的安排；请先继续、跳过或清空计划。';
 else if(error)reason=error;
 else if(!steps.length||steps.length>planLimit||steps.some(x=>x.length>40))reason='每份计划需1–8项行动，每项最多40字。';
 else{const unknown=steps.find(x=>!parseCommand(x));if(unknown)reason='尚未实装或无法理解：'+unknown+'。计划未加入，请修改后再试。'}
 if(reason){s.result=[reason];return false}
 s.plan=steps;s.result=['行动计划已备好，点击“执行计划”开始。',...steps.map((x,i)=>`${i+1}. ${x}`),'遇到重要事件、行动无法执行或跨日时暂停。'];return true;
}
export function clearPlan(s){s.plan=[];s.result=['行动计划已清空；不消耗时间、精力或物品。'];return true}
export function skipStep(s){if(!s.plan?.length){s.result=['当前没有行动计划。'];return false}const skipped=s.plan.shift();s.result=['已跳过：'+skipped,'剩余安排不会自动执行。'];return true}
export function runPlan(s,onStep=()=>{}){
 if(!s.plan?.length){s.result=['当前没有行动计划。'];return false}
 if(s.dead||s.pending||s.combat){s.result=[s.dead?'人生已结束，计划停止。':'计划暂停：先处理眼前事件或交手，之后再继续。'];return false}
 const startDay=s.day,lines=[];let completed=0,reason='';
 while(s.plan.length&&completed<planLimit){
  const step=s.plan[0],before=date(s),ok=command(s,step);
  if(!ok){reason=`无法执行“${step}”：${s.result.join('；')}。该项与后续安排保留，可跳过或先解决条件。`;break}
  s.plan.shift();completed++;lines.push(`【${completed}. ${step}】${before} → ${date(s)}`,...s.result);onStep(s);
  if(s.dead){reason='人生已结束，剩余计划停止。';break}
  if(s.pending||s.combat){reason='出现需要你决定的事件或交手；计划暂停，剩余安排保留。';break}
  if(s.day!==startDay){reason='已进入第二天；请查看世界消息，再决定是否继续剩余安排。';break}
 }
 s.result=[`行动计划：完成${completed}项${s.plan.length?`，剩余${s.plan.length}项`:'，安排已做完'}`, ...lines,...(reason?[reason]:[])];return completed>0;
}

export function planTravel(s,to){
 if(s.dead||s.pending||s.combat){s.result=['先处理眼前事件或交手；人生结束后不能再远行。'];return false}
 const route=findRoute(s,to);if(!route){s.result=['找不到通往此地的路线。'];return false}
 if(!route.steps.length){s.result=['你已经在这里。'];return false}
 if(!setPlan(s,route.steps.map(key=>'去'+locations[key].name).join('；')))return false;
 s.result=[`远行计划：${locations[to].name}`,`路线：${[s.place,...route.steps].map(key=>locations[key].name).join(' → ')}`,`预计${route.minutes}分钟，移动精力0；实际天气与耗时逐段结算。`,'点击“执行计划”出发，途中遇事或跨日暂停。',...s.plan.map((step,i)=>`${i+1}. ${step}`)];return true;
}
