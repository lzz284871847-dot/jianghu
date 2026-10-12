// Finite county cases. The constable uses existing local funds, with no legal-history simulation.
export const CONSTABLE={name:'赵捕快',place:'county',open:480,close:1080};
export const INCIDENTS={toll:{name:'官道勒索',place:'road',kind:'coins',amount:4,witness:'boatman'},goods:{name:'渡口侵占药材',place:'ferry',kind:'herb',amount:1,witness:'merchant'}};
export const CRIMES={robbery:{name:'抢夺柳掌柜钱袋',place:'market',victim:'merchant',fine:12},assault:{name:'主动伤害贺船工',place:'dock',victim:'boatman',fine:8}};
export const POLICE_JOBS={witness:{name:'查访田间证人',reward:6,description:'3日内到河湾田地问陈农户，30分钟/精力6，75%愿作证；回来县城结算6文。'},lost:{name:'寻回遗失公文',reward:8,description:'3日内到竹林搜寻，45分钟/精力10，65%找到；回来县城结算8文。公文不能出售。'},escort:{name:'协助护送证人',reward:10,description:'3日内经旧渡口选择路段，再到柳溪集交接；稳妥路45分钟/精力8，近路15分钟/精力12、30%擦伤8气血，可能死亡。报酬10文。'}};
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),int=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const incidentStates=['new','avoided','open','privateFailed','private','refused','filed','recovered','unrecovered'];
export const makeLaw=()=>({incidents:Object.fromEntries(Object.keys(INCIDENTS).map(k=>[k,{status:'new',loss:0,held:0,witness:false,reportTier:0}])),crimes:Object.fromEntries(Object.keys(CRIMES).map(k=>[k,{status:'none',stolen:0,debt:0,escaped:false}])),jobs:Object.fromEntries(Object.keys(POLICE_JOBS).map(k=>[k,{status:'none',acceptedDay:0,dueDay:0,step:0}])),pursuit:false});
export const wanted=s=>Object.entries(s.adventures.law.crimes).filter(([,r])=>r.status==='wanted').map(([id])=>id);
export function lawValid(s){const l=s.adventures.law;if(!obj(l)||Object.keys(l).length!==4||typeof l.pursuit!=='boolean'||!obj(l.incidents)||Object.keys(l.incidents).length!==2||!obj(l.crimes)||Object.keys(l.crimes).length!==2||!obj(l.jobs)||Object.keys(l.jobs).length!==3)return false;
 if(!Object.entries(INCIDENTS).every(([id,d])=>{const r=l.incidents[id];return obj(r)&&Object.keys(r).length===5&&incidentStates.includes(r.status)&&[0,d.amount].includes(r.loss)&&[0,r.loss].includes(r.held)&&typeof r.witness==='boolean'&&int(r.reportTier,2)&&(r.status==='new'||r.status==='avoided'?r.loss===0&&r.held===0&&!r.witness&&r.reportTier===0:r.loss===d.amount)&&(r.status==='private'||r.status==='recovered'?r.held===0:r.held===r.loss)&&(['filed','recovered','unrecovered','refused'].includes(r.status)?r.reportTier>0:['private','privateFailed'].includes(r.status)?r.reportTier<2:r.reportTier===0)&&(!r.witness||!['new','avoided'].includes(r.status))&&(r.reportTier!==2||r.witness);}))return false;
 if(!Object.entries(CRIMES).every(([id])=>{const r=l.crimes[id];return obj(r)&&Object.keys(r).length===4&&['none','hidden','wanted','closed'].includes(r.status)&&[0,id==='robbery'?5:0].includes(r.stolen)&&int(r.debt,r.stolen)&&typeof r.escaped==='boolean'&&(r.status!=='none'||r.stolen===0&&r.debt===0&&!r.escaped)&&(r.status==='closed'||r.debt===r.stolen)&&(!r.escaped||['wanted','closed'].includes(r.status));}))return false;
 if(l.pursuit&&(s.place!=='county'||!wanted(s).length))return false;
 let active=0;return Object.values(l.jobs).every(r=>{if(!obj(r)||Object.keys(r).length!==4||!['none','active','done','failed','withdrawn'].includes(r.status)||!int(r.step,1)||!int(r.acceptedDay,s.day)||!int(r.dueDay,s.day+3))return false;if(r.status==='active')active++;return r.status==='none'?r.acceptedDay===0&&r.dueDay===0&&r.step===0:r.acceptedDay>=1&&r.dueDay===r.acceptedDay+3&&(r.status!=='done'||r.step===1);})&&active<=1;
}
export function expireLaw(s){const l=s.adventures?.law;if(!l)return;for(const [id,r] of Object.entries(l.jobs))if(r.status==='active'&&(s.dead||s.day>r.dueDay)){r.status='failed';s.news.unshift(POLICE_JOBS[id].name+'未完成，委托结束，无报酬或罚款。');s.news.length=Math.min(20,s.news.length);}}
export function lawArrival(s,rng){const l=s.adventures.law;if(!['county','market'].includes(s.place))return;for(const [id,r] of Object.entries(l.crimes))if(r.status==='hidden'&&rng()<.7){r.status='wanted';s.result.push('有人认出了你：'+CRIMES[id].name+'已留下追责记录。');}if(s.place==='county'&&wanted(s).length){l.pursuit=true;s.result.push('赵捕快拦下你核对案件；可投案缴款、接受短期拘押或冒险逃避。');}}
const office=(s,minutes=0)=>s.place==='county'&&s.minute>=CONSTABLE.open&&s.minute+minutes<=CONSTABLE.close;
const holderCanReceive=(s,id,n)=>s.npcWorld.individuals[CRIMES[id].victim].coins<=1000000-n;
function returnLoss(s,id){const d=INCIDENTS[id],r=s.adventures.law.incidents[id];if(d.kind==='coins')s.coins+=r.held;else s.bag[d.kind]+=r.held;r.held=0;}
export function lawAction(s,id,{present,transact,advance,rng}){
 const [,kind,key,choice]=id.split(':'),l=s.adventures.law,fail=t=>{s.result=[t];return false;};
 if(l.pursuit&&!['surrender','evade'].includes(kind))return fail('先处理眼前追责：投案、短期拘押或冒险逃避。');
 if(kind==='office'){if(!office(s,15))return fail('赵捕快08:00–18:00在县衙接洽。');return transact(s,'询问赵捕快',15,0,()=>{s.result.push('亲历损失才能报案，可找证人补证；受理与追回都可能失败。主动抢夺或伤人才留追责记录，争执与原有自卫不算违法。','没钱缴罚金可接受6小时短期拘押；捕快委托有限，实际结算后才付款。');},advance);}
 if(kind==='incident'){
  if(!Object.hasOwn(INCIDENTS,key))return fail('没有这宗遭遇。');const d=INCIDENTS[key],r=l.incidents[key];
  if(s.place!==d.place||r.status!=='new'||!['yield','leave'].includes(choice))return fail('需到现场且尚未处理；这宗遭遇只发生一次。');
  if(choice==='yield'&&(d.kind==='coins'?s.coins<d.amount:s.bag[d.kind]<d.amount))return fail('没有足够自己的钱物，不会虚记损失；可拒绝并离开。');
  return transact(s,d.name,15,0,()=>{if(choice==='leave'){r.status='avoided';s.result.push('拒绝交出钱物并退开，无损失、不强迫战斗，此遭遇结束。');}else{if(d.kind==='coins')s.coins-=d.amount;else s.bag[d.kind]-=d.amount;r.status='open';r.loss=r.held=d.amount;s.result.push('受胁迫交出'+(d.kind==='coins'?'4文':'药材1份')+'退开；亲历损失已记录，可索回或去县衙报案，不保证追回。');}},advance);
 }
 if(['evidence','report','recover','private'].includes(kind)){
  if(!Object.hasOwn(INCIDENTS,key))return fail('没有这宗案件。');const d=INCIDENTS[key],r=l.incidents[key];if(!r.loss)return fail('没有新发生的实际损失，不能伪造报案或追索。');
  if(kind==='evidence'){if(r.witness||!['open','privateFailed','refused'].includes(r.status)||!present(s,d.witness,30))return fail('需证人在场，案件未结，且尚未取得证词。');return transact(s,'询问证人：'+d.name,30,0,()=>{r.witness=true;s.result.push('证人确认案发经过，证词已随案件保存；有证报案受理率80%，无证35%。');},advance);}
  if(kind==='report'){const tier=r.witness?2:1;if(!office(s,30)||!['open','privateFailed','refused'].includes(r.status)||r.reportTier>=tier)return fail('县衙08:00–18:00受理；同样证据不重复报案，无证退回后可补证重报一次。');return transact(s,'报案：'+d.name,30,0,()=>{r.reportTier=tier;r.status=rng()<(r.witness?.8:.35)?'filed':'refused';s.result.push(r.status==='filed'?'受理并登记，需另行查办，不提前发赔偿。':r.witness?'证词仍不足以确认嫌疑人，受理失败；本案不重复受理。':'仅有你的陈述，暂未受理；可找证人补证后再报。');},advance);}
  if(kind==='recover'){if(!office(s,60)||r.status!=='filed')return fail('需已受理案件，并在县衙留足1小时查办。');}
  if(kind==='private'&&(s.place!==d.place||!['open','refused'].includes(r.status)||r.reportTier===2))return fail('私下索回需在原地且尚未尝试或最终结案。');
  if((d.kind==='coins'?s.coins:s.bag[d.kind])>(d.kind==='coins'?10000000:1000000)-r.held)return fail('接收钱物超过存档上限，暂不结算。');
  return transact(s,(kind==='private'?'私下索回：':'查办：')+d.name,kind==='private'?45:60,kind==='private'?8:0,()=>{const success=rng()<(kind==='private'?.6:r.witness?.85:.5);r.status=kind==='private'?(success?'private':'privateFailed'):(success?'recovered':'unrecovered');if(success){returnLoss(s,key);s.result.push('追回本案实际被拿走的钱物，无额外补偿，不能再次领取。');}else s.result.push(kind==='private'?'对方拒不归还，时间精力已消耗；仍可取证报案。':'未找到赃物，本案查办结束；损失保留，不凭空赔钱。');},advance);
 }
 if(kind==='crime'){
  if(!Object.hasOwn(CRIMES,key))return fail('没有这种违法行动。');const d=CRIMES[key],r=l.crimes[key],p=s.npcWorld.individuals[d.victim];
  if(r.status!=='none'||!present(s,d.victim,15)||s.hp<1||key==='robbery'&&(p.coins<5||s.coins>9999995))return fail('需当事人在场且这项行动尚未发生；钱物不足不会抢夺。');
  return transact(s,d.name,15,12,()=>{const success=key==='assault'||rng()<.45;r.status=rng()<.8?'wanted':'hidden';if(key==='robbery'&&success){p.coins-=5;s.coins+=5;r.stolen=r.debt=5;}if(key==='assault'){p.injuryDays=Math.min(30,p.injuryDays+2);if(rng()<.4){s.hp=Math.max(0,s.hp-8);if(!s.hp){s.dead=true;s.pending=null;s.combat=null;}s.result.push('对方反击，气血-8；气血归零则永久死亡。');}}s.relations[d.victim]=Math.max(0,s.relations[d.victim]-8);s.result.push(key==='robbery'?(success?'抢走当事人5文，留下5文欠赔记录。':'抢夺未成，仍可能因企图被追责。'):'对方受伤休养2日，关系下降；这是主动伤人，不是争执或自卫。',r.status==='wanted'?'已被识别；到县城会被拦查。':'暂未被识别；以后进入县城或街市有70%被认出，案件不会凭空消失。');},advance);
 }
 if(kind==='surrender'){
  const ids=Object.keys(CRIMES).filter(id=>['hidden','wanted'].includes(l.crimes[id].status));if(s.place!=='county'||!ids.length||!['pay','custody'].includes(key))return fail('请到县城处理尚未结清的案件；可缴款或短期拘押。');
  const fine=ids.reduce((n,id)=>n+CRIMES[id].fine,0),debt=ids.reduce((n,id)=>n+l.crimes[id].debt,0);
  if(key==='pay'&&(s.coins<fine+debt||s.commerce.budget.market>1000000-fine||ids.some(id=>!holderCanReceive(s,id,l.crimes[id].debt))))return fail('缴款需罚金'+fine+'文及欠赔'+debt+'文，接收方须有余额空间；没钱可选择短期拘押。');
  return transact(s,key==='pay'?'投案缴款':'接受短期拘押',key==='pay'?60:360,0,()=>{for(const id of ids){const r=l.crimes[id],n=key==='pay'?r.debt:Math.min(s.coins,r.debt);if(holderCanReceive(s,id,n)){s.coins-=n;s.npcWorld.individuals[CRIMES[id].victim].coins+=n;r.debt-=n;}r.status='closed';}if(key==='pay'){s.coins-=fine;s.commerce.budget.market+=fine;}l.pursuit=false;s.result.push(key==='pay'?'罚金进入现有县城资金，赔款交还当事人；处罚结清，历史保留。':'游戏时间推进6小时，无现实等待，不恢复气血精力；现有钱优先赔偿，未赔足另留欠赔记录，处罚已结清。');},advance);
 }
 if(kind==='repay'){
  if(!Object.hasOwn(CRIMES,key))return fail('没有这宗欠赔。');const r=l.crimes[key],d=CRIMES[key];if(r.status!=='closed'||!r.debt||!present(s,d.victim,15)||s.coins<r.debt||!holderCanReceive(s,key,r.debt))return fail('需处罚已结清、还有欠赔，当事人在场且自己钱够；不强制自动扣款。');return transact(s,'偿还欠赔',15,0,()=>{s.coins-=r.debt;s.npcWorld.individuals[d.victim].coins+=r.debt;r.debt=0;s.result.push('实际赔款交还当事人，不抹掉违法记录。');},advance);
 }
 if(kind==='evade'){
  const ids=wanted(s);if(!l.pursuit||!ids.length||ids.some(id=>l.crimes[id].escaped))return fail('需正被拦查且尚未尝试逃避；每批案件只尝试一次。');
  return transact(s,'逃避拦查',30,8,()=>{for(const id of ids)l.crimes[id].escaped=true;if(rng()<.4){l.pursuit=false;s.result.push('暂时脱开拦查，可以离开；追责记录保留，再进县城仍会被拦。');}else{s.hp=Math.max(0,s.hp-6);if(!s.hp)s.dead=true;s.result.push('逃避失败，损失6气血；仍需投案或短期拘押，气血归零则永久死亡。');}},advance);
 }
 if(kind==='job'){
  if(!Object.hasOwn(POLICE_JOBS,key))return fail('没有这项捕快委托。');const d=POLICE_JOBS[key],r=l.jobs[key];
  if(choice==='accept'){if(!office(s,15)||wanted(s).length||r.status!=='none'||Object.values(l.jobs).some(x=>x.status==='active'))return fail('请在县衙办公时领取，先结清已识别案件；同时只接一项，每项只结算一次。');return transact(s,'领取：'+d.name,15,0,()=>{r.status='active';r.acceptedDay=s.day;r.dueDay=s.day+3;s.result.push(d.description,'截止第'+r.dueDay+'日，报酬来自现有县城资金，不提前支付。');},advance);}
  if(r.status!=='active')return fail('委托未领取、已到期或已处理。');
  if(choice==='withdraw')return transact(s,'撤回捕快委托',0,0,()=>{r.status='withdrawn';s.result.push('无报酬、无罚款，本项结束。');},advance);
  if(choice==='finish'){const destination=key==='escort'?'liuxi':'county';if(s.place!==destination||r.step!==1||key!=='escort'&&!office(s,15)||key==='escort'&&(s.minute<480||s.minute+15>1080)||s.commerce.budget.market<d.reward||s.coins>10000000-d.reward)return fail('需完成实际步骤并到交接处，留足15分钟且县城现有资金充足；未结算不发奖。');return transact(s,'完成：'+d.name,15,0,()=>{r.status='done';s.commerce.budget.market-=d.reward;s.coins+=d.reward;s.result.push('支付'+d.reward+'文来自现有县城资金，只结算一次。');},advance);}
  if(r.step!==0)return fail('步骤已经完成，请到交接处结算。');
  if(key==='witness'&&choice==='ask'&&present(s,'farmer',30))return transact(s,'查访问证',30,6,()=>{if(rng()<.75){r.step=1;s.result.push('陈农户愿意作证，可回县衙交代。');}else{r.status='failed';s.result.push('陈农户不愿作证，查访失败，无报酬。');}},advance);
  if(key==='lost'&&choice==='search'&&s.place==='bamboo')return transact(s,'搜寻遗失公文',45,10,()=>{if(rng()<.65){r.step=1;s.result.push('找到封存公文，不能买卖；回县衙交回。');}else{r.status='failed';s.result.push('没找到公文，时间精力已耗，无报酬。');}},advance);
  if(key==='escort'&&['safe','quick'].includes(choice)&&s.place==='ferry')return transact(s,'协助护送证人',choice==='safe'?45:15,choice==='safe'?8:12,()=>{r.step=1;if(choice==='quick'&&rng()<.3){s.hp=Math.max(0,s.hp-8);if(!s.hp){s.dead=true;r.status='failed';}s.result.push('近路擦伤，气血-8；可能永久死亡。');}s.result.push('前往柳溪集交接，无强迫战斗。');},advance);
  return fail('地点、接洽时间或委托步骤不符。');
 }
 return fail('没有这项治安行动。');
}
export function lawOptions(s){const l=s.adventures.law,out=[],add=(id,label,preview)=>out.push({id:'law:'+id,label,preview});
 const activeCrimes=Object.keys(CRIMES).filter(id=>['hidden','wanted'].includes(l.crimes[id].status));
 if(s.place==='county'&&activeCrimes.length){const fine=activeCrimes.reduce((n,id)=>n+CRIMES[id].fine,0),debt=activeCrimes.reduce((n,id)=>n+l.crimes[id].debt,0);add('surrender:pay','投案 · 缴罚金与赔款','1小时；罚金'+fine+'文、欠赔'+debt+'文，实际转移钱款，保留历史。');add('surrender:custody','投案 · 短期拘押','游戏时间6小时，无现实等待；不恢复气血精力，已有钱先赔偿，没钱仍可结清处罚。');if(l.pursuit&&!activeCrimes.some(id=>l.crimes[id].escaped))add('evade','冒险逃避拦查','30分钟/精力8，40%暂时脱开；失败损失6气血可能死亡；案件保留，每批只试一次。');if(l.pursuit)return out;}
 for(const [id,d] of Object.entries(INCIDENTS)){const r=l.incidents[id];if(s.place===d.place&&r.status==='new'){add('incident:'+id+':yield','受胁迫交出钱物 · '+d.name,'15分钟，实际失去'+(d.kind==='coins'?'4文':'自己的药材1份')+'；留下亲历记录，可索回或报案，不保证追回。');add('incident:'+id+':leave','拒绝并退开 · '+d.name,'15分钟，无损失或战斗，此遭遇结束。');}if(r.loss&&['open','privateFailed','refused'].includes(r.status)){if(!r.witness&&s.place===(d.witness==='boatman'?'dock':'market'))add('evidence:'+id,'询问证人 · '+d.name,'30分钟，证人须在场；证词随存档保留。');if(s.place==='county'&&r.reportTier<(r.witness?2:1))add('report:'+id,'报案 · '+d.name,'08:00–18:00；30分钟；受理率'+(r.witness?'80%':'35%')+'；不保证追回，无证退回可补证重报一次。');}if(s.place===d.place&&['open','refused'].includes(r.status)&&r.reportTier<2)add('private:'+id,'私下索回 · '+d.name,'45分钟/精力8；60%追回实际损失，失败可取证报案，不能重复索取。');if(s.place==='county'&&r.status==='filed')add('recover:'+id,'查办已受理案件 · '+d.name,'1小时；'+(r.witness?'85%':'50%')+'追回原钱物；失败保留损失，只查办一次，不凭空赔偿。');}
 for(const [id,d] of Object.entries(CRIMES)){const r=l.crimes[id];if(s.place===d.place&&r.status==='none')add('crime:'+id,'违法选择 · '+d.name,'15分钟/精力12；'+(id==='robbery'?'45%抢到对方5文':'对方受伤休养2日，40%反击损失8气血可能死亡')+'；80%当场识别；罚金'+d.fine+'文'+(id==='robbery'?'并偿还赃款':'')+'，逃避失败有伤亡风险；只发生一次。');if(r.status==='closed'&&r.debt&&s.place===d.place)add('repay:'+id,'补偿当事人 · '+d.name,'15分钟，付剩余欠赔'+r.debt+'文，钱须真实持有，不清除违法记录。');}
 for(const [id,d] of Object.entries(POLICE_JOBS)){const r=l.jobs[id];if(s.place==='county'&&r.status==='none')add('job:'+id+':accept','捕快委托 · '+d.name,d.description+' 县衙08:00–18:00，不能同时接多项。');if(r.status!=='active')continue;add('job:'+id+':withdraw','撤回 · '+d.name,'无报酬无罚款，每项有限，不重复领取。');if(!r.step){if(id==='witness'&&s.place==='fields')add('job:witness:ask','查访 · 陈农户','30分钟/精力6，75%愿作证，失败无报酬。');if(id==='lost'&&s.place==='bamboo')add('job:lost:search','搜寻 · 遗失公文','45分钟/精力10，65%找到，失败无报酬，不能出售。');if(id==='escort'&&s.place==='ferry'){add('job:escort:safe','证人护送 · 稳妥步道','45分钟/精力8，无路段擦伤。');add('job:escort:quick','证人护送 · 冒险近路','15分钟/精力12，30%损失8气血可能死亡。');}}if(r.step&&s.place===(id==='escort'?'liuxi':'county'))add('job:'+id+':finish','交接 · '+d.name,'15分钟，报酬'+d.reward+'文来自现有县城资金；截止第'+r.dueDay+'日，只结算一次。');}
 return out;
}
const caseNames={new:'未发生',avoided:'已退开，无损失',open:'损失未处理',privateFailed:'索回失败，可报案',private:'私下追回',refused:'报案未受理',filed:'已受理，待查办',recovered:'官府追回',unrecovered:'未追回，损失保留'};
export function lawSummary(s){const l=s.adventures.law;return ['县衙：赵捕快08:00–18:00接洽；争执与原有自卫不算主动违法。'+(l.pursuit?'当前被拦查，请先处理案件。':''),...Object.entries(INCIDENTS).map(([id,d])=>d.name+'：'+caseNames[l.incidents[id].status]+'；'+(l.incidents[id].witness?'已有证词':'无证词')+'。'),...Object.entries(CRIMES).map(([id,d])=>d.name+'：'+({none:'未发生',hidden:'尚未识别，有追责风险',wanted:'待追责',closed:'处罚结清，记录保留'}[l.crimes[id].status])+'；欠赔'+l.crimes[id].debt+'文。'),...Object.entries(POLICE_JOBS).map(([id,d])=>d.name+'：'+({none:'未领取',active:'进行中，截止第'+l.jobs[id].dueDay+'日',done:'已完成',failed:'未完成',withdrawn:'已撤回'}[l.jobs[id].status])+'。')];}
