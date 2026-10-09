// 采集数据：工具可重复使用，精简版不模拟耐久或矿场经营。
export const resources={
 collectWood:{name:'拾柴整理木料',hours:2,energy:12,skill:'forage',chance:0.8,output:{wood:2},success:'挑出干燥结实的落枝，整理成木料×2，可作燃料或简单木柄。',failure:'落枝多已受潮腐朽，这次没有合用的木料。'},
 mine:{name:'浅层采矿',hours:2,energy:20,skill:'mining',chance:0.65,tool:'tool',output:{ore:1},success:'在露天旧矿点采得铁矿石×1，需去作坊炼成铁料，不能直接打造。',failure:'清理了碎石，这次没有找到合用的铁矿石。'}
};
