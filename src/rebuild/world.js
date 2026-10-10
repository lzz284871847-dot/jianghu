import {continuityDay,npcActivity,gatherings} from './continuity.js?v=1.0.51';
import {farmStatus} from './farming.js?v=1.0.51';
import {procurementNews} from './contracts.js?v=1.0.51';
import {discoveries} from './discoveries.js?v=1.0.51';
import {events,people,locations,npcSchedules} from './content.js?v=1.0.51';
export function random(s){let x=s.seed>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;s.seed=x>>>0;return s.seed/4294967296}
export function npcPlace(s,id){const schedule=npcActivity(s,id)||npcSchedules[id];if(!Object.hasOwn(npcSchedules,id))return null;const h=Math.floor(s.minute/60);return h>=schedule.from&&h<schedule.to?schedule.place:schedule.off}
export function npcScheduleText(id,s){if(s&&npcActivity(s,id))return npcActivity(s,id).text;if(!Object.hasOwn(npcSchedules,id))return '去向未知';const schedule=npcSchedules[id],hour=h=>String(h).padStart(2,'0')+':00';return `${hour(schedule.from)}–${hour(schedule.to)} ${locations[schedule.place].name}；其余时间 ${locations[schedule.off].name}`}
export function nearbyPeople(s){return Object.entries(people).filter(([id])=>npcPlace(s,id)===s.place).map(([id,p])=>({id,...p,relation:s.relations[id]}))}
export function advance(s,minutes){let total=s.minute+minutes;while(total>=1440){total-=1440;s.day++;newDay(s)}s.minute=total;}
function newDay(s){
 const news=[`第${s.day-1}日结束 · 世界新闻`];
 if(s.plot&&s.plot.readyDay===s.day)news.push('你的菜地已成熟，可自行安排收获。'+farmStatus(s));
 if(s.discoveryResolution&&s.discoveryResolution.expires<=s.day){news.push('【可靠消息】'+discoveries[s.discoveryResolution.kind].after);s.discoveryResolution=null;}
 continuityDay(s,news);
 for(const e of s.events)if(gatherings[e.kind]&&e.expires-2<s.day&&['open','ignored'].includes(e.status)){e.status='resolved';news.push('【可靠消息】'+events[e.kind].after)}
 s.weather=random(s)<0.3?'雨':'晴';news.push(`【可靠消息】次日天气：${s.weather}。`,procurementNews(s));
 for(const e of s.events)if(['open','ignored'].includes(e.status)&&e.expires<=s.day){e.status='resolved';news.push('【可靠消息】'+events[e.kind].after)}
 const lives=['乔掌柜在柳溪集整理农具货架，收摊后在集口歇脚。','贺船工收工后沿岸回柳溪集，整理明日用具。','许铁匠修好邻人的锄头，收工后去客栈歇脚。','阿平给家中的屋顶补了几块瓦，随后回码头找活。','柳掌柜整理旧货，准备下一次赶集。','沈医者到邻村看诊后回村整理药材。','周师傅与老友喝茶，聊起近来的练武见闻。'];news.push('【可靠消息】'+lives[Math.floor(random(s)*lives.length)]);
 if(random(s)<0.55){const kinds=Object.keys(events).filter(k=>!Object.hasOwn(gatherings,k)&&!['boatThanks','herbThanks','roofThanks'].includes(k)),kind=kinds[Math.floor(random(s)*kinds.length)];if(!s.events.some(e=>e.kind===kind&&e.status==='open')){s.events.push({id:`${kind}-${s.day}`,kind,status:'open',expires:s.day+2});news.push(`【街坊消息】${locations[events[kind].place].name}：${events[kind].title}。`);}}
 if(random(s)<0.2)news.push('【未证实传闻】有人说邻县武馆月底收徒，消息尚待核实。');
 s.events=s.events.slice(-12);
 if(s.job&&s.job.deadline<s.day){news.push('你接下的约定已经到期，对方另找了人。');s.job=null;}
 s.news=[...news,...s.news].slice(0,20);
}
export function encounter(s){if(s.pending||s.combat||s.dead)return;const e=s.events.find(e=>e.status==='open'&&events[e.kind].place===s.place&&(!gatherings[e.kind]||s.day===e.expires-2&&s.minute>=480&&s.minute<gatherings[e.kind].close));if(e)s.pending={type:'world',id:e.id};}
