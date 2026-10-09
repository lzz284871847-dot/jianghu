import {skills,skillLevel,skillCap} from './progression.js?v=0.6.0';
import {npcs} from './world.js?v=0.6.0';

const locations={拳脚:['城外小路','客栈'],吐纳:['城外小路','客栈'],搬运:['青石镇','河湾村'],采药:['河边','山坡','竹林'],药材辨识:['作坊'],制药:['作坊'],锻造:['作坊'],火候控制:['作坊'],材料辨识:['作坊'],烹饪:['作坊'],经商:['粮铺'],钓鱼:['河边']};
export function studyOptions(s){return Object.entries(skills).filter(([n,k])=>skillLevel(s,n)<3&&s[k]===skillCap(s,n)).map(([n])=>[`进修${n}（Lv${skillLevel(s,n)+1} · ${12*skillLevel(s,n)}文）`,'进修：'+n])}
export function studyProblem(s,name){
 if(!Object.hasOwn(skills,name))return '没有这项技能。';
 const level=skillLevel(s,name);
 if(level===3)return '当前最高阶段已开放至Lv3。';
 if(s[skills[name]]!==skillCap(s,name))return '先完成当前技能阶段，再进修。';
 const ready=(s.studyDays?.[name]||1)+(level===1?30:90);
 if(s.day<ready)return `还需历练${ready-s.day}日，最早第${ready}日可进修。`;
 if(!locations[name].includes(s.place))return `请到${locations[name].join('或')}进修${name}。`;
 if(['拳脚','吐纳'].includes(name)&&!npcs(s).some(n=>n.id==='master'&&n.place===s.place))return '请在周师傅在场时请教进修。';
 if(name==='吐纳'&&!s.learned)return '先向周师傅学习基础吐纳。';
 if(name==='经商'&&!npcs(s).some(n=>n.id==='merchant'&&n.place===s.place))return '请在掌柜白日营业时研习经商。';
 if(s.energy<12)return '进修需要12精力，请先休息。';
 if(s.coins<12*level)return `进修费用为${12*level}文，铜钱不足。`;
 return null;
}
export function completeStudy(s,name){
 const level=skillLevel(s,name),oldCap=skillCap(s,name),fee=12*level;
 s.coins-=fee;
 if(['拳脚','吐纳'].includes(name))s.world.npcMoney.master+=fee;
 if(name==='经商')s.world.npcMoney.merchant+=fee;
 s.skillLevels[name]=level+1;s.studyDays[name]=s.day;s[skills[name]]=0;
 return `${name}进阶：Lv${level} ${oldCap}/${oldCap}【完成】 → Lv${level+1} 0/${skillCap(s,name)}；既有积累保留，需继续练习。`;
}
