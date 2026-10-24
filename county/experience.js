import {resources,places,items,recipes} from './content.js?v=5.71.0';
// Derive prose from an action that has already settled. No random calls or state writes.
const goods=(b,s,keys)=>keys.filter(k=>s.bag[k]>b.bag[k]).map(k=>items[k]+'×'+(s.bag[k]-b.bag[k])).join('、');
export function actionNarrative(b,s,title){
 const entry=Object.entries(resources).find(([,d])=>d.name===title);
 if(entry){const [key,d]=entry,found=goods(b,s,Object.keys(d.output));
  const process=key==='wood'?'你沿林间拾起落枝，试着拣出能用的木料。':key==='hardwood'?'你逐段查看木料，辨认质地，再挑选合用的部分。':d.skill==='herb'?'你在草木间慢慢寻找，辨认叶形和根茎，才决定是否采下。':d.skill==='fish'?'你带着钓竿来到水边，下竿等候，留意水面的动静。':d.skill==='mining'?'你用矿镐试探矿层，逐块查看开出的石料。':d.skill==='hunt'?'你布置好猎具，沿附近查看，又回头检查是否有收获。':'你帮农户逐份分拣余菜，挑出可以带走的部分。';
  return process+(found?'这一趟收好了'+found+'。':'忙过这一阵，仍没有得到合用的东西，空手收了工。')+(b.weather==='雨'?'这趟是在雨中进行的。':'');
 }
 if(b.place!==s.place)return '你从'+places[b.place].name+'动身，'+(b.weather==='雨'?'冒雨沿路走了一程，':'沿路走了一程，')+'来到'+places[s.place].name+'。';
 if(title==='完成一份短工')return '你在'+places[b.place].name+'接下活计，忙过这一阵，做完手上的活。'+(s.coins>b.coins?'收工时领到了'+(s.coins-b.coins)+'文工钱。':'这回的工钱见下方实际结算。');
 if(title==='歇息')return '你停下手里的事，在原地歇了一个时辰。'+recovery(b,s);
 if(title==='睡一觉')return (b.place==='inn'?'你在客栈付过房钱，安顿下来睡了一觉。':'你在河湾村借宿，安顿下来睡了一觉。')+recovery(b,s);
 if(title.startsWith('等待至')||title==='等候半小时')return '你暂且没有再做别的，留在'+places[b.place].name+'等了一阵。'+(b.day!==s.day?'夜色过去，又是新的一日。':'时光慢慢过去。');
 if(title==='吃干粮')return '你从行囊里取出一份干粮，慢慢吃完。'+recovery(b,s);
 if(title==='用常见药材处理伤口')return '你取出自己带着的药材，花些工夫处理伤处。'+recovery(b,s);
 if(title==='医者治疗')return '你向医者说明伤情，付过诊金，留在药铺接受诊治。'+recovery(b,s);
 if(title==='练习入门拳脚')return '你在武馆练场站定，把入门拳脚一遍遍练下来，收势后歇了歇。';
 const recipe=Object.values(recipes).find(d=>d.name===title);if(recipe)return '你在作坊备好自己的材料，'+(recipe.skill==='smelt'?'看着炉火，将矿石慢慢炼成铁料。':'守着灶火，把食材加工成干粮。')+'收工时，你把做好的'+goods(b,s,Object.keys(recipe.output))+'装进行囊。';
 if(/^(购买|出售)/.test(title)){const buying=title.startsWith('购买'),changed=Object.keys(items).find(k=>buying?s.bag[k]>b.bag[k]:s.bag[k]<b.bag[k]);if(changed)return '你在货摊前谈妥这笔买卖，'+(buying?'点过钱，将'+items[changed]+'收进行囊。':'交出'+items[changed]+'，收好对方付来的钱。');}
 if(/^亲手制作/.test(title))return '你在手艺台铺开自己的材料，照着已会的做法逐步加工，收工前检查这一回做得怎样。';
 if(/^自行修理/.test(title))return '你把旧装备放上手艺台，检查损坏的地方，动手修整。';
 if(/^烹饪 · /.test(title))return '你在公用灶备好食材，下锅后留意火候，忙到可以起锅时才查看这次做得怎样。';
 if(/^学方 · /.test(title))return '你付过学费，跟着医者辨认用料，把这张药方的配伍和做法记下来。';
 if(/^制作 · /.test(title))return '你照着学过的药方备料，逐份处理药材，守着火候完成这一回配制。';
 if(/^学习 · 识字/.test(title))return '你跟着先生逐字辨认，把常用的字来回认读几遍。';
 if(/^学习 · 账算/.test(title))return '你跟着账房把进出一笔笔列开，重新核算，学着分清本钱和收入。';
 if(title==='核读告示与约定')return '你走近告示，逐句辨认字意，回头核对容易看错的地方。';
 if(title==='核对经营账目')return '你将账上的进出逐笔核过，反复算了一遍，再看能否理清。';
 if(/^与.+交谈$/.test(title))return '你停下脚步，和对方说了一阵话。';
 return '';
}
function recovery(b,s){if(s.dead)return '休整没能挽回伤势，这段人生走到了尽头。';if(s.hp<b.hp)return '原有伤势仍在拖累身体，这段时间里气血反而减少了。';return s.energy>b.energy||s.hp>b.hp?'再起身时，身体比先前缓过来一些。':'歇过这一阵，身体仍和先前一样。';}
// Old saves may only contain accounting lines. Preserve them in a folded ledger.
const ledger=t=>/→|^(精力[： ]|金钱[： ]|气血[： ]|单价|本次收获[：]|本次生产[：]|材料消耗[：]|当前库存[：]|实际工钱|今日本处已完成|作业耗时|求学耗时|练习耗时|扣除学费|失败概率|消耗\d+文|花费\d+文|本资源点每两日|资源每两日|疲惫[：]|极疲[：])/.test(t);
export function experienceView(s){const [title='眼下',...lines]=s.result||[];return {title,prose:lines.filter(t=>!ledger(t)),ledger:lines.filter(ledger),recent:(s.journal||[]).filter(j=>j.text!==(s.result||[]).join('；')).slice(0,3).map(j=>{const [title,...lines]=j.text.split('；');return {day:j.day,title,prose:lines.filter(t=>!ledger(t)).slice(0,3)};})};}
