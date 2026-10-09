import {combatCost,strike} from './combat.js?v=1.0.11';
import {postedJobs} from './contracts.js?v=1.0.11';
import {recipeBlockers} from './crafting.js?v=1.0.11';
import {resources} from './resources.js?v=1.0.11';
import {injury} from './condition.js?v=1.0.11';
import {discoveries,discoveryForRoll} from './discoveries.js?v=1.0.11';
import {weapons,currentWeapon} from './equipment.js?v=1.0.11';
import {locations,skills,items,people,jobs,recipes,events,actionNames} from './content.js?v=1.0.11';
import {gain,maxXP,progress} from './progression.js?v=1.0.11';
import {advance,encounter,random,npcPlace} from './world.js?v=1.0.11';
export const KEY='jianghu-wanxiang-lite-v1';
export function fresh(profile={}){return {version:1,name:String(profile.name||'无名客').trim().slice(0,12)||'无名客',age:Math.max(16,Math.min(60,Math.floor(Number(profile.age)||18))),gender:profile.gender==='女'?'女':'男',background:['农家','学徒','小贩'].includes(profile.background)?profile.background:'农家',personality:['谨慎','随和','勤奋'].includes(profile.personality)?profile.personality:'谨慎',day:1,minute:480,place:'town',hp:100,energy:100,coins:30,dead:false,weapon:'unarmed',learned:false,seed:823471,skills:Object.fromEntries(Object.keys(skills).map(k=>[k,0])),bag:Object.fromEntries(Object.keys(items).map(k=>[k,k==='food'?2:0])),relations:Object.fromEntries(Object.keys(people).map(k=>[k,0])),talkDays:{},giftDays:{},lessonDay:0,discoveryDay:0,discoveryResolution:null,jobsDone:{},plan:[],job:null,combat:null,pending:null,events:[],weather:'晴',news:[],result:['你只是一个初到青石镇的普通人。先找一份活，或出去走走。'],journal:[]}}
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
export function travel(s,to){if(!available(s))return false;if(!locations[s.place].routes.includes(to))return fail(s,'这里没有直达的路。');return settle(s,'前往'+locations[to].name,s.weather==='雨'&&['road','hill','bamboo'].includes(to)?60:30,0,()=>{s.place=to})}
export function equip(s,key){if(!available(s))return false;if(!Object.hasOwn(weapons,key))return fail(s,'没有这类兵器。');if(key!=='unarmed'&&!s.bag[key])return fail(s,'背包里没有'+weapons[key].name+'。');if(s.weapon===key)return fail(s,'已经使用这件兵器。');return settle(s,'换用'+weapons[key].name,5,0,()=>{s.weapon=key;s.result.push(`当前兵器：${weapons[key].name}；练习和出招结算${skills[weapons[key].skill]}。`)})}
export function talk(s,id){if(!available(s))return false;if(!Object.hasOwn(people,id)||npcPlace(s,id)!==s.place)return fail(s,'此人目前不在这里。');return settle(s,'与'+people[id].name+'交谈',30,1,()=>{s.result.push(people[id].line);if(s.talkDays[id]!==s.day){const old=s.relations[id];s.relations[id]=Math.min(100,old+1);s.talkDays[id]=s.day;s.result.push(`关系：${old}/100 → ${s.relations[id]}/100`)}else s.result.push('今日已经交谈过，不重复增加关系。');if(id==='master'&&!s.learned){s.learned=true;s.result.push('周师傅教你基础吐纳，现在可以自行练习。')}})}
export function gift(s,id){if(!available(s))return false;if(!Object.hasOwn(people,id)||npcPlace(s,id)!==s.place)return fail(s,'此人目前不在这里。');if(s.giftDays[id]===s.day)return fail(s,'今日已赠礼，改日再来。');const key=people[id].gift;if(!s.bag[key])return fail(s,`${people[id].name}喜欢${items[key]}，你目前没有。`);return settle(s,'赠礼给'+people[id].name,15,1,()=>{s.bag[key]--;s.giftDays[id]=s.day;const before=s.relations[id];s.relations[id]=Math.min(100,before+2);s.result.push(`关系：${before}/100 → ${s.relations[id]}/100（+${s.relations[id]-before}）`)})}
export function lessonFee(s){return s.relations.master>=5?4:6}
export function treatmentFee(s){return s.relations.doctor>=10?6:8}
export function lesson(s){if(!available(s))return false;if(npcPlace(s,'master')!==s.place)return fail(s,'周师傅目前不在这里。');if(s.lessonDay===s.day)return fail(s,'今日已请教，先消化练习，明日再来。');if(s.hp<25)return fail(s,'先养好伤，再请教师傅。');const fee=lessonFee(s);if(s.coins<fee)return fail(s,`请教需要${fee}文。`);return settle(s,'向周师傅请教拳脚',60,12,()=>{s.coins-=fee;s.lessonDay=s.day;s.result.push('师傅纠正你的站姿和发力，练的仍是基础拳脚。')},{fist:3})}
export const prices={food:4,herb:4,iron:5,wood:2,rod:6,staff:12,sword:24,tool:20};
const salePrices={herb:3,fish:5,tool:18};
export function trade(s,type,key){if(!available(s))return false;if(s.place!=='town'||npcPlace(s,'merchant')!=='town')return fail(s,'请在08:00–20:00到街市买卖。');const price=(type==='buy'?prices:salePrices)[key];if(typeof price!=='number')return fail(s,'这里不经营这件物品。');if(type==='buy'&&s.coins<price)return fail(s,'铜钱不足。');if(type==='sell'&&!s.bag[key])return fail(s,'没有可出售的'+items[key]+'。');return settle(s,(type==='buy'?'购买':'出售')+items[key],15,1,()=>{s.coins+=type==='buy'?-price:price;s.bag[key]+=type==='buy'?1:-1},type==='sell'?{trade:1}:{})}
export function acceptJob(s,id){if(!available(s))return false;if(!Object.hasOwn(jobs,id)||!['town',jobs[id].place].includes(s.place))return fail(s,'请到街市或委托地点接活。');if(!postedJobs(s).some(([key])=>key===id))return fail(s,'今日未刊出这份采购，去街市看看其他约定。');if(s.job)return fail(s,'先完成或放弃手里的约定。');if(s.jobsDone[id]===s.day)return fail(s,'这份活今天已经做过了，明日再看看。');s.job={id,deadline:s.day+2};s.result=[`接下：${jobs[id].name}。三日内完成；也可以放弃，没有强制主线。`];return true}
export function abandonJob(s){if(!available(s))return false;s.job=null;s.result=['你放下了这份约定，可以另作打算。'];return true}
export function act(s,id,rng=()=>random(s)){
 if(!available(s))return false;
 if(id==='deliver'){
  if(!s.job)return fail(s,'没有待完成的约定。');const job=jobs[s.job.id];if(s.place!==job.place)return fail(s,'请前往'+locations[job.place].name+'完成约定。');for(const [k,n] of Object.entries(job.needs||{}))if(s.bag[k]<n)return fail(s,`${items[k]}不足，需要${n}。`);
  return settle(s,'完成：'+job.name,job.hours?job.hours*60:30,job.energy||2,()=>{for(const [k,n] of Object.entries(job.needs||{}))s.bag[k]-=n;s.coins+=job.reward;s.jobsDone[s.job.id]=s.day;s.job=null;s.result.push('对方收下交付，这份活就此结束。')},{[job.skill]:job.hours?2:1});
 }
 if(id==='rest')return settle(s,'歇息',120,0,()=>{s.energy=Math.min(100,s.energy+30);s.hp=Math.min(100,s.hp+10)});
 if(id==='sleep'){if(!['inn','village'].includes(s.place))return fail(s,'可去客栈住店，或到河湾村借宿。');const fee=s.place==='inn'?5:0;if(s.coins<fee)return fail(s,'住店需要5文。');return settle(s,'睡一觉',480,0,()=>{s.coins-=fee;s.energy=100;s.hp=Math.min(100,s.hp+20)})}
 if(id==='eat'||id==='heal'){const key=id==='eat'?'food':'herb';if(!s.bag[key])return fail(s,'没有'+items[key]+'。');if(s.hp===100&&(id==='heal'||s.energy===100))return fail(s,'目前无需恢复，不消耗物品。');return settle(s,actionNames[id],15,0,()=>{s.bag[key]--;s.hp=Math.min(100,s.hp+(id==='heal'?25:5));if(id==='eat')s.energy=Math.min(100,s.energy+12)})}
 if(id==='treat'){if(npcPlace(s,'doctor')!==s.place)return fail(s,'沈医者不在这里。');if(s.hp===100)return fail(s,'气血充足，无需治疗。');const fee=treatmentFee(s);if(s.coins<fee)return fail(s,`诊金需要${fee}文。`);return settle(s,'医者治疗',60,0,()=>{s.coins-=fee;s.hp=Math.min(100,s.hp+50)})}
 if(id==='inner'){if(!s.learned)return fail(s,'先向周师傅学习基础吐纳。');return settle(s,'吐纳修炼',120,8,()=>{s.hp=Math.min(100,s.hp+5)},{inner:2})}
 if(id==='spar'){if(npcPlace(s,'master')!==s.place)return fail(s,'周师傅不在这里。');if(s.hp<30)return fail(s,'先养好伤再切磋。');return settle(s,'请教切磋',5,0,()=>{s.combat={name:'周师傅',hp:45,attack:5,spar:true};s.result.push('点到为止，随时可以认输。')})}
 if(!locations[s.place].actions.includes(id))return fail(s,'此地不能进行这项行动。');
 if(id==='work')return settle(s,'打零工',180,24,()=>{s.coins+=12},{carry:2});
 if(id==='browse')return settle(s,'听街谈',30,1,()=>{s.result.push('茶客谈起附近的事情：有活可以去街市看，有伤可以找沈医者；传闻听听就好。')});
 if(id==='train'){if(s.hp<25)return fail(s,'受伤太重，先休养。');const w=currentWeapon(s);return settle(s,'练习'+skills[w.skill],120,18,()=>{},{[w.skill]:2})}
 if(resources[id]){const r=resources[id];if(s.hp<25)return fail(s,'受伤太重，先休养再做重活。');if(r.tool&&!s.bag[r.tool])return fail(s,`需要${items[r.tool]}，可在街市购买或自己打造。`);return settle(s,r.name,r.hours*60,r.energy,()=>{const chance=Math.min(0.95,r.chance+(progress(s.skills[r.skill]).level-1)*0.02)*(s.energy-r.energy<20?0.75:1);if(rng()<chance){for(const [key,n] of Object.entries(r.output))s.bag[key]+=n;s.result.push(r.success)}else s.result.push(r.failure)},{[r.skill]:2})}
 if(id==='gather')return settle(s,'采药',120,16,()=>{if(rng()<0.6+Math.min(0.12,progress(s.skills.herb).level*0.02)){s.bag.herb++;s.result.push('采到草药×1。')}else s.result.push('找了两小时，这次没有合适的药材。')},{herb:2});
 if(id==='fish'){if(!s.bag.rod)return fail(s,'需要钓竿，可在街市花6文购买。');return settle(s,'钓鱼',120,16,()=>{if(rng()<0.6+Math.min(0.12,progress(s.skills.fish).level*0.02))s.bag.fish++;else s.result.push('这次没有钓到鱼。')},{fish:2})}
 if(recipes[id]){const r=recipes[id],missing=recipeBlockers(s,r);if(missing.length)return fail(s,missing.join('；')+'。');return settle(s,r.name,r.hours*60,r.energy,()=>{for(const [k,n] of Object.entries(r.input))s.bag[k]-=n;const failed=s.energy-r.energy<20&&rng()<0.2;if(!failed)for(const [k,n] of Object.entries(r.output))s.bag[k]+=n;s.result.push(failed?'疲劳导致失误，没有产出。':'本次产出：'+Object.entries(r.output).map(([k,n])=>items[k]+'×'+n).join('、'),'材料消耗：'+Object.entries(r.input).map(([k,n])=>items[k]+' -'+n).join('、'),'当前库存：'+[...new Set([...Object.keys(r.input),...Object.keys(r.output)])].map(k=>items[k]+' '+s.bag[k]).join('、'))},{[r.skill]:2})}
 if(id==='explore')return settle(s,'沿路探索',60,8,()=>{const roll=rng(),kind=discoveryForRoll(roll),endDay=s.day+Math.floor((s.minute+60)/1440);if(roll<0.2){s.pending={type:'bandit'};s.result.push('一个拦路人挡住去路。是否交手由你决定。')}else if(kind&&s.discoveryDay!==endDay){s.discoveryDay=endDay;s.pending={type:'discovery',kind,day:endDay};s.result.push('偶遇：'+discoveries[kind].title+'。参与或离开由你决定。')}else s.result.push('你走了一段旧道，远处有炊烟，今天没有遇到特别的事。')});
 return fail(s,'未知行动。');
}
export function choose(s,id){
 if(s.dead||!s.pending)return fail(s,'当前没有待决定的事情。');
 if(s.pending.type==='discovery'){const kind=s.pending.kind,def=discoveries[kind],c=def.choices.find(x=>x.id===id);if(!c)return fail(s,'没有这个选择。');for(const [key,n] of Object.entries(c.input||{}))if(s.bag[key]<n)return fail(s,`${items[key]}不足，需要${n}；可以改选或离开。`);return settle(s,c.label,Math.round((c.hours||0)*60),c.energy||0,()=>{s.pending=null;for(const [key,n] of Object.entries(c.input||{}))s.bag[key]-=n;for(const [key,n] of Object.entries(c.output||{}))s.bag[key]+=n;s.coins+=c.coins||0;if(c.to)s.place=c.to;if(id==='leave')s.discoveryResolution={kind,expires:s.day+1};s.result.push(c.result)},c.xp||{})}
 if(s.pending.type==='bandit'){if(!['fight','leave'].includes(id))return fail(s,'请选择交手或绕开。');return settle(s,id==='fight'?'迎战拦路人':'绕路离开',id==='fight'?1:30,0,()=>{s.pending=null;if(id==='fight'){s.combat={name:'拦路人',hp:32,attack:8,spar:false};s.result.push('实战可能致命，可随时尝试撤离。')}})}
 const e=s.events.find(e=>e.id===s.pending.id&&e.status==='open');if(!e){s.pending=null;return fail(s,'事情已经结束。');}const c=events[e.kind].choices.find(c=>c.id===id);if(!c)return fail(s,'没有这个选择。');return settle(s,c.label,Math.round((c.hours||0)*60),c.energy||0,()=>{e.status=id==='leave'?'ignored':'resolved';s.pending=null;if(c.to)s.place=c.to;if(c.relation)s.relations[c.relation]=Math.min(100,s.relations[c.relation]+c.change);s.result.push(c.result)},c.skill?{[c.skill]:c.xp}:{});
}
export function fight(s,id,rng=()=>random(s)){
 if(s.dead||!s.combat)return fail(s,'当前没有战斗。');if(!['attack','heavy','guard','inner','flee'].includes(id))return fail(s,'未知战斗行动。');if(id==='inner'&&!s.learned)return fail(s,'尚未学会吐纳。');
 const cost=combatCost(s,id),w=currentWeapon(s);
 const xp=['attack','heavy'].includes(id)?{[w.skill]:1}:id==='inner'?{[w.skill]:1,inner:1}:{};
 const name=id==='attack'?w.attack:id==='heavy'?'重击':id==='guard'?'防守':id==='inner'?'运功出招':'撤离';
 return settle(s,name,1,cost,()=>{
  const c=s.combat;
  if(id==='flee'){s.combat=null;s.result.push('你退开脱身，没有必要逞强。');return}
  if(id==='guard'){c.prepared=true;s.result.push('稳住架势：下一次出招基础伤害+2，重击基础命中率+10个百分点；连续防守不叠加。')}
  else{const prepared=!!c.prepared,result=strike(s,id,rng);delete c.prepared;if(prepared)s.result.push('用上守势后的出招机会，本次消耗架势。');if(result.hit){c.hp-=result.damage;s.result.push(`你造成${result.damage}点伤害。`)}else s.result.push('重击落空，没有伤到对方；精力已消耗，仍结算相关发力练习。')}
  if(c.hp<=0){s.combat=null;if(!c.spar)s.coins+=8;s.result.push(c.spar?'切磋结束，师傅点头示意。':'拦路人逃走，你拾回8文铜钱。');return}
  const incoming=Math.max(1,c.attack-(id==='guard'?5:0));s.hp=Math.max(0,s.hp-incoming);s.result.push(id==='guard'?`防守挡下${c.attack-incoming}点伤害，仍受伤${incoming}点。`:`对方造成${incoming}点伤害。`);
  if(c.spar&&s.hp<=25){s.combat=null;s.hp=Math.max(1,s.hp);s.result.push('师傅收手：到这里就好，回去养养伤。')}
  else if(s.hp===0){s.combat=null;s.dead=true;s.result.push('你伤重死去。这段人生结束，不会自动读档。')}
 },xp);
}

export function restore(raw){
 const s=JSON.parse(raw);if(s&&typeof s==='object'){if(s.plan===undefined)s.plan=[];if(s.giftDays===undefined)s.giftDays={};if(s.lessonDay===undefined)s.lessonDay=0;if(s.discoveryDay===undefined)s.discoveryDay=0;if(s.discoveryResolution===undefined)s.discoveryResolution=null;if(s.bag&&s.bag.ore===undefined)s.bag.ore=0;if(s.bag&&s.bag.sword===undefined)s.bag.sword=0;if(s.skills){if(s.skills.woodwork===undefined)s.skills.woodwork=0;if(s.skills.forage===undefined)s.skills.forage=0;if(s.skills.mining===undefined)s.skills.mining=0;if(s.skills.staff===undefined)s.skills.staff=0;if(s.skills.sword===undefined)s.skills.sword=0;}if(s.weapon===undefined)s.weapon=s.bag?.staff>0?'staff':'unarmed';}if(!s||s.version!==1||typeof s.name!=='string'||!Object.hasOwn(locations,s.place))throw Error('不是新版存档；旧版存档请在旧版入口使用。');
 if(!Array.isArray(s.plan)||s.plan.length>8||s.plan.some(x=>typeof x!=='string'||!x.trim()||x.length>40))throw Error('行动计划无效');
 const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 for(const [k,min,max] of [['age',16,60],['day',1,100000],['minute',0,1439],['hp',0,100],['energy',0,100],['coins',0,10000000],['seed',1,4294967295]])if(!integer(s[k],min,max))throw Error('存档数值无效');
 if(!Object.hasOwn(weapons,s.weapon)||(s.weapon!=='unarmed'&&!s.bag?.[s.weapon]))throw Error('兵器状态无效');if(typeof s.dead!=='boolean'||typeof s.learned!=='boolean'||(s.hp===0)!==s.dead)throw Error('人生状态无效');
 if(!['男','女'].includes(s.gender)||!['农家','学徒','小贩'].includes(s.background)||!['谨慎','随和','勤奋'].includes(s.personality))throw Error('角色资料无效');
 for(const k of Object.keys(skills))if(!integer(s.skills?.[k],0,maxXP))throw Error('技能无效');for(const k of Object.keys(items))if(!integer(s.bag?.[k],0,1000000))throw Error('库存无效');for(const k of Object.keys(people))if(!integer(s.relations?.[k],0,100))throw Error('关系无效');
 for(const [map,keys] of [[s.talkDays,Object.keys(people)],[s.giftDays,Object.keys(people)],[s.jobsDone,Object.keys(jobs)]])if(!map||typeof map!=='object'||Array.isArray(map)||Object.entries(map).some(([k,v])=>!keys.includes(k)||!integer(v,1,s.day)))throw Error('行动记录无效');
 if(!integer(s.discoveryDay,0,s.day))throw Error('偶遇记录无效');if(s.discoveryResolution&&(!Object.hasOwn(discoveries,s.discoveryResolution.kind)||!integer(s.discoveryResolution.expires,s.day+1,s.day+1)))throw Error('偶遇后续无效');if(!integer(s.lessonDay,0,s.day))throw Error('请教记录无效');if(!['晴','雨'].includes(s.weather)||!Array.isArray(s.events)||s.events.length>12||!Array.isArray(s.news)||!Array.isArray(s.journal)||!Array.isArray(s.result))throw Error('世界记录无效');
 if(s.events.some(e=>!Object.hasOwn(events,e.kind)||e.id!==`${e.kind}-${e.expires-2}`||!['open','ignored','resolved'].includes(e.status)||!integer(e.expires,3,s.day+2)))throw Error('事件记录无效');
 if(s.job&&(!Object.hasOwn(jobs,s.job.id)||!integer(s.job.deadline,s.day,s.day+2)))throw Error('委托无效');
 if(s.combat&&(!['周师傅','拦路人'].includes(s.combat.name)||!integer(s.combat.hp,1,45)||!integer(s.combat.attack,1,8)||s.combat.spar!==(s.combat.name==='周师傅')))throw Error('战斗无效');
 if(s.combat?.prepared!==undefined&&typeof s.combat.prepared!=='boolean')throw Error('交手架势无效');
 if(s.pending&&!(s.pending.type==='bandit'||s.pending.type==='discovery'&&Object.hasOwn(discoveries,s.pending.kind)&&['road','hill','bamboo'].includes(s.place)&&s.pending.day===s.day&&s.discoveryDay===s.day||s.pending.type==='world'&&s.events.some(e=>e.id===s.pending.id&&e.status==='open'&&events[e.kind].place===s.place)))throw Error('选择状态无效');
 if(s.combat&&s.pending||s.dead&&(s.combat||s.pending))throw Error('状态冲突');s.name=s.name.slice(0,12);s.news=s.news.filter(x=>typeof x==='string').slice(0,20);s.result=s.result.filter(x=>typeof x==='string').slice(0,160);s.journal=s.journal.filter(x=>integer(x.day,1,s.day)&&typeof x.text==='string').slice(0,24);return s;
}
