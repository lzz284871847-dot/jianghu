import {forestTasks} from './forest-contracts.js?v=5.34.0';
import {ASSESSMENTS,assessmentBlocker,assessmentSummary} from './assessments.js?v=5.34.0';
import {fortSummary} from './fort.js?v=5.34.0';
import {raidSummary} from './raid.js?v=5.34.0';
import {dungeonSummary} from './dungeon.js?v=5.34.0';
import {cultureTasks} from './culture.js?v=5.34.0';
import {professionalTasks} from './professionals.js?v=5.34.0';
import {countyLifeTasks} from './county-life.js?v=5.34.0';
import {SPOILS} from './spoils.js?v=5.34.0';
import {COOPERATIONS,companionSummary} from './companions.js?v=5.34.0';
import {places,people,markets,items} from './content.js?v=5.34.0';
import {QUESTS} from './adventure-data.js?v=5.34.0';
import {BUSINESSES,businessFarmProfile} from './business.js?v=5.34.0';
import {CRAFTS,craftBlocker,craftPlan} from './crafts.js?v=5.34.0';
import {EQUIPMENT,artisanRecipeKnown} from './equipment.js?v=5.34.0';
import {marketPrice} from './commerce.js?v=5.34.0';
import {districtStatus} from './society.js?v=5.34.0';
import {OUTINGS} from './outings.js?v=5.34.0';
import {MENTOR_TASKS} from './player-mentor.js?v=5.34.0';
import {POLICE_JOBS} from './law.js?v=5.34.0';
import {THREADS,threadEligible,goalProgress} from './threads.js?v=5.34.0';
// A read-only projection of existing save data. Never enrolls, settles, or moves a player.
export function nextRoad(s,to){if(s.place===to)return null;const queue=[[s.place]],seen=new Set();while(queue.length){const path=queue.shift(),last=path.at(-1);if(last===to)return path[1];if(seen.has(last))continue;seen.add(last);for(const p of places[last].routes)queue.push([...path,p]);}return null;}
const materialBlock=(s,input)=>Object.entries(input).filter(([k,n])=>s.bag[k]<n).map(([k,n])=>'缺'+items[k]+(n-s.bag[k])+'份').join('；');
function contactBlock(s,id,minutes=15){const p=s.npcWorld.individuals[id],d=people[id]??{place:p?.home,open:480,close:1080};const j=s.npcWorld.journeys.records[id];if(!p||!people[id]&&p.place!==d.place||p.life.deathDay||p.life.sickDays||p.injuryDays||p.life.restDay===s.day||j&&(j.departedDay>j.returnedDay||j.returnedDay===s.day))return '接洽人今日无法办事，改日再来；已完成成果仍保留。';if(s.minute<d.open||s.minute+minutes>d.close)return '营业时段'+Math.floor(d.open/60)+'—'+Math.floor(d.close/60)+'时，须留足作业时间。';return '';}
export function handbook(s){const a=s.adventures,cards=[];const add=(title,place,next,due=0,goods='',blocker='',group='quests')=>cards.push({title,place,next,due,goods,blocker,group,road:nextRoad(s,place)});
 for(const c of forestTasks(s))add(c.title,c.place,c.next,c.due,c.goods,'',c.group);
 for(const [id,d] of Object.entries(ASSESSMENTS)){const r=s.assessments.records[id];if(!r.attempts||r.lessonArt)continue;add(d.name,d.place,r.wins?'选用合适的已学武艺，领取一次付费专题授艺。':'恢复后改日再约；认输及未获认可的耗费保留。',0,assessmentSummary(s).find(t=>t.startsWith(d.name)),assessmentBlocker(s,id,r.wins?'lesson':'start')||'','assessments');}
 if(s.fort.status==='active')add('荒山旧堡','oldroad','处理机关、选择一条奖励支路并带出；可承担风险撤回。',0,fortSummary(s),'','fort');
 if(['ready','active','claim'].includes(s.raid.status))add('山中匪寨',s.raid.status==='claim'?'market':'oldroad',s.raid.status==='ready'?'到山间旧道进入副本，可先在竹林邀猎户。':s.raid.status==='active'?'继续当前场景或承担风险撤回；交手中先决定战术。':'向柳掌柜交代实际带出的成果，钱款或容量不足保留。',0,raidSummary(s),'','raid');
 if(s.dungeon.status==='active')add('废弃矿道','mine','继续当前场景，或零精力紧急撤回洞口。',0,dungeonSummary(s),'','dungeon');
 for(const [id,d] of Object.entries(CRAFTS)){if(!d.recipeOrder||!artisanRecipeKnown(s,id))continue;const own=Object.hasOwn(s.equipment.owned,id),damaged=own&&s.equipment.owned[id]<EQUIPMENT[id].durability;if(own&&!damaged)continue;const kind=damaged?'repair':'make',p=craftPlan(s,id,kind);add('独有配方 · '+p.name,'workshop',damaged?'备好材料，在作坊自行修理。':'备好材料，在作坊亲手制作；完成后需主动穿戴。',0,EQUIPMENT[id].use+' '+Object.entries(p.input).map(([k,n])=>items[k]+'×'+n).join('、')+'；台位费'+p.fee+'文。',craftBlocker(s,id,kind)||'','craft');}
 for(const c of cultureTasks(s))add(c.title,c.place,c.next,c.due,c.goods,c.blocker,'culture');
 for(const c of professionalTasks(s))add(c.title,c.place,c.next,c.due,c.goods,c.blocker,c.group||'professionals');
 if(s.dead)add('人生已结束',s.place,'永久死亡；可导出记录或另建普通人。没有继续行动或自动读档。',0,'','','');
 else if(a.law.pursuit)add('县城拦查','county','先投案、接受六小时游戏拘押，或承担逃避风险。',0,'没钱仍可接受拘押。','','law');
 if(a.outings.records.lost.outcome==='lost')add('林间脱困','foot','使用脱困返回，零精力仍能走回原路。',0,'不回血、不瞬移。','','outings');
 if(a.quest){const q=a.quest,d=QUESTS[q.id],place=q.id==='parcel'&&!q.stage?'bamboo':q.id==='escort'?(q.stage?'liuxi':'ferry'):q.id==='rescue'&&!q.stage?'hill':d.from;const next=q.id==='medicine'?'备药材2份，向医者交付':q.id==='parcel'?q.stage?'交还找到的货包':'搜寻失落货包':q.id==='escort'?q.stage?'向魏婶交接':'选择稳妥或近路':q.stage?'回村交代救援':'携药材1份救助';add(d.name,place,next,q.dueDay,'没有预付报酬；可撤回，已花耗不退。',q.id==='medicine'?materialBlock(s,{herb:2}):q.id==='rescue'&&!q.stage?materialBlock(s,{herb:1}):'', 'quests');}
 for(const [id,d] of Object.entries(BUSINESSES)){const r=a.business.records[id];if(r.status==='failed'&&r.cargo){add(d.name,s.place,'腾出背包空间，领取留存货物。',0,'留存货物'+r.cargo+'份。','','business');continue;}if(r.status!=='active')continue;let place=d.place,next='',blocker='',goods='投入估值'+r.cost+'文；留存货物'+r.cargo+'份；尚未收款。';
 if(d.kind==='farm'){const p=businessFarmProfile(d);place=r.step?(s.place==='fields'?'fields':'market'):'fields';next=r.step?'可在田地自留收成，或按街市当前收购价供货。':s.day<r.accepted+p.mature?'照看小畦；第'+(r.accepted+p.mature)+'日起可收获。':'白天照看、收获；随后自留或街市供货。';if(!r.step&&s.day<r.accepted+p.mature)blocker='尚未满'+({2:'两个',3:'三个',4:'四个'}[p.mature])+'游戏日，可做别的工作，不需现实等待。';if(s.minute<360||s.minute+(r.step?15:60)>1080)blocker+='田间作业需6—18时。';if(s.energy<(r.step?1:12))blocker+='精力不足。';}
 else if(d.kind==='smith'){const eq=['wood_staff','iron_sword','steel_blade'][d.t],item=EQUIPMENT[eq];next='打造'+item.name+'，完好且卸下后交给许铁匠。';blocker=s.equipment.owned[eq]!==item.durability?'尚缺指定完好装备；查看作坊打造材料与门槛。':Object.values(s.equipment.equipped).includes(eq)?'请先卸下交付装备。':contactBlock(s,'smith');if(s.npcWorld.individuals.smith.coins<[7,30,110][d.t]+(s.equipment.quality[eq]===2?[3,8,20][d.t]:0))blocker+='付款人现有余额不足。';}
 else if(d.kind==='clinic'){next=r.step===2?'向医者验收药包，等待实际付款。':'医者指导下配药，随后交付。';blocker=contactBlock(s,'doctor',r.step===2?15:60+30*d.t);if(s.npcWorld.clinic.holder!=='doctor')blocker+='沈医者不主持诊所，暂停此项。';if(!r.step){blocker+=materialBlock(s,{herb:2+d.t,wood:1});if(s.coins<d.t+1)blocker+='缺耗材费'+(d.t+1)+'文。';if(s.energy<12+4*d.t)blocker+='精力不足。';}else if(s.npcWorld.individuals.doctor.coins<[15,23,32][d.t])blocker+='医者现有资金不足，药包保留。';}
 else {place='liuxi';next=r.step?'按当前收购价结算；缺钱付款时保留货物，也可撤回自行出售。':'到柳溪查验一次货物，再结算。';goods+=' 当前收购单价'+marketPrice(s,'liuxi','sell','herb')+'文。';}
 if(['market','liuxi'].includes(place)){const m=markets[place];if(districtStatus(s,place).closed)blocker+='商铺暂时歇业。';else if(s.minute<m.open||s.minute+15>m.close)blocker+='商铺需8—'+Math.floor(m.close/60)+'时营业。';if(d.kind==='farm'&&r.step||d.kind==='merchant'&&r.step){const key=d.kind==='farm'?businessFarmProfile(d).item:'herb',price=marketPrice(s,place,'sell',key),pay=r.cargo*price+(d.kind==='merchant'&&r.cargo?[2,5,10][d.t]:0);if(s.commerce.budget[place]<pay)blocker+='买方现有资金不足，成果保留。';if(s.commerce.stock[place][key]+r.cargo>30)blocker+='买方收购容量不足。';}}
 add(d.name,place,next,r.due,goods,blocker,'business');}
 const m=a.mentor;if(m.active){const place=m.stage?'school':m.active==='delivery'?'workshop':m.active==='inquiry'?'bamboo':'school';add(MENTOR_TASKS[m.active].name,place,m.stage?'向师傅交代，付款不足保留成果。':MENTOR_TASKS[m.active].description,m.dueDay,'已交材料不退，实际切磋才计参与。','','mentor');}
 for(const [id,r] of Object.entries(a.law.jobs))if(r.status==='active'){const place=r.step?(id==='escort'?'liuxi':'county'):id==='witness'?'fields':id==='lost'?'bamboo':'ferry';add(POLICE_JOBS[id].name,place,r.step?'实际交代后付款。':POLICE_JOBS[id].description,r.dueDay,'不预付报酬；可撤回。','','law');}
 for(const [id,r] of Object.entries(a.outings.records))if(r.outcome==='claim'){const d=OUTINGS[id],place=id==='traps'?'bamboo':people[d.holder]?.place??'workshop';add(d.name,place,'找接洽人交代，领取实际余额内的报酬。',0,'成果已完成，付款不足仍保留。','','outings');}
 for(const [id,d] of Object.entries(THREADS)){const r=a.threads.records[id];if(r.status==='new'&&threadEligible(s,id))add(d.name,d.place,'可选机会：'+d.description,0,'未领取，不计截止期限；可忽略。','','threads');else if(['active','claim'].includes(r.status)){const place=id==='escort'?(r.step?'liuxi':'ferry'):id==='testimony'&&r.status==='active'?'road':d.place;const next=r.status==='claim'||id==='escort'&&r.step?'向接洽人交代实际成果。':id==='escort'?'经过旧渡口选择稳妥或近路。':'到官道核对现场。';const cash=d.payer==='public'?s.commerce.budget.market:s.npcWorld.individuals[d.payer].coins;add(d.name,place,next,r.dueDay,'留存自己的干粮'+r.cargo+'份；付款'+d.reward+'文。',r.status==='claim'&&cash<d.reward?'付款人实际余额不足，成果保留。':'','threads');}else if(r.status==='failed'&&r.cargo)add(d.name,s.place,'腾出背包空间，领回留存干粮。',0,'自己的干粮'+r.cargo+'份，无额外奖励。','','threads');}
 for(const [id,d] of Object.entries(COOPERATIONS)){const r=a.companions.records[id];if(['open','ready'].includes(r.status)){const place=r.status==='ready'?d.claim:d.site,next=r.status==='ready'?'按真实分帐交代成果。':r.conflict==='hurt'?'照料同伴轻伤，或结束同行后独行。':r.prepared?'按准备路线实际作业；可撤回。':r.joined?'到现场商量合作分歧。':'同伴离队，仍可独行准备、作业或撤回。';add(d.name,place,next,0,'NPC已消耗精力'+r.npcSpent+'；邀请工钱'+r.fee+'文；'+(r.joined?'同行至今天'+Math.floor(r.until%1440/60)+':'+String(r.until%60).padStart(2,'0')+'，一次一人。':'同伴已离队，返程期间暂停接洽。'),'','companions');}}
 for(const [id,d] of Object.entries(SPOILS)){const r=a.spoils.records[id];if(r.state==='sealed')continue;if(r.coins||r.gear||Object.values(r.goods).some(Boolean))add(d.name,s.place,'打开留存钱物，分别拾取；同名装备冲突时旧物保留。',0,'铜钱'+r.coins+'文，装备'+(r.gear?EQUIPMENT[r.gear.id].name:'已取')+'，不自动穿戴。','','spoils');if(r.stolen.status==='held')add('有主失物 · '+d.name,r.stolen.identified?people[d.owner].place:'county','辨认后归还原主，或去县衙代还；明知留下会影响关系。',0,'实际失物独立留存，不混入可卖背包。','','spoils');if(r.stolen.status==='kept')add('补还失物 · '+d.name,'county','备原数钱物和2文转交费，向县衙补还；不清除已有案件。',0,'欠还'+r.stolen.value+(d.kind==='coins'?'文':'份干粮')+'。','','spoils');}
 for(const task of countyLifeTasks(s))add(task.title,task.place,task.next,task.due,task.goods,task.blocker??'',task.group);
 const critical=['人生已结束','县城拦查','林间脱困'];cards.sort((x,y)=>Number(critical.includes(y.title))-Number(critical.includes(x.title))||(x.due||Infinity)-(y.due||Infinity));return {goal:goalProgress(s),cards};}
