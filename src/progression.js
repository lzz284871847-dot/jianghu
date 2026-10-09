export const skills={拳脚:'skill',吐纳:'inner',搬运:'carry',采药:'gather',药材辨识:'identify',制药:'medicine',锻造:'forge',火候控制:'heat',材料辨识:'materials',烹饪:'cook',经商:'tradeXP',钓鱼:'fishing'};
export const stageCaps=[100,300,600];
export function skillLevel(s,name){return s.skillLevels?.[name]||1}
export function skillCap(s,name){return stageCaps[skillLevel(s,name)-1]}
export function canGrow(s,name){return s[skills[name]]<skillCap(s,name)}
// 已完成阶段的积累保留，数值收益封顶，进阶不是突然变强。
export function mastery(s,name){return Math.min(200,stageCaps.slice(0,skillLevel(s,name)-1).reduce((a,b)=>a+b,0)+(s[skills[name]]||0))}
export function gain(s,name,amount){const key=skills[name],before=s[key]||0,cap=skillCap(s,name);const add=Math.min(cap-before,Math.max(0,Math.floor(amount)));s[key]=before+add;return `${name} Lv${skillLevel(s,name)}：${before}/${cap} → ${s[key]}/${cap}（+${add}）${s[key]===cap?'【完成】':''}`}
export function skillLines(s){return Object.entries(skills).map(([n,k])=>`${n} Lv${skillLevel(s,n)}：${s[k]||0}/${skillCap(s,n)}${s[k]===skillCap(s,n)?'【完成】':''}`)}
export function date(s){const d=s.day-1;return `江湖历${1+Math.floor(d/360)}年${1+Math.floor(d%360/30)}月${1+d%30}日 · ${String(s.hour).padStart(2,'0')}:${String(s.minute||0).padStart(2,'0')}`}
export const items={food:'干粮',herbs:'草药',iron:'铁料',wood:'木料',powder:'药粉',tools:'铁制工具',fish:'鲜鱼',rod:'钓竿'};
export const recipes={
'制作药粉':{hours:2,energy:16,input:{herbs:2},output:{powder:1},skills:['制药','药材辨识']},
'锻造工具':{hours:3,energy:24,input:{iron:2,wood:1},output:{tools:1},skills:['锻造','火候控制','材料辨识']},
'烹制鱼食':{hours:1,energy:8,input:{fish:1,wood:1},output:{food:2},skills:['烹饪']},
'烹煮干粮':{hours:1,energy:8,input:{food:1,wood:1},output:{food:2},skills:['烹饪']}
};
