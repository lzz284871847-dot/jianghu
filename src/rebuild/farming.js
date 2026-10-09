// 一块借用菜地，七个游戏日一茬：轻量种植规则，不模拟农场账目。
export function farmStatus(s){return !s.plot?'菜地空闲：菜种1、借地2文可播种，七个游戏日成熟。':`河湾村菜地：${s.day>=s.plot.readyDay?'已成熟，可收获':'距成熟还有'+(s.plot.readyDay-s.day)+'日'}；已照料${s.plot.careDays.length}/3次，预计蔬菜${3+s.plot.careDays.length}份。`}
export function farmBlocker(s,id){
 if(s.hp<25)return '受伤太重，先休养再下地。';
 if(id==='plant'){if(s.plot)return '已有一茬作物，请收获后再播种。';if(!s.bag.seed)return '需要菜种1，可在街市购买。';if(s.coins<2)return '每茬借地需要2文。';return null}
 if(!s.plot)return '菜地尚未播种。';
 if(id==='harvest')return s.day<s.plot.readyDay?'作物尚未成熟，请按游戏日等待。':null;
 if(s.day>=s.plot.readyDay)return '已经成熟，无需继续照料，可安排收获。';
 if(s.plot.careDays.includes(s.day))return '今日已经照料过，不重复消耗时间和精力。';
 return s.plot.careDays.length>=3?'本茬已经充分照料，无需重复劳作。':null;
}
export const farmActions={
 plant:{minutes:120,energy:16,xp:2,run(s){s.bag.seed--;s.coins-=2;const day=s.day+Math.floor((s.minute+120)/1440);s.plot={plantedDay:day,readyDay:day+7,careDays:[]};s.result.push('播种完成：菜种 -1、借地 -2文。七个游戏日成熟，最多照料三次；不照料也有基础收成。')}},
 tend:{minutes:60,energy:8,xp:1,run(s){s.plot.careDays.push(s.day);s.result.push('除草与浇灌完成，预计收成增加1份；每天最多一次，每茬最多三次。')}},
 harvest:{minutes:120,energy:16,xp:2,run(s){const n=3+s.plot.careDays.length;s.bag.vegetable+=n;s.plot=null;s.result.push(`本次收获：蔬菜×${n}；当前库存：蔬菜 ${s.bag.vegetable}。菜地重新空闲。`);}}
};
export function validPlot(s){
 const p=s.plot;if(p===null)return true;
 const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 return !!p&&typeof p==='object'&&!Array.isArray(p)&&int(p.plantedDay,1,s.day)&&p.readyDay===p.plantedDay+7&&Array.isArray(p.careDays)&&p.careDays.length<=3&&new Set(p.careDays).size===p.careDays.length&&p.careDays.every(d=>int(d,p.plantedDay,Math.min(s.day,p.readyDay-1)));
}
