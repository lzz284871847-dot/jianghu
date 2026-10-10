import {locations,items,jobs} from './content.js?v=1.0.48';
import {travel,equip,act,trade,acceptJob,lesson} from './engine.js?v=1.0.48';
const aliases={买房:'buyHome',买旧屋:'buyHome',购买镇上旧屋:'buyHome',回屋睡觉:'sleep',考较:'assessment',基础考较:'assessment',参加基础考较:'assessment',等半小时:'wait30',等候半小时:'wait30',等30分钟:'wait30',等待30分钟:'wait30',等一小时:'wait60',等候一小时:'wait60',等1小时:'wait60',等60分钟:'wait60',请教锻造:'forgeLesson',请教基础锻造:'forgeLesson',种菜:'plant',播种:'plant',借地播种:'plant',照料菜地:'tend',浇水:'tend',收菜:'harvest',收获蔬菜:'harvest',做菜饭:'cookVegetables',做菜饭干粮:'cookVegetables',狩猎:'hunt',捕猎:'hunt',布置猎具捕猎:'hunt',制作猎具:'craftTrap',制作简易猎具:'craftTrap',做烤肉干粮:'cookMeat',烤肉:'cookMeat',制药:'brew',调制药膏:'brew',调制普通药膏:'brew',用药膏:'useSalve',使用普通药膏:'useSalve',制作木棍:'craftStaff',打造木棍:'craftStaff',锻造普通铁剑:'craftSword',打造铁剑:'craftSword',锻造铁剑:'craftSword',拾柴:'collectWood',捡柴:'collectWood',整理木料:'collectWood',采矿:'mine',浅层采矿:'mine',炼铁:'smelt',炼制铁料:'smelt',休息:'rest',歇息:'rest',睡觉:'sleep',练拳:'train',练习拳脚:'train',吐纳:'inner',吐纳修炼:'inner',采药:'gather',采集草药:'gather',钓鱼:'fish',打零工:'work',打造工具:'forge',做鱼饭:'cook',吃干粮:'eat',用草药:'heal',治疗:'treat',探索:'explore',切磋:'spar',交货:'deliver',完成约定:'deliver'};
const placeAliases={柳溪集:'liuxi',旧渡口:'ferry',渡口:'ferry',街市:'town',小镇:'town',青石镇:'town',客栈:'inn',作坊:'forge',码头:'dock',村庄:'village',河湾村:'village',城外:'road',城外小路:'road',山坡:'hill',南山坡:'hill',竹林:'bamboo'};
const lessons={请教拳脚:'unarmed',请教棍法:'staff',请教剑术:'sword'};
const practice={练拳:'unarmed',练习拳脚:'unarmed',练剑:'sword',练习剑术:'sword',练棍:'staff',练习棍法:'staff'};
export function parseCommand(input){
 const value=String(input).trim().replace(/[。！!\s]/g,'').replace(/^我想|^我要|^我/,'');
 if(Object.hasOwn(lessons,value))return {kind:'lesson',key:lessons[value]};
 if(Object.hasOwn(practice,value))return {kind:'practice',key:practice[value]};
 if(value==='卸下兵器')return {kind:'equip',key:'unarmed'};
 if(value.startsWith('装备')||value.startsWith('换用')){const name=value.slice(2),key=name==='木棍'?'staff':['铁剑','普通铁剑'].includes(name)?'sword':name==='空手'?'unarmed':null;if(key)return {kind:'equip',key}}
 if(Object.hasOwn(aliases,value))return {kind:'act',key:aliases[value]};
 if(value.startsWith('去')){const name=value.slice(1),key=placeAliases[name]||Object.keys(locations).find(k=>locations[k].name===name);if(key)return {kind:'travel',key}}
 const bulk=value.match(/^([买卖])(.+?)([0-9]+)(?:份|件|条)$/);if(bulk){const key=Object.keys(items).find(k=>items[k]===bulk[2]),quantity=Number(bulk[3]);if(key&&Number.isInteger(quantity)&&quantity>=1&&quantity<=20)return {kind:'trade',key,type:bulk[1]==='买'?'buy':'sell',quantity};return null}
 if(value.startsWith('买')||value.startsWith('卖')){const key=Object.keys(items).find(k=>items[k]===value.slice(1));if(key)return {kind:'trade',key,type:value[0]==='买'?'buy':'sell'}}
 if(value.startsWith('接')){const key=Object.keys(jobs).find(k=>jobs[k].name===value.slice(1));if(key)return {kind:'job',key}}
 return null;
}
export function command(s,input){
 const parsed=parseCommand(input);if(!parsed){s.result=['暂时无法理解这项行动。可输入：去码头、钓鱼、打零工、接码头卸货、买铁料、休息。多项安排用分号隔开。'];return false}
 const {kind,key,type,quantity}=parsed;
 if(kind==='lesson')return lesson(s,key);
 if(kind==='practice'){if(s.weapon!==key){s.result=['先在背包中换用对应兵器，再进行这项练习。'];return false}return act(s,'train')}
 if(kind==='equip')return equip(s,key);if(kind==='act')return act(s,key);if(kind==='travel')return travel(s,key);if(kind==='trade')return trade(s,type,key,quantity);return acceptJob(s,key);
}
