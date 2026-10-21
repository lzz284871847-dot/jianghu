export const VERSION='5.56.0';
const place=(name,area,routes,minutes,text,facilities,work=false)=>({name,area,routes,minutes,text,facilities,work});
export const places={
 county:place('青河县城','县城与近郊',['market','inn','workshop','school','road','village','dock'],15,'你站在县城街口。县衙告示写着本县道路与危险地带，出城由自己决定。',['县衙告示','赵捕快接洽','许账房教学','街边短工'],true),
 market:place('县城街市','县城与近郊',['county'],15,'粮铺与杂货摊08:00–20:00营业。普通材料按标价收购，不承诺贸易利润。',['粮铺','杂货铺','顾先生识字与书法']),
 inn:place('长安客栈','县城与近郊',['county'],15,'一晚5文；手头紧也可到河湾村免费借宿。',['住宿','食物','陆老伯棋局','苏晚娘吹箫']),
 workshop:place('作坊街','县城与近郊',['county'],15,'铁匠炉与公用灶07:00–18:00开放。可先加工普通原料。',['铁匠铺','梁木匠、沈裁缝、韩皮匠','裁缝制革木工台','公用灶','作坊短工'],true),
 school:place('县城武馆','县城与近郊',['county'],15,'08:00–18:00可练习入门拳脚。武馆提供分阶武学教学和战术挑战，交手可能受伤。',['基础练习']),
 road:place('城郊官道','县城与近郊',['county','liuxi','foot'],45,'官道连接县城与柳溪集，路远但普通往来不强迫战斗。北向邻县暂未开放。',['邻县出口（未开放）']),
 village:place('河湾村','河谷与水路',['county','fields','dock','foot'],30,'村里能借宿、采常见药材；药铺08:00–18:00，可向沈医者学方，独立制药。',['药铺与制药台','免费借宿']),
 fields:place('河湾田地','河谷与水路',['village'],15,'农户允许帮忙分拣余菜；也可以做田间短工，工钱来自实际劳动。',['农户短工','余菜分拣'],true),
 dock:place('青石码头','河谷与水路',['county','village','ferry'],30,'船工06:00–18:00招短工，水边可钓鱼。',['船工短工','钓位'],true),
 ferry:place('旧渡口','河谷与水路',['dock','liuxi'],45,'沿岸步道不收船费。旧钓位鱼获不保证，雨天赶路更慢。',['河岸钓位']),
 liuxi:place('柳溪集','河谷与水路',['road','ferry','bamboo'],45,'小集08:00–18:00交易鱼、菜、药材和常用物资。',['小集商铺','集上短工'],true),
 foot:place('南山脚','山林与旧道',['village','road','bamboo','hill'],30,'可拾柴、寻药。再往山上走，开始需要准备工具与药品。',['木料','常见药材','芳草（采药10）']),
 bamboo:place('竹林','山林与旧道',['foot','hill','liuxi'],45,'落枝、野兔与小径。采集有时空手，雨天木料更难找。',['木料','硬木料（采集30）','狩猎与生皮']),
 hill:place('南山坡','山林与旧道',['foot','bamboo','mine','oldroad'],60,'山坡药材较多，狩猎也更危险；行动前明确提示擦伤风险。',['常见药材','芳草','山参根（采药30）','狩猎']),
 mine:place('旧矿洞','山林与旧道',['hill'],45,'浅层铁矿供日常冶炼，深层矿脉需要采矿经验。精铁、寒铁与陨铁碎料越来越难寻，深入采矿可能受伤。',['浅层铁矿','深层精铁','寒铁矿脉','陨铁碎料']),
 oldroad:place('山间旧道','山林与旧道',['hill'],60,'危险地段：可能遇拦路人。可以绕开；交手可能死亡，胜利没有神装。远山出口暂未开放。',['危险旧道','崖生药花（采药60）','远山出口（未开放）'])
};
export const skills={carry:'搬运',forage:'采集',herb:'采药',fish:'钓鱼',mining:'采矿',hunt:'狩猎',farming:'农耕',cook:'烹饪',smelt:'冶炼',fist:'拳脚',battle:'临战判断',trade:'经商',medicine:'制药',tailor:'裁缝',leatherwork:'制革',woodwork:'木工',navigation:'辨路',tracking:'追踪',awareness:'察看',negotiation:'交涉',literacy:'识字',accounting:'账算',calligraphy:'书法',chess:'棋艺',music:'音律'};
export const items={food:'干粮',grain:'粮食',vegetable:'蔬菜',wood:'木料',herb:'常见药材',fish:'鲜鱼',ore:'铁矿石',iron:'铁料',meat:'猎物肉',rod:'钓竿',pick:'矿镐',trap:'猎具',fine_ore:'精铁矿',cold_ore:'寒铁矿',meteor_ore:'陨铁碎料',aromatic_herb:'芳草',mountain_root:'山参根',cliff_bloom:'崖生药花',stop_powder:'止血散',wound_salve:'舒筋膏',inner_decoction:'调息汤',rescue_pill:'护命丸',cloth:'粗布',hide:'生皮',leather:'熟皮',fine_cloth:'细布',hardwood:'硬木料',cord:'绳线',vegetable_congee:'菜粥',fish_rice:'鱼饭',jerky:'肉干',herbal_meal:'养身药膳',paper:'纸张',ink:'墨料',bamboo_flute:'竹箫',calligraphy_sheet:'书法习作',trap_probe:'机关探具'};
const node=(name,places,minutes,energy,skill,chance,capacity,output,tool=null,risk=0,damage=0)=>({name,places,minutes,energy,skill,chance,capacity,output,tool,risk,damage});
export const resources={
 wood:node('拾柴整理木料',['foot','bamboo'],90,12,'forage',.75,3,{wood:2}),
 hardwood:node('辨选硬木料',['bamboo'],120,20,'forage',.50,2,{hardwood:1},null,.15,8),
 herb:node('寻找常见药材',['village','foot','hill'],90,14,'herb',.65,3,{herb:1}),
 aromatic_herb:node('辨采芳草',['foot','hill'],90,16,'herb',.60,2,{aromatic_herb:1},null,.10,5),
 mountain_root:node('挖寻山参根',['hill'],120,22,'herb',.40,2,{mountain_root:1},null,.20,9),
 cliff_bloom:node('险坡寻崖生药花',['oldroad'],150,28,'herb',.25,1,{cliff_bloom:1},null,.35,15),
 fish:node('河岸钓鱼',['dock','ferry'],90,14,'fish',.65,3,{fish:1},'rod'),
 vegetables:node('帮农户分拣余菜',['fields'],60,10,'farming',.8,2,{vegetable:1}),
 ore:node('浅层采矿',['mine'],120,20,'mining',.7,3,{ore:2},'pick',.15,8),
 fine_ore:node('深层精铁矿脉',['mine'],150,24,'mining',.45,2,{fine_ore:1},'pick',.20,9),
 cold_ore:node('寒铁矿脉',['mine'],180,28,'mining',.30,1,{cold_ore:1},'pick',.30,13),
 meteor_ore:node('陨铁碎料探寻',['mine'],210,32,'mining',.16,1,{meteor_ore:1},'pick',.40,18),
 hunt:node('布置猎具狩猎',['bamboo','hill'],150,20,'hunt',.55,2,{meat:1,hide:1},'trap',.15,8)
};
export const nodeDefs=Object.fromEntries(Object.entries(resources).flatMap(([key,d])=>d.places.map(place=>[place+':'+key,{...d,key,place}])));
export const recipes={rice:{name:'煮饭备干粮',input:{grain:2,wood:1},output:{food:3},minutes:60,energy:8,skill:'cook'},cookVegetables:{name:'做菜饭',input:{vegetable:1,grain:1,wood:1},output:{food:3},minutes:60,energy:8,skill:'cook'},smelt:{name:'炼制普通铁料',input:{ore:2,wood:1},output:{iron:1},minutes:120,energy:18,skill:'smelt'}};
export const markets={market:{open:480,close:1200,buy:{paper:2,ink:3,bamboo_flute:8,food:4,grain:2,wood:2,herb:4,rod:6,pick:14,trap:12,cloth:4,hide:5,leather:9,fine_cloth:12,cord:3},sell:{paper:1,ink:1,bamboo_flute:4,calligraphy_sheet:1,grain:1,wood:1,herb:3,fish:5,ore:3,iron:7,meat:5,vegetable:2,aromatic_herb:5,mountain_root:10,cliff_bloom:18,stop_powder:7,wound_salve:12,inner_decoction:18,rescue_pill:32,cloth:2,hide:3,leather:6,fine_cloth:8,hardwood:6,cord:2,rod:3,trap:6,pick:8,vegetable_congee:4,fish_rice:7,jerky:5,herbal_meal:8}},liuxi:{open:480,close:1080,buy:{food:5,grain:3,wood:3,herb:5,cloth:5,hide:6,leather:10,fine_cloth:14,cord:4},sell:{grain:2,wood:1,herb:4,fish:7,ore:3,iron:8,meat:6,vegetable:3,aromatic_herb:6,mountain_root:11,cliff_bloom:20,stop_powder:8,wound_salve:13,inner_decoction:20,rescue_pill:35,cloth:3,hide:4,leather:7,fine_cloth:9,hardwood:7,cord:2,rod:4,trap:7,pick:9,vegetable_congee:5,fish_rice:8,jerky:6,herbal_meal:9}}};
export const people={merchant:{name:'柳掌柜',age:43,place:'market',off:'inn',open:480,close:1200,role:'商人',line:'生意先算成本，别把所有钱都押在一趟路上。'},doctor:{name:'沈医者',age:38,place:'village',off:'inn',open:480,close:1080,role:'医者',line:'常见药材可自行处理轻伤，重伤先找我，诊金8文。'},smith:{name:'许铁匠',age:46,place:'workshop',off:'inn',open:420,close:1080,role:'铁匠',line:'普通矿石先配木料炼成铁料，好的材料以后也要有相应手艺。'},master:{name:'周师傅',age:51,place:'school',off:'inn',open:480,close:1080,role:'教习',line:'先练基础，山间旧道有危险，别凭几招拳脚就去拼命。'},boatman:{name:'贺船工',age:32,place:'dock',off:'village',open:360,close:1080,role:'船工',line:'官道和河岸都能到柳溪，雨天沿岸走得慢些。'},chessfriend:{name:'陆老伯',age:62,place:'inn',off:'county',open:480,close:1080,role:'棋友（退休脚夫）',line:'走了半辈子路，闲下来爱下棋。输赢只论棋，不赌钱。'},musician:{name:'苏晚娘',age:29,place:'inn',off:'dock',open:480,close:1080,role:'乐师',line:'白天在客栈教吹箫，收工去码头练曲。乐器自备，卖艺也不是每次有人捧场。'},scribe:{name:'顾文轩',age:32,place:'market',off:'inn',open:480,close:1080,role:'代书先生',line:'我在街市代写书信。认字先从常见告示学起，认字扎实后，可以跟我练书法、代写家书。'},bookkeeper:{name:'许账房',age:45,place:'county',off:'inn',open:480,close:1080,role:'账房先生',line:'收入不等于利润；材料、租金和做坏的损耗都要算。'},carpenter:{name:'梁木匠',age:41,place:'workshop',off:'inn',open:480,close:1080,role:'木匠',line:'先学量料和榫接。材料自己备，公用台也能自己练手。'},tailor:{name:'沈裁缝',age:36,place:'workshop',off:'inn',open:480,close:1080,role:'裁缝',line:'下剪先看尺寸，布料用坏了不能凭空补回来。'},tanner:{name:'韩皮匠',age:48,place:'workshop',off:'inn',open:480,close:1080,role:'皮匠',line:'鞣皮看火候，熟皮仍要亲手做；我只教制革，不教医术。'},farmer:{name:'陈农户',age:57,place:'fields',off:'village',open:360,close:1080,role:'农户',line:'忙时招人整地，分拣后的余菜可以带走，不能直接拿地里的庄稼。'}};
export const talents={ordinary:{name:'平常资质',text:'没有隐藏加成。'},observant:{name:'观察细致',text:'寻找资源成功率增加3个百分点。'},enduring:{name:'耐劳',text:'工作与采集精力消耗减少2。'}};
