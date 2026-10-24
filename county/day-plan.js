import {act,talk,move,adventureAction,cost,resourceBlocker} from './engine.js?v=5.71.0';
import {places,people,resources} from './content.js?v=5.71.0';
import {jobBlocker,jobPreview} from './livelihood.js?v=5.71.0';
import {npcPlace} from './world.js?v=5.71.0';
import {activityGroups} from './activity-layout.js?v=5.71.0';
import {activityKnown,resourceKnown} from './skill-guide.js?v=5.71.0';
import {outingMovementBlocker} from './outings.js?v=5.71.0';
// Numbers describe one displayed snapshot. Execution always rechecks the live world.
export function dayOptions(s){
 if(s.dead||s.pending||s.combat||s.adventures.law.pursuit||[s.fort,s.raid,s.dungeon,s.wreck].some(x=>x?.status==='active'))return [];
 const rows=[],add=(kind,key,label,preview='',review=false)=>rows.push({id:kind+':'+key,kind,key,label,preview,review});
 if(places[s.place].work&&!jobBlocker(s,cost(s,24)))add('act','work','做短工',jobPreview(s,cost(s,24)));
 add('act','rest','歇息','2小时，恢复精力30、气血10');add('act','wait','等半小时','只推进时间，不恢复状态');
 if(['inn','village'].includes(s.place)&&(s.place==='village'||s.coins>=5))add('act','sleep','睡一觉',s.place==='inn'?'8小时，房钱5文':'8小时，免费借宿');
 if(s.minute<480||s.minute>=1080)add('act','waitMorning','等待至08:00','不恢复状态，跨日后停止余下安排');
 if(s.bag.food&&(s.hp<100||s.energy<100))add('act','eat','吃干粮','15分钟，消耗干粮1份');
 if(s.bag.herb&&(s.hp<100||['bruise','cut','strain'].some(k=>s.injuries[k])))add('act','heal','用药材处理伤口','15分钟，消耗常见药材1份');
 for(const [key,n] of Object.entries(people))if(npcPlace(s,key)===s.place&&s.energy>=1)add('talk',key,'与'+n.name+'交谈','半小时 / 精力1');
 for(const [key,d] of Object.entries(resources))if(d.places.includes(s.place)&&resourceKnown(s,key)&&!resourceBlocker(s,key))add('act',key,d.name,d.minutes+'分钟 / 精力'+cost(s,d.energy)+(d.risk?'；先查看风险，由你确认':''));
 for(const g of activityGroups(s))for(const a of g.options)if(activityKnown(s,a.id)&&!a.blocker)add('adventure',a.id,a.label,a.brief,!['culture','professionals','advancedOrders','civic','kitchen','field','craft','medicine','bonds','work'].includes(g.id)||/撤回|放弃|交手|挑战|拆解|出售|离开|解约|决定|分歧/.test(a.label));
 if(!s.adventures.law.pursuit&&!outingMovementBlocker(s))for(const to of places[s.place].routes)add('move',to,'去'+places[to].name,'只走这一段路；到达后重新安排');
 return rows;
}
export function parseDayNumbers(input,count){
 const raw=String(input).trim();if(!raw)throw Error('请先填写事项编号。');
 let parts;if(/^\d+$/.test(raw)&&!raw.includes('0'))parts=[...raw];else if(/^#\d+$/.test(raw))parts=[raw.slice(1)];else if(/^[#\d\s,，、]+$/.test(raw)&&/[\s,，、]/.test(raw))parts=raw.split(/[\s,，、]+/).filter(Boolean).map(p=>p.replace(/^#/,''));else throw Error('连写126代表1、2、6；两位数请用空格分隔，单项用#12。');
 if(parts.some(p=>!/^\d+$/.test(p)))throw Error('请填写有效编号。');const numbers=parts.map(Number);if(!numbers.length||numbers.some(n=>!Number.isSafeInteger(n)||n<1||n>count))throw Error('编号不在当前清单内，请核对后再执行。');if(new Set(numbers).size!==numbers.length)throw Error('同一事项请只选择一次。');return numbers;
}
export function performDayOption(s,id){const a=dayOptions(s).find(a=>a.id===id);if(!a)return false;return a.kind==='act'?act(s,a.key):a.kind==='talk'?talk(s,a.key):a.kind==='move'?move(s,a.key):adventureAction(s,a.key);}
export function runDayPlan(s,snapshot,numbers,onStep=()=>{}){
 const report=[],day=s.day,place=s.place;let stop='',reviewId=null;
 for(const number of numbers){
  const frozen=snapshot[number-1],a=dayOptions(s).find(a=>a.id===frozen.id);
  if(!a){stop='第'+number+'项目前已不能办理，余下安排未执行。';break;}
  if(a.review){reviewId=a.id;stop='第'+number+'项「'+a.label+'」需要你单独决定，尚未执行；余下安排已停止。';break;}
  const ok=performDayOption(s,a.id);report.push({number,label:a.label,result:[...s.result],ok});onStep();
  if(!ok){stop='这项未办成，余下安排已停止。';break;}
  if(s.dead||s.pending||s.combat){stop='遇到需要处理的情况，余下安排已停止。';break;}
  if(s.day!==day){stop='已到新的一日，余下安排未执行，请重新查看清单。';break;}
  if(s.place!==place){stop='已经来到新的地方，余下安排未执行，请重新查看当地清单。';break;}
 }
 return {report,stop,reviewId};
}
