import {practiceAward,growthPreview} from './practice-growth.js?v=5.56.0';
import {skills,markets,places,items} from './content.js?v=5.56.0';
import {marketPrice,transactionStock,recordTrade} from './commerce.js?v=5.56.0';
import {districtStatus} from './society.js?v=5.56.0';
import {EQUIPMENT} from './equipment.js?v=5.56.0';
import {gain} from './progression.js?v=5.56.0';
// Fourteen bounded opportunities. Cargo belongs to the player and is kept out of the saleable bag.
export const BUSINESSES=Object.freeze(Object.fromEntries(['farm','smith','clinic','merchant'].flatMap(kind=>(kind==='farm'?[0,1,2,3,4]:[0,1,2]).map(t=>[kind+t,{kind,t,name:({farm:['试种小畦','租地种菜','乡邻供菜约定','谷畦试种','药畦试种'],smith:['木棍订单','铁剑订单','精钢刀订单'],clinic:['基础配药协作','分批配药协作','急用药协作'],merchant:['小批药材贩运','柳溪供药约定','大批供药约定']})[kind][t],skill:({farm:'farming',smith:'smelt',clinic:'herb',merchant:'trade'})[kind],required:kind==='farm'&&t>=3?(t===3?6:12):t*(kind==='merchant'?3:6),place:({farm:'fields',smith:'workshop',clinic:'village',merchant:'market'})[kind],giver:({farm:'farmer',smith:'smith',clinic:'doctor',merchant:'merchant'})[kind],days:kind==='farm'?6:kind==='smith'?5:3}]))));
export function businessFarmProfile(d){const stage=d.t>=3?(d.t===3?1:2):d.t;return {item:d.t===3?'grain':d.t===4?'herb':'vegetable',seed:d.t===4?'herb':'grain',seeds:d.t===4?1:stage+1,fee:[3,5,8][stage],mature:d.t===3?3:d.t===4?4:2,yield:d.t===3?7:d.t===4?5:[3,6,10][stage]};}
const empty=()=>({status:'none',accepted:0,due:0,step:0,cost:0,revenue:0,cargo:0,tended:0,rain:false});
export const makeBusiness=()=>({records:Object.fromEntries(Object.keys(BUSINESSES).map(id=>[id,empty()]))});
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),integer=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
// Finished clinic work is a retained contract result, not repeatable medicine or a new inventory.
export const businessAwaitingPayment=(d,r)=>d.kind==='clinic'&&r.status==='active'&&r.step===2;
export function businessValid(s){const b=s.adventures.business;if(!obj(b)||Object.keys(b).length!==1||!obj(b.records)||Object.keys(b.records).length!==Object.keys(BUSINESSES).length)return false;
 return Object.entries(BUSINESSES).every(([id,d])=>{const r=b.records[id];if(!obj(r)||Object.keys(r).length!==9||!['none','active','done','failed'].includes(r.status)||!integer(r.accepted,s.day)||!integer(r.due,s.day+6)||!integer(r.step,2)||!integer(r.cost,1000000)||!integer(r.revenue,1000000)||!integer(r.cargo,30)||!integer(r.tended,s.day)||typeof r.rain!=='boolean')return false;
 if(r.status==='none')return Object.entries(empty()).every(([k,v])=>r[k]===v);
 if(r.accepted<1||r.due!==r.accepted+d.days||r.tended&&r.tended<r.accepted||r.status==='active'&&s.day>r.due&&!businessAwaitingPayment(d,r)||r.status==='done'&&r.cargo||r.status==='done'&&r.step!==2||r.status!=='done'&&r.revenue)return false;
 if(d.kind!=='farm'&&(r.tended||r.rain))return false;
 if(d.kind==='farm'&&r.cargo>businessFarmProfile(d).yield||d.kind==='clinic'&&r.revenue>0&&r.revenue!==[15,23,32][d.t]||d.kind==='smith'&&r.revenue>0&&![[7,10],[30,38],[110,130]][d.t].includes(r.revenue))return false;
 if(d.kind==='farm')return r.step<2&&r.revenue===0||r.step===2;
 if(d.kind==='smith')return r.cargo===0&&r.step!==1;
 if(d.kind==='clinic')return r.cargo===0&&r.step!==1;
 return r.cost>0&&r.cargo<=2+2*d.t&&r.step<=1||r.step===2&&r.cargo===0;
 });}
const cargoKey=d=>d.kind==='farm'?businessFarmProfile(d).item:'herb';
const xp=(s,key,n)=>{const line=gain(s,key,n);if(line)s.result.push(line);};
const fail=(s,text)=>{s.result=[text];return false;};
function release(s,d,r){if(r.cargo){const n=Math.min(r.cargo,1000000-s.bag[cargoKey(d)]);s.bag[cargoKey(d)]+=n;r.cargo-=n;}r.status='failed';}
export function expireBusiness(s){if(!s.adventures?.business)return;for(const [id,d] of Object.entries(BUSINESSES)){const r=s.adventures.business.records[id];if(r.status!=='active')continue;if(d.kind==='farm'&&r.step===0&&s.weather==='雨')r.rain=true;if(s.day>r.due&&!businessAwaitingPayment(d,r)){release(s,d,r);s.news.unshift(d.name+'逾期：未结算报酬，留存货物退回背包；背包满时余货留存可再领取，投入不退。');s.news.length=Math.min(20,s.news.length);}}}
const equipmentId=t=>['wood_staff','iron_sword','steel_blade'][t];
function openMarket(s,minutes=15){const m=markets[s.place];return !!m&&!districtStatus(s,s.place).closed&&s.minute>=m.open&&s.minute+minutes<=m.close;}
export function businessAction(s,id,{present,transact,advance,rng}){const [,key,action]=id.split(':'),d=BUSINESSES[key],r=s.adventures.business.records[key];if(!d||!['accept','tend','harvest','keep','mix','deliver','withdraw'].includes(action))return fail(s,'没有这项经营行动。');
 if(action==='accept'){
  if(r.status!=='none'||Object.entries(s.adventures.business.records).some(([key,v])=>v.status==='active'&&BUSINESSES[key].kind===d.kind))return fail(s,'本项已处理，或同类经营尚未交代。');
  if(s.skills[d.skill]<d.required||d.kind==='farm'&&d.t===4&&s.skills.herb<10)return fail(s,'需实际手艺积累'+d.required+'点'+(d.kind==='farm'&&d.t===4?'及采药10点':'')+'；先做现有短工、采集、炼铁或交易。');
  if(!present(s,d.giver,15)||d.kind==='clinic'&&s.npcWorld.clinic.holder!=='doctor')return fail(s,'接洽人今日不在岗，请在原营业地点与时间再来。');
  if(d.kind==='merchant'&&!openMarket(s))return fail(s,'商铺未营业，不能购进货物。');
  const profile=d.kind==='farm'?businessFarmProfile(d):null,seed=profile?.seed||'grain',fee=profile?.fee||0,seeds=profile?.seeds||0,n=d.kind==='merchant'?2+2*d.t:0,price=n?marketPrice(s,'market','buy','herb'):0,cost=fee+n*price;
  if(s.coins<cost||s.bag[seed]<seeds||s.npcWorld.individuals[d.giver].coins>1000000-fee||n&&(transactionStock(s,'buy','herb',n,price)||s.commerce.budget.market>1000000-n*price))return fail(s,'铜钱、种粮、实际存货或收款容量不足，整笔不投入。');
  const seedCost=seeds*marketPrice(s,'market','buy',seed);
  return transact(s,'开办 · '+d.name,15,0,()=>{s.coins-=cost;s.bag[seed]-=seeds;s.npcWorld.individuals[d.giver].coins+=fee;if(n)recordTrade(s,'buy','herb',n,price);Object.assign(r,{status:'active',accepted:s.day,due:s.day+d.days,cost:cost+seedCost,cargo:n,rain:s.weather==='雨'&&d.kind==='farm'});s.result.push('截止第'+r.due+'日；实际投入'+cost+'文'+(seeds?'、'+(seed==='herb'?'药材种苗':'种粮')+seeds+'份（成本按当前买价计）':'')+'。不预付报酬，不自动经营。');},advance);
 }
 if(r.status==='failed'&&r.cargo&&action==='withdraw'){if(s.bag[cargoKey(d)]===1000000)return fail(s,'背包已满，先处理库存再领取留存货物。');return transact(s,'领取留存货物 · '+d.name,0,0,()=>{release(s,d,r);s.result.push('归还自己持有的货物，余货'+r.cargo+'份，无额外报酬。');},advance);}
 if(r.status!=='active')return fail(s,'此项没有进行中的经营。');
 if(action==='withdraw'){if(r.cargo&&s.bag[cargoKey(d)]>1000000-r.cargo)return fail(s,'背包已满，先处理库存。');return transact(s,'撤回 · '+d.name,0,0,()=>{const ready=businessAwaitingPayment(d,r);release(s,d,r);s.result.push(ready?'已主动放弃本单药包与报酬，投入不退，不可重新配药或领款。':'未用货物退回背包，投入与耗时不退，订单不重新开放。');},advance);}
 if(d.kind==='farm'){
  const profile=businessFarmProfile(d);
  if(action==='keep'&&r.step===1){if(s.place!=='fields'||s.minute<360||s.minute+15>1080||s.bag[profile.item]>1000000-r.cargo)return fail(s,'请白天到田地取回收成；背包不足时整笔保留。');return transact(s,'自留收成 · '+d.name,15,1,()=>{s.bag[profile.item]+=r.cargo;r.cargo=0;r.step=2;r.status='done';s.result.push('收成进入自己的背包，可做饭或加工；没有销售收入，投入成本与历史保留。');},advance);}
  if(action==='tend'&&r.step===0){if(s.place!=='fields'||s.minute<360||s.minute+60>1080||r.tended===s.day)return fail(s,'需白天在田地照看，每日一次。');return transact(s,'照看小畦',60,10,()=>{r.tended=s.day;xp(s,'farming',practiceAward(s,0,6));s.result.push('实际整地排水；临近收获的照看提高收成，雨天仍可能减产。');},advance);}
  if(action==='harvest'&&r.step===0){if(s.place!=='fields'||s.day<r.accepted+profile.mature||s.minute<360||s.minute+60>1080)return fail(s,'需种满'+profile.mature+'个游戏日后，白天到田地收获。');return transact(s,'收获 · '+d.name,60,12,()=>{const tended=r.tended>=s.day-1;const chance=Math.min(.9,.55+(tended?.2:0)+(s.skills.farming>=12?.1:0)-(r.rain?.2:0));r.cargo=rng()<chance?profile.yield:1;r.step=1;xp(s,'farming',practiceAward(s,0,r.cargo>1?16:4));s.result.push('收得'+({vegetable:'蔬菜',grain:'粮食',herb:'药材'}[profile.item])+r.cargo+'份，可自留或供货；'+(r.cargo===1?'减产，本轮可能亏本。':'尚未卖出，不能算已获利。'));},advance);}
 }
 if(d.kind==='clinic'&&action==='mix'&&r.step===0){const herbs=2+d.t,minutes=60+30*d.t,fee=d.t+1;if(!present(s,'doctor',minutes)||s.npcWorld.clinic.holder!=='doctor')return fail(s,'需沈医者在岗指导，不能独立诊治。');if(s.bag.herb<herbs||s.bag.wood<1||s.coins<fee)return fail(s,'配药需药材'+herbs+'份、木料1份、耗材费'+fee+'文。');const cost=herbs*marketPrice(s,'market','buy','herb')+marketPrice(s,'market','buy','wood')+fee;if(r.cost>1000000-cost||s.npcWorld.individuals.doctor.coins>1000000-fee)return fail(s,'本次投入超过记录或医者收款容量。');return transact(s,'配药协作 · '+d.name,minutes,12+4*d.t,()=>{s.bag.herb-=herbs;s.bag.wood--;s.coins-=fee;s.npcWorld.individuals.doctor.coins+=fee;r.cost+=cost;const success=rng()<.8;xp(s,'herb',practiceAward(s,0,success?20:4));if(success){r.step=2;s.result.push('药包完成，仅供本次医者协作交付；制作期限已履行，缺款时保留待付款，不再因原期限失效，不凭空回血。');}else{r.status='failed';s.result.push('火候失当，本项结束，材料与耗材费损失；可继续采药供货。');}},advance);}
 if(action!=='deliver')return fail(s,'此地点或经营阶段不能执行该步骤。');
 if(d.kind==='smith'){
  const eq=equipmentId(d.t),item=EQUIPMENT[eq];if(!present(s,'smith',15)||s.equipment.owned[eq]!==item.durability||Object.values(s.equipment.equipped).includes(eq))return fail(s,'交付需铁匠在岗、指定装备完好且已卸下；用现有打造菜单备货。');
  const quality=s.equipment.quality[eq],payout=[7,30,110][d.t]+(quality===2?[3,8,20][d.t]:0),cost=Object.entries(item.materials).reduce((n,[k,v])=>n+v*(marketPrice(s,'market','buy',k)??marketPrice(s,'market','sell',k)??({fine_ore:12}[k]??3)),item.fee);
  if(s.npcWorld.individuals.smith.coins<payout||s.coins>10000000-payout)return fail(s,'铁匠实际余额不足，保留装备与订单，改日再来。');
  return transact(s,'交付 · '+d.name,15,0,()=>{delete s.equipment.owned[eq];delete s.equipment.quality[eq];s.npcWorld.individuals.smith.coins-=payout;s.coins+=payout;r.step=2;r.status='done';if(!r.cost)r.cost=cost;r.revenue=payout;xp(s,'smelt',4);s.result.push('实际交付'+item.name+'（'+(quality===2?'精良':'普通')+'），收款'+payout+'文；材料成本按当前报价估算，接单后的锻造尝试均计入投入，接单前备货按当前材料报价估值。');},advance);
 }
 if(d.kind==='clinic'){
  const payout=[15,23,32][d.t],p=s.npcWorld.individuals.doctor;if(r.step!==2||!present(s,'doctor',15)||s.npcWorld.clinic.holder!=='doctor')return fail(s,'需完成配药后向在岗沈医者交付。');if(p.coins<payout||s.coins>10000000-payout)return fail(s,'医者实际诊所资金不足，保留药包与进度。');return transact(s,'交付 · '+d.name,15,0,()=>{p.coins-=payout;s.coins+=payout;r.status='done';r.revenue=payout;p.workDays=Math.min(100000,p.workDays+1);xp(s,'herb',2);s.result.push('医者验收药包，实际支付'+payout+'文；收益扣除材料估值与耗材费。');},advance);
 }
 if(d.kind==='farm'&&r.step!==1)return fail(s,'先在田地完成收获。');
 const dest=d.kind==='farm'?'market':'liuxi';if(s.place!==dest||!openMarket(s))return fail(s,'请在'+places[dest].name+'营业时交货。');
 // One inspection, separate from settlement: damage cannot be rerolled by insufficient buyer cash.
 if(d.kind==='merchant'&&r.step===0){return transact(s,'查验柳溪货物',15,1,()=>{r.step=1;const risk=s.day>r.accepted+1?.4:s.weather==='雨'?.25:.1;if(rng()<risk){r.cargo=Math.max(0,r.cargo-1-d.t);s.result.push('途中受潮损坏药材'+(1+d.t)+'份；留下损失记录，收款前可核对价格和余额。');}else s.result.push('货物查验完好；尚未付款。');},advance);}
 const keyItem=cargoKey(d),price=marketPrice(s,dest,'sell',keyItem),fee=d.kind==='merchant'?[2,5,10][d.t]:0,payout=r.cargo*price+(r.cargo?fee:0);
 if(transactionStock(s,'sell',keyItem,r.cargo,price)||s.commerce.budget[dest]<payout||s.coins>10000000-payout)return fail(s,'买方实际余额或收购容量不足，保留货物；改日再来或撤回自行出售。');
 return transact(s,'结算 · '+d.name,15,1,()=>{recordTrade(s,'sell',keyItem,r.cargo,price);s.commerce.budget[dest]-=r.cargo?fee:0;s.coins+=payout;r.cargo=0;r.step=2;r.status='done';r.revenue=payout;xp(s,d.skill,d.kind==='farm'?2:3);s.result.push('当前单价'+price+'文，实际收款'+payout+'文（运费'+(payout?fee:0)+'）；计入材料成本后的本轮净额'+(payout-r.cost)+'文。');},advance);
}
export function businessOptions(s){const out=[];const add=(id,label,preview)=>out.push({id,label,preview});for(const [id,d] of Object.entries(BUSINESSES)){const r=s.adventures.business.records[id],prefix='business:'+id+':';const profile=d.kind==='farm'?businessFarmProfile(d):null;const common='阶段'+(d.kind==='farm'&&d.t>=3?d.t-1:d.t+1)+'；实际'+skills[d.skill]+'积累需'+d.required+'点；'+d.days+'游戏日截止。';if(r.status==='none'&&s.place===d.place)add(prefix+'accept','开办 · '+d.name,common+(d.kind==='farm'?'租地'+profile.fee+'文，'+(profile.seed==='herb'?'药材种苗':'种粮')+profile.seeds+'份；种满'+profile.mature+'日，需照看，雨天与失手会减产。收成可自留或出售。'+(d.t===4?'另需采药10点，不能种出稀有野生药材。':''):d.kind==='merchant'?'现价购买药材'+(2+2*d.t)+'份，每份'+marketPrice(s,'market','buy','herb')+'文，共'+((2+2*d.t)*marketPrice(s,'market','buy','herb'))+'文；在柳溪按实际收购价结算，另付运费'+[2,5,10][d.t]+'文；受潮和延误可能亏本。':d.kind==='smith'?'现有打造菜单制作'+EQUIPMENT[equipmentId(d.t)].name+'，交付完好未穿戴装备；普通收款'+[7,30,110][d.t]+'文，精良另加'+[3,8,20][d.t]+'文；高阶打造可能失败。':'医者指导下用药材'+(2+d.t)+'份、木料1份、耗材费'+(1+d.t)+'文配药，80%成功，验收实付'+[15,23,32][d.t]+'文。'));
 if(r.status==='failed'&&r.cargo)add(prefix+'withdraw','领取留存货物 · '+d.name,'背包腾出空间后领取余货'+r.cargo+'份，自己的货物无额外报酬。');if(r.status!=='active')continue;add(prefix+'withdraw','撤回 · '+d.name,(businessAwaitingPayment(d,r)?'药包已完成，待付款不受原制作期限限制；撤回会放弃药包与报酬。':'截止第'+r.due+'日；')+'投入'+r.cost+'文，未收款；留存货物'+r.cargo+'份。投入不退，留存货物回背包，本项不重复开放。');if(d.kind==='farm'&&s.place==='fields'&&r.step===0){add(prefix+'tend','照看 · '+d.name,'白天1小时 / 精力10，每日一次；临收获照看提高成功率。'+growthPreview(s,'farming',10,6));add(prefix+'harvest','收获 · '+d.name,'第'+(r.accepted+profile.mature)+'日起白天，1小时 / 精力12；产物可自留或街市供货。'+growthPreview(s,'farming',12,16,4));}if(d.kind==='farm'&&s.place==='fields'&&r.step===1)add(prefix+'keep','自留收成 · '+d.name,'自己的'+items[profile.item]+'收成转入背包；15分钟/精力1，不收销售钱，原投入不退。');if(d.kind==='clinic'&&s.place==='village'&&r.step===0)add(prefix+'mix','配药 · '+d.name,(60+30*d.t)+'分钟 / 精力'+(12+4*d.t)+'；药材'+(2+d.t)+'、木料1、耗材费'+(d.t+1)+'文，失败损失投入。'+growthPreview(s,'herb',12+4*d.t,20,4));const dest=d.kind==='farm'?'market':d.kind==='merchant'?'liuxi':d.place;if(s.place===dest)add(prefix+'deliver',d.kind==='merchant'&&r.step===0?'查验 · '+d.name:'交付 · '+d.name,d.kind==='merchant'?'15分钟 / 精力1；留存药材'+r.cargo+'份，当前收购单价'+marketPrice(s,'liuxi','sell','herb')+'文，完货运费'+[2,5,10][d.t]+'文；买方余额'+s.commerce.budget.liuxi+'文。先查验一次，结算不重掷损耗。':businessAwaitingPayment(d,r)?'药包已完成，原制作期限不再限制结款；15分钟，须医者在岗且实际余额足够，不重复制作或发钱。':'15分钟，需实际成果与付款方余额，保留未结算进度。');}return out;}
export function businessSummary(s){return Object.entries(BUSINESSES).filter(([id])=>s.adventures.business.records[id].status!=='none').map(([id,d])=>{const r=s.adventures.business.records[id];return d.name+'：'+(businessAwaitingPayment(d,r)?'药包已完成待付款':({active:'进行中',done:'已结算',failed:'已结束未获报酬'})[r.status])+'；投入估值'+r.cost+'文，已收款'+r.revenue+'文，净额'+(r.revenue-r.cost)+'文'+(businessAwaitingPayment(d,r)?'；不再受原制作期限限制，仍需本人实际付款。':r.status==='active'?'；截止第'+r.due+'日，留存货物'+r.cargo+'份':'')+'。';});}

export function businessCraftCost(s,id){const pair=Object.entries(BUSINESSES).find(([key,d])=>d.kind==='smith'&&equipmentId(d.t)===id&&s.adventures.business.records[key].status==='active');if(!pair)return null;const item=EQUIPMENT[id];return {record:s.adventures.business.records[pair[0]],cost:Object.entries(item.materials).reduce((n,[k,v])=>n+v*(marketPrice(s,'market','buy',k)??marketPrice(s,'market','sell',k)??({fine_ore:12}[k]??3)),item.fee)};}
