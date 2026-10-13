import {fieldChance,fieldRisk,useFieldClue} from './field-skills.js?v=5.26.0';
import {openSiteSpoils} from './spoils.js?v=5.26.0';
import {SITES} from './adventure-data.js?v=5.26.0';
import {items} from './content.js?v=5.26.0';
import {gain} from './progression.js?v=5.26.0';
import {addInjury} from './injury.js?v=5.26.0';
export const makeExploration=()=>({routes:{},encounters:{}});
export const ENCOUNTERS={bamboo:{name:'废棚旁受困行人',description:'受困行人需要帮助。可用自己药材1份处理（30分钟/精力8），或搬开压枝（1小时/精力18，25%擦伤8气血）。无钱物奖励；也可离开。'},ferry:{name:'药篓旁的争执',description:'两名行人争执一只另有药材2份的破篓。可公平分取其中1份（30分钟/精力6），或劝对方让出1份（45分钟/精力8，60%成功；互助会成员或柳掌柜关系3可直接谈妥）。未谈妥不强迫战斗。'},mine:{name:'矿堆旁的守路棍手',description:'棍手守着另有铁矿1份的碎矿堆。可绕行1小时/精力8，不拿物资；或交自己口粮1份商量（30分钟/精力6，60%放行，无物资奖励）；也可主动实战，可能受伤、撤退失败或永久死亡，胜利后才可收取矿料。'}};
const outcomes={bamboo:['helped','strained','left'],ferry:['shared','agreed','refused','left'],mine:['bypassed','agreed','refused','left','fighting','won','taken','escaped','died']};
export function explorationValid(s){const x=s.adventures.exploration,obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);return obj(x)&&Object.keys(x).length===2&&obj(x.routes)&&obj(x.encounters)&&Object.entries(x.routes).every(([id,v])=>SITES[id]&&['standard','safe','deep','leave'].includes(v)&&s.adventures.sites[id]&&(v==='leave')===(s.adventures.sites[id]==='retreated'))&&Object.entries(s.adventures.sites).every(([id,v])=>v!=='retreated'||x.routes[id]==='leave')&&Object.entries(x.encounters).every(([id,v])=>outcomes[id]?.includes(v)&&(v!=='fighting'||s.place==='mine'&&s.combat?.opponent==='staffhand'&&!s.combat.practice));}
export function settleExplorationCombat(s,c,log){const x=s.adventures?.exploration;if(x?.encounters.mine!=='fighting'||c.opponent!=='staffhand'||c.practice)return;x.encounters.mine=c.ended==='victory'?'won':c.ended==='death'?'died':'escaped';log.push(c.ended==='victory'?'守路棍手败退，碎矿堆还留有铁矿1份，可自主收取一次。':c.ended==='death'?'守路遭遇记录：战败身亡。':'守路遭遇记录：已撤离，伤势和耗费保留，不再重开此遭遇。');}
export function reconcileExploration(s){if(s.dead&&s.adventures?.exploration.encounters.mine==='fighting')s.adventures.exploration.encounters.mine='died';}
export function explorationPlan(s,key,choice){const d=SITES[key];if(!d||!['standard','safe','deep'].includes(choice))return null;const safe=choice==='safe',deep=choice==='deep';return {minutes:safe?Math.max(15,d.minutes-15):d.minutes+(deep?30:0),energy:safe?Math.max(4,d.energy-4):d.energy+(deep?6:0),chance:fieldChance(s,'navigation',Math.max(.05,d.chance+(safe?-.25:deep?.15:0))),risk:safe?0:fieldRisk(s,d.risk+(deep?.2:0)),damage:d.damage+(deep?6:0)};}
export function explorationAction(s,id,{transact,advance,rng}){
 const [kind,key,choice]=id.split(':'),x=s.adventures.exploration,fail=t=>{s.result=[t];return false;};
 if(s.place!==key)return fail('请到这处旧址再决定。');
 if(kind==='route'){
  const d=SITES[key];if(!d||s.adventures.sites[key]||!['standard','safe','deep','leave'].includes(choice))return fail('这处遗留物已处理或没有这个路线，不会刷新。');
  if(choice==='leave')return transact(s,'提前返回：'+d.name,15,0,()=>{s.adventures.sites[key]='retreated';x.routes[key]='leave';s.result.push('回到旧址入口，放弃本处这次遗留物，不取材料；再访只留放弃记录。正常采集不受影响。');},advance);
  if(s.hp<25||key==='mine'&&!s.bag.pick)return fail('搜寻需气血至少25；矿堆仍需矿镐。');
  if(Object.entries(d.goods).some(([id,n])=>s.bag[id]>1000000-n))return fail('背包库存已满，不开始搜寻。');
  const safe=choice==='safe',deep=choice==='deep',{minutes,energy,chance,risk,damage}=explorationPlan(s,key,choice);
  return transact(s,'探索：'+d.name+' · '+(safe?'稳妥搜寻':deep?'深入冒险':'原有搜寻'),minutes,energy,()=>{x.routes[key]=choice;const found=rng()<chance;useFieldClue(s,'navigation');if(risk)useFieldClue(s,'awareness');s.adventures.sites[key]=found?'found':'empty';if(found)openSiteSpoils(s,key);if(found){for(const [id,n] of Object.entries(d.goods))s.bag[id]+=n;s.result.push('取得本处有限遗留物：'+Object.entries(d.goods).map(([id,n])=>items[id]+'×'+n).join('、'));}else s.result.push('没有找到合用材料，时间精力已付出，不可反复搜寻。');if(risk&&rng()<risk){s.hp-=damage;if(deep)addInjury(s,'bruise');s.result.push('擦伤，气血 -'+damage+(deep?'，新增瘀伤；可休养或治疗。':'。'));}const line=gain(s,key==='mine'?'mining':key==='ferry'?'herb':'forage',2);if(line)s.result.push(line);},advance);
 }
 if(kind!=='encounter'||!ENCOUNTERS[key])return fail('没有这项遭遇。');
 const status=x.encounters[key];
 if(key==='mine'&&choice==='take'){
  if(status!=='won'||s.bag.ore>=1000000)return fail('需实际战胜守路人且背包有余位；矿料只取一次。');
  return transact(s,'收取碎矿堆',15,0,()=>{x.encounters.mine='taken';s.bag.ore++;s.result.push('从碎矿堆取走铁矿1份，矿堆已空；不刷新，不掉落装备或金钱。');},advance);
 }
 if(status)return fail('此遭遇已经有结局，再访不会重开或发奖。');
 if(choice==='leave')return transact(s,'离开：'+ENCOUNTERS[key].name,15,0,()=>{x.encounters[key]='left';s.result.push('没有参与，留下放弃记录；无罚款或强迫战斗。');},advance);
 if(s.hp<25)return fail('身体状态不允许冒险，仍可选择离开。');
 if(key==='bamboo'&&['herb','lift'].includes(choice)){
  if(choice==='herb'&&s.bag.herb<1)return fail('需要自己现有药材1份，不会预支。');
  return transact(s,'帮助受困行人',choice==='herb'?30:60,choice==='herb'?8:18,()=>{if(choice==='herb')s.bag.herb--;const hurt=choice==='lift'&&rng()<.25;if(hurt)s.hp-=8;x.encounters.bamboo=hurt?'strained':'helped';s.result.push(hurt?'搬开压枝，行人脱困；自己擦伤8气血，无钱物奖励。':'行人得到帮助，已离开废棚；无钱物奖励。');},advance);
 }
 if(key==='ferry'&&['share','talk'].includes(choice)){
  if(s.bag.herb>=1000000)return fail('背包库存已满，无法接手药材。');
  return transact(s,'处理药篓争执',choice==='share'?30:45,choice==='share'?6:8,()=>{const success=choice==='share'||s.adventures.org.id==='caravan'||s.relations.merchant>=3||rng()<.6;x.encounters.ferry=choice==='share'?'shared':success?'agreed':'refused';if(success){s.bag.herb++;s.result.push('分取破篓药材1份，另1份由行人带走；本遭遇物资已分清，不再领取。');}else s.result.push('对方不肯让出，药篓由行人带走；无收获，不强迫交手。');},advance);
 }
 if(key==='mine'&&['bypass','talk'].includes(choice)){
  if(choice==='talk'&&s.bag.food<1)return fail('商量需交自己口粮1份。');
  return transact(s,'处理守路遭遇',choice==='bypass'?60:30,choice==='bypass'?8:6,()=>{if(choice==='talk')s.bag.food--;const success=choice==='bypass'||rng()<.6;x.encounters.mine=choice==='bypass'?'bypassed':success?'agreed':'refused';s.result.push(choice==='bypass'?'绕开棍手，未拿碎矿堆物资，仍可正常探索和采矿。':success?'口粮交给棍手，对方让路；未拿矿料。':'口粮已交，对方仍不松口；你退开，没有矿料，不强迫交手。');},advance);
 }
 return fail('没有这种处理方式。');
}
const routeNames={standard:'原有搜寻',safe:'稳妥搜寻',deep:'深入冒险',leave:'提前返回'},resultNames={found:'取走遗留物',empty:'空手而归',retreated:'主动放弃'};
const encounterNames={helped:'行人获助离开',strained:'救出行人，自己擦伤',left:'未参与并离开',shared:'药材公平分清',agreed:'交涉谈妥',refused:'交涉未成，空手退开',bypassed:'绕行离开',fighting:'正在实战',won:'棍手败退，碎矿尚未收取',taken:'碎矿取走，矿堆已空',escaped:'战斗撤离，伤势保留',died:'战败身亡'};
export function explorationOptions(s){const out=[],x=s.adventures.exploration,key=s.place,d=SITES[key],add=(id,label,preview)=>out.push({id,label,preview});if(d&&!s.adventures.sites[key]){for(const choice of ['safe','deep']){const safe=choice==='safe',p=explorationPlan(s,key,choice);add('route:'+key+':'+choice,routeNames[choice]+' · '+d.name,p.minutes+'分钟 / 精力'+p.energy+'；'+Math.round(p.chance*100)+'%取得'+Object.entries(d.goods).map(([id,n])=>items[id]+n+'份').join('、')+'；'+(safe?'无路线擦伤。':Math.round(p.risk*100)+'%损失'+(d.damage+6)+'气血并瘀伤。')+'仅一次，与原有搜寻共用遗留物；需气血25'+(key==='mine'?'及矿镐。':'。'));}add('route:'+key+':leave','提前返回 · '+d.name,'15分钟/精力0；永久放弃这处遗留物，不拿材料、不刷新；正常采集不受影响。');}
 const e=ENCOUNTERS[key],status=x.encounters[key];if(e&&!status){const choices=key==='bamboo'?[['herb','用药救助'],['lift','搬枝救助']]:key==='ferry'?[['share','公平分取'],['talk','交涉药材']]:[['bypass','绕开棍手'],['talk','交粮商量'],['fight','主动交手']];const previews={herb:'药材1份；30分钟/精力8；行人获助，无钱物奖励。',lift:'1小时/精力18；行人脱困，25%自己擦伤8气血；无钱物奖励。',share:'30分钟/精力6；破篓共药材2份，你和行人各取1份，仅一次。',talk:key==='ferry'?'45分钟/精力8；60%取得破篓药材1份；互助会成员或柳掌柜关系3可直接谈妥，失败空手。':'交口粮1份，30分钟/精力6；60%谈妥，失败也消耗口粮；无矿料奖励，不强迫战斗。',bypass:'1小时/精力8；绕开棍手，不取矿料，不影响正常采矿。',fight:'已学选用武艺、气血25、精力20才可开战；真实棍手实战，可能受伤、撤退失败或永久死亡；胜利后自主取铁矿1份。'};for(const [choice,label] of choices)add('encounter:'+key+':'+choice,label+' · '+e.name,previews[choice]);add('encounter:'+key+':leave','离开遭遇 · '+e.name,'15分钟/精力0，无奖励或罚款；此次遭遇结束，再访只留记录。');}if(key==='mine'&&status==='won')add('encounter:mine:take','收取守路人留下的碎矿','15分钟，铁矿1份；仅一次，无钱财或装备。');return out;}
export function explorationSummary(s){const x=s.adventures.exploration;return Object.entries(SITES).map(([id,d])=>d.name+'：'+(s.adventures.sites[id]?(routeNames[x.routes[id]]||'旧档搜寻')+' · '+resultNames[s.adventures.sites[id]]:'遗留物尚未搜寻')+'；'+ENCOUNTERS[id].name+'：'+(encounterNames[x.encounters[id]]||'尚未处理'));}

export function localExplorationSummary(s){const index=Object.keys(SITES).indexOf(s.place);return index<0?null:explorationSummary(s)[index];}
