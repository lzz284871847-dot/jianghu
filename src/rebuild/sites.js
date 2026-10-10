// 固定小地点，有界记录和有限物资；不是新地图或自动剧情。
export const sites={
 quarry:{name:'废弃采石场',place:'hill',text:'旧石棚旁留下浅层矿料。浅采与深入取料只能选一种；取完不再刷新。可先查看痕迹，也可以返回。',choices:[
 {id:'inspect',claim:'inspect',label:'查看旧采掘痕迹',hours:1,energy:4,xp:{mining:1},result:'你辨认了敲凿方向和石层，没有发现新矿脉。'},
 {id:'extract',claim:'ore',label:'敲取浅层矿石2份',hours:1,energy:16,minHp:25,tool:'tool',output:{ore:2},xp:{mining:1},result:'你敲取两份可用矿石。这处有限矿料已取完，工具保留。'},
 {id:'deep',claim:'ore',label:'深入取矿3份 · 20%概率轻伤12',hours:2,energy:20,minHp:50,minEnergy:40,tool:'tool',risk:0.2,damage:12,output:{ore:3},xp:{mining:2},result:'你取回三份普通矿石。这处有限矿料已取完，工具保留；没有隐秘矿脉或宝藏。'}]},
 camp:{name:'竹林旧营地',place:'bamboo',text:'樵夫留下的旧营地已无人使用。可以整理落枝，或辨认遗留物；两项各限一次，搜索可能空手。',choices:[
 {id:'wood',claim:'wood',label:'整理可用木料2份',hours:1,energy:12,minHp:25,output:{wood:2},xp:{forage:1},result:'你辨认并整理可用落枝，得到木料2份；这里的可用木料已收完。'},
 {id:'search',claim:'search',label:'搜索旧营地 · 50%找到干粮1份',hours:1,energy:8,minHp:25,chance:0.5,output:{food:1},xp:{forage:1},result:'你检查避雨处的遗留物，找到一份包好的干粮。',empty:'你检查了避雨处，只有破布和空袋，没有可用物资。'}]},
 riverside:{name:'河岸旧栈道',place:'ferry',text:'旧栈道的入口仍通岸边，船行留了12文请人清理障碍。也可查看沿岸漂来的旧物；两项各限一次，不要求乘船。',choices:[
 {id:'clear',claim:'clear',label:'清理栈道障碍，收12文',hours:2,energy:16,minHp:25,coins:12,xp:{carry:1},result:'你实际搬开散石和断枝，收到船行留下的12文工钱。这份清理工作已经完成。'},
 {id:'search',claim:'search',label:'查看沿岸遗物 · 40%找到木料1份',hours:1,energy:8,minHp:25,chance:0.4,output:{wood:1},xp:{forage:1},result:'你辨认岸边漂来的旧物，捡到一份可用木料。',empty:'你辨认岸边旧物，没有可用材料；没有藏宝线索。'}]}
};
export function siteAt(s){return Object.entries(sites).find(([,d])=>d.place===s.place)?.[0]||null;}
export function siteBlocker(s,key,c){if(!Object.hasOwn(sites,key)||sites[key].place!==s.place||!s.sites[key])return '请先在所在地找到这处旧址。';if(s.sites[key].done.includes(c.claim))return '这一项已经处理过，有限物资不会刷新。';if(c.tool&&!s.bag[c.tool])return '需要铁制工具；工具可重复使用。';if(c.minHp&&s.hp<c.minHp)return '气血不足，先养伤；可选择返回。';if(c.minEnergy&&s.energy<c.minEnergy)return '深入前至少需要精力'+c.minEnergy+'，请先休息。';if(s.energy<c.energy)return '精力不足，先休息；可选择返回。';return '';}
export function validSites(s){return s.sites&&typeof s.sites==='object'&&!Array.isArray(s.sites)&&Object.entries(s.sites).every(([key,v])=>Object.hasOwn(sites,key)&&v&&Number.isSafeInteger(v.day)&&v.day>=1&&v.day<=s.day&&Array.isArray(v.done)&&v.done.length<=2&&new Set(v.done).size===v.done.length&&v.done.every(k=>sites[key].choices.some(c=>c.claim===k)));}
