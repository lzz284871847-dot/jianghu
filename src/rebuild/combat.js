import {progress} from './progression.js?v=1.0.24';
import {attackFactor} from './condition.js?v=1.0.24';
import {currentWeapon} from './equipment.js?v=1.0.24';
export function combatCost(s,id){return id==='flee'?Math.min(3,s.energy):id==='heavy'?8:id==='inner'?6:4}
export function heavyChance(s){
 const level=progress(s.skills[currentWeapon(s).skill]).level;
 const base=Math.min(0.95,0.75+Math.min(4,level-1)*0.03+(s.combat?.prepared?0.1:0));
 return base*(s.energy-8<20?0.8:1)*(s.hp<30?0.8:1);
}
export function strike(s,id,rng){
 const weapon=currentWeapon(s),prepared=s.combat?.prepared?2:0;
 const chance=id==='heavy'?heavyChance(s):1;
 if(id==='heavy'&&rng()>=chance)return {damage:0,hit:false};
 const base=8+Math.min(4,progress(s.skills[weapon.skill]).level-1)+weapon.bonus+prepared+(id==='inner'?2:0);
 return {damage:Math.floor(base*(id==='heavy'?1.5:1)*attackFactor(s,combatCost(s,id))),hit:true};
}
