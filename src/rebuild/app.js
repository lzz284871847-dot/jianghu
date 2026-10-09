import {command} from './commands.js?v=1.0.0';
import {locations,skills,items,people,jobs,events,actionNames} from './content.js?v=1.0.0';
import {date,skillLines} from './progression.js?v=1.0.0';
import {nearbyPeople} from './world.js?v=1.0.0';
import {KEY,fresh,restore,travel,talk,trade,prices,acceptJob,abandonJob,act,choose,fight} from './engine.js?v=1.0.0';
const $=id=>document.getElementById(id);let state=null;
function text(tag,value,className){const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el}
function button(label,fn,className=''){const b=text('button',label,className);b.type='button';b.onclick=()=>{fn();save()};return b}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='已保存在此浏览器'}catch{$('save-status').textContent='保存失败，请导出备份'}render()}
const labels={work:'打零工 · 3小时 / 精力24',train:'练拳 · 2小时 / 精力18',inner:'吐纳 · 2小时 / 精力8',gather:'采药 · 2小时 / 精力16',fish:'钓鱼 · 2小时 / 精力16',forge:'打造工具 · 3小时 / 精力24',cook:'做鱼饭 · 1小时 / 精力8',explore:'探索 · 1小时 / 精力8',rest:'歇息 · 2小时 / 恢复精力30',sleep:'睡觉 · 8小时',eat:'吃干粮 · 恢复精力12',heal:'用草药 · 恢复气血25',treat:'医者治疗 · 8文',browse:'听街谈 · 半小时 / 精力1'};
function render(){
 if(!state)return;const s=state;$('setup').hidden=true;$('game').hidden=false;$('hero-name').textContent=s.name+' · '+s.background;$('hero-detail').textContent=`${s.gender} · ${s.age+Math.floor((s.day-1)/360)}岁 · ${s.personality} · ${s.dead?'人生已结束':'一介普通人'}`;
 $('stats').replaceChildren(...[`气血 ${s.hp}/100`,`精力 ${s.energy}/100`,`铜钱 ${s.coins}文`].map(x=>text('span',x,'pill')));
 $('place-name').textContent=locations[s.place].name;$('place-tag').textContent=locations[s.place].tag;$('place-text').textContent=locations[s.place].text;$('clock').textContent=date(s)+' · '+s.weather;
 $('result').replaceChildren(...s.result.map(x=>text('p',x)));
 $('map').replaceChildren();for(const [id,loc] of Object.entries(locations)){const b=button(loc.name,()=>travel(s,id),'map-place'+(id===s.place?' current':''));b.disabled=s.dead||!!s.pending||!!s.combat||!locations[s.place].routes.includes(id);b.append(text('small',id===s.place?'你在这里':loc.tag.split(' · ')[0]));$('map').append(b)}
 const blocked=s.dead||s.pending||s.combat;
 $('actions').replaceChildren();if(!blocked){const ids=[...locations[s.place].actions,'rest','eat','heal',...(s.learned?['inner']:[]),...(nearbyPeople(s).some(n=>n.id==='master')?['spar']:[]),...(nearbyPeople(s).some(n=>n.id==='doctor')?['treat']:[]),...(s.job?['deliver']:[])];for(const id of [...new Set(ids)])$('actions').append(button(labels[id]||actionNames[id],()=>act(s,id)));}
 $('scene').replaceChildren();$('scene').hidden=!s.pending&&!s.combat&&!s.dead;
 if(s.dead){$('scene').append(text('h2','这一段人生结束了'),text('p','死亡不会自动回到上一刻。你可以导出人生记录，再创建另一个普通人。'));}
 else if(s.pending){if(s.pending.type==='bandit'){$('scene').append(text('h2','有人拦路'),text('p','对方来意不善。交手可能受伤或死亡；绕路离开也是一种选择。'),button('谨慎交手',()=>choose(s,'fight')),button('绕路离开',()=>choose(s,'leave')));}else{const e=s.events.find(e=>e.id===s.pending.id),def=events[e.kind];$('scene').append(text('h2',def.title),text('p',def.text));for(const c of def.choices)$('scene').append(button(c.label+((c.hours||c.energy)?` · ${c.hours||0}小时 / 精力${c.energy||0}`:''),()=>choose(s,c.id)));}}
 else if(s.combat){$('scene').append(text('h2',s.combat.name+' · 气血 '+s.combat.hp),text('p',s.combat.spar?'切磋点到为止。每段交手耗时一分钟。':'这是真正的危险。精力与伤势会影响交手，请量力而行。'));for(const [id,label] of [['attack','出拳 · 精力4'],['guard','防守 · 精力4'],...(s.learned?[['inner','运功出招 · 精力6']]:[]),['flee','撤离 · 至多精力3']])$('scene').append(button(label,()=>fight(s,id)));}
 $('people').replaceChildren();for(const n of nearbyPeople(s)){const card=text('div','','person');card.append(text('h3',n.name+' · '+n.role),text('p',`${n.personality} · 关系 ${n.relation}/100`,'muted'));const details=document.createElement('details');details.append(text('summary','了解此人'),text('p',`兴趣：${n.interest}。眼下打算：${n.goal}。`));card.append(details);if(!blocked)card.append(button('与'+n.name+'交谈',()=>talk(s,n.id)));$('people').append(card)}if(!nearbyPeople(s).length)$('people').append(text('p','这里暂时没有熟悉的人。','muted'));
 $('jobs').replaceChildren();if(s.job){const j=jobs[s.job.id];$('jobs').append(text('h3',j.name),text('p',`去${locations[j.place].name}完成；截止第${s.job.deadline}日。${j.text}`));if(!blocked)$('jobs').append(button('放弃这份约定',()=>abandonJob(s),'quiet'));}else if(!blocked&&s.place==='town'){for(const [id,j] of Object.entries(jobs)){$('jobs').append(text('h3',j.name+' · '+j.reward+'文'),text('p',j.text),button(s.jobsDone[id]===s.day?'今日已完成':'接下：'+j.name,()=>acceptJob(s,id)));}}else $('jobs').append(text('p','去青石镇看看招工和收货的约定。没有必须完成的任务。','muted'));
 $('bag').replaceChildren(...Object.entries(items).map(([k,n])=>text('span',n+' ×'+s.bag[k],'pill')));$('skills').replaceChildren(...skillLines(s).map(x=>text('p',x)));
 $('shop').hidden=s.place!=='town'||!!blocked;$('buys').replaceChildren();$('sells').replaceChildren();if(!blocked&&s.place==='town'){for(const [k,p] of Object.entries(prices))$('buys').append(button(`买${items[k]} · ${p}文`,()=>trade(s,'buy',k)));for(const [k,p] of [['herb',3],['fish',5],['tool',18]])$('sells').append(button(`卖${items[k]} · ${p}文`,()=>trade(s,'sell',k)));}
 $('news').replaceChildren(...(s.news.length?s.news:['世界会随你的行动推进。跨日后，这里会出现与别人有关的消息。']).map(x=>text('p',x)));
 const next=s.dead?['创建新的普通角色']:s.pending?['决定眼前事件，也可以不参与']:s.job?[`去${locations[jobs[s.job.id].place].name}完成${jobs[s.job.id].name}`]:['去街市找一份活，或自由探索'];if(s.energy<30)next.push('先歇息，或去客栈、河湾村睡觉');if(s.bag.fish)next.push('鲜鱼可以出售，也能在作坊做饭');if(s.bag.herb>=2)next.push('街市可能有医者收药的约定');for(const e of s.events.filter(e=>e.status==='open'))next.push(`${locations[events[e.kind].place].name}：${events[e.kind].title}（可不参与）`);$('next').replaceChildren(...next.map(x=>text('p',x)));
 $('journal').replaceChildren(...s.journal.slice(0,10).map(x=>text('p',`第${x.day}日 · ${x.text}`)));
}
function start(){state=fresh({name:$('name').value,age:$('age').value,gender:$('gender').value,background:$('background').value,personality:$('personality').value});save()}
$('start').onclick=start;
$('free-form').onsubmit=e=>{e.preventDefault();command(state,$('free-input').value);save()};
$('reset').onclick=()=>{if(confirm('重新创建角色会替换新版进度，请先导出备份。继续吗？')){state=null;localStorage.removeItem(KEY);$('game').hidden=true;$('setup').hidden=false}};
$('export').onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='jianghu-wanxiang-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>150000)throw Error('存档文件过大');const loaded=restore(await f.text());if(state&&!confirm('导入会替换新版当前角色，继续吗？'))return;state=loaded;save()}catch(error){alert('导入失败：'+error.message)}finally{e.target.value=''}};
try{const raw=localStorage.getItem(KEY);if(raw){state=restore(raw);render();$('save-status').textContent='本机存档已恢复'}}catch{$('save-status').textContent='存档无法读取，可导入备份或新建角色。'}
