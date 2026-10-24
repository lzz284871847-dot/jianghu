import {gain} from './progression.js?v=5.70.1';
import {equipmentBonuses} from './equipment.js?v=5.70.1';
import {MARTIAL_ARTS} from './martial-data.js?v=5.70.1';
// Finite, optional encounters. Compact results reuse the existing encounter map.
export const VIGNETTES={inn:{name:'两张脚钱条',place:'inn'},road:{name:'官道上的断带',place:'road'},market:{name:'旧矿镐的刻痕',place:'market'},herb_dispute:{name:'竹林争药',place:'bamboo'}};
export const VIGNETTE_STATES={herb_dispute:['heard','identified','settled','refused','fighting','won','taken','escaped','died','left'],inn:['heard','checked','hasty','calmed','done','left'],road:['heard','asked','helped','done','left'],market:['offer_good','offer_bad','known_good','known_bad','bought_good','bought_bad','closed_good','closed_bad','left']};
const record=(s,key)=>s.adventures.exploration.encounters[key];
export const herbDisputeChance=s=>Math.min(.95,.55+(s.skills.negotiation>=6?.2:0)+(record(s,'herb_dispute')==='identified'?.2:0));
const intros={
 herb_dispute:'竹阴下，年轻采药客护住背篓，持短棍的行脚人攥着一束草根，说这是早已说定要买的救命药。采药客说钱未收、药也未定。两人谁都没提价钱，短棍却已举到篓沿。你可查看草根、开口劝解、拦住挥棍者，或照常离开。',
 inn:'堂前两名过客为脚钱争执。背包客举着一张盖了指印的收条：“钱明明付了。”脚夫却把另一张皱纸摊在桌上：“那只算前半程。”贺船工曾替这趟货过手，两人都提到过他。你可以听一听，也可以照常投宿。',
 road:'一名带着断腰带的习武者坐在路边，臂上渗血。他说自己替村口一个孩子挡过棍子，却不愿说是谁先动的手。你看不出他说了几分真话；他没有拦你的路，也没有许诺报酬。',
 market:'柳掌柜代一个过客出让一把包着旧布的矿镐。镐柄上有三道斜刻，铁箍下看不清是否开裂。卖价6文，不退；可能还能采矿，也可能只剩一截可用木柄。你可以问价、记下刻痕去问许铁匠，也可以不买。'
};
function choices(s,key){const st=record(s,key),out=[],add=(action,label,place,minutes,energy,text,actor=null)=>out.push({action,label,place,minutes,energy,text,actor});
 if(!st){add('listen','听一听 · '+VIGNETTES[key].name,VIGNETTES[key].place,15,0,'听完当事人眼前的说法。',key==='market'?'merchant':null);add('leave','不参与 · '+VIGNETTES[key].name,VIGNETTES[key].place,0,0,'不介入，照常走自己的路。');return out;}
 if(key==='herb_dispute'){
  if(['heard','identified'].includes(st)){if(st==='heard')add('inspect','凭采药经验辨认草根','bamboo',30,4,'采药经验12；仔细辨认药材性质，为交涉提供根据，不替双方判定所有权。');add('mediate','请双方放下药篓谈清','bamboo',45,6,'成功率'+Math.round(herbDisputeChance(s)*100)+'%；交涉经验6可提高把握，辨药后再提高。成功获采药客自愿赠常见药材1份；失败双方散开，不重试或改动手。');const b=equipmentBonuses(s);add('fight','拦住挥棍者，主动交手','bamboo',15,0,'挥棍者近身猛攻，起手距离2、气血100。当前'+MARTIAL_ARTS[s.martial.equipped].name+'，气血'+s.hp+'、精力'+s.energy+'，有效兵器攻击+'+b.attack+'、护甲减伤'+b.defense+'。需已学当前武艺、气血25、精力20；真实消耗与耐久，可能受伤、撤退失败或永久死亡。胜利后仅可领常见药材1份，不判断谁有理。');add('leave','不再介入 · 竹林争药','bamboo',0,0,'不介入、不罚钱，不强迫战斗。');}
  if(st==='won')add('take','收下采药客留下的药材','bamboo',15,0,'常见药材1份，只领一次；不是珍药或新武学。');
 }
 if(key==='inn'){
  if(st==='heard'){add('believe','先信持收条的客人','inn',15,0,'替客人说话，尚未核对另一张脚钱条；没有报酬。');add('calm','劝两人先停争执','inn',15,1,'请双方暂缓争吵，不替他们断谁欠谁。');add('verify','向贺船工问那趟货','dock',15,1,'贺船工是当日过货人；当面问清，不付报酬。','boatman');add('leave','不再介入 · 两张脚钱条','inn',0,0,'不替任何一方作证，没有罚款。');}
  if(st==='checked')add('explain','回客栈说清两段脚钱','inn',15,1,'把贺船工亲口说的分段过货经过告诉双方。');
 }
 if(key==='road'){
  if(['heard','asked'].includes(st)){if(st==='heard')add('ask','隔着几步问清缘由','road',15,0,'只听他的说法，不保证知道全部真相。');add('help','用自己的药材包扎','road',30,4,'药材1份实际用掉，没有金钱或武学奖励；以后回村可顺口问医者。');add('leave','绕开伤者继续赶路','road',0,0,'不介入、不强迫战斗，也没有罚款。');}
  if(st==='helped')add('follow','问沈医者那位断带客','village',15,1,'只问一次后来怎样；不再讨一份谢礼。','doctor');
 }
 if(key==='market'){
  if(['offer_good','offer_bad','known_good','known_bad'].includes(st)){add('buy','付6文买下旧矿镐','market',15,0,'6文交柳掌柜；镐可用则矿镐1把，破裂则仅木料1份；卖方不退钱。','merchant');if(st.startsWith('offer'))add('verify','向许铁匠描述三道刻痕','workshop',20,1,'记下镐上的刻痕，请许铁匠讲讲来历；未买也能先问。','smith');add('leave','不买这件旧物','market',0,0,'不花钱，代售旧物这件事结束。');}
  if(st.startsWith('bought'))add('follow','拿旧镐的来历问许铁匠','workshop',15,1,'问过这件旧工具的来历，便各忙各的。','smith');
 }
 return out;
}
function plan(s,id){const p=String(id).split(':');if(p.length!==3||p[0]!=='vignette'||!VIGNETTES[p[1]])return null;const [ ,key,action]=p,c=choices(s,key).find(x=>x.action===action);return c?{...c,key}:null;}
export function vignetteBlocker(s,id,present=()=>true){const p=plan(s,id);if(!p)return '这件小事已结束，或当前没有这种回应；不会重开。';
 if(s.dead||s.combat||s.pending||s.adventures.law.pursuit||[s.dungeon,s.raid,s.fort].some(x=>x.status==='active'))return '先处理眼前交手或选择；人生结束后不能继续。';
 if(s.place!==p.place)return '请沿现有道路到现场，不能远处替人作决定。';
 if(p.actor&&!present(s,p.actor,p.minutes))return '请等本人实际在场且能接洽时再问；这件事暂时保留。';
 if(s.energy<p.energy)return '精力不足'+p.energy+'；可先歇息，或在原处选择不参与。';
 if(p.key==='herb_dispute'){if(p.action==='inspect'&&s.skills.herb<12)return '采药累计经验需12；仍可直接交涉或离开。';if(p.action==='fight'&&(!s.martial.known[s.martial.equipped]||s.hp<25||s.energy<20))return '主动交手需学会并选用武艺、气血25、精力20；仍可交涉或离开。';if(['mediate','take'].includes(p.action)&&s.bag.herb>=1000000)return '常见药材库存已满，尚未开始或领物。';}
 if(p.action==='help'&&s.bag.herb<1)return '需自己的常见药材1份；没有扣料，也可以不介入。';
 if(p.action==='buy'){const st=record(s,'market'),item=st.endsWith('good')?'pick':'wood';if(s.coins<6||s.npcWorld.individuals.merchant.coins>999994)return '实际钱款不足或柳掌柜无法收款，未扣钱。';if(s.bag[item]>=1000000)return '背包容量不足，钱物都未结算。';}
 return null;
}
function remember(s,actor,line){const p=s.npcWorld.individuals[actor];p.history=['第'+s.day+'日'+line,...p.history].slice(0,8);}
export function vignetteAction(s,id,{settle,rng,present,startFight}){const why=vignetteBlocker(s,id,present);if(why){s.result=[why];return false;}const p=plan(s,id),{key,action}=p,records=s.adventures.exploration.encounters,old=record(s,key);
 return settle(s,VIGNETTES[key].name+' · '+p.label,p.minutes,p.energy,()=>{
  if(action==='leave'){records[key]='left';s.result.push('你没有继续介入。身后的说话声渐渐远了，你照常走自己的路。');return;}
  if(action==='listen'){records[key]=key==='market'?(rng()<.5?'offer_good':'offer_bad'):'heard';s.result.push(intros[key]);if(key==='inn')s.result.push('两张纸都不像新写的，但上面的交货地名不同。仅凭这一眼，还不能断定谁在赖账。');if(key==='market')s.result.push('柳掌柜说：“只代转旧物，不替它包好坏。三道刻痕，许铁匠兴许认得。”镐柄被布裹住一半，那几道刻痕倒还清楚。');return;}
  if(key==='herb_dispute'){
   if(action==='inspect'){records[key]='identified';const line=gain(s,'herb',2);if(line)s.result.push(line);s.result.push('断面、叶脉和气味都表明这只是常见药材，并非对方口中的救命珍草。你能说明药性，却不能凭一束草断定谁先约定。把这个根据说出来，双方也许更愿意谈。');}
   if(action==='mediate'){const success=rng()<herbDisputeChance(s);records[key]=success?'settled':'refused';const line=gain(s,'negotiation',success?2:1);if(line)s.result.push(line);if(success){s.bag.herb++;s.result.push('你请两人把“说过要买”和“已收钱”分开讲清。持棍者承认还未付钱，放下棍子；采药客也承认自己应过一句，却未谈定价。他们自行商量，采药客另从自己采到的药里赠你常见药材1份。');}else s.result.push('两人仍不肯谈清，各收好自己的东西，从不同的小径走了。你没替谁垫钱，也未取得药材；这次争执到此结束。');}
   if(action==='fight'){startFight('brawler');records[key]='fighting';s.result.push('你挡住举起的短棍，行脚人转而向你出手。是否获胜与谁先有理是两件事；不会自动恢复或赠送兵器。');}
   if(action==='take'){s.bag.herb++;records[key]='taken';s.result.push('采药客留下的常见药材1份收入背包。你们各自离开，篓中并没有传说中的珍药。');}return;
  }
  if(key==='inn'){
   if(action==='believe'){records.inn='hasty';s.result.push('背包客得了声援，催脚夫认账。脚夫却收起另一张纸：“你问过后半程是谁背的么？”两人各自散开，你并没因此知道完整经过。');}
   if(action==='calm'){records.inn='calmed';s.result.push('你请两人把纸各自收好，明日自己找经手人。争执停了，谁也没向你道谢；你也没有替人认下一笔债。');}
   if(action==='verify'){records.inn='checked';remember(s,'boatman','与你说起客栈两张脚钱条，说明是分段过货。');s.result.push('贺船工认得这趟货：“前半程用车，后半程渡口窄，是人背的。那张收条结的是车钱，背货的脚钱另算。”两人各拿着一半实情，客人可能以为已经结清。回客栈时可以说清，不必替谁垫钱。');}
   if(action==='explain'){records.inn='done';s.result.push('你把两段路说清。背包客重新看了收条上的地名，脚夫也承认先前没讲清分段计价。他们留下自行对账，没有请你担保。你没有拿钱，这件事到此为止。');}return;
  }
  if(key==='road'){
   if(action==='ask'){records.road='asked';s.result.push('他先说自己替孩子挡棍，追问后才承认曾骂过对方、先推过人。“我有我的不是，可那一棍不能落孩子身上。”他的伤是真的，谁先有理仍不是一句话能说清。');}
   if(action==='help'){s.bag.herb--;records.road='helped';s.result.push('你用自己的药材替他包好手臂。他从袖口撕下一截布，拢住包扎处，向你拱手后慢慢往河湾村去。你们各走各路。');}
   if(action==='follow'){records.road='done';remember(s,'doctor','与你谈起官道断带客，你此前用自备药材替他包扎。');s.result.push('沈医者说那人来过：“伤口包得住。他确实替孩子挡了棍，也承认先前逞口舌之快。”后来他把赔坏竹篮的钱留在村里便走了。沈医者又低头整理案上的药末，没有再谈那人的去向。');}return;
  }
  const good=old.endsWith('good');
  if(action==='verify'){records.market=good?'known_good':'known_bad';remember(s,'smith','听你描述旧矿镐刻痕，讲起旧工具来历。');s.result.push(good?'许铁匠认出那三道刻痕：“是我以前重装过柄的记号，铁箍只是旧，镐头还能用。”只是旧铺子里换下来的家什，回来买不买随你。':'许铁匠摇头：“三道刻痕里，最后一道是报废时添的。镐头裂了，能用的只剩木柄。”你还没有付钱，仍可回街市不买。');}
  if(action==='buy'){s.coins-=6;s.npcWorld.individuals.merchant.coins+=6;s.bag[good?'pick':'wood']++;records.market=good?'bought_good':'bought_bad';s.result.push(good?'6文交给柳掌柜。拆开旧布，镐头虽钝却牢实，得到可用于原有采矿的矿镐1把；正是寻常采矿用的那种工具。':'6文交给柳掌柜。揭开铁箍才见镐头已裂，旧镐不能采矿；仅留下木料1份，柳掌柜把原先说过的不退钱又复述了一遍。');}
  if(action==='follow'){records.market=good?'closed_good':'closed_bad';remember(s,'smith','与你谈完买下的旧矿镐，不再另发工具。');s.result.push(good?'许铁匠指着刻痕说：“旧，不等于不能用；能不能用，也不看故事讲得多好听。”他把这把寻常矿镐的旧事说完，便回身照看炉火。':'许铁匠看过你记下的断口：“这件原本只该拆柄。下回先问，再付钱。”他把话说完，便回身照看炉火。');}
 });
}
export function vignetteOptions(s,present){return Object.entries(VIGNETTES).flatMap(([key,d])=>choices(s,key).filter(p=>p.place===s.place).map(p=>{const id='vignette:'+key+':'+p.action;return {id,label:p.label,preview:p.minutes+'分钟 / 精力'+p.energy+'；'+p.text,blocker:vignetteBlocker(s,id,present)};}));}
export function vignetteContact(id){const [,key,action]=String(id).split(':');return key==='market'&&['listen','buy'].includes(action)?'merchant':key==='market'&&['verify','follow'].includes(action)?'smith':key==='inn'&&action==='verify'?'boatman':key==='road'&&action==='follow'?'doctor':null;}
const labels={identified:'已辨明只是常见药材，所有权仍须双方说清',settled:'双方谈清后散开，自愿赠药已收',refused:'交涉未果，双方散开，不再重试',fighting:'你正与挥棍者交手',won:'已制止挥棍者，采药客留下常见药材1份待收',taken:'已收下常见药材1份，此事结束',escaped:'已脱身，争执无从再问，伤势保留',died:'介入争执后身亡',heard:'听过说法，是否介入由你决定',asked:'听到伤者承认争执起因',checked:'已问过船工，回客栈可说明分段脚钱',hasty:'先信一方，未弄清全貌',calmed:'劝止争吵，未替人断账',helped:'已用自己的药材包扎，回村可问一次近况',done:'这件事已说完',left:'选择不参与',offer_good:'旧物来历未明，尚未付钱',offer_bad:'旧物来历未明，尚未付钱',known_good:'问过铁匠，旧镐仍可用，尚未付款',known_bad:'问过铁匠，镐头已裂，尚未付款',bought_good:'付6文买到普通矿镐1把',bought_bad:'付6文买到裂镐，仅留木料1份',closed_good:'旧镐可用，来历已问清',closed_bad:'裂镐的后话已问完，损失不补'};
export const vignetteSummary=s=>Object.entries(VIGNETTES).filter(([key])=>record(s,key)).map(([key,d])=>d.name+'：'+labels[record(s,key)]+'。');
export function vignetteScene(s){const pair=Object.entries(VIGNETTES).find(([,d])=>d.place===s.place);if(!pair)return null;const [key,d]=pair;const st=record(s,key);return {title:d.name,text:st?labels[st]+'。'+(['heard','asked'].includes(st)?intros[key]:''):intros[key]};}

export function settleVignetteCombat(s,c,log){const r=s.adventures?.exploration?.encounters;if(s.place!=='bamboo'||r?.herb_dispute!=='fighting'||c.opponent!=='brawler'||c.practice)return;r.herb_dispute=c.ended==='victory'?'won':c.ended==='death'?'died':'escaped';log.push(c.ended==='victory'?'挥棍者退开，采药客从自采药材中留下常见药材1份，可自主领取。双方的约定仍由他们自己处理。':c.ended==='death'?'竹林争药：介入后身亡。':'你脱身离开争执，未得到药材，不再重开；实际伤势和损耗保留。');}
