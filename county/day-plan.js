import {act,talk,move,adventureAction,trade,cost,resourceBlocker} from './engine.js?v=5.74.0';
import {places,people,resources,markets,items,recipes,skills} from './content.js?v=5.74.0';
import {ARTISANS} from './professional-data.js?v=5.74.0';
import {CRAFTS} from './crafts.js?v=5.74.0';
import {jobBlocker,jobPreview} from './livelihood.js?v=5.74.0';
import {npcPlace} from './world.js?v=5.74.0';
import {activityGroups} from './activity-layout.js?v=5.74.0';
import {activityKnown,resourceKnown} from './skill-guide.js?v=5.74.0';
import {outingMovementBlocker} from './outings.js?v=5.74.0';
import {stockAt,budgetAt,MARKET_LIMIT} from './commerce.js?v=5.74.0';
import {tradePrice} from './civic.js?v=5.74.0';
import {districtStatus} from './society.js?v=5.74.0';
const auxiliary={social:'人物往来',affairs:'江湖事务',martial:'武学与身法',daily:'休整与出行'};
// Classification only: no eligibility, journey, action, or save changes.
export function dayOptionSkill(a){
 if(a.kind==='talk')return 'social';
 if(['buy','sell'].includes(a.kind))return 'trade';
 if(a.kind==='move')return 'daily';
 if(a.kind==='act')return resources[a.key]?.skill??recipes[a.key]?.skill??({work:'carry',train:'fist',heal:'herb'}[a.key]||'daily');
 const [kind,key,choice]=a.key.split(':');
 if(kind==='professional'){const teacher=key.split('_')[0];return ARTISANS[teacher]?.skill??({scribe:'literacy',bookkeeper:'accounting',chessfriend:'chess',musician:'music'}[teacher]||'affairs');}
 if(kind==='craft')return CRAFTS[choice]?.skill??'affairs';
 if(kind==='culture')return Object.hasOwn(skills,key)?key:'affairs';
 if(kind==='civic')return ({read:'literacy',literacy:'literacy',audit:'accounting',accounting:'accounting',bargain:'negotiation'}[key]||'negotiation');
 if(kind==='bond')return choice==='meet'?'social':({boatman:'woodwork',smith:'smelt',doctor:'herb',merchant:'trade'}[key]||'affairs');
 if(kind==='business')return key.startsWith('farm')?'farming':key.startsWith('smith')?'smelt':key.startsWith('clinic')?'herb':key.startsWith('merchant')?'trade':'affairs';
 if(kind==='field')return Object.hasOwn(skills,key)?key:Object.hasOwn(skills,choice)?choice:'navigation';
 return ({kitchen:'cook',medicine:'medicine',stall:'trade',mobility:'martial',mentor:'martial',sect:'martial',trial:'martial'}[kind]||'affairs');
}
export function daySkillGroups(options){
 const buckets=new Map();for(const option of options){const key=dayOptionSkill(option);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(option);}
 return [...Object.keys(skills),...Object.keys(auxiliary)].filter(key=>buckets.has(key)).map(key=>({key,label:skills[key]??auxiliary[key],options:buckets.get(key)}));
}
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
 if(s.place==='school'&&s.minute>=480&&s.minute+120<=1080&&s.hp>=25&&s.energy>=18)add('act','train','练入门拳脚','2小时 / 精力18');
 if(s.place==='workshop')for(const [key,d] of Object.entries(recipes))if(s.minute>=420&&s.minute+d.minutes<=1080&&s.energy>=d.energy&&Object.entries(d.input).every(([k,n])=>s.bag[k]>=n))add('act',key,d.name,d.minutes+'分钟 / 精力'+d.energy+'；消耗自己的材料');
 for(const [key,n] of Object.entries(people))if(npcPlace(s,key)===s.place&&s.energy>=1)add('talk',key,'与'+n.name+'交谈','半小时 / 精力1');
 for(const [key,d] of Object.entries(resources))if(d.places.includes(s.place)&&resourceKnown(s,key)&&!resourceBlocker(s,key))add('act',key,d.name,d.minutes+'分钟 / 精力'+cost(s,d.energy)+(d.risk?'；先查看风险，由你确认':''));
 const m=markets[s.place];if(m&&!districtStatus(s,s.place).closed&&s.minute>=m.open&&s.minute+15<=m.close&&s.energy>=1)for(const type of ['buy','sell'])for(const key of Object.keys(m[type])){const price=tradePrice(s,s.place,type,key),stock=stockAt(s,s.place,key);if(type==='buy'?s.coins>=price&&stock>=1&&s.bag[key]<1000000:s.bag[key]>=1&&stock<MARKET_LIMIT&&budgetAt(s,s.place)>=price&&s.coins<=10000000-price)add(type,key,(type==='buy'?'购买':'出售')+items[key]+'×1','15分钟 / 精力1；'+price+'文');}
 for(const g of activityGroups(s))for(const a of g.options)if(activityKnown(s,a.id)&&!a.blocker)add('adventure',a.id,a.label,a.brief,!['culture','professionals','advancedOrders','civic','kitchen','field','craft','medicine','bonds','work'].includes(g.id)||/撤回|放弃|交手|挑战|拆解|出售|离开|解约|决定|分歧/.test(a.label));
 if(!s.adventures.law.pursuit&&!outingMovementBlocker(s))for(const to of places[s.place].routes)add('move',to,'去'+places[to].name,'只走这一段路；到达后重新安排');
 return rows;
}
// Read-only county catalogue at the current time; arrival may change eligibility.
export function dayRoute(from,to){
 const queue=[[from]],seen=new Set([from]);
 for(const path of queue){const last=path.at(-1);if(last===to)return path.slice(1);for(const next of places[last].routes)if(!seen.has(next)){seen.add(next);queue.push([...path,next]);}}
 return [];
}
export function countyDayOptions(s){
 const local=dayOptions(s);if(!local.length)return [];
 const rows=local.map(a=>({...a,place:s.place,remote:false}));
 if(outingMovementBlocker(s))return rows;
 for(const place of Object.keys(places)){
  if(place===s.place)continue;const route=dayRoute(s.place,place);if(!route.length)continue;
  const projected=structuredClone(s);projected.place=place;
  for(const a of dayOptions(projected)){
   // Rest, food, waiting and exits belong to the player's actual location.
   if(a.kind==='move'||a.kind==='act'&&['rest','wait','waitMorning','eat','heal'].includes(a.key))continue;
   rows.push({...a,id:'at:'+place+':'+a.id,place,remote:true,route});
  }
 }
 return rows;
}
export function parseDayNumbers(input,count){
 const raw=String(input).trim();if(!raw)throw Error('请先填写事项编号。');
 let parts;if(/^\d+$/.test(raw)&&!raw.includes('0'))parts=[...raw];else if(/^#\d+$/.test(raw))parts=[raw.slice(1)];else if(/^[#\d\s,，、]+$/.test(raw)&&/[\s,，、]/.test(raw))parts=raw.split(/[\s,，、]+/).filter(Boolean).map(p=>p.replace(/^#/,''));else throw Error('连写126代表1、2、6；两位数请用空格分隔，单项用#12。');
 if(parts.some(p=>!/^\d+$/.test(p)))throw Error('请填写有效编号。');const numbers=parts.map(Number);if(!numbers.length||numbers.some(n=>!Number.isSafeInteger(n)||n<1||n>count))throw Error('编号不在当前清单内，请核对后再执行。');if(new Set(numbers).size!==numbers.length)throw Error('同一事项请只选择一次。');return numbers;
}
export function performDayOption(s,id){if(id.startsWith('at:')){const destination=countyDayOptions(s).find(a=>a.id===id);return !!destination&&move(s,destination.route[0]);}const a=dayOptions(s).find(a=>a.id===id);if(!a)return false;return a.kind==='act'?act(s,a.key):a.kind==='talk'?talk(s,a.key):a.kind==='move'?move(s,a.key):['buy','sell'].includes(a.kind)?trade(s,a.kind,a.key):adventureAction(s,a.key);}
export function runDayPlan(s,snapshot,numbers,onStep=()=>{}){
 const report=[],day=s.day,place=s.place;let stop='',reviewId=null;
 for(const number of numbers){
  const frozen=snapshot[number-1],a=frozen?.remote?countyDayOptions(s).find(a=>a.id===frozen.id):(!frozen?.place||frozen.place===s.place)?dayOptions(s).find(a=>a.id===frozen?.id):null;
  if(!a){stop='第'+number+'项目前已不能办理，余下安排未执行。';break;}
  if(a.remote){reviewId=a.id;stop='第'+number+'项「'+a.label+'」在'+places[a.place].name+'，需先按道路前往；尚未移动或办理，余下安排已停止。';break;}
  if(a.review){reviewId=a.id;stop='第'+number+'项「'+a.label+'」需要你单独决定，尚未执行；余下安排已停止。';break;}
  const ok=performDayOption(s,a.id);report.push({number,label:a.label,result:[...s.result],ok});onStep();
  if(!ok){stop='这项未办成，余下安排已停止。';break;}
  if(s.dead||s.pending||s.combat){stop='遇到需要处理的情况，余下安排已停止。';break;}
  if(s.day!==day){stop='已到新的一日，余下安排未执行，请重新查看清单。';break;}
  if(s.place!==place){stop='已经来到新的地方，余下安排未执行，请重新查看当地清单。';break;}
 }
 return {report,stop,reviewId};
}

