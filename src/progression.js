export const skills={拳脚:'skill',吐纳:'inner',搬运:'carry',采药:'gather',药材辨识:'identify',制药:'medicine',锻造:'forge',火候控制:'heat',材料辨识:'materials',烹饪:'cook',经商:'tradeXP'};
export function gain(s,name,amount){const key=skills[name],before=s[key]||0;const add=Math.min(100-before,Math.max(0,Math.floor(amount)));s[key]=before+add;return `${name} Lv1：${before}/100 → ${s[key]}/100（+${add}）${s[key]===100?'【完成】':''}`}
export function skillLines(s){return Object.entries(skills).map(([n,k])=>`${n} Lv1：${s[k]||0}/100${s[k]===100?'【完成】':''}`)}
export function date(s){const d=s.day-1;return `江湖历${1+Math.floor(d/360)}年${1+Math.floor(d%360/30)}月${1+d%30}日 · ${String(s.hour).padStart(2,'0')}:00`}
export const items={food:'干粮',herbs:'草药',iron:'铁料',wood:'木料',powder:'药粉',tools:'铁制工具'};
export const recipes={
'制作药粉':{hours:2,energy:16,input:{herbs:2},output:{powder:1},skills:['制药','药材辨识']},
'锻造工具':{hours:3,energy:24,input:{iron:2,wood:1},output:{tools:1},skills:['锻造','火候控制','材料辨识']},
'烹煮干粮':{hours:1,energy:8,input:{food:1,wood:1},output:{food:2},skills:['烹饪']}
};
