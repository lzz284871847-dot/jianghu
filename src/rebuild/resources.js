// 采集数据：工具可重复使用，精简版不模拟耐久、矿场经营或动物种群。
export const resources={
 hunt:{name:'布置猎具捕猎',hours:3,energy:20,skill:'hunt',chance:0.6,tool:'trap',output:{meat:1},success:'布置猎具、等候并收取后，捕到一只野兔，整理出猎物肉×1。猎具仍可继续使用。',failure:'等候三小时，猎具里空空如也。这次没有猎获，猎具仍可继续使用。'},
 collectWood:{name:'拾柴整理木料',hours:2,energy:12,skill:'forage',chance:0.8,output:{wood:2},success:'挑出干燥结实的落枝，整理成木料×2，可作燃料或简单木柄。',failure:'落枝多已受潮腐朽，这次没有合用的木料。'},
 mine:{name:'浅层采矿',hours:2,energy:20,skill:'mining',chance:0.65,tool:'tool',output:{ore:1},success:'在露天旧矿点采得铁矿石×1，需去作坊炼成铁料，不能直接打造。',failure:'清理了碎石，这次没有找到合用的铁矿石。'}
};
