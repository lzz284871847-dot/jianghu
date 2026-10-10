import {arts,activeArt,learnArtBlocker,artPracticeBlocker,artMoveBlocker,artAssessmentBlocker,validMartial} from './martial.js?v=1.0.49';
import {marketBlocker,marketHours,marketPrices} from './market.js?v=1.0.49';
import {relationshipFee,relationshipChange} from './relationships.js?v=1.0.49';
import {farmActions,farmBlocker,farmStatus,validPlot} from './farming.js?v=1.0.49';
import {travelMinutes} from './routes.js?v=1.0.49';
import {combatCost,strike,assessmentBlocker,counterBlocker,banditForPlace,opponentHint} from './combat.js?v=1.0.49';
import {postedJobs,recordEscortStep,escortStatus,jobEntryBlocker,jobDeliveryBlocker,jobMinutes} from './contracts.js?v=1.0.49';
import {recipeBlockers} from './crafting.js?v=1.0.49';
import {resources,resourceChance} from './resources.js?v=1.0.49';
import {injury} from './condition.js?v=1.0.49';
import {discoveries,discoveryForRoll} from './discoveries.js?v=1.0.49';
import {weapons,currentWeapon} from './equipment.js?v=1.0.49';
import {locations,skills,items,people,jobs,recipes,events,actionNames,waitingActions,homePrice} from './content.js?v=1.0.49';
import {gain,maxXP,progress} from './progression.js?v=1.0.49';
import {advance,encounter,random,npcPlace} from './world.js?v=1.0.49';
export const KEY='jianghu-wanxiang-lite-v1';
export function fresh(profile={}){return {version:1,name:String(profile.name||'无名客').trim().slice(0,12)||'无名客',age:Math.max(16,Math.min(60,Math.floor(Number(profile.age)||18))),gender:profile.gender==='女'?'女':'男',background:['农家','学徒','小贩'].includes(profile.background)?profile.background:'农家',personality:['谨慎','随和','勤奋'].includes(profile.personality)?profile.personality:'谨慎',day:1,minute:480,place:'town',hp:100,energy:100,coins:30,dead:false,weapon:'unarmed',arts:{steadySword:false,shelterStaff:false},art:null,artPassed:{},learned:false,learnedMedicine:false,seed:823471,skills:Object.fromEntries(Object.keys(skills).map(k=>[k,0])),bag:Object.fromEntries(Object.keys(items).map(k=>[k,k==='food'?2:0])),relations:Object.fromEntries(Object.keys(people).map(k=>[k,0])),talkDays:{},giftDays:{},lessonDay:0,homeDay:0,assessments:{},forgeLessonDay:0,discoveryDay:0,discoveryResolution:null,jobsDone:{},plot:null,plan:[],job:null,combat:null,pending:null,events:[],weather:'晴',news:[],result:['你只是一个初到青石镇的普通人。先找一份活，或出去走走。'],journal:[]}}
function fail(s,text){s.result=[text];return false}
function available(s){if(s.dead)return fail(s,'这段人生已结束。可以导出记录，再创建新角色。');if(s.combat)return fail(s,'先处理当前交手，可以撤离。');if(s.pending)return fail(s,'先决定如何处理眼前的事，也可以不参与。');return true}
function settle(s,name,minutes,cost,run,xp={}){
 if(cost>s.energy)return fail(s,'精力不足，请歇息或睡觉。');const before=structuredClone(s);s.result=[];const efficiency=Math.max(0,s.energy-cost)<20?0.5:1;
 run();s.energy=Math.max(0,s.energy-cost);advance(s,minutes);
 s.result.unshift(name,`精力：${before.energy} → ${s.energy}（${signed(s.energy-before.energy)}）`,`金钱：${before.coins} → ${s.coins}（${signed(s.coins-before.coins)}文）`);
 if(s.hp!==before.hp){s.result.push(`气血：${before.hp} → ${s.hp}（${signed(s.hp-before.hp)}）`);if(injury(s.hp).name!==injury(before.hp).name)s.result.push(`伤势：${injury(before.hp).name} → ${injury(s.hp).name}`);}
 for(const [k,n] of Object.entries(xp)){const line=gain(s,k,Math.max(1,Math.floor(n*efficiency)));if(line)s.result.push(line)}
 for(const [k,n] of Object.entries(items))if(s.bag[k]!==before.bag[k])s.result.push(`${n}：${before.bag[k]} → ${s.bag[k]}（${signed(s.bag[k]-before.bag[k])}）`);
 if(s.energy<20)s.result.push(s.energy<10?'极疲：行动效率与交手能力下降。':'疲惫：成长效率下降，先歇歇也无妨。');
 s.journal=[{day:s.day,text:s.result.join('；')},...s.journal].slice(0,24);encounter(s);return true;
}
function signed(n){return (n>=0?'+':'')+n}
export function travel(s,to){if(!available(s))return false;if(!locations[s.place].routes.includes(to))return fail(s,'这里没有直达的路。');return settle(s,'前往'+locations[to].name,travelMinutes(s,to),0,()=>{s.place=to;recordEscortStep(s,to)})}
export function equip(s,key){if(!available(s))return false;if(!Object.hasOwn(weapons,key))return fail(s,'没有这类兵器。');if(key!=='unarmed'&&!s.bag[key])return fail(s,'背包里没有'+weapons[key].name+'。');if(s.weapon===key)return fail(s,'已经使用这件兵器。');return settle(s,'换用'+weapons[key].name,5,0,()=>{s.weapon=key;s.result.push(`当前兵器：${weapons[key].name}；练习和出招结算${skills[weapons[key].skill]}。`)})}
export function talk(s,id){if(!available(s))return false;if(!Object.hasOwn(people,id)||npcPlace(s,id)!==s.place)return fail(s,'此人目前不在这里。');return settle(s,'与'+people[id].name+'交谈',30,1,()=>{s.result.push(people[id].line);if(s.talkDays[id]!==s.day){const old=s.relations[id];s.relations[id]=Math.min(100,old+1);s.talkDays[id]=s.day;s.result.push(...relationshipChange(s,id,old))}else s.result.push('今日已经交谈过，不重复增加关系。');if(id==='master'&&!s.learned){s.learned=true;s.result.push('周师傅教你基础吐纳，现在可以自行练习。')}if(id==='doctor'&&!s.learnedMedicine){s.learnedMedicine=true;s.result.push('沈医者教你基础制药：在河湾村用草药2、木料1调制普通药膏2。仅是常见药膏，没有神效。')}})}
export function gift(s,id){if(!available(s))return false;if(!Object.hasOwn(people,id)||npcPlace(s,id)!==s.place)return fail(s,'此人目前不在这里。');if(s.giftDays[id]===s.day)return fail(s,'今日已赠礼，改日再来。');const key=people[id].gift;if(!s.bag[key])return fail(s,`${people[id].name}喜欢${items[key]}，你目前没有。`);return settle(s,'赠礼给'+people[id].name,15,1,()=>{s.bag[key]--;s.giftDays[id]=s.day;const before=s.relations[id];s.relations[id]=Math.min(100,before+2);s.result.push(...relationshipChange(s,id,before))})}
export function lessonFee(s){return relationshipFee(s,'master')}
export function treatmentFee(s){return relationshipFee(s,'doctor')}
export function forgeLessonFee(s){return relationshipFee(s,'artisan')}
function instruction(s,teacher,record,skill,fee,practice){
 if(!available(s))return false;
 const name=people[teacher].name;
 if(npcPlace(s,teacher)!==s.place)return fail(s,name+'目前不在这里。');
 if(s[record]===s.day)return fail(s,'今日已请教，先消化练习，明日再来。');
 if(s.hp<25)return fail(s,'先养好伤，再请教师傅。');
 if(s.skills[skill]>=maxXP)return fail(s,`基础${skills[skill]}已经完成，师傅暂时没有更高阶段课程；不收学费。`);
 if(s.coins<fee)return fail(s,`请教需要${fee}文。`);
 return settle(s,'向'+name+'请教'+skills[skill],60,12,()=>{s.coins-=fee;s[record]=s.day;s.result.push(practice)},{[skill]:3});
}
export function lesson(s,key=s.weapon||'unarmed'){
 if(!available(s))return false;
 if(!Object.hasOwn(weapons,key)||key!==(s.weapon||'unarmed'))return fail(s,'请先在背包换用对应兵器，再请教这项武学。');
 const w=weapons[key];return instruction(s,'master','lessonDay',w.skill,lessonFee(s),`师傅纠正你的站姿、发力与${key==='unarmed'?'拳脚动作':key==='staff'?'握棍和收棍动作':'握剑和收剑动作'}，练的仍是基础${skills[w.skill]}。`);
}
export function forgeLesson(s){
 if(!available(s))return false;
 if(s.place!=='forge')return fail(s,'请在07:00–18:00到作坊，请许铁匠指导基础锻造。');
 return instruction(s,'artisan','forgeLessonDay','forge',forgeLessonFee(s),'许铁匠用练习用废铁教你看火色、落锤和检查缺口；学费包含练习用料，没有成品带走。');
}
export {prices,salePrices} from './market.js?v=1.0.49';
export function trade(s,type,key,quantity=1){
 if(!available(s))return false;
 if(!['buy','sell'].includes(type)||!Number.isInteger(quantity)||quantity<1||quantity>20)return fail(s,'每笔买卖数量需为1–20的整数。');
 const marketClosed=marketBlocker(s);if(marketClosed)return fail(s,marketClosed);
 const price=marketPrices(s,type)[key];if(typeof price!=='number')return fail(s,'这里不经营这件物品。');
 const total=price*quantity;
 if(type==='buy'&&s.coins<total)return fail(s,`铜钱不足，这笔需要${total}文；整笔未成交。`);
 if(type==='sell'&&s.bag[key]<quantity)return fail(s,`没有足够可出售的${items[key]}，需要${quantity}，现有${s.bag[key]}；整笔未成交。`);
 return settle(s,(type==='buy'?'购买':'出售')+items[key]+(quantity===1?'':'×'+quantity),marketHours.minutes,1,()=>{s.coins+=type==='buy'?-total:total;s.bag[key]+=type==='buy'?quantity:-quantity;s.result.push(`本笔成交：${items[key]}×${quantity}，单价${price}文，总价${total}文。`);},type==='sell'?{trade:1}:{});
}
export function acceptJob(s,id){if(!available(s))return false;if(!Object.hasOwn(jobs,id)||![jobs[id].board||'town',jobs[id].place].includes(s.place))return fail(s,'请到街市或委托地点接活。');if(!postedJobs(s).some(([key])=>key===id))return fail(s,'今日未刊出这份采购，去街市看看其他约定。');if(jobs[id].start&&s.place!==jobs[id].start)return fail(s,'请到'+locations[jobs[id].start].name+'领取委托货物。');const skillBlock=jobEntryBlocker(s,jobs[id]);if(skillBlock)return fail(s,skillBlock);if(s.job)return fail(s,'先完成或放弃手里的约定。');if(s.jobsDone[id]===s.day)return fail(s,'这份活今天已经做过了，明日再看看。');s.job={id,deadline:s.day+2,...(jobs[id].route?{progress:0}:{})};s.result=[`接下：${jobs[id].name}。三日内完成；也可以放弃，没有强制主线。`,...(jobs[id].route?[escortStatus(s)]:[])];return true}
export function abandonJob(s){if(!available(s))return false;s.job=null;s.result=['你放下了这份约定，可以另作打算。'];return true}
export function act(s,id,rng=()=>random(s)){
 if(!available(s))return false;
 if(['learnSwordArt','learnStaffArt'].includes(id)){const key=id==='learnSwordArt'?'steadySword':'shelterStaff',a=arts[key],blocked=learnArtBlocker(s,key);if(blocked)return fail(s,blocked);return settle(s,'学习'+a.name,60,12,()=>{s.coins-=a.fee;s.arts[key]=true;s.result.push('教习演示后，你按兵器练习入门动作。已学会，需自行选用；没有装备或隐藏加成。')},{[key]:1,[a.basic]:1})}
 if(['equipSwordArt','equipStaffArt','unsetArt'].includes(id)){const key=id==='equipSwordArt'?'steadySword':id==='equipStaffArt'?'shelterStaff':null;if(key&&(!s.arts[key]||s.weapon!==arts[key].weapon))return fail(s,'需学过这门武艺并装备对应兵器。');if(s.art===key)return fail(s,'已经是当前选择。');return settle(s,key?'选用'+arts[key].name:'停用进阶武艺',5,0,()=>{s.art=key})}
 if(id==='practiceArt'){const blocked=artPracticeBlocker(s);if(blocked)return fail(s,blocked);const a=activeArt(s);return settle(s,'练习'+a.name,120,16,()=>{s.result.push('按招式练习攻守和兵器动作，没有一夜顿悟。')},{[s.art]:2,[a.basic]:1})}
 if(id==='artAssessment'){const blocked=artAssessmentBlocker(s);if(blocked)return fail(s,blocked);return settle(s,'参加'+activeArt(s).name+'进阶考较',5,0,()=>{s.combat={name:'陆教习',hp:50,attack:8,spar:true,artAssessment:s.art};s.result.push('点到为止，可用已掌握的招式，也可撤离；获胜才记通过，不送奖金、装备或隐藏加成。')})}
 if(id==='forgeLesson')return forgeLesson(s);
 if(id==='deliver'){
  if(!s.job)return fail(s,'没有待完成的约定。');const job=jobs[s.job.id],blocked=jobDeliveryBlocker(s,job);if(blocked)return fail(s,blocked);
  return settle(s,'完成：'+job.name,jobMinutes(job),job.energy||2,()=>{for(const [k,n] of Object.entries(job.needs||{}))s.bag[k]-=n;s.coins+=job.reward;s.jobsDone[s.job.id]=s.day;s.job=null;s.result.push(job.result||(job.hours?'你完成约定的活计，雇主支付工钱；用料和成品都归雇主。':'对方收下交付，这份活就此结束。'));if(job.hours&&job.needs)s.result.push('材料消耗：'+Object.entries(job.needs).map(([key,n])=>items[key]+' -'+n).join('、'),'当前库存：'+Object.keys(job.needs).map(key=>items[key]+' '+s.bag[key]).join('、'))},job.xp||{[job.skill]:job.hours?2:1});
 }
 if(Object.hasOwn(waitingActions,id)){const a=waitingActions[id];return settle(s,a.name,a.minutes,0,()=>{s.result.push('你留在原地等候。等候不恢复精力或气血，也不增长技能；周围的人仍照自己的安排活动。')});}
 if(id==='rest')return settle(s,'歇息',120,0,()=>{s.energy=Math.min(100,s.energy+30);s.hp=Math.min(100,s.hp+10)});
 if(id==='buyHome'){if(s.place!=='town')return fail(s,'请到青石镇购买旧屋。');if(s.homeDay)return fail(s,'你已拥有镇上旧屋，不重复购买。');if(s.coins<homePrice)return fail(s,`旧屋需要${homePrice}文，铜钱不足；没有扣钱。`);return settle(s,'购买镇上旧屋',60,0,()=>{s.coins-=homePrice;s.homeDay=s.day;s.result.push('你与房主办理交接，拿到一间普通旧屋的钥匙。以后可在青石镇睡觉，不付住宿费；没有附赠物资或技能加成。')});}
 if(id==='sleep'){if(!['inn','village'].includes(s.place)&&!(s.place==='town'&&s.homeDay))return fail(s,'可去客栈住店、到河湾村借宿，或在已购的镇上旧屋睡觉。');const fee=s.place==='inn'?5:0;if(s.coins<fee)return fail(s,'住店需要5文。');return settle(s,'睡一觉',480,0,()=>{s.coins-=fee;s.energy=100;s.hp=Math.min(100,s.hp+20)})}
 if(['eat','heal','useSalve'].includes(id)){const key=id==='eat'?'food':id==='heal'?'herb':'salve';if(!s.bag[key])return fail(s,'没有'+items[key]+'。');if(s.hp===100&&(id!=='eat'||s.energy===100))return fail(s,'目前无需恢复，不消耗物品。');return settle(s,actionNames[id],15,0,()=>{s.bag[key]--;s.hp=Math.min(100,s.hp+(id==='eat'?5:id==='heal'?25:35));if(id==='eat')s.energy=Math.min(100,s.energy+12)})}
 if(id==='treat'){if(npcPlace(s,'doctor')!==s.place)return fail(s,'沈医者不在这里。');if(s.hp===100)return fail(s,'气血充足，无需治疗。');const fee=treatmentFee(s);if(s.coins<fee)return fail(s,`诊金需要${fee}文。`);return settle(s,'医者治疗',60,0,()=>{s.coins-=fee;s.hp=Math.min(100,s.hp+50)})}
 if(id==='inner'){if(!s.learned)return fail(s,'先向周师傅学习基础吐纳。');return settle(s,'吐纳修炼',120,8,()=>{s.hp=Math.min(100,s.hp+5)},{inner:2})}
 if(id==='assessment'){if(npcPlace(s,'master')!==s.place)return fail(s,'周师傅目前不在这里。');const blocked=assessmentBlocker(s);if(blocked)return fail(s,blocked);return settle(s,'参加基础武艺考较',5,0,()=>{s.combat={name:'周师傅',hp:45,attack:7,spar:true,assessment:s.weapon};s.result.push('师傅提高了对练强度：将对方气血降到0才算通过；可随时撤离，伤势过重会收手。没有奖金或装备。')});}
 if(id==='spar'){if(npcPlace(s,'master')!==s.place)return fail(s,'周师傅不在这里。');if(s.hp<30)return fail(s,'先养好伤再切磋。');return settle(s,'请教切磋',5,0,()=>{s.combat={name:'周师傅',hp:45,attack:5,spar:true};s.result.push('点到为止，随时可以认输。')})}
 if(!locations[s.place].actions.includes(id))return fail(s,'此地不能进行这项行动。');
 if(farmActions[id]){const a=farmActions[id],blocked=farmBlocker(s,id);if(blocked)return fail(s,blocked);return settle(s,actionNames[id],a.minutes,a.energy,()=>{a.run(s);s.result.push(farmStatus(s))},{farming:a.xp})}
 if(id==='work'){if(s.hp<25)return fail(s,'受伤太重，先休养再做重活。');return settle(s,'打零工',180,24,()=>{s.coins+=12},{carry:2});}
 if(id==='browse')return settle(s,'听街谈',30,1,()=>{s.result.push('茶客谈起附近的事情：有活可以去街市看，有伤可以找沈医者；传闻听听就好。')});
 if(id==='train'){if(s.hp<25)return fail(s,'受伤太重，先休养。');const w=currentWeapon(s);return settle(s,'练习'+skills[w.skill],120,18,()=>{},{[w.skill]:2})}
 if(resources[id]){const r=resources[id];if(s.hp<25)return fail(s,'受伤太重，先休养再做重活。');if(r.tool&&!s.bag[r.tool])return fail(s,`需要${items[r.tool]}，可在街市购买或自己打造。`);return settle(s,r.name,r.hours*60,r.energy,()=>{const chance=resourceChance(s,r);if(rng()<chance){for(const [key,n] of Object.entries(r.output))s.bag[key]+=n;s.result.push(r.success)}else s.result.push(r.failure)},{[r.skill]:2})}
 if(recipes[id]){const r=recipes[id],missing=recipeBlockers(s,r);if(missing.length)return fail(s,missing.join('；')+'。');return settle(s,r.name,r.hours*60,r.energy,()=>{for(const [k,n] of Object.entries(r.input))s.bag[k]-=n;const failed=s.energy-r.energy<20&&rng()<0.2;if(!failed)for(const [k,n] of Object.entries(r.output))s.bag[k]+=n;s.result.push(failed?'疲劳导致失误，没有产出。':'本次产出：'+Object.entries(r.output).map(([k,n])=>items[k]+'×'+n).join('、'),'材料消耗：'+Object.entries(r.input).map(([k,n])=>items[k]+' -'+n).join('、'),'当前库存：'+[...new Set([...Object.keys(r.input),...Object.keys(r.output)])].map(k=>items[k]+' '+s.bag[k]).join('、'))},{[r.skill]:2})}
 if(id==='explore')return settle(s,'沿路探索',60,8,()=>{const roll=rng(),kind=discoveryForRoll(roll,s.place),endDay=s.day+Math.floor((s.minute+60)/1440);if(roll<0.2){s.pending={type:'bandit'};s.result.push('一个拦路人挡住去路。是否交手由你决定。')}else if(kind&&s.discoveryDay!==endDay){s.discoveryDay=endDay;s.pending={type:'discovery',kind,day:endDay};s.result.push('偶遇：'+discoveries[kind].title+'。参与或离开由你决定。')}else s.result.push('你走了一段旧道，远处有炊烟，今天没有遇到特别的事。')});
 return fail(s,'未知行动。');
}
export function choose(s,id){
 if(s.dead||!s.pending)return fail(s,'当前没有待决定的事情。');
 if(s.pending.type==='discovery'){const kind=s.pending.kind,def=discoveries[kind],c=def.choices.find(x=>x.id===id);if(!c)return fail(s,'没有这个选择。');if(c.coins<0&&s.coins<-c.coins)return fail(s,`这项选择需${-c.coins}文，铜钱不足；可以改选或离开。`);for(const [key,level] of Object.entries(c.requires||{}))if(progress(s.skills[key]).level<level)return fail(s,`需要${skills[key]}Lv${level}，当前Lv${progress(s.skills[key]).level}；可以改选或离开。`);if(c.minHp&&s.hp<c.minHp)return fail(s,'受伤太重，先休养；也可以改选或离开。');if(c.tool&&!s.bag[c.tool])return fail(s,`需要${items[c.tool]}；工具可重复使用，也可以改选或离开。`);for(const [key,n] of Object.entries(c.input||{}))if(s.bag[key]<n)return fail(s,`${items[key]}不足，需要${n}；可以改选或离开。`);return settle(s,c.label,Math.round((c.hours||0)*60),c.energy||0,()=>{s.pending=null;for(const [key,n] of Object.entries(c.input||{}))s.bag[key]-=n;for(const [key,n] of Object.entries(c.output||{}))s.bag[key]+=n;s.coins+=c.coins||0;if(c.to)s.place=c.to;if(id==='leave')s.discoveryResolution={kind,expires:s.day+1};s.result.push(c.result)},c.xp||{})}
 if(s.pending.type==='bandit'){if(!['fight','leave'].includes(id))return fail(s,'请选择交手或绕开。');return settle(s,id==='fight'?'迎战拦路人':'绕路离开',id==='fight'?1:30,0,()=>{s.pending=null;if(id==='fight'){s.combat=banditForPlace(s.place);s.result.push(opponentHint(s.combat.name),'实战可能致命，可随时尝试撤离。')}})}
 const e=s.events.find(e=>e.id===s.pending.id&&e.status==='open');if(!e){s.pending=null;return fail(s,'事情已经结束。');}const c=events[e.kind].choices.find(c=>c.id===id);if(!c)return fail(s,'没有这个选择。');if(c.familiar&&s.relations[c.familiar.person]<c.familiar.relation)return fail(s,`需要与${people[c.familiar.person].name}关系${c.familiar.relation}，当前${s.relations[c.familiar.person]}；可以改选或离开。`);if(c.coins<0&&s.coins<-c.coins)return fail(s,`这项选择需${-c.coins}文，铜钱不足；可以改选或离开。`);for(const [key,level] of Object.entries(c.requires||{}))if(progress(s.skills[key]).level<level)return fail(s,`需要${skills[key]}Lv${level}，当前Lv${progress(s.skills[key]).level}；可以改选或离开。`);if(c.minHp&&s.hp<c.minHp)return fail(s,'受伤太重，先休养；也可以改选其他处理方式。');for(const [key,n] of Object.entries(c.input||{}))if(s.bag[key]<n)return fail(s,`${items[key]}不足，需要${n}；可以改选或离开。`);return settle(s,c.label,Math.round((c.hours||0)*60),c.energy||0,()=>{e.status=id==='leave'?'ignored':'resolved';s.pending=null;for(const [key,n] of Object.entries(c.input||{}))s.bag[key]-=n;s.coins+=c.coins||0;if(c.input)s.result.push('材料消耗：'+Object.entries(c.input).map(([key,n])=>items[key]+' -'+n).join('、'),'当前库存：'+Object.keys(c.input).map(key=>items[key]+' '+s.bag[key]).join('、'));if(c.to)s.place=c.to;if(c.relation){const before=s.relations[c.relation];s.relations[c.relation]=Math.min(100,before+c.change);s.result.push(...relationshipChange(s,c.relation,before));}s.result.push(c.result)},c.skill?{[c.skill]:c.xp}:{});
}
export function fight(s,id,rng=()=>random(s)){
 if(s.dead||!s.combat)return fail(s,'当前没有战斗。');if(!['attack','heavy','guard','inner','counter','art','flee'].includes(id))return fail(s,'未知战斗行动。');if(id==='inner'&&!s.learned)return fail(s,'尚未学会吐纳。');
 if(id==='art'){const blocked=artMoveBlocker(s);if(blocked)return fail(s,blocked);}
 if(id==='counter'){const blocked=counterBlocker(s);if(blocked)return fail(s,blocked);}
 const cost=combatCost(s,id),w=currentWeapon(s);
 const xp=['attack','heavy','counter'].includes(id)?{[w.skill]:1}:id==='inner'?{[w.skill]:1,inner:1}:{};
 if(id==='art'){xp[w.skill]=1;xp[s.art]=1;}
 if(!s.combat.spar&&id!=='flee')xp.battle=1;
 const name=id==='art'?activeArt(s).move:id==='attack'?w.attack:id==='heavy'?'重击':id==='guard'?'防守':id==='inner'?'运功出招':id==='counter'?'拆招反击':'撤离';
 return settle(s,name,1,cost,()=>{
  const c=s.combat;
  if(id==='flee'){s.combat=null;s.result.push('你退开脱身，没有必要逞强。');return}
  if(id==='guard'){c.prepared=true;s.result.push('稳住架势：下一次出招基础伤害+2，重击基础命中率+10个百分点；连续防守不叠加。')}
  else{const prepared=!!c.prepared,result=strike(s,id,rng);delete c.prepared;if(prepared)s.result.push('用上守势后的出招机会，本次消耗架势。');if(result.hit){c.hp-=result.damage;s.result.push(`你造成${result.damage}点伤害。`)}else s.result.push('重击落空，没有伤到对方；精力已消耗，仍结算相关发力练习。')}
  if(c.hp<=0){s.combat=null;if(c.artAssessment){s.artPassed[c.artAssessment]=s.day;s.result.push(arts[c.artAssessment].name+'进阶考较通过，记录已保存；没有额外奖励。');}if(c.assessment){s.assessments[c.assessment]=s.day;s.result.push('基础'+skills[weapons[c.assessment].skill]+'考较通过，记录已保存。没有额外经验、工钱或装备奖励。');}if(!c.spar)s.coins+=8;s.result.push(c.spar?'切磋结束，师傅点头示意。':'拦路人逃走，你拾回8文铜钱。');return}
  const reduction=id==='guard'?5:id==='counter'?3:id==='art'?(s.art==='shelterStaff'?4:1):0;const incoming=Math.max(1,c.attack-reduction);s.hp=Math.max(0,s.hp-incoming);s.result.push(id==='art'?`招式卸去${c.attack-incoming}点还击伤害，仍受伤${incoming}点。`:id==='counter'?`拆招卸去${c.attack-incoming}点还击伤害，仍受伤${incoming}点。`:id==='guard'?`防守挡下${c.attack-incoming}点伤害，仍受伤${incoming}点。`:`对方造成${incoming}点伤害。`);
  if(c.spar&&s.hp<=25){s.combat=null;s.hp=Math.max(1,s.hp);s.result.push('师傅收手：到这里就好，回去养养伤。')}
  else if(s.hp===0){s.combat=null;s.dead=true;s.result.push('你伤重死去。这段人生结束，不会自动读档。')}
 },xp);
}

export function restore(raw){
 const s=JSON.parse(raw);if(s&&typeof s==='object'){if(s.arts===undefined)s.arts={steadySword:false,shelterStaff:false};if(s.art===undefined)s.art=null;if(s.artPassed===undefined)s.artPassed={};if(s.skills){for(const k of Object.keys(arts))if(s.skills[k]===undefined)s.skills[k]=0;}if(s.relations&&s.relations.tutor===undefined)s.relations.tutor=0;if(s.relations){for(const id of ['qiao','boatman'])if(s.relations[id]===undefined)s.relations[id]=0;}if(s.homeDay===undefined)s.homeDay=0;if(s.assessments===undefined)s.assessments={};if(s.skills&&s.skills.battle===undefined)s.skills.battle=0;if(s.forgeLessonDay===undefined)s.forgeLessonDay=0;if(s.relations&&s.relations.artisan===undefined)s.relations.artisan=0;if(s.plot===undefined)s.plot=null;if(s.bag){if(s.bag.seed===undefined)s.bag.seed=0;if(s.bag.vegetable===undefined)s.bag.vegetable=0;}if(s.skills&&s.skills.escort===undefined)s.skills.escort=0;if(s.skills&&s.skills.farming===undefined)s.skills.farming=0;if(s.learnedMedicine===undefined)s.learnedMedicine=false;if(s.bag&&s.bag.trap===undefined)s.bag.trap=0;if(s.bag&&s.bag.meat===undefined)s.bag.meat=0;if(s.skills&&s.skills.hunt===undefined)s.skills.hunt=0;if(s.bag&&s.bag.salve===undefined)s.bag.salve=0;if(s.skills&&s.skills.medicine===undefined)s.skills.medicine=0;if(s.plan===undefined)s.plan=[];if(s.giftDays===undefined)s.giftDays={};if(s.lessonDay===undefined)s.lessonDay=0;if(s.discoveryDay===undefined)s.discoveryDay=0;if(s.discoveryResolution===undefined)s.discoveryResolution=null;if(s.bag&&s.bag.ore===undefined)s.bag.ore=0;if(s.bag&&s.bag.sword===undefined)s.bag.sword=0;if(s.skills){if(s.skills.woodwork===undefined)s.skills.woodwork=0;if(s.skills.forage===undefined)s.skills.forage=0;if(s.skills.mining===undefined)s.skills.mining=0;if(s.skills.staff===undefined)s.skills.staff=0;if(s.skills.sword===undefined)s.skills.sword=0;}if(s.weapon===undefined)s.weapon=s.bag?.staff>0?'staff':'unarmed';}if(!s||s.version!==1||typeof s.name!=='string'||!Object.hasOwn(locations,s.place))throw Error('不是新版存档；旧版存档请在旧版入口使用。');
 if(!Array.isArray(s.plan)||s.plan.length>8||s.plan.some(x=>typeof x!=='string'||!x.trim()||x.length>40))throw Error('行动计划无效');
 const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 for(const [k,min,max] of [['age',16,60],['day',1,100000],['minute',0,1439],['hp',0,100],['energy',0,100],['coins',0,10000000],['seed',1,4294967295]])if(!integer(s[k],min,max))throw Error('存档数值无效');
 if(!validPlot(s))throw Error('菜地记录无效');
 if(!Object.hasOwn(weapons,s.weapon)||(s.weapon!=='unarmed'&&!s.bag?.[s.weapon]))throw Error('兵器状态无效');if(typeof s.dead!=='boolean'||typeof s.learned!=='boolean'||typeof s.learnedMedicine!=='boolean'||(s.hp===0)!==s.dead)throw Error('人生状态无效');
 if(!['男','女'].includes(s.gender)||!['农家','学徒','小贩'].includes(s.background)||!['谨慎','随和','勤奋'].includes(s.personality))throw Error('角色资料无效');
 for(const k of Object.keys(skills))if(!integer(s.skills?.[k],0,maxXP))throw Error('技能无效');for(const k of Object.keys(items))if(!integer(s.bag?.[k],0,1000000))throw Error('库存无效');for(const k of Object.keys(people))if(!integer(s.relations?.[k],0,100))throw Error('关系无效');
 for(const [map,keys] of [[s.talkDays,Object.keys(people)],[s.giftDays,Object.keys(people)],[s.jobsDone,Object.keys(jobs)]])if(!map||typeof map!=='object'||Array.isArray(map)||Object.entries(map).some(([k,v])=>!keys.includes(k)||!integer(v,1,s.day)))throw Error('行动记录无效');
 if(!integer(s.discoveryDay,0,s.day))throw Error('偶遇记录无效');if(s.discoveryResolution&&(!Object.hasOwn(discoveries,s.discoveryResolution.kind)||!integer(s.discoveryResolution.expires,s.day+1,s.day+1)))throw Error('偶遇后续无效');if(!integer(s.forgeLessonDay,0,s.day))throw Error('锻造请教记录无效');if(!integer(s.lessonDay,0,s.day))throw Error('请教记录无效');if(!['晴','雨'].includes(s.weather)||!Array.isArray(s.events)||s.events.length>12||!Array.isArray(s.news)||!Array.isArray(s.journal)||!Array.isArray(s.result))throw Error('世界记录无效');
 if(s.events.some(e=>!Object.hasOwn(events,e.kind)||e.id!==`${e.kind}-${e.expires-2}`||!['open','ignored','resolved'].includes(e.status)||!integer(e.expires,3,s.day+2)))throw Error('事件记录无效');
 if(s.job&&(!Object.hasOwn(jobs,s.job.id)||!integer(s.job.deadline,s.day,s.day+2)))throw Error('委托无效');
 if(s.job&&jobs[s.job.id].route&&!integer(s.job.progress,0,jobs[s.job.id].route.length))throw Error('护送进度无效');
 if(!validMartial(s))throw Error('武艺记录无效');
 if(s.combat&&(!['周师傅','陆教习','拦路人','持棍拦路人'].includes(s.combat.name)||!integer(s.combat.hp,1,s.combat.name==='陆教习'?50:45)||!integer(s.combat.attack,1,8)||s.combat.spar!==['周师傅','陆教习'].includes(s.combat.name)))throw Error('战斗无效');
 if(!integer(s.homeDay,0,s.day))throw Error('住所记录无效');
 if(!s.assessments||typeof s.assessments!=='object'||Array.isArray(s.assessments)||Object.entries(s.assessments).some(([key,day])=>!Object.hasOwn(weapons,key)||!integer(day,1,s.day)))throw Error('考较记录无效');
 if(s.combat?.assessment!==undefined&&(!Object.hasOwn(weapons,s.combat.assessment)||s.combat.assessment!==s.weapon||s.combat.name!=='周师傅'||!s.combat.spar||s.combat.attack!==7||s.assessments[s.combat.assessment]))throw Error('考较状态无效');
 if(s.combat?.name==='陆教习'&&(!s.combat.artAssessment||s.combat.attack!==8))throw Error('进阶考较无效');
 if(s.combat?.artAssessment!==undefined&&(s.combat.name!=='陆教习'||s.combat.artAssessment!==s.art||!activeArt(s)||progress(s.skills[s.art]).level<2||s.artPassed[s.art]))throw Error('进阶考较无效');
 if(s.combat?.prepared!==undefined&&typeof s.combat.prepared!=='boolean')throw Error('交手架势无效');
 if(s.pending&&!(s.pending.type==='bandit'||s.pending.type==='discovery'&&Object.hasOwn(discoveries,s.pending.kind)&&['road','hill','bamboo'].includes(s.place)&&s.pending.day===s.day&&s.discoveryDay===s.day||s.pending.type==='world'&&s.events.some(e=>e.id===s.pending.id&&e.status==='open'&&events[e.kind].place===s.place)))throw Error('选择状态无效');
 if(s.combat&&s.pending||s.dead&&(s.combat||s.pending))throw Error('状态冲突');s.name=s.name.slice(0,12);s.news=s.news.filter(x=>typeof x==='string').slice(0,20);s.result=s.result.filter(x=>typeof x==='string').slice(0,160);s.journal=s.journal.filter(x=>integer(x.day,1,s.day)&&typeof x.text==='string').slice(0,24);return s;
}
