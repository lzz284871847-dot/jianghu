import {items,skills,locations} from './content.js?v=1.0.36';
import {maxXP} from './progression.js?v=1.0.36';
// 只读选择预览：奖励和成长仍由引擎在玩家确认后结算。
export function choiceDetails(s,c){
 const lines=[];
 if(c.input)lines.push('消耗：'+Object.entries(c.input).map(([k,n])=>`${items[k]}${n}（现有${s.bag[k]}）`).join('、'));
 if(c.output)lines.push('获得：'+Object.entries(c.output).map(([k,n])=>`${items[k]}${n}`).join('、'));
 if(c.coins)lines.push(`铜钱：${c.coins>0?'+':''}${c.coins}文`);
 if(c.to&&c.to!==s.place)lines.push('结束地点：'+locations[c.to].name);
 const related=c.skill?[c.skill]:Object.keys(c.xp||{});
 if(related.length)lines.push('相关技能：'+related.map(k=>skills[k]+(s.skills[k]>=maxXP?'【已满，不增长】':'')).join('、'));
 if(c.tool)lines.push(`需要工具：${items[c.tool]}（可重复使用）`);
 if(c.tool&&!s.bag[c.tool])lines.push(`暂不能执行：缺少${items[c.tool]}`);
 const missing=Object.entries(c.input||{}).filter(([k,n])=>s.bag[k]<n).map(([k])=>items[k]);
 if(missing.length)lines.push('暂不能执行：'+missing.join('、')+'不足');
 if(c.minHp&&s.hp<c.minHp)lines.push('暂不能执行：受伤太重，先休养');
 if(s.energy<(c.energy||0))lines.push('暂不能执行：精力不足，可改选或离开');
 return lines;
}
