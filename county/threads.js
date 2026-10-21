import {rememberExperience} from './county-life.js?v=5.56.0';
import {cooperationRefusal} from './npc-social.js?v=5.56.0';
import {tradeRouteBlocked,EVENTS} from './world-feedback.js?v=5.56.0';
import {gain} from './progression.js?v=5.56.0';
// Finite follow-up opportunities; eligibility is earned from existing playable outcomes.
export const GOALS={settle:{name:'谋生安顿',hint:'先做短工或一项委托，攒够12文可选择客栈短租；无需习武。'},artisan:{name:'手艺立足',hint:'通过采集、炼铁、种植或交易积累手艺，再选择一项经营；别把全部钱投入。'},martial:{name:'习武闯荡',hint:'武馆学一门入门武学，真实交手积累经验；陪练可收手，野外实战可能永久死亡。'},explore:{name:'县境游历',hint:'先准备口粮药材，搜寻两处旧址并处理一次县境冒险；可绕行或非战斗解决。'}};
export const THREADS={
 cargo:{name:'贩运验价争执',place:'liuxi',holder:'stallholder',payer:'stallholder',reward:3,relation:'merchant',skill:'trade',routes:['talk','concede'],description:'查验后的药材价格惹起争执。可花30分钟/精力4核对账目（经商3更稳），谈妥由魏婶支付3文复核工钱；也可付自己2文了结分歧，钱交给魏婶。普通贩运结算仍可直接继续。'},
 forge:{name:'装备交付后的复核',place:'workshop',holder:'smith',payer:'smith',reward:8,relation:'smith',skill:'smelt',routes:['inspect','repair'],description:'交过装备后，铁匠请你复核一批接头。检查30分钟/精力4，熟手更有把握；或用自己铁料1份，60分钟/精力10重新补牢。完成后由铁匠支付8文；失败不退材料。'},
 herbs:{name:'药篓见闻与供药',place:'village',holder:'doctor',payer:'doctor',reward:6,relation:'doctor',skill:'herb',routes:['sort','supply'],description:'旧渡口搜寻的见闻带来医者合作。用自己的药材1份辨拣，45分钟/精力6，熟手更稳；或供药材2份，由医者复核30分钟/精力4。验收后支付6文，不凭空回血。'},
 rescue:{name:'救工之后的修具',place:'workshop',holder:'smith',payer:'smith',reward:10,relation:'smith',skill:'smelt',routes:['rebuild','tool'],description:'矿洞救工交代后，许铁匠找你修整支架。用铁料1、木料1，60分钟/精力12；或带自己的矿镐辅助拆整，90分钟/精力16，工具不消耗。仍可能失手，完成支付10文。'},
 escort:{name:'柳溪供粮接洽',place:'market',holder:'merchant',payer:'stallholder',reward:12,relation:'merchant',skill:'carry',routes:['accept','safe','quick'],description:'商路受阻或处理护送规矩后，可找柳掌柜接洽一次柳溪供粮。只向魏婶送一份干粮，不会凭空补满集市货架。投入自己的干粮1份，3日内经旧渡口选择稳妥或近路，再去柳溪交给魏婶，实际支付12文。货物独立留存，近路可能擦伤并永久死亡。'},
 testimony:{name:'亲历之后的查访',place:'county',holder:null,payer:'public',reward:6,relation:null,skill:'forage',routes:['tell','accept','check'],description:'实际胜利或完成查访证人后，捕快请你核对道路见闻。可陈述30分钟/精力4；或接下3日查访，到官道核对45分钟/精力8，再回县城交代。查访也可能失败，完成由县衙现有资金支付6文，不抹去案件。'}
};
const blank=()=>({status:'new',route:null,openedDay:0,dueDay:0,step:0,cargo:0,paid:0});
export const makeThreads=()=>({goal:'none',records:Object.fromEntries(Object.keys(THREADS).map(id=>[id,blank()]))});
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),int=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
export function threadEligible(s,id){const a=s.adventures;switch(id){case 'cargo':return Object.entries(a.business.records).some(([k,r])=>k.startsWith('merchant')&&r.status==='active'&&r.step===1&&r.cargo>0);case 'forge':return Object.entries(a.business.records).some(([k,r])=>k.startsWith('smith')&&r.status==='done');case 'herbs':return a.sites.ferry==='found'||['shared','agreed'].includes(a.exploration.encounters.ferry);case 'rescue':return a.outings.records.mine.outcome==='done';case 'escort':return tradeRouteBlocked(s)||['mediated','school','caravan'].includes(a.factions.cases.escort.outcome);case 'testimony':return a.victories.some(k=>['chief','staffhand'].includes(k))||a.law.jobs.witness.status==='done';default:return false;}}
export function threadsValid(s){const t=s.adventures.threads;if(!obj(t)||Object.keys(t).length!==2||!['none',...Object.keys(GOALS)].includes(t.goal)||!obj(t.records)||Object.keys(t.records).length!==6)return false;
 return Object.entries(THREADS).every(([id,d])=>{const r=t.records[id];if(!obj(r)||Object.keys(r).length!==7||!['new','active','claim','done','failed','left','died'].includes(r.status)||r.route!==null&&!d.routes.includes(r.route)||!int(r.openedDay,s.day)||!int(r.dueDay,s.day+3)||!int(r.step,1)||!int(r.cargo,1)||![0,d.reward].includes(r.paid))return false;
 if(r.status==='new')return Object.entries(blank()).every(([k,v])=>r[k]===v);
 if(r.status==='died'&&!s.dead)return false;
 if(r.openedDay<1||r.paid!==0&&r.status!=='done'||r.status==='done'&&r.route!=='concede'&&r.paid!==d.reward||r.status==='claim'&&r.step!==1||r.status==='done'&&r.step!==1||r.status!=='active'&&r.dueDay!==0||r.status==='active'&&r.dueDay!==r.openedDay+3||r.status==='active'&&!['escort','testimony'].includes(id)||r.status==='active'&&s.day>r.dueDay)return false;
 if(r.status!=='left'&&r.route===null||r.route==='concede'&&(id!=='cargo'||r.status!=='done'||r.paid!==0))return false;
 if(id!=='escort'&&r.cargo)return false;
 if(id==='escort'&&r.status==='active'&&(r.step===0?r.route!=='accept':!['safe','quick'].includes(r.route)))return false;
 if(id==='escort'&&['claim','done'].includes(r.status)&&!['safe','quick'].includes(r.route))return false;
 if(id==='testimony'&&r.status==='active'&&(r.route!=='accept'||r.step!==0))return false;
 if(id==='testimony'&&['claim','done'].includes(r.status)&&!['tell','check'].includes(r.route))return false;
 const history=id==='cargo'?Object.entries(s.adventures.business.records).some(([k,b])=>k.startsWith('merchant')&&b.step>=1&&b.cost>0):threadEligible(s,id)||id==='escort'&&r.openedDay>=s.adventures.feedback.startDay+EVENTS.ferry.offset&&r.openedDay<=s.adventures.feedback.startDay+EVENTS.ferry.offset+EVENTS.ferry.days||id==='escort'&&s.adventures.outings.floodDay>0&&r.openedDay>=s.adventures.outings.floodDay&&r.openedDay<s.adventures.outings.floodDay+3;if(!history)return false;
 if(id==='escort'&&(['active','claim'].includes(r.status)?r.cargo!==1:['done','left'].includes(r.status)&&r.cargo!==0))return false;
 return true;
 });}
function returnCargo(s,r){const n=Math.min(r.cargo,1000000-s.bag.food);s.bag.food+=n;r.cargo-=n;}
export function expireThreads(s){if(!s.adventures?.threads)return;for(const [id,d] of Object.entries(THREADS)){const r=s.adventures.threads.records[id];if(s.dead&&['active','claim'].includes(r.status)){r.status='died';r.dueDay=0;}else if(r.status==='active'&&s.day>r.dueDay){returnCargo(s,r);r.status='failed';r.dueDay=0;s.news.unshift(d.name+'逾期，没有报酬或罚款；留存干粮归还，满背包余货可另领。');s.news.length=Math.min(20,s.news.length);}}}
const xp=(s,key,n)=>{const line=gain(s,key,n);if(line)s.result.push(line);};
const relation=(s,d,n)=>{if(d.relation)s.relations[d.relation]=Math.max(0,Math.min(100,s.relations[d.relation]+n));};
const office=(s,n)=>s.place==='county'&&s.minute>=480&&s.minute+n<=1080;
export function threadAction(s,id,{present,transact,advance,rng}){const onsite=(holder,n)=>present(s,holder,n)&&(holder!=='stallholder'||s.npcWorld.individuals.stallholder.place===s.place);const [,key,choice]=id.split(':'),d=THREADS[key],r=s.adventures.threads.records[key],fail=text=>{s.result=[text];return false;};if(!d)return fail('没有这项串联机会。');
 if(choice==='leave'){
  if(!['new','active','claim','failed'].includes(r.status)||r.status==='failed'&&!r.cargo||r.status==='new'&&!threadEligible(s,key))return fail('此机会尚未出现或已处理。');
  if(r.cargo&&s.bag.food>1000000-r.cargo)return fail('背包已满，先处理库存再领回干粮。');
  return transact(s,'不再参与 · '+d.name,0,0,()=>{returnCargo(s,r);r.status='left';r.openedDay||=s.day;r.dueDay=0;s.result.push('留存自己的货物归还；投入时间与材料不退，无额外报酬或罚款，原有玩法继续。');},advance);
 }
 if(choice==='claim'){
  const place=key==='escort'?'liuxi':d.place,holder=key==='escort'?'stallholder':d.holder;
  if(!(r.status==='claim'||key==='escort'&&r.status==='active'&&r.step===1)||s.place!==place||holder&&!onsite(holder,15)||!holder&&!office(s,15))return fail('需已完成实际步骤，并到在岗接洽人处交代。');
  if(key==='herbs'&&s.npcWorld.clinic.holder!=='doctor')return fail('沈医者不主持诊所，保留成果，暂停接洽。');
  const payer=d.payer==='public'?s.commerce.budget:s.npcWorld.individuals[d.payer],field=d.payer==='public'?'market':'coins';
  if(payer[field]<d.reward||s.coins>10000000-d.reward||r.cargo&&payer.food>=100)return fail('付款人实际余额或收货容量不足，保留成果，改日再来。');
  return transact(s,'交代 · '+d.name,15,0,()=>{payer[field]-=d.reward;s.coins+=d.reward;if(r.cargo){payer.food+=r.cargo;r.cargo=0;}r.paid=d.reward;r.status='done';r.dueDay=0;relation(s,d,1);if(key==='escort')rememberExperience(s,'merchant','cooperation',true);s.result.push('实际支付'+d.reward+'文；接洽关系'+(d.relation?' +1':'不变')+'，本项不重复结算。');},advance);
 }
 if(r.status==='new'&&!threadEligible(s,key))return fail('需先有相应经营、探索、救援、势力接洽或亲历记录。');
 if(key==='escort'&&choice==='accept'||key==='testimony'&&choice==='accept'){
  if(r.status!=='new'||(d.holder?!onsite(d.holder,15):!office(s,15)))return fail('请在原接洽地点与营业时间领取一次。');
  if(key==='escort'){const refusal=cooperationRefusal(s,'merchant');if(refusal)return fail(refusal);}
  if(key==='escort'&&s.bag.food<1)return fail('需投入自己的干粮1份，留存到实际交付。');
  return transact(s,'接洽 · '+d.name,15,0,()=>{r.status='active';r.route='accept';r.openedDay=s.day;r.dueDay=s.day+3;if(key==='escort'){s.bag.food--;r.cargo=1;}s.result.push('截止第'+r.dueDay+'日；没有预付报酬。');},advance);
 }
 if(key==='escort'&&['safe','quick'].includes(choice)){
  if(r.status!=='active'||r.step!==0||s.place!=='ferry')return fail('需已领取供粮，在旧渡口选择一次路线。');
  return transact(s,'供粮经过旧渡口',choice==='safe'?45:15,choice==='safe'?8:12,()=>{r.route=choice;r.step=1;if(choice==='quick'&&rng()<.3){s.hp=Math.max(0,s.hp-8);if(!s.hp){s.dead=true;r.status='died';r.dueDay=0;s.result.push('近路受伤身亡，货物与人生结束，不发报酬。');return;}s.result.push('擦伤8气血，消耗保留。');}xp(s,'carry',2);s.result.push('已通过路段，去柳溪实际交货；尚未付款。');},advance);
 }
 if(key==='testimony'&&choice==='check'){
  if(r.status!=='active'||s.place!=='road')return fail('领取查访后到城郊官道核对现场。');
  return transact(s,'核对道路见闻',45,8,()=>{r.route='check';r.dueDay=0;r.status=rng()<.8?'claim':'failed';r.step=r.status==='claim'?1:0;xp(s,'forage',2);s.result.push(r.status==='claim'?'现场核对完成，回县城交代。':'未找到相符痕迹，查访结束，无报酬。');},advance);
 }
 if(r.status!=='new'||!d.routes.includes(choice)||choice==='accept'||choice==='check')return fail('此选择不可执行或已经处理，不会反复重掷。');
 let minutes=30,energy=4,input={},chance=1;
 if(key==='cargo'){
  if(choice==='concede'){if(s.coins<2||s.npcWorld.individuals.stallholder.coins>999998)return fail('需自己的2文，收款人也需有容量。');}
  else chance=s.skills.trade>=3?.85:.65;
 }else if(key==='forge'){if(choice==='repair'){minutes=60;energy=10;input={iron:1};}else chance=s.skills.smelt>=6?.9:.6;
 }else if(key==='herbs'){if(choice==='sort'){minutes=45;energy=6;input={herb:1};chance=s.skills.herb>=6?.95:.75;}else input={herb:2};
 }else if(key==='rescue'){if(choice==='rebuild'){minutes=60;energy=12;input={iron:1,wood:1};chance=s.skills.smelt>=20?.98:.8;}else{if(!s.bag.pick)return fail('需自己的矿镐辅助拆整，不消耗工具。');minutes=90;energy=16;chance=.9;}
 }else if(key==='testimony')chance=s.adventures.victories.some(k=>['chief','staffhand'].includes(k))?.95:.75;
 if(d.holder?!onsite(d.holder,minutes):!office(s,minutes))return fail('请到在岗接洽人处，留足作业时间。');
 if(key==='herbs'&&s.npcWorld.clinic.holder!=='doctor')return fail('沈医者当前不主持诊所，暂停这项协作。');
 if(Object.entries(input).some(([k,n])=>s.bag[k]<n))return fail('自己的材料不足，不开始作业。');
 return transact(s,d.name,minutes,energy,()=>{r.route=choice;r.openedDay=s.day;for(const [k,n] of Object.entries(input))s.bag[k]-=n;if(choice==='concede'){s.coins-=2;s.npcWorld.individuals.stallholder.coins+=2;r.status='done';r.step=1;s.result.push('自己付2文了结分歧，无复核报酬，原有贩运可继续。');return;}const success=rng()<chance;r.status=success?'claim':'failed';r.step=success?1:0;xp(s,d.skill,2);if(!success)relation(s,d,-1);s.result.push(success?'实际工作完成，向接洽人交代后才付款。':'处理未成，时间精力和材料不退'+(d.relation?'，接洽关系 -1':'，查访记录保留')+'；可回短工或原有交易恢复资金。');},advance);
}
export function goalProgress(s){const a=s.adventures,goal=a.threads.goal;if(goal==='none')return {name:'自由行动',hint:'近期目标可忽略，不限制接单、习武或出门。',checks:[]};const checks=goal==='settle'?[['完成一次委托或经营',a.done.length>0||Object.values(a.law.jobs).some(r=>r.status==='done')||Object.values(a.business.records).some(r=>r.status==='done')],['选择一次短租安顿',a.home.untilDay>0]]:goal==='artisan'?[['积累任一相关手艺6点',['farming','smelt','herb','trade'].some(k=>s.skills[k]>=6)],['实际结算一次经营',Object.values(a.business.records).some(r=>r.status==='done')]]:goal==='martial'?[['学会一门武学',Object.keys(s.martial.known).length>0],['通过实际出招积累经验',Object.values(s.martial.experience).some(n=>n>0)]]:[['实际搜寻两处旧址',Object.keys(a.sites).filter(k=>a.sites[k]!=='retreated').length>=2],['处理一次县境冒险',Object.values(a.outings.records).some(r=>r.outcome==='done')]];return {...GOALS[goal],checks};}
export function threadOptions(s){const out=[];if(s.dead)return out;for(const [id,d] of Object.entries(THREADS)){const r=s.adventures.threads.records[id],add=(choice,label,preview=d.description)=>out.push({id:'thread:'+id+':'+choice,label,preview});if(r.status==='new'&&threadEligible(s,id)&&s.place===d.place){for(const choice of d.routes.filter(c=>!['safe','quick','check'].includes(c)))add(choice,({talk:'核账交涉',concede:'付2文了结',inspect:'检查接头',repair:'用铁料补牢',sort:'辨拣药材',supply:'交药复核',rebuild:'投入材料修整',tool:'用矿镐拆整',accept:'领取合作',tell:'陈述亲历'})[choice]+' · '+d.name);add('leave','不参与 · '+d.name,'无罚款，不改变原有玩法。');}if(r.status==='active'){add('leave','撤回 · '+d.name,'留存干粮归还，投入耗时不退。');if(id==='escort'&&r.step===0&&s.place==='ferry'){add('safe','供粮 · 稳妥步道','45分钟 / 精力8；保留原有道路路程，不瞬移。');add('quick','供粮 · 冒险近路','15分钟 / 精力12；30%擦伤8气血，可能永久死亡。');}if(id==='testimony'&&s.place==='road')add('check','核对道路见闻 · '+d.name,'45分钟 / 精力8，80%查明，失败结束无报酬。');}if((r.status==='claim'||id==='escort'&&r.status==='active'&&r.step===1)&&s.place===(id==='escort'?'liuxi':d.place))add('claim','交代 · '+d.name,'15分钟；实际支付'+d.reward+'文，付款人不足保留成果。');if(r.status==='failed'&&r.cargo)add('leave','领回留存干粮 · '+d.name,'背包需空位，无额外奖励。');}return out;}
