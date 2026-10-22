// Fixed playable batch: bounded county content, no population or lifecycle simulation.
export const QUESTS={
 medicine:{name:'河湾急用药材',giver:'doctor',from:'village',reward:12,days:3,description:'领取后3日内交付自己现有药材2份，报酬12文由沈医者支付；可撤回，无罚款。'},
 parcel:{name:'竹林失物',giver:'merchant',from:'market',reward:10,days:3,description:'到竹林搜寻失落货包：1小时/精力12，70%找回；找到后回街市交还，报酬10文。未找到也有结局，不可反复领取。'},
 escort:{name:'沿岸护送行脚人',giver:'boatman',payer:'stallholder',from:'dock',reward:14,days:3,description:'码头领取，经旧渡口到柳溪集交付；渡口可走稳妥步道或冒险抄近路。柳溪集魏婶支付报酬14文，无垫资、无强迫战斗。完成后可接新一趟，每日最多新接一次，仍须实际走完路线。'},
 rescue:{name:'南山采药人救援',giver:'doctor',from:'village',reward:20,days:2,description:'县境成长第二阶段后开放；携自己药材1份到南山坡救助，1小时/精力16，70%成功，30%擦伤8气血。回村结算20文。'}
};
export const SITES={
 bamboo:{name:'竹林废棚',minutes:60,energy:12,chance:.75,risk:.20,damage:6,goods:{wood:2},description:'棚内散落木料2份；75%找到，20%擦伤6气血。只可搜寻一次，可先离开。'},
 ferry:{name:'旧渡口药篓',minutes:45,energy:10,chance:.65,risk:.10,damage:4,goods:{herb:1},description:'旧药篓有合用药材1份；65%找到，10%擦伤4气血。只可搜寻一次。'},
 mine:{name:'矿洞遗留矿堆',minutes:90,energy:18,chance:.70,risk:.25,damage:8,goods:{ore:2},description:'遗留浅层铁矿2份；需矿镐，70%取得，25%擦伤8气血。只可搜寻一次，不产高级矿。'}
};
export const ORGANIZATIONS={school:{name:'青河武馆',place:'school',holder:'master',description:'已学一门武艺且教习关系3后，可付12文入馆；完成委托或一次公开切磋积累贡献，贡献3后陪练费降至3文。'},caravan:{name:'行脚互助会',place:'market',holder:'merchant',description:'完成一条委托后可付12文加入；贡献2后每天可付3文向柳掌柜购买一份现有口粮，须其余粮至少2份。'}};
export const CAREERS={
 porter:{name:'熟手搬运',place:'dock',holder:'boatman',skill:'carry',required:12,input:{},reward:12,minutes:120,energy:18,description:'搬运积累12后验收；开放熟手装船：2小时/精力18，报酬12文来自现有商铺劳务资金，每日一份。'},
 smith:{name:'作坊熟手',place:'workshop',holder:'smith',skill:'smelt',required:10,input:{iron:2},reward:20,minutes:60,energy:10,description:'冶炼积累10后验收；开放铁料订单：交铁料2份，1小时/精力10，报酬20文来自现有商铺作业资金，每日一份。'},
 herb:{name:'采药帮手',place:'village',holder:'doctor',skill:'herb',required:10,input:{herb:2},reward:12,minutes:60,energy:10,description:'采药积累10后验收；开放诊所药材订单：交药材2份，1小时/精力10，报酬12文来自现有商铺药材资金，每日一份。'}
};
