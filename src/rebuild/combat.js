import {activeArt} from './martial.js?v=1.0.52';
import {progress} from './progression.js?v=1.0.52';
import {attackFactor} from './condition.js?v=1.0.52';
import {currentWeapon} from './equipment.js?v=1.0.52';
export function battleBonus(s){return Math.min(2,Math.floor(progress(s.skills.battle||0).level/2))}
export function combatCost(s,id){return id==='flee'?Math.min(3,s.energy):id==='heavy'?8:['inner','counter','art'].includes(id)?6:4}
export function heavyChance(s){
 const level=progress(s.skills[currentWeapon(s).skill]).level;
 const base=Math.min(0.95,0.75+Math.min(4,level-1)*0.03+(s.combat?.prepared?0.1:0));
 return base*(s.energy-8<20?0.8:1)*(s.hp<30?0.8:1);
}
export function strike(s,id,rng){
 const weapon=currentWeapon(s),prepared=s.combat?.prepared?2:0;
 const chance=id==='heavy'?heavyChance(s):1;
 if(id==='heavy'&&rng()>=chance)return {damage:0,hit:false};
 const art=activeArt(s),artBonus=id==='art'&&art?(s.art==='steadySword'?Math.min(2,progress(s.skills[s.art]).level): -2):0;
 const base=8+artBonus+battleBonus(s)+Math.min(4,progress(s.skills[weapon.skill]).level-1)+weapon.bonus+prepared+(['inner','counter'].includes(id)?2:0);
 const guard=s.combat?.name==='持棍拦路人'&&!['heavy','counter'].includes(id)?2:0;return {damage:Math.max(1,Math.floor(base*(id==='heavy'?1.5:1)*attackFactor(s,combatCost(s,id)))-guard),hit:true};
}

// 普通基础考较，仅记录通过日期，不授予隐藏加成或额外奖励。
export function assessmentBlocker(s){
 const w=currentWeapon(s);
 if(s.assessments?.[s.weapon])return '这项基础考较已经通过，不重复发放记录。';
 if(progress(s.skills[w.skill]).level<2)return '当前兵器对应的基础武学需达到Lv2。';
 if(s.hp<70)return '考较前气血至少70，先养好伤。';
 if(s.energy<40)return '考较前精力至少40，先歇息。';
 return null;
}

export function counterBlocker(s){
 if(progress(s.skills[currentWeapon(s).skill]).level<2)return '对应基础武学达到Lv2才能拆招反击。';
 if(!s.combat?.prepared)return '先防守蓄势，才能拆招反击。';
 if(s.energy<6)return '拆招反击需要精力6。';
 return null;
}

// 对手只有一项可见特点，不增加敌人技能或隐藏状态。
export function banditForPlace(place){return place==='hill'?{name:'持棍拦路人',hp:40,attack:6,spar:false}:{name:'拦路人',hp:32,attack:8,spar:false}}
export function opponentHint(name){return name==='持棍拦路人'?'棍架护身：普通与运功出招伤害减少2；重击或拆招反击可以破架，不受这项减伤。':'出手较急，没有护身棍架。'}
