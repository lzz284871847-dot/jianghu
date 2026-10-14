import {fortOptions} from './fort.js?v=5.29.1';
import {raidOptions,raidSummary} from './raid.js?v=5.29.1';
import {present} from './adventures.js?v=5.29.1';
import {dungeonOptions,dungeonSummary} from './dungeon.js?v=5.29.1';
import {cultureOptions} from './culture.js?v=5.29.1';
import {professionalOptions} from './professionals.js?v=5.29.1';
import {civicOptions} from './civic.js?v=5.29.1';
import {kitchenOptions} from './kitchen.js?v=5.29.1';
import {fieldOptions,fieldChance} from './field-skills.js?v=5.29.1';
import {mentorParcelChance} from './player-mentor.js?v=5.29.1';
import {craftOptions} from './crafts.js?v=5.29.1';
import {mobilityOptions} from './mobility.js?v=5.29.1';
import {medicineOptions} from './medicine.js?v=5.29.1';
import {countyLifeOptions,countyLifeSummary} from './county-life.js?v=5.29.1';
import {spoilOptions,spoilSummary} from './spoils.js?v=5.29.1';
import {companionOptions,companionSummary} from './companions.js?v=5.29.1';
import {threadOptions} from './threads.js?v=5.29.1';
import {businessOptions,businessSummary} from './business.js?v=5.29.1';
import {outingOptions,outingSummary} from './outings.js?v=5.29.1';
import {lawOptions,lawSummary} from './law.js?v=5.29.1';
import {factionOptions,factionSummary,factionHostile,factionFriendly} from './factions.js?v=5.29.1';
import {playerMentorOptions,playerMentorSummary} from './player-mentor.js?v=5.29.1';
import {TRIALS,trialPreview,trialSummary} from './trials.js?v=5.29.1';
import {explorationOptions,explorationSummary,explorationPlan} from './exploration.js?v=5.29.1';
import {feedbackOptions,feedbackSummary} from './world-feedback.js?v=5.29.1';
import {QUESTS,SITES,ORGANIZATIONS,CAREERS} from './adventure-data.js?v=5.29.1';
import {nextMilestone} from './adventures.js?v=5.29.1';
import {places,items} from './content.js?v=5.29.1';
export function activityOptions(s){
 if(s.fort.status==='active')return fortOptions(s);
 if(s.raid.status==='active')return raidOptions(s,present);
 if(s.dungeon.status==='active')return dungeonOptions(s);
 const a=s.adventures,out=[...fortOptions(s),...raidOptions(s,present),...dungeonOptions(s),...cultureOptions(s),...professionalOptions(s),...civicOptions(s),...kitchenOptions(s),...fieldOptions(s),...craftOptions(s),...medicineOptions(s),...mobilityOptions(s)],add=(id,label,preview)=>out.push({id,label,preview});
 if(a.law.pursuit)return lawOptions(s);
 for(const [id,d] of Object.entries(QUESTS))if(s.place===d.from&&!a.done.includes(id)&&!a.failed.includes(id)&&!a.quest)add('quest:'+id,'领取 · '+d.name,d.description);
 for(const id of a.failed)if(id!=='parcel'&&s.place===QUESTS[id].from&&!a.quest)add('retry:'+id,'重新约定 · '+QUESTS[id].name,'失败、撤回或逾期后可重新完成；不提前发奖，已成功委托不重复。');
 if(a.quest){const q=a.quest,d=QUESTS[q.id];add('withdraw','撤回当前委托','无罚款，无报酬；药材、护送和救援可回领取处重新约定，失物不重复。');
  if(q.id==='parcel'&&!q.stage&&s.place==='bamboo')add('questStep:search','搜寻失落货包','1小时 / 精力12，'+Math.round(fieldChance(s,'tracking',mentorParcelChance(s))*100)+'%找回；未找到则委托结束。');
  if(q.id==='escort'&&!q.stage&&s.place==='ferry'){add('questStep:safe','护送 · 稳妥步道','45分钟 / 精力8，不发生路线擦伤。');add('questStep:quick','护送 · 抄近路','15分钟 / 精力12，30%擦伤8气血，可能死亡。');}
  if(q.id==='rescue'&&!q.stage&&s.place==='hill')add('questStep:help','救助采药人','1小时 / 精力16，消耗药材1份；70%成功，失败擦伤8气血。');
  if(s.place===(q.id==='escort'?'liuxi':d.from)&&(q.id==='medicine'||q.stage===1))add('deliver','交付 · '+d.name,'完成后领取'+d.reward+'文；须付款人实际余额充足，不重复发奖。');
 }
 const site=SITES[s.place];if(site&&!a.sites[s.place]){const p=explorationPlan(s,s.place,'standard');add('explore:'+s.place,'搜寻 · '+site.name,Object.entries(site.goods).map(([k,n])=>items[k]+'×'+n).join('、')+'；'+p.minutes+'分钟 / 精力'+p.energy+'；当前成功率'+Math.round(p.chance*100)+'%，'+Math.round(p.risk*100)+'%擦伤'+p.damage+'气血。仅一次，可不参与。'+(s.place==='mine'?'需矿镐。':''));}
 for(const [id,d] of Object.entries(ORGANIZATIONS))if(s.place===d.place&&a.org.id==='none')add('join:'+id,'加入 · '+d.name,d.description+(factionHostile(s,id)?' 当前交恶，先赔礼恢复接洽。':'')+' 退出无罚款，会费不退，贡献保留。');
 if(a.org.id!=='none')add('leaveOrg','退出当前组织','会费不退，无强制任务，贡献保留。');
 if((a.org.id==='caravan'||factionFriendly(s,'caravan'))&&s.place==='market')add('memberFood',a.org.id==='caravan'?'会内购买口粮 · 3文':'会友购买口粮 · 3文','贡献2或友好立场2且未交恶后每日一次，使用柳掌柜实际余粮；不会凭空发粮。');
 for(const [id,d] of Object.entries(CAREERS))if(s.place===d.place){if(!a.career[id])add('career:'+id,'职业验收 · '+d.name,d.description+' 当前积累'+s.skills[d.skill]+'/'+d.required+'。');else add('order:'+id,'合作订单 · '+d.name,d.description);}
 if(s.place==='inn'){if(a.home.untilDay<s.day)add('rent','短租房间 · 3日12文','可选住所目标；每日一次8小时休息，恢复精力至100、气血20；期满不自动扣钱。');else if(a.home.restDay!==s.day)add('homeRest','在租房休息','8小时，已付租金，不重复收住宿费；期满不自动续租。');}
 if(s.place==='county'&&a.milestones.length<3)add('milestone','确认当前成长阶段','只核对真实条件，无隐藏加成或装备奖励；目标详情见下方。');
 if(s.place==='school')for(const [id,d] of Object.entries(TRIALS))add('trial:'+id,(a.trials.records[id].wins?'再战 · ':'挑战目标 · ')+d.name,trialPreview(s,id));
 return [...out,...countyLifeOptions(s),...spoilOptions(s),...companionOptions(s),...threadOptions(s),...businessOptions(s),...outingOptions(s),...lawOptions(s),...factionOptions(s),...explorationOptions(s),...feedbackOptions(s),...playerMentorOptions(s)];
}
export function adventureSummary(s){
 const a=s.adventures,q=a.quest,n=nextMilestone(s).n;
 const lines=[q?'当前委托：'+QUESTS[q.id].name+' · 截止第'+q.dueDay+'日 · '+(q.id==='medicine'?'携药材2份回河湾村':q.id==='parcel'?q.stage?'回县城街市交付':'到竹林搜寻':q.id==='escort'?q.stage?'到柳溪集交付':'经旧渡口选择路线':q.stage?'回河湾村交代':'携药材1份到南山坡救助'):'没有进行中的委托；县城街市、河湾村和青石码头可接洽。',
 '委托完成'+a.done.length+'条；撤回、未完成或逾期'+a.failed.length+'条；有限探索'+Object.keys(a.sites).length+'/3处。',
 '组织：'+(ORGANIZATIONS[a.org.id]?.name||'未加入')+'；武馆贡献'+a.org.rep.school+'，互助会贡献'+a.org.rep.caravan+'。完成新委托增加当前组织贡献；武馆成员完成公开切磋也可增加一次贡献。',
 '职业合作：'+(Object.entries(a.career).filter(([,v])=>v).map(([id])=>CAREERS[id].name).join('、')||'尚未验收；码头、作坊与医者处查看要求。'),
 a.home.untilDay>=s.day?'短租房间至第'+a.home.untilDay+'日，去长安客栈使用。':'尚无有效短租房间，可到长安客栈选择租住；免费借宿仍可用。'];
 lines.push(n===1?'成长第一阶段：完成任一委托，到县城确认。':n===2?'成长第二阶段：完成2条委托；武者需两门一阶武学各练习120与二阶以上完好护甲，职业路线可改用任一职业验收与短租记录。确认后开放南山救援。':n===3?'成长第三阶段：武者需两门二阶武学各练习120并真实战胜老镖师、资深教头；职业路线可选任一合作订单完成3次、处理3条委托与搜寻2处旧址。到县城确认；陪练不计胜利。':'县境成长三阶段已完成，可继续自由生活、职业合作、探索与挑战。');
 return [...lines,...countyLifeSummary(s),...spoilSummary(s),...companionSummary(s),...businessSummary(s),...outingSummary(s),...lawSummary(s),...factionSummary(s),...feedbackSummary(s),...explorationSummary(s),...trialSummary(s),...playerMentorSummary(s)];
}
