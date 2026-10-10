import {events,locations,items,skills,jobs} from './content.js?v=1.0.56';
import {gatherings,npcActivity,followups} from './continuity.js?v=1.0.56';
import {sites,siteAt} from './sites.js?v=1.0.56';
import {resources,resourceChance} from './resources.js?v=1.0.56';
import {farmActions,farmBlocker} from './farming.js?v=1.0.56';
import {currentWeapon} from './equipment.js?v=1.0.56';
import {npcPlace} from './world.js?v=1.0.56';
import {relationshipFee} from './relationships.js?v=1.0.56';
import {jobDeliveryBlocker,jobMinutes,jobMaterials} from './contracts.js?v=1.0.56';
import {artPracticeBlocker,activeArt} from './martial.js?v=1.0.56';
// 全部只读：不推进时间、不抽随机数、不模拟操作，也不自动领取。
export function localOutlook(s){
 if(s.dead)return ['这段人生已经结束，可导出记录。'];
 const rows=[];
 for(const e of s.events){if(e.status!=='open'||e.expires<=s.day||events[e.kind].place!==s.place)continue;const g=gatherings[e.kind];if(g&&(e.expires-2!==s.day||s.minute>=g.close))continue;rows.push(events[e.kind].title+'：'+(g?(s.minute<480?'08:00开始，':'正在开放，')+Math.floor(g.close/60)+'点收场。':'仍可参与，第'+(e.expires-1)+'日结束后收场。'));}
 const key=siteAt(s);if(key){const record=s.sites[key],left=record?new Set(sites[key].choices.filter(c=>!record.done.includes(c.claim)).map(c=>c.claim)).size:0;rows.push(record?sites[key].name+'：'+(left?'还有'+left+'项可处理，有限物资不刷新。':'已全部处理，可查看记录。'):'附近有普通旧址，可花1小时、精力4查看并留下记录。');}
 const activity=npcActivity(s);if(activity&&(activity.place===s.place||activity.id==='merchant'&&s.place==='town'||activity.id==='master'&&s.place==='road'||activity.id==='boatman'&&s.place==='ferry'))rows.push(activity.text);
 if(!rows.length)rows.push('暂无已知的当地活动或回信，普通工作和探索照常。');
 return rows.slice(0,5);
}
export function tomorrowOutlook(s){
 if(s.dead)return ['这段人生已结束，没有待安排的下一天。'];
 const day=s.day+1,rows=[];
 if(s.job&&s.job.deadline<=day)rows.push(jobs[s.job.id].name+'：'+(s.job.deadline===s.day?'今日截止，不能拖到明日。':'明日结束前截止，请留足路程和交付时间。'));
 for(const def of Object.values(gatherings))if(day%7===def.offset)rows.push('明日'+def.name+'：'+locations[def.place].name+'，08:00–'+Math.floor(def.close/60)+':00，可参加或忽略。');
 const activity=npcActivity({...s,day});if(activity)rows.push(activity.text.replace('今天','明日'));
 for(const [kind,record] of Object.entries(s.echoes))if(!record.done&&record.day+2===day){const def=events[followups[kind].event];rows.push('明日回信：'+def.title+'，到'+locations[def.place].name+'自行查看。');}
 if(s.plot&&s.plot.readyDay===day)rows.push('明日菜地成熟，可到河湾村收获。');
 if(!rows.length)rows.push('明日暂无已知的特别安排，可继续自己的生活。');
 rows.push('这里只提示已知安排；明日天气和随机事件尚未发生。');return rows;
}
export function actionPreview(s,id){
 let minutes=0,energy=0,benefit='',blocked='';const r=resources[id],f=farmActions[id];
 if(r){minutes=r.hours*60;energy=r.energy;benefit='成功时获得'+Object.entries(r.output).map(([k,n])=>items[k]+'×'+n).join('、')+'，收获概率约'+Math.round(resourceChance(s,r)*1000)/10+'%；相关技能：'+skills[r.skill]+(r.tool?'；'+items[r.tool]+'可重复使用':'');if(s.hp<25)blocked='伤重需休养';else if(r.tool&&!s.bag[r.tool])blocked='缺少'+items[r.tool];}
 else if(f){minutes=f.minutes;energy=f.energy;blocked=farmBlocker(s,id)||'';benefit=id==='plant'?'消耗菜种1、借地2文，七日成熟':id==='tend'?'本茬预计收成+1份':'收获蔬菜'+(s.plot?3+s.plot.careDays.length:0)+'份';}
 else if(id==='deliver'){const j=jobs[s.job?.id];if(!j)return '暂不能执行：没有待完成的约定。';minutes=jobMinutes(j);energy=j.energy||2;blocked=jobDeliveryBlocker(s,j)||'';benefit='报酬'+j.reward+'文'+(j.needs?'；消耗：'+jobMaterials(s,j):'');}
 else if(id==='practiceArt'){minutes=120;energy=16;blocked=artPracticeBlocker(s)||'';benefit='练习'+(activeArt(s)?.name||'选用武艺')+'，增长相关武艺与基础兵器技能';}
 else {
 const data={work:[180,24,'工钱12文；搬运经验'],browse:[30,1,'了解街谈，不增加技能经验'],train:[120,18,'练习基础'+skills[currentWeapon(s).skill]],explore:[60,8,'20%可能遇拦路人；非战斗偶遇每日最多一次，也可能安静走过'],rest:[120,0,'精力恢复'+Math.min(30,100-s.energy)+'、气血恢复'+Math.min(10,100-s.hp)],inner:[120,8,'气血恢复'+Math.min(5,100-s.hp)+'；吐纳经验'],spar:[5,0,'进入点到为止的切磋，可撤离；交手另计时间和精力'],sleep:[480,0,'精力恢复至100，气血最多恢复20；'+(s.place==='inn'?'住店5文':'住宿免费')],treat:[60,0,'气血最多恢复50；诊金'+relationshipFee(s,'doctor')+'文']};
 if(['eat','heal','useSalve'].includes(id)){minutes=15;const k=id==='eat'?'food':id==='heal'?'herb':'salve';benefit='消耗'+items[k]+'1；气血恢复'+Math.min(id==='eat'?5:id==='heal'?25:35,100-s.hp)+(id==='eat'?'，精力恢复'+Math.min(12,100-s.energy):'');if(!s.bag[k])blocked='没有'+items[k];else if(s.hp===100&&(id!=='eat'||s.energy===100))blocked='目前无需恢复，不消耗物品';}
 else if(data[id]){[minutes,energy,benefit]=data[id];if(['work','train'].includes(id)&&s.hp<25)blocked='伤重需休养';if(id==='inner'&&!s.learned)blocked='先向周师傅学习基础吐纳';if(id==='spar'&&(npcPlace(s,'master')!==s.place||s.hp<30))blocked='需周师傅在场且气血至少30';if(id==='treat'){if(npcPlace(s,'doctor')!==s.place)blocked='沈医者不在这里';else if(s.hp===100)blocked='气血充足，无需治疗';else if(s.coins<relationshipFee(s,'doctor'))blocked='诊金不足';}if(id==='sleep'){if(!['inn','village'].includes(s.place)&&!(s.place==='town'&&s.homeDay))blocked='请去客栈、河湾村或自己的旧屋睡觉';else if(s.place==='inn'&&s.coins<5)blocked='住店需要5文';}}
 else return '';
 }
 if(!blocked&&energy>s.energy)blocked='精力不足，先歇息';
 return minutes+'分钟 / 精力'+energy+'；'+benefit+(energy&&s.energy-energy<20?(r?'；疲劳降低收获与成长':'；疲劳降低成长效率'):'')+(blocked?'；暂不能执行：'+blocked:'');
}
