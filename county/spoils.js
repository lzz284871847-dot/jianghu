import {EQUIPMENT} from './equipment.js?v=5.16.0';
import {items,people} from './content.js?v=5.16.0';
import {marketPrice} from './commerce.js?v=5.16.0';
import {travelBusy} from './npc-journeys.js?v=5.16.0';
import {companionBusy} from './companions.js?v=5.16.0';
// These are saved physical reserves, not a reward table rolled on every victory.
export const SPOILS={
 brawler:{name:'旧道莽汉的随身包',place:'oldroad',coins:4,goods:{food:1},gear:'farm_knife',durability:18,owner:'boatman',kind:'food',missing:1},
 staffhand:{name:'矿洞棍手的随身包',place:'mine',coins:6,goods:{wood:1},gear:'wood_staff',durability:18},
 chief:{name:'旧道头目的旧行囊',place:'oldroad',coins:12,goods:{food:1},gear:'iron_sword',durability:25,owner:'merchant',kind:'coins',missing:6},
 bamboo:{name:'废棚里的一包旧物',place:'bamboo',coins:0,goods:{wood:1},gear:'coarse_cloth',durability:12}
};
const missing=()=>({status:'none',checked:false,identified:false,value:0});
export const makeSpoils=()=>({records:Object.fromEntries(Object.entries(SPOILS).map(([id,d])=>[id,{state:'sealed',engaged:false,won:false,coins:d.coins,goods:{...d.goods},gear:{id:d.gear,durability:d.durability,quality:1},stolen:missing()}])),sold:{}});
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),int=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export function spoilsValid(s){const a=s.adventures.spoils;if(!obj(a)||Object.keys(a).length!==2||!obj(a.records)||Object.keys(a.records).length!==4||!obj(a.sold)||Object.entries(a.sold).some(([id,list])=>!EQUIPMENT[id]||!Array.isArray(list)||list.length<1||list.length>2||list.some(g=>!obj(g)||Object.keys(g).length!==2||!int(g.durability,EQUIPMENT[id].durability)||g.durability===0||![1,2].includes(g.quality))))return false;
 return Object.entries(SPOILS).every(([id,d])=>{const r=a.records[id];if(!obj(r)||Object.keys(r).length!==7||!['sealed','open','empty'].includes(r.state)||typeof r.engaged!=='boolean'||typeof r.won!=='boolean'||!int(r.coins,d.coins)||!obj(r.goods)||Object.keys(r.goods).length!==Object.keys(d.goods).length||!Object.entries(d.goods).every(([k,n])=>int(r.goods[k],n)))return false;
 if(r.gear!==null&&(!obj(r.gear)||Object.keys(r.gear).length!==3||r.gear.id!==d.gear||r.gear.durability!==d.durability||r.gear.quality!==1))return false;
 const m=r.stolen;if(!obj(m)||Object.keys(m).length!==4||!['none','held','kept','returned'].includes(m.status)||typeof m.checked!=='boolean'||typeof m.identified!=='boolean'||![0,d.missing??0].includes(m.value)||m.status==='none'&&(m.value||m.checked||m.identified)||m.status!=='none'&&(!d.owner||m.value!==d.missing)||m.identified&&!m.checked||m.status==='kept'&&!m.identified)return false;
 if(id==='bamboo'){if(r.engaged||r.won)return false;if(r.state!=='sealed'&&s.adventures.sites.bamboo!=='found')return false;}else{if(r.engaged&&(r.state!=='sealed'||!s.combat||s.combat.practice||s.place!==d.place||(s.combat.opponent??'brawler')!==id))return false;if(r.state!=='sealed'&&!r.won||r.won&&(!s.adventures.victories.includes(id)||r.state==='sealed'))return false;}
 if(r.state==='sealed'&&(r.coins!==d.coins||r.gear===null||Object.entries(d.goods).some(([k,n])=>r.goods[k]!==n)||['kept','returned'].includes(m.status)))return false;
 if(r.state==='empty'&&(r.coins||r.gear||Object.values(r.goods).some(Boolean)||m.status==='held'))return false;
 return true;
 });}
function emptied(r){if(!r.coins&&!r.gear&&!Object.values(r.goods).some(Boolean)&&r.stolen.status!=='held')r.state='empty';}
export function engageSpoils(s,id,log=[]){const d=SPOILS[id],r=s.adventures?.spoils?.records[id];if(!d||id==='bamboo'||s.place!==d.place||!r||r.state!=='sealed'||r.engaged||s.combat?.practice)return;r.engaged=true;
 if(d.owner&&r.stolen.status==='none'){const p=s.npcWorld.individuals[d.owner],field=d.kind==='coins'?'coins':'food';if(!p.life.deathDay&&p[field]>=d.missing){p[field]-=d.missing;Object.assign(r.stolen,{status:'held',value:d.missing});p.history=['第'+s.day+'日损失'+(d.kind==='coins'?d.missing+'文':'现有口粮'+d.missing+'份')+'，去向已留在有限失物记录中。',...p.history].slice(0,8);log.push('对手包里另有来历可疑的钱物，已记录实际来源；胜利后仍需辨认和选择处置。');}}
}
export function settleSpoils(s,c,log=[]){const r=s.adventures?.spoils?.records[c.opponent];if(!r?.engaged||c.practice)return;r.engaged=false;if(c.ended==='victory'&&s.place===SPOILS[c.opponent].place){r.state='open';r.won=true;if(!s.adventures.victories.includes(c.opponent))s.adventures.victories.push(c.opponent);log.push('发现'+SPOILS[c.opponent].name+'：仅这份实际存货，需自行拾取，不自动发奖、不重复补货。');}}
export function openSiteSpoils(s,id){if(id==='bamboo'&&s.adventures.sites.bamboo==='found'&&s.adventures.spoils.records.bamboo.state==='sealed')s.adventures.spoils.records.bamboo.state='open';}
const present=(s,id,n)=>{const p=s.npcWorld.individuals[id],d=people[id];return p&&d&&s.place===d.place&&!p.life.deathDay&&!p.life.sickDays&&!p.injuryDays&&p.life.restDay!==s.day&&!travelBusy(s,id)&&!companionBusy(s,id)&&s.minute>=d.open&&s.minute+n<=d.close;};
const fail=(s,text)=>{s.result=[text];return false;};
export function equipmentResale(s,id){const item=EQUIPMENT[id],dur=s.equipment.owned[id];if(!item||dur===undefined||dur===0)return 0;const value=Object.entries(item.materials).reduce((n,[k,q])=>n+q*(marketPrice(s,'market','buy',k)??marketPrice(s,'market','sell',k)??({fine_ore:12,cold_ore:30,meteor_ore:50}[k]??1)),item.fee);return Math.max(1,Math.floor(value*.35*(dur/item.durability)*(s.equipment.quality[id]===2?1.25:1)));}
export function salvageMaterials(s,id){const item=EQUIPMENT[id];if(!item||!Object.hasOwn(s.equipment.owned,id))return {};const ratio=s.equipment.owned[id]/item.durability;return Object.fromEntries(Object.entries(item.materials).filter(([k])=>!['fine_ore','cold_ore','meteor_ore'].includes(k)).map(([k,n])=>[k,Math.min(n,Math.max(1,Math.floor(n*(.2+.2*ratio))))]));}
export function spoilAction(s,id,{transact,advance,rng}){const [,key,action]=id.split(':'),d=SPOILS[key],r=s.adventures.spoils.records[key];if(!d||!r||r.state==='sealed')return fail(s,'需实际野外胜利或本次探索找到旧物；不补发旧战斗奖励。');
 if(action==='coins'){if(!r.coins||s.coins>10000000-r.coins)return fail(s,'没有可拾取铜钱或钱包已满。');return transact(s,'拾取存货铜钱',15,1,()=>{s.coins+=r.coins;r.coins=0;emptied(r);},advance);}
 if(action==='goods'){if(!Object.values(r.goods).some(Boolean)||Object.entries(r.goods).some(([k,n])=>s.bag[k]>1000000-n))return fail(s,'没有物资或背包已满，物资保留。');return transact(s,'拾取存货物资',15,1,()=>{for(const [k,n] of Object.entries(r.goods)){s.bag[k]+=n;r.goods[k]=0;}emptied(r);},advance);}
 if(action==='gear'){if(!r.gear||Object.hasOwn(s.equipment.owned,r.gear.id))return fail(s,'没有装备，或已有同名装备；战利品保留，先处置旧件。');return transact(s,'拾取旧装备',15,1,()=>{const g=r.gear;s.equipment.owned[g.id]=g.durability;s.equipment.quality[g.id]=g.quality;r.gear=null;emptied(r);s.result.push('取得原有品质与剩余耐久，不自动穿戴或恢复耐久。');},advance);}
 const m=r.stolen;if(!d.owner||m.status==='none')return fail(s,'此处没有有主失物。');const owner=s.npcWorld.individuals[d.owner],field=d.kind==='coins'?'coins':'food';
 if(action==='identify'){
  if(m.status!=='held'||m.checked)return fail(s,'自行辨认仅一次；未辨明可到原主处核对。');return transact(s,'辨认刻记',30,2,()=>{m.checked=true;m.identified=rng()<((s.relations[d.owner]??0)>=3?.95:.7);s.result.push(m.identified?'刻记与'+people[d.owner].name+'的失物相符，仍需选择归还或留下。':'暂未辨明，物品保留；去原主在岗地点核对，不反复重掷。');},advance);
 }
 if(action==='verify'){if(m.status!=='held'||!present(s,d.owner,15))return fail(s,'带保留的失物到在岗原主处核对。');return transact(s,'向原主核对失物',15,0,()=>{m.checked=true;m.identified=true;s.result.push('确认失物归属，不自动归还或发奖。');},advance);}
 if(action==='keep'){
  if(m.status!=='held'||!m.identified||(d.kind==='coins'?s.coins>10000000-m.value:s.bag.food>1000000-m.value))return fail(s,'需先辨明来源并留足库存空间；可直接去县衙代还。');return transact(s,'明知有主仍留下',15,0,()=>{if(d.kind==='coins')s.coins+=m.value;else s.bag.food+=m.value;m.status='kept';s.relations[d.owner]=Math.max(0,s.relations[d.owner]-3);emptied(r);s.result.push('实际钱物转入你手中，原主关系 -3；县衙可补还原物并付2文转交费。已有案件不清除。');},advance);
 }
 if(['return','office','repay'].includes(action)){
  const repay=action==='repay',office=action!=='return';if(repay?m.status!=='kept':m.status!=='held')return fail(s,'这份失物已处置，不重复归还。');
  if(office?s.place!=='county'||s.minute<480||s.minute+30>1080:!m.identified||!present(s,d.owner,30))return fail(s,'需县衙08—18时留足30分钟，或辨明后到在岗原主处。');
  if(owner.life.deathDay||owner[field]>(field==='coins'?1000000:100)-m.value)return fail(s,'原主不能接收，物品或补还记录保留。');
  if(repay&&(s.coins<2+(d.kind==='coins'?m.value:0)||d.kind==='food'&&s.bag.food<m.value||s.commerce.budget.market>999998))return fail(s,'需自己的原数钱物和2文转交费，不足可先谋生。');
  return transact(s,repay?'补还失物':'归还失物',30,0,()=>{if(repay){s.coins-=2+(d.kind==='coins'?m.value:0);if(d.kind==='food')s.bag.food-=m.value;s.commerce.budget.market+=2;}owner[field]+=m.value;m.checked=true;m.identified=true;m.status='returned';s.relations[d.owner]=Math.min(100,s.relations[d.owner]+(repay?1:2));owner.history=['第'+s.day+'日收回原有失物'+(office?'，由县衙转交':'')+'。',...owner.history].slice(0,8);emptied(r);s.result.push('原物归还，无凭空谢礼；过往选择、伤势和已有治安案件保留。');},advance);
 }
 return fail(s,'没有这个战利品处置步骤。');}
export function disposeEquipment(s,id,mode,{transact,advance}){const item=EQUIPMENT[id],e=s.equipment;if(!item||!Object.hasOwn(e.owned,id)||!['sell','scrap'].includes(mode))return fail(s,'没有可处置的这件装备。');if(Object.values(e.equipped).includes(id))return fail(s,'请先卸下装备，不能误卖或拆掉正在穿戴的物品。');if(s.place!=='workshop'||s.minute<420||s.minute+(mode==='sell'?15:30)>1080)return fail(s,'作坊07—18时作业，需留足处置时间。');
 const price=equipmentResale(s,id),stock=s.adventures.spoils.sold[id]??[],p=s.npcWorld.individuals.smith,out=salvageMaterials(s,id);
 if(mode==='sell'&&(!present(s,'smith',15)||!price||stock.length>=2||p.coins<price||s.coins>10000000-price))return fail(s,'铁匠不在岗、余额不足、同种旧货已收2件或装备已损坏；整笔不成交，装备保留。');
 if(mode==='scrap'&&Object.entries(out).some(([k,n])=>s.bag[k]>1000000-n))return fail(s,'材料背包已满，装备保留。');
 return transact(s,(mode==='sell'?'出售':'拆解')+item.name,mode==='sell'?15:30,mode==='sell'?1:6,()=>{const g={durability:e.owned[id],quality:e.quality[id]??1};delete e.owned[id];delete e.quality[id];if(mode==='sell'){p.coins-=price;s.coins+=price;s.adventures.spoils.sold[id]=[...stock,g];s.result.push('实际收款'+price+'文；原装备进入铁匠有限旧货库存，品质耐久原样保留。');}else{for(const [k,n] of Object.entries(out))s.bag[k]+=n;s.result.push('只回收常用材料：'+Object.entries(out).map(([k,n])=>items[k]+'×'+n).join('、')+'；不返还稀矿和工钱，原装备不再保留。');}},advance);}
export function spoilOptions(s){const out=[];for(const [id,d] of Object.entries(SPOILS)){const r=s.adventures.spoils.records[id],add=(a,label,preview)=>out.push({id:'spoil:'+id+':'+a,label,preview});if(r.state==='sealed')continue;if(r.coins)add('coins','拾取铜钱 · '+d.name,'留存'+r.coins+'文，15分钟/精力1，只转移这份存货。');if(Object.values(r.goods).some(Boolean))add('goods','拾取物资 · '+d.name,Object.entries(r.goods).filter(([,n])=>n).map(([k,n])=>items[k]+'×'+n).join('、')+'；15分钟/精力1，库存不足保留。');if(r.gear)add('gear','拾取装备 · '+d.name,EQUIPMENT[r.gear.id].name+'，普通，耐久'+r.gear.durability+'/'+EQUIPMENT[r.gear.id].durability+'；同名装备已有时留存。');const m=r.stolen;if(m.status==='held'){if(!m.checked)add('identify','辨认失物 · '+d.name,'30分钟/精力2，70%辨明，熟悉原主95%；仅一次，未明可找原主核对。');if(s.place===people[d.owner]?.place){if(!m.identified)add('verify','请原主核对 · '+d.name,'15分钟；需原主在岗。');else add('return','归还原主 · '+d.name,'30分钟；返还实际失物，关系+2，无凭空谢礼。');}if(m.identified)add('keep','留下有主失物 · '+d.name,'钱物转入你手中，关系-3；以后补还需原物和2文转交费。');if(s.place==='county')add('office','县衙代还 · '+d.name,'30分钟，县衙代转实际原物，无奖励、不开新案件也不抹旧案。');}if(m.status==='kept'&&s.place==='county')add('repay','补还失物 · '+d.name,'自己的原数钱物和2文转交费；过往记录保留。');}return out;}
export function spoilSummary(s){return Object.entries(SPOILS).filter(([id])=>s.adventures.spoils.records[id].state!=='sealed').map(([id,d])=>{const r=s.adventures.spoils.records[id];return d.name+'：'+(r.state==='empty'?'普通存货已取尽':'有留存钱物')+'；铜钱'+r.coins+'文，装备'+(r.gear?EQUIPMENT[r.gear.id].name:'已取')+'；失物'+({none:'无',held:r.stolen.identified?'已辨明待处置':'待辨认',kept:'已留下，可去县衙补还',returned:'已归还'})[r.stolen.status]+'。';});}
