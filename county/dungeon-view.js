import {dungeonOptions,dungeonPlan} from './dungeon.js?v=5.60.0';

// Read-only presentation of the finite expedition. Actions and validation stay in dungeon.js.
const names=['','入口岔路','有限矿堆','塌落支巷','返回洞口'];
const intent={inspect:'先辨清松石与旧撑，不前进；察看失败也不能重查。',safe:'用自己的新木加固，省工且入口风险较低。',lash:'利用已察明的旧撑，把新木留给后段；多花工夫和绳线。',quick:'不加固，直接穿缝；较快，但落石风险更高。',mine:'用自己的矿镐试采；矿料可能破碎，只能尝试一次。',skip:'不取矿料，继续走向支巷。',rescue:'用自己的木料和绳线搭架救工，仍可能失败。',lift:'不搭木架，徒手搬石；更费力，受伤后果更重。',pass:'不在这处支巷救工，沿归途返回。',exit:'沿已处理的路线退回洞口，随身成果与伤势保留。',withdraw:'现在退回洞口；未走的部分不重开，已有成果保留。',dismiss:'让猎户按原路返程，之后独行；工钱不退。'};
const lootText=d=>({new:'矿堆还未处理。',ore:'本次取得普通铁矿石2份；矿堆已处理，不能再采。',fine:'本次取得精铁矿1份；矿堆已处理，不能再采。',empty:'这次矿料破碎不可用，矿堆已处理，不能再试。',skipped:'你已放弃矿堆，本次没有采得矿料。'})[d.loot];
function rescueText(s){const d=s.dungeon;return d.rescue==='saved'?s.adventures.outings.records.mine.outcome==='done'?'困工已救出，原有10文报酬已在作坊结清。':'困工已救出；返回后去作坊找许铁匠领原有10文，缺款时成果保留，不自动发钱。':({new:'塌落支巷的救工尚未处理。',failed:'救援未成，乡邻接手；不能重救或领取报酬。',skipped:'你略过了救工，已投入的东西不退，没有救工报酬。',unavailable:'这处救工已有旧结局，支巷不再出现同一位困工。'})[d.rescue];}
export function dungeonScene(s){
 const d=s.dungeon;if(d?.status!=='active')return null;
 const all=dungeonOptions(s),get=key=>all.find(a=>a.id==='dungeon:'+key),group=(title,text,keys)=>({title,text,options:keys.map(get).filter(Boolean)});
 const approach=d.route==='safe'?'来路已经加固；后续按加固通道的风险处理。':d.route==='quick'?'你从狭缝穿入，来路没有加固。':'尚未选定进入矿道的走法。';
 const surveyed=d.surveyed?'你已辨出松石、支撑走向与可用旧撑；线索来自这次实际察看。':d.inspected?'你已察看，但没辨出可靠的支撑走向与可用旧撑；不能重新察看。':'松动的旧支撑还未察明；看清之前，不能凭空利用旧撑。';
 const groups=d.stage===1?[group('旧支撑',surveyed,['inspect','safe','lash']),group('狭缝','不先加固也能穿过，但松石风险要自己承担。',['quick'])]:d.stage===2?[group('遗留矿堆',s.bag.pick?'自己的矿镐还在，可试采一次；开采未必取得矿料。':'没有自己的矿镐，这堆矿料暂时不能开采；可以直接略过。',['mine','skip'])]:d.stage===3?[group('压石下的支巷',d.rescue==='unavailable'?rescueText(s):'这里有待救的困工。可以用木架绳具支撑，也可以冒险徒手搬石；不救也能返回。',d.rescue==='unavailable'?['pass']:['rescue','lift','pass'])]:[group('退回洞口的路','本次矿堆和支巷都已有处理结果。返回不会补满气血或精力，未取得的东西不会刷新。',['exit'])];
 return {stage:d.stage,title:names[d.stage],description:['','松动支撑与狭缝挡在入口，先决定怎样穿过这段矿道。','穿过入口后，一堆遗留矿料就在眼前。取不取，由你决定。','支巷有塌落压石，救人要用掉真实材料或冒身体风险。','该往洞口退了。先看清这趟实际带走的东西和留下的后果。'][d.stage],
  pack:'随身：木料'+s.bag.wood+'、绳线'+s.bag.cord+'、矿镐'+s.bag.pick+'；木工累计'+s.skills.woodwork+'。气血'+s.hp+'，精力'+s.energy+'。',
  traces:[...(d.stage>=2?[approach]:[]),...(d.stage>=3?[lootText(d)]:[]),...(d.stage===4?[rescueText(s)]:[])],
  companion:d.guide==='joined'?'蒋猎户仍在同行；每步能否协助看其健康、精力和剩余时间。':d.guide==='left'?'蒋猎户已离队，你仍可独行或撤回。':d.guide==='refused'?'猎户没有同行，这趟由你自己处理。':'你独自探这段矿道。',
  groups,escape:get('withdraw'),dismiss:get('dismiss')};
}
export function dungeonChoice(s,option){const key=option.id.split(':')[1],p=dungeonPlan(s,key);return {intent:intent[key]||'',cost:p?p.minutes+'分钟 · 精力'+p.energy+' · 成功率'+Math.round(p.chance*100)+'%'+(Object.entries(p.input).map(([k,n])=>' · '+({wood:'木料',cord:'绳线'}[k])+'×'+n).join(''))+' · '+(p.risk?'受伤'+Math.round(p.risk*100)+'%，损'+p.damage+'气血并拉伤':'无直接受伤风险'):option.preview};}
export function renderDungeonScene(s,{el,button,run}){
 const data=dungeonScene(s);if(!data)return null;const root=el('section','','mine-scene');root.setAttribute('aria-label','废弃矿道当前现场');
 root.append(el('p','废弃矿道 · 第'+data.stage+'/4段','eyebrow'),el('h3',data.title),el('p',data.description,'mine-description'),el('p',data.pack,'mine-pack'));
 for(const text of data.traces)root.append(el('p',text,'mine-trace'));root.append(el('p',data.companion,'muted'));
 const optionRow=(a,escape=false)=>{const c=dungeonChoice(s,a),row=el('article','','activity-option'+(escape?' mine-retreat':''));row.dataset.actionId=a.id;row.dataset.group='dungeon';row.append(el('p',c.intent,'action-preview'),el('p',c.cost,'mine-cost'));if(a.blocker)row.append(el('p',a.blocker,'muted'));row.append(button(a.label,()=>run(a.id),!!a.blocker||s.dead||!!s.pending||!!s.combat));const details=el('details','');details.append(el('summary','完整投入与风险'),el('p',a.preview,'muted'));row.append(details);return row;};
 if(data.escape)root.append(optionRow(data.escape,true));
 for(const group of data.groups){const area=el('section','','mine-object');area.append(el('h4',group.title),el('p',group.text,'mine-object-text'));for(const a of group.options)area.append(optionRow(a));root.append(area);}
 if(data.dismiss)root.append(optionRow(data.dismiss));return root;
}
