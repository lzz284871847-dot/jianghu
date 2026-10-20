import {PRACTICAL_WOODWORK} from './artisan-work-data.js?v=5.47.0';
import {PRACTICE_XP,practiceAward,growthPreview} from './practice-growth.js?v=5.47.0';
import {ARTISAN_LESSON_XP} from './professional-data.js?v=5.47.0';
import {EQUIPMENT} from './equipment.js?v=5.47.0';
import {people,skills,items} from './content.js?v=5.47.0';
import {gain} from './progression.js?v=5.47.0';
import {present} from './adventures.js?v=5.47.0';
export const ARTISAN_ORDERS={
 carpenter_frame:{teacher:'carpenter',skill:'woodwork',required:300,trust:4,name:'护路榫接梁架',product:'榫接梁架',input:{hardwood:2,wood:2,cord:2},reward:40,days:4,minutes:180,energy:22,chance:.8},
 carpenter_case:{teacher:'carpenter',skill:'woodwork',required:700,trust:6,name:'精密药箱机关',product:'机关药箱',input:{hardwood:3,iron:2,cord:2},reward:70,days:5,minutes:240,energy:30,chance:.7},
 tailor_outfit:{teacher:'tailor',skill:'tailor',required:300,trust:4,name:'商路防雨行装',product:'防雨行装',input:{fine_cloth:2,cloth:2,cord:2},reward:60,days:4,minutes:180,energy:22,chance:.8},
 tailor_banner:{teacher:'tailor',skill:'tailor',required:700,trust:6,name:'武馆仪仗绣旗',product:'仪仗绣旗',input:{fine_cloth:3,cloth:2,cord:3},reward:90,days:5,minutes:240,energy:30,chance:.7},
 tanner_pack:{teacher:'tanner',skill:'leatherwork',required:300,trust:4,name:'山行耐磨皮件',product:'耐磨皮件',input:{hide:3,wood:2,cord:1},reward:38,days:4,minutes:180,energy:22,chance:.8},
 tanner_case:{teacher:'tanner',skill:'leatherwork',required:700,trust:6,name:'护镖成套皮具',product:'成套皮具',input:{hide:4,leather:2,wood:2,cord:2},reward:75,days:5,minutes:240,energy:30,chance:.7}
};
export const ALL_ARTISAN_ORDERS={...ARTISAN_ORDERS,...PRACTICAL_WOODWORK};
const empty=()=>({status:'none',accepted:0,due:0,held:0,stock:0,paid:0});
export const makeArtisanOrders=()=>Object.fromEntries(Object.keys(ALL_ARTISAN_ORDERS).map(k=>[k,empty()]));
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function artisanOrdersValid(s){const records=s.professionals.advanced;if(!exact(records,Object.keys(ALL_ARTISAN_ORDERS)))return false;const busy=new Set();return Object.entries(ALL_ARTISAN_ORDERS).every(([key,d])=>{const r=records[key];if(!exact(r,Object.keys(empty()))||!['none','active','claim','done','failed','left'].includes(r.status)||!Number.isSafeInteger(r.accepted)||r.accepted<0||r.accepted>s.day||!Number.isSafeInteger(r.due)||r.due<0||r.due>s.day+d.days||![0,1].includes(r.held)||![0,1].includes(r.stock)||![0,d.reward].includes(r.paid))return false;if(r.status==='none')return !r.accepted&&!r.due&&!r.held&&!r.stock&&!r.paid;if(!r.accepted||r.due!==r.accepted+d.days)return false;if(['active','claim'].includes(r.status)){if(busy.has(d.teacher))return false;busy.add(d.teacher);}if(r.status==='done')return !r.held&&r.stock===1&&r.paid===d.reward;if(r.stock||r.paid)return false;if(r.status==='claim')return r.held===1;if(r.status==='active')return !r.held&&s.day<=r.due;if(r.status==='failed')return !r.held;return true;});}
export function migratePracticalOrders(p){
 const records=p?.advanced;if(exact(records,Object.keys(ARTISAN_ORDERS)))for(const key of Object.keys(PRACTICAL_WOODWORK))records[key]=empty();
}
export function artisanWorkPlan(key,action='work'){
 const d=ALL_ARTISAN_ORDERS[key];if(!d)return null;
 if(action==='work')return {...d,methodName:d.methodName||'定制作业'};
 const method=d.methods?.[action.replace(/^work_/, '')];
 return action.startsWith('work_')&&method?{...d,...method,name:d.name,methodName:method.name}:null;
}
export function artisanOrderChance(s,key,action='work'){
 const d=artisanWorkPlan(key,action);if(!d)return 0;
 return Math.min(.95,d.chance+Math.min(.1,Math.max(0,s.skills[d.skill]-d.required)/2000))*(s.energy-d.energy<20?.75:1);
}
const goods=d=>Object.entries(d.input).map(([k,n])=>items[k]+'×'+n).join('、');
export function artisanPayer(s,key){const d=ALL_ARTISAN_ORDERS[key];return s.npcWorld.individuals[d.payer||d.teacher];}
const payerName=d=>people[d.payer||d.teacher].name;
export function artisanOrderBlocker(s,key,action){
 const base=ALL_ARTISAN_ORDERS[key],work=action==='work'||action.startsWith('work_'),d=work?artisanWorkPlan(key,action):base;
 if(!d||!work&&!['accept','deliver','withdraw'].includes(action))return '没有这项订单行动。';
 const r=s.professionals.advanced[key],p=s.npcWorld.individuals[d.teacher];
 if(s.dead||s.pending||s.combat||s.adventures.law.pursuit)return '先处理眼前选择或交手；永久死亡后不能继续订单。';
 if(action==='withdraw')return ['active','claim'].includes(r.status)?null:'没有未结束的本项订单。';
 if(action==='accept'&&r.status!=='none'||work&&r.status!=='active'||action==='deliver'&&r.status!=='claim')return '请按接单、亲自作业、交付领取的顺序；失败或完成不重开。';
 if(action!=='deliver'&&(s.skills[d.skill]<d.required||s.relations[d.teacher]<d.trust))return '需'+skills[d.skill]+'累计经验'+d.required+(d.practical?'':'（Lv'+(d.required===300?3:4)+'）')+'、与'+people[d.teacher].name+'关系'+d.trust+'；铜钱和成品不能替代手艺。';
 if(action==='accept'&&Object.entries(ALL_ARTISAN_ORDERS).some(([id,other])=>other.teacher===d.teacher&&['active','claim'].includes(s.professionals.advanced[id].status)))return '先完成或撤回这位师傅正在接洽的订单。';
 const minutes=work?d.minutes:15,energy=work?d.energy:1;
 if(!present(s,d.teacher,minutes)||p.retirement.active||p.energy<(work?8:0))return '需'+people[d.teacher].name+'在作坊08—18时在岗，留足'+minutes+'分钟；休养、外出或退养时暂停，可撤回。';
 if(s.socialActions?.[d.teacher]?.quarrel>=s.day-2)return '师傅还记得近期争执，先赔礼再接洽。';
 if(s.hp<25||s.energy<energy)return '需气血25、精力'+energy+'；仍可撤回。';
 if(work){if(s.day>r.due)return '未制作的订单已逾期。';if(Object.entries(d.input).some(([k,n])=>s.bag[k]<n))return '需自己的'+goods(d)+'；材料不足，不开始。';}
 if(['accept','deliver'].includes(action)){const payer=artisanPayer(s,key);if(payer.life.deathDay||payer.coins<d.reward||s.coins>10000000-d.reward)return (d.practical?payerName(d)+'现钱不足或无法付款':'师傅现钱不足')+'或自己的钱袋已满；待付款成品保留，不凭空发钱。';}
 return null;
}
export function artisanOrderAction(s,key,action,{settle,rng}){
 const why=artisanOrderBlocker(s,key,action);if(why){s.result=[why];return false;}
 const work=action==='work'||action.startsWith('work_'),d=work?artisanWorkPlan(key,action):ALL_ARTISAN_ORDERS[key],r=s.professionals.advanced[key],p=s.npcWorld.individuals[d.teacher];
 const chance=work?artisanOrderChance(s,key,action):0;
 return settle(s,d.name+' · '+(work?d.methodName:({accept:'接单',deliver:'交付',withdraw:'撤回'})[action]),work?d.minutes:15,work?d.energy:action==='withdraw'?0:1,()=>{
  if(action==='accept'){
   Object.assign(r,{status:'active',accepted:s.day,due:s.day+d.days});
   s.result.push((d.context?d.context+' ':'')+'第'+r.due+'日内亲自完成作业；自备材料，做法不同，投入与成功率不同。没有预付款；成品只用于本单，不能当装备或出售。');
  }else if(work){
   for(const [k,n] of Object.entries(d.input))s.bag[k]-=n;p.energy-=8;const success=rng()<chance;
   if(success){r.status='claim';r.held=1;s.result.push('完成'+d.product+'一件，留存在本单待交付；材料、时间与精力已实际投入。报酬未到账时保留成品，过期不销毁已完成成果。');}
   else{r.status='failed';s.relations[d.teacher]=Math.max(0,s.relations[d.teacher]-1);s.result.push('定制失手，材料已全部消耗，没有成品或收入；关系最多降低1，失败结果保存，本单不重试。');}
   const line=gain(s,d.skill,practiceAward(s,d.energy,success?PRACTICE_XP.order:PRACTICE_XP.orderFailure));if(line)s.result.push(line);
  }else if(action==='deliver'){
   r.held=0;r.stock=1;r.status='done';r.paid=d.reward;artisanPayer(s,key).coins-=d.reward;s.coins+=d.reward;s.relations[d.teacher]=Math.min(100,s.relations[d.teacher]+2);
   const recipe=Object.values(EQUIPMENT).find(e=>e.recipeOrder===key);if(recipe)s.result.push('已解锁'+recipe.name+'独有配方，可在作坊亲手制作；需材料、手艺与台位费，成品需穿戴才生效。');
   s.result.push(d.product+'一件实际交入师傅留存，实付'+d.reward+'文来自'+payerName(d)+'钱袋；不是净利润，材料和学习成本另计，本单不重复。');
  }else{r.status='left';s.result.push('已撤回，不付钱、不退投入；'+(r.held?'未交定制件留作本单记录，不能再兑现。':'自己的未投入材料保留。')+'本单不重开。');}
 });
}
export function expireArtisanOrders(s){for(const [key,d] of Object.entries(ALL_ARTISAN_ORDERS)){const r=s.professionals.advanced[key];if(r.status==='active'&&s.day>r.due){r.status='failed';s.relations[d.teacher]=Math.max(0,s.relations[d.teacher]-2);s.news.unshift(d.name+'逾期，未投入材料保留，关系最多降低2，本单不重开。');s.news.length=Math.min(20,s.news.length);}}}
const workPreview=(s,key,action)=>{const d=artisanWorkPlan(key,action);return goods(d)+'；'+d.minutes+'分钟/精力'+d.energy+'，当前成功率'+Math.round(artisanOrderChance(s,key,action)*100)+'%。失败耗全部投入，本单不重试。'+growthPreview(s,d.skill,d.energy,PRACTICE_XP.order,PRACTICE_XP.orderFailure);};
export function artisanOrderOptions(s){
 if(s.place!=='workshop')return [];
 return Object.entries(ALL_ARTISAN_ORDERS).flatMap(([key,d])=>{
  const r=s.professionals.advanced[key];
  // Practical opportunities appear when the handwork is within reach, not as a life-long progression roadmap.
  if(d.practical&&r.status==='none'&&s.skills[d.skill]<d.required)return [];
  const workActions=['work',...Object.keys(d.methods||{}).map(k=>'work_'+k)];
  const actions=r.status==='none'?['accept']:r.status==='active'?[...workActions,'withdraw']:r.status==='claim'?['deliver','withdraw']:[];
  return actions.map(action=>{
   const work=workActions.includes(action),preview=action==='deliver'?'15分钟/精力1；定制成品1件已完成，交付实领'+d.reward+'文，实际扣'+payerName(d)+'钱袋（现有'+artisanPayer(s,key).coins+'文）；缺钱时保留成品，不再受制作期限限制。':action==='withdraw'?'15分钟/精力0；不退投入、不发报酬，未交定制件只留记录，不重开。':work?workPreview(s,key,action):(d.context?d.context+' ':'')+'需'+skills[d.skill]+'累计'+d.required+(d.practical?'':'（Lv'+(d.required===300?3:4)+'）')+'、关系'+d.trust+'；接单15分钟/精力1；'+d.days+'游戏日内亲自制作，不接受买来的成品，没有预付款。'+workActions.map(a=>artisanWorkPlan(key,a).methodName+'：'+workPreview(s,key,a)).join(' 或 ');
   return {id:'professional:'+key+':'+action,advancedOrder:!d.practical,details:d.practical&&action==='accept'?workActions.map(a=>artisanWorkPlan(key,a).methodName+'：'+workPreview(s,key,a)).join('\n'):undefined,detailsLabel:'做法、材料与风险',label:people[d.teacher].name+' · '+(work?artisanWorkPlan(key,action).methodName:({accept:'接单',deliver:'交付领取',withdraw:'撤回'})[action])+' · '+d.name,preview:(d.practical&&action==='accept'?(d.context+' 需累计'+d.required+'经验、关系'+d.trust+'；接单15分钟/精力1，'+d.days+'游戏日内亲自作业，不接受购买成品，无预付款。'):preview)+(action==='withdraw'?'':action==='deliver'?' 材料成本另计。':' 约定报酬'+d.reward+'文，交付后才支付；付款人'+payerName(d)+'现有'+artisanPayer(s,key).coins+'文，材料成本另计。'),blocker:artisanOrderBlocker(s,key,action)};
  });
 });
}
function practicalWorkBlocker(s,key){const actions=['work',...Object.keys(ALL_ARTISAN_ORDERS[key].methods||{}).map(k=>'work_'+k)];return actions.some(a=>!artisanOrderBlocker(s,key,a))?'':actions.map(a=>artisanWorkPlan(key,a).methodName+'：'+artisanOrderBlocker(s,key,a)).join('；');}
export function artisanOrderTasks(s){return Object.entries(ALL_ARTISAN_ORDERS).flatMap(([key,d])=>{const r=s.professionals.advanced[key];return ['active','claim'].includes(r.status)?[{title:d.name,place:'workshop',group:d.practical?'professionals':'advancedOrders',next:r.status==='active'?'选择做法并自备对应材料，亲自完成作业；可撤回。':'向'+people[d.teacher].name+'交付定制成品并领取实际报酬；可撤回。',due:r.status==='active'?r.due:0,goods:r.held?'定制成品1件尚未交付，报酬'+d.reward+'文未到账。':'尚无成品，报酬未到账。',blocker:r.status==='active'?practicalWorkBlocker(s,key):artisanOrderBlocker(s,key,'deliver')||''}]:[];});}
export function artisanOrderHistory(s){return Object.entries(ALL_ARTISAN_ORDERS).filter(([key])=>s.professionals.advanced[key].status!=='none').map(([key,d])=>{const r=s.professionals.advanced[key];return d.name+(r.status==='done'&&Object.values(EQUIPMENT).some(e=>e.recipeOrder===key)?'（独有配方已解锁）':'')+' · '+({active:'待制作',claim:'待付款',done:'已交付',failed:'未成或逾期',left:'已撤回'}[r.status])+'；定制件待交'+r.held+'、师傅留存'+r.stock+'；实领'+r.paid+'文，材料投入与失败不重置。';});}
export function artisanSkillGoal(s,skill){const entries=Object.entries(ALL_ARTISAN_ORDERS).filter(([key,d])=>d.skill===skill&&(!d.practical||s.skills[skill]<300||['active','claim'].includes(s.professionals.advanced[key].status))).sort((a,b)=>a[1].required-b[1].required);if(!entries.length)return '';const current=entries.find(([key])=>['active','claim'].includes(s.professionals.advanced[key].status)),next=current||entries.find(([key])=>s.professionals.advanced[key].status==='none');if(!next){const recipe=Object.values(EQUIPMENT).find(e=>e.recipeOrder&&ALL_ARTISAN_ORDERS[e.recipeOrder].skill===skill&&s.professionals.advanced[e.recipeOrder].status==='done');return (recipe?'已解锁'+recipe.name+'，作坊可亲手制作并穿戴；':'')+'现有有限订单已处理；原有制作与修理仍可使用。';}const [key,d]=next,r=s.professionals.advanced[key];const recipe=Object.values(EQUIPMENT).find(e=>e.recipeOrder&&ALL_ARTISAN_ORDERS[e.recipeOrder].skill===skill&&s.professionals.advanced[e.recipeOrder].status==='done');const hint=recipe?'已解锁'+recipe.name+'，作坊可亲手制作并穿戴；':'';return (skill==='woodwork'?'可以不上课：通过实际木工制作、有限实作委托积累经验；课程可选。':'作坊每日练习课：成功'+ARTISAN_LESSON_XP.success+'、失败'+ARTISAN_LESSON_XP.failure+'经验，需自己的材料与学费；')+hint+(d.practical?(r.status==='claim'?'实作已完成，待向梁木匠交付。':r.status==='active'?'实作：'+d.name+'；选择做法并备料，逾期可能失约。':'可接洽：'+d.name+'；需累计'+d.required+'经验、关系'+d.trust+'。'):(r.status==='claim'?'高级订单：'+d.name+'已完成，待实际付款。':r.status==='active'?'高级订单：'+d.name+'待制作。':'下一目标：Lv'+(d.required===300?3:4)+' / 累计'+d.required+'，'+d.name+'；关系'+d.trust+'。'));}
