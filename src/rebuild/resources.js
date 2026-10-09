import {progress} from './progression.js?v=1.0.29';
// 采集数据：工具可重复使用，精简版不模拟耐久、矿场经营或动物种群。
export const resources={
 gather:{name:'采药',hours:2,energy:16,skill:'herb',chance:0.62,output:{herb:1},success:'采到草药×1。',failure:'找了两小时，这次没有合适的药材。'},
 fish:{name:'钓鱼',hours:2,energy:16,skill:'fish',chance:0.62,tool:'rod',output:{fish:1},success:'钓得鲜鱼×1。钓竿仍可继续使用。',failure:'这次没有钓到鱼。'},
 hunt:{name:'布置猎具捕猎',hours:3,energy:20,skill:'hunt',chance:0.6,tool:'trap',output:{meat:1},success:'布置猎具、等候并收取后，捕到一只野兔，整理出猎物肉×1。猎具仍可继续使用。',failure:'等候三小时，猎具里空空如也。这次没有猎获，猎具仍可继续使用。'},
 collectWood:{name:'拾柴整理木料',hours:2,energy:12,skill:'forage',chance:0.8,output:{wood:2},success:'挑出干燥结实的落枝，整理成木料×2，可作燃料或简单木柄。',failure:'落枝多已受潮腐朽，这次没有合用的木料。'},
 mine:{name:'浅层采矿',hours:2,energy:20,skill:'mining',chance:0.65,tool:'tool',output:{ore:1},success:'在露天旧矿点采得铁矿石×1，需去作坊炼成铁料，不能直接打造。',failure:'清理了碎石，这次没有找到合用的铁矿石。'}
};

// 概率以本次行动结束后的精力计算，与实际结算及界面共用。
export function resourceChance(s,r){return Math.min(0.95,r.chance+(progress(s.skills[r.skill]).level-1)*0.02)*(s.energy-r.energy<20?0.75:1)}
