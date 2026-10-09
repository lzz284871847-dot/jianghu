import {events,people,locations} from './content.js?v=1.0.2';
export function random(s){let x=s.seed>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;s.seed=x>>>0;return s.seed/4294967296}
export function npcPlace(s,id){const h=Math.floor(s.minute/60);return id==='master'?(h>=7&&h<18?'road':'inn'):id==='merchant'?(h>=8&&h<20?'town':'inn'):id==='doctor'?(h>=8&&h<18?'village':'inn'):(h>=6&&h<18?'dock':'inn')}
export function nearbyPeople(s){return Object.entries(people).filter(([id])=>npcPlace(s,id)===s.place).map(([id,p])=>({id,...p,relation:s.relations[id]}))}
export function advance(s,minutes){let total=s.minute+minutes;while(total>=1440){total-=1440;s.day++;newDay(s)}s.minute=total;}
function newDay(s){
 const news=[`第${s.day-1}日结束 · 世界新闻`];
 s.weather=random(s)<0.3?'雨':'晴';news.push(`【可靠消息】次日天气：${s.weather}。`);
 for(const e of s.events)if(['open','ignored'].includes(e.status)&&e.expires<=s.day){e.status='resolved';news.push('【可靠消息】'+events[e.kind].after)}
 const lives=['阿平给家中的屋顶补了几块瓦，随后回码头找活。','柳掌柜整理旧货，准备下一次赶集。','沈医者到邻村看诊后回村整理药材。','周师傅与老友喝茶，白日仍在城外教拳。'];news.push('【可靠消息】'+lives[Math.floor(random(s)*lives.length)]);
 if(random(s)<0.55){const kinds=Object.keys(events),kind=kinds[Math.floor(random(s)*kinds.length)];if(!s.events.some(e=>e.kind===kind&&e.status==='open')){s.events.push({id:`${kind}-${s.day}`,kind,status:'open',expires:s.day+2});news.push(`【街坊消息】${locations[events[kind].place].name}：${events[kind].title}。`);}}
 if(random(s)<0.2)news.push('【未证实传闻】有人说邻县武馆月底收徒，消息尚待核实。');
 s.events=s.events.slice(-12);s.news=[...news,...s.news].slice(0,20);
 if(s.job&&s.job.deadline<s.day){news.push('你接下的约定已经到期，对方另找了人。');s.job=null;s.news=[...news,...s.news].slice(0,20)}
}
export function encounter(s){if(s.pending||s.combat||s.dead)return;const e=s.events.find(e=>e.status==='open'&&events[e.kind].place===s.place);if(e)s.pending={type:'world',id:e.id};}
