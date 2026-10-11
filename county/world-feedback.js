// Finite local responses and events; no repeating daily or lifetime simulation.
export const EVENTS={
 ferry:{name:'旧渡口修栈道',place:'dock',holder:'boatman',offset:1,days:2,description:'栈道受阻期间进出旧渡口多走15分钟；到青石码头找船家接洽。可交木料2份修补（45分钟/精力10）；熟手搬运可改用90分钟/精力20实际劳作。支付8文来自船家余额。'},
 market:{name:'赶集备货',place:'workshop',holder:'smith',offset:3,days:2,description:'交铁料2份、作业1小时/精力10，支付18文来自铁匠余额；作坊熟手可用铁料1份并花90分钟/精力16精加工。'},
 bout:{name:'武馆公开切磋',place:'school',holder:'master',offset:5,days:2,description:'使用已学拳掌实际陪练，准备30分钟，正常收费与收手线；至少交手3回合记为参与。武馆成员取得1点贡献；提前停止也留记录，无实战胜利或钱物奖励。'}
};
export const makeFeedback=day=>({startDay:day,followups:{},events:{}});
const followups={doctor:{place:'village',quest:'medicine',name:'诊所的后话'},merchant:{place:'market',quest:'parcel',name:'失物的后话'},boatman:{place:'dock',quest:'escort',name:'护送的后话'}};
const statuses=['joined','ignored','withdrew','entered'];
export function feedbackValid(s){const f=s.adventures.feedback,obj=x=>x&&typeof x==='object'&&!Array.isArray(x);return obj(f)&&Object.keys(f).length===3&&Number.isSafeInteger(f.startDay)&&f.startDay>=1&&f.startDay<=s.day&&obj(f.followups)&&Object.entries(f.followups).every(([k,v])=>followups[k]&&['helped','explained','declined'].includes(v)&&(s.adventures.done.includes(followups[k].quest)||s.adventures.failed.includes(followups[k].quest))&&(v!=='helped'||s.adventures.done.includes(followups[k].quest)))&&obj(f.events)&&Object.entries(f.events).every(([k,v])=>EVENTS[k]&&statuses.includes(v)&&(v!=='withdrew'||k==='bout')&&(v!=='entered'||k==='bout'&&s.combat?.practice===true)&&(s.day>=f.startDay+EVENTS[k].offset)&&(v!=='ignored'||s.day>f.startDay+EVENTS[k].offset+EVENTS[k].days));}
export const eventOpen=(s,id)=>{const d=EVENTS[id],f=s.adventures.feedback;return d&&!f.events[id]&&s.day>=f.startDay+d.offset&&s.day<=f.startDay+d.offset+d.days;};
export function expireFeedback(s){const f=s.adventures?.feedback;if(!f)return;for(const [id,d] of Object.entries(EVENTS))if(!f.events[id]&&s.day>f.startDay+d.offset+d.days){f.events[id]='ignored';s.news.unshift(d.name+'已结束：乡邻自行收尾，你未参与，无罚款。');s.news.length=Math.min(20,s.news.length);}}
export const ferryDelay=(s,to)=>eventOpen(s,'ferry')&&(to==='ferry'||s.place==='ferry')?15:0;
export function finishFeedbackBout(s,c,log){const f=s.adventures?.feedback;if(!c.practice||f?.events.bout!=='entered')return;f.events.bout=c.round>=3?'joined':'withdrew';if(c.round>=3&&s.adventures.org.id==='school'){s.adventures.org.rep.school=Math.min(100,s.adventures.org.rep.school+1);log.push('作为武馆成员完成公开切磋，贡献 +1。');}log.push(c.round>=3?'公开切磋留下了实际参与记录。':'提前收手，公开切磋记录为退出，不发贡献。');}
export function feedbackAction(s,id,{present,transact,advance}){
 const f=s.adventures.feedback,[kind,key,choice]=id.split(':'),fail=t=>{s.result=[t];return false;};
 if(kind==='followup'){
  const d=followups[key],done=s.adventures.done.includes(d?.quest),failed=s.adventures.failed.includes(d?.quest);
  if(!d||f.followups[key]||!done&&!failed||!present(s,key,30)||!['help','explain','decline'].includes(choice)||choice==='help'&&!done)return fail('请在当事人在场时处理一次后续；只有成功帮忙后才开放进一步合作。');
  const herb=key==='doctor'&&s.adventures.career.herb,materials=key==='doctor'?{herb:herb?1:2}:key==='merchant'?{wood:1}:{},minutes=choice==='help'?(key==='boatman'?60:herb?60:30):15,energy=choice==='help'?10:0;
  if(!present(s,key,minutes))return fail('今日剩余接洽时间不足。');
  if(choice==='help'&&Object.entries(materials).some(([id,n])=>s.bag[id]<n))return fail('后续合作材料不足；不会收物或发钱。');
  const reward=choice==='help'?6:0,p=s.npcWorld.individuals[key];if(p.coins<reward||s.coins>10000000-reward)return fail('对方实际资金不足，请稍后再来。');
  return transact(s,d.name,minutes,energy,()=>{f.followups[key]=choice==='help'?'helped':choice==='explain'?'explained':'declined';if(choice==='help'){for(const [id,n] of Object.entries(materials))s.bag[id]-=n;p.coins-=reward;s.coins+=reward;s.relations[key]=Math.min(100,s.relations[key]+1);s.result.push('实际完成合作，报酬6文从当事人余额支付。');}else s.result.push(choice==='explain'?(done?'你说清帮忙的经过，对方道谢；无额外奖励。':'你解释上次未完成的原因，对方接受交代；无奖励。'):'婉拒后续，各自继续生活；无罚款。');},advance);
 }
 if(kind==='event'){
  const d=EVENTS[key];if(!eventOpen(s,key)||s.place!==d.place||!present(s,d.holder,key==='ferry'?45:60))return fail('活动尚未开始、已结束，或当事人暂不能接洽。');
  if(key==='bout')return fail('请通过公开切磋入口开始实际交手。');
  const specialist=key==='ferry'?s.adventures.career.porter:s.adventures.career.smith;
  if(!['supply','skill'].includes(choice)||choice==='skill'&&!specialist)return fail('这个处理方式需要对应职业验收。');
  const minutes=choice==='skill'?90:key==='ferry'?45:60,energy=choice==='skill'?(key==='ferry'?20:16):10,materials=key==='ferry'?(choice==='skill'?{}:{wood:2}):{iron:choice==='skill'?1:2},reward=key==='ferry'?8:18,p=s.npcWorld.individuals[d.holder];
  if(!present(s,d.holder,minutes)||Object.entries(materials).some(([id,n])=>s.bag[id]<n)||p.coins<reward||s.coins>10000000-reward)return fail('需足够材料、实际付款资金与剩余工作时间；尚未结算。');
  return transact(s,'参与：'+d.name,minutes,energy,()=>{for(const [id,n] of Object.entries(materials))s.bag[id]-=n;p.coins-=reward;s.coins+=reward;f.events[key]='joined';s.relations[d.holder]=Math.min(100,s.relations[d.holder]+1);s.result.push('完成实际作业，报酬'+reward+'文；本活动只结算一次。',key==='ferry'?'栈道修好，进出渡口不再绕行。':'赶集备货已交付。');},advance);
 }
 return fail('没有这项后续。');
}
export function feedbackOptions(s){const f=s.adventures.feedback,out=[],add=(id,label,preview)=>out.push({id,label,preview});
 for(const [id,d] of Object.entries(followups))if(s.place===d.place&&!f.followups[id]&&(s.adventures.done.includes(d.quest)||s.adventures.failed.includes(d.quest))){if(s.adventures.done.includes(d.quest))add('followup:'+id+':help','后续合作 · '+d.name,id==='doctor'?(s.adventures.career.herb?'采药帮手：药材1份，1小时/精力10，报酬6文。':'药材2份，30分钟/精力10，报酬6文；采药帮手可用1份并花1小时配药。'):id==='merchant'?'用木料1份整理货架，30分钟/精力10，报酬6文。':'帮忙整理船具，1小时/精力10，报酬6文。');add('followup:'+id+':explain','说清经过 · '+d.name,'15分钟，无奖励；成功、失约都有对应回应，只处理一次。');add('followup:'+id+':decline','婉拒后续 · '+d.name,'15分钟，无奖励或罚款。');}
 for(const [id,d] of Object.entries(EVENTS))if(s.place===d.place&&eventOpen(s,id)){add('event:'+id+':'+(id==='bout'?'start':'supply'),'县境事件 · '+d.name,d.description);if(id==='ferry'&&s.adventures.career.porter||id==='market'&&s.adventures.career.smith)add('event:'+id+':skill','职业处理 · '+d.name,d.description);}
 return out;
}
export function feedbackSummary(s){const f=s.adventures.feedback;return Object.entries(EVENTS).map(([id,d])=>{const begin=f.startDay+d.offset,end=begin+d.days,status=f.events[id];return d.name+' · 第'+begin+'—'+end+'日 · '+(status==='joined'?'已参与':status==='ignored'?'未参与，乡邻自行收尾':status==='withdrew'?'提前退出':status==='entered'?'正在交手':s.day<begin?'预告':s.day<=end?'开放中':'已结束')+' · '+d.description;});}
export function feedbackDialogue(s,id){const v=s.adventures.feedback.followups[id];return v==='helped'?'后续合作已结清，对方记得你的实际帮助。':v==='explained'?'你已说清经过，这件事有了交代。':v==='declined'?'你婉拒了后续，对方不会继续催办。':null;}
