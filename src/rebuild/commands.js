import {locations,items,jobs} from './content.js?v=1.0.2';
import {travel,act,trade,acceptJob} from './engine.js?v=1.0.2';
const aliases={休息:'rest',歇息:'rest',睡觉:'sleep',练拳:'train',练习拳脚:'train',吐纳:'inner',吐纳修炼:'inner',采药:'gather',采集草药:'gather',钓鱼:'fish',打零工:'work',打造工具:'forge',做鱼饭:'cook',吃干粮:'eat',用草药:'heal',治疗:'treat',探索:'explore',切磋:'spar',交货:'deliver',完成约定:'deliver'};
const placeAliases={街市:'town',小镇:'town',青石镇:'town',客栈:'inn',作坊:'forge',码头:'dock',村庄:'village',河湾村:'village',城外:'road',城外小路:'road',山坡:'hill',南山坡:'hill',竹林:'bamboo'};
export function command(s,input){
 const value=String(input).trim().replace(/[。！!\s]/g,'').replace(/^我想|^我要|^我/,'');
 if(Object.hasOwn(aliases,value))return act(s,aliases[value]);
 if(value.startsWith('去')){const name=value.slice(1),to=placeAliases[name]||Object.keys(locations).find(k=>locations[k].name===name);if(to)return travel(s,to)}
 if(value.startsWith('买')||value.startsWith('卖')){const key=Object.keys(items).find(k=>items[k]===value.slice(1));if(key)return trade(s,value[0]==='买'?'buy':'sell',key)}
 if(value.startsWith('接')){const id=Object.keys(jobs).find(k=>jobs[k].name===value.slice(1));if(id)return acceptJob(s,id)}
 s.result=['暂时无法理解这项行动。可输入：去码头、钓鱼、打零工、接码头卸货、买铁料、休息。每次处理一项行动。'];return false;
}
