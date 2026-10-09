// 伤势由气血直接计算，不另设需要迁移的隐藏伤病状态。
export function injury(hp){
 if(hp<=0)return {name:'死亡',factor:0};
 if(hp<30)return {name:'重伤',factor:0.8};
 if(hp<70)return {name:'中伤',factor:0.9};
 if(hp<100)return {name:'轻伤',factor:1};
 return {name:'无伤',factor:1};
}
export function conditionText(s){const wound=injury(s.hp);return `伤势：${wound.name}${wound.factor>0&&wound.factor<1?`（出招威力降低${Math.round((1-wound.factor)*100)}%）`:''} · ${s.energy<10?'极疲':s.energy<20?'疲惫':'精力尚可'}`}
export function attackFactor(s,cost){return injury(s.hp).factor*(s.energy-cost<20?0.6:1)}
