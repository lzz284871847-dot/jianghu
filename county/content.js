export const VERSION='0.1.0';
const place=(name,area,routes,minutes,text,facilities,work=false)=>({name,area,routes,minutes,text,facilities,work});
export const places={
 county:place('青河县城','县城与近郊',['market','inn','workshop','school','road','village','dock'],15,'你站在县城街口。县衙告示写着本县道路与危险地带，出城由自己决定。',['县衙告示','街边短工'],true),
 market:place('县城街市','县城与近郊',['county'],15,'粮铺与杂货摊08:00–20:00营业。普通材料按标价收购，不承诺贸易利润。',['粮铺','杂货铺']),
 inn:place('长安客栈','县城与近郊',['county'],15,'一晚5文；手头紧也可到河湾村免费借宿。',['住宿','食物']),
 workshop:place('作坊街','县城与近郊',['county'],15,'铁匠炉与公用灶07:00–18:00开放。可先加工普通原料。',['铁匠铺','公用灶','作坊短工'],true),
 school:place('县城武馆','县城与近郊',['county'],15,'08:00–18:00可练习入门拳脚。完整武学与战斗成长将在下一系统批次制作。',['基础练习']),
 road:place('城郊官道','县城与近郊',['county','liuxi','foot'],45,'官道连接县城与柳溪集，路远但普通往来不强迫战斗。北向邻县暂未开放。',['邻县出口（未开放）']),
 village:place('河湾村','河谷与水路',['county','fields','dock','foot'],30,'村里能借宿、采常见药材，医者08:00–18:00坐诊。',['药铺','免费借宿']),
 fields:place('河湾田地','河谷与水路',['village'],15,'农户允许帮忙分拣余菜；也可以做田间短工，工钱来自实际劳动。',['农户短工','余菜分拣'],true),
 dock:place('青石码头','河谷与水路',['county','village','ferry'],30,'船工06:00–18:00招短工，水边可钓鱼。',['船工短工','钓位'],true),
 ferry:place('旧渡口','河谷与水路',['dock','liuxi'],45,'沿岸步道不收船费。旧钓位鱼获不保证，雨天赶路更慢。',['河岸钓位']),
 liuxi:place('柳溪集','河谷与水路',['road','ferry','bamboo'],45,'小集08:00–18:00交易鱼、菜、药材和常用物资。',['小集商铺','集上短工'],true),
 foot:place('南山脚','山林与旧道',['village','road','bamboo','hill'],30,'可拾柴、寻药。再往山上走，开始需要准备工具与药品。',['木料','常见药材']),
 bamboo:place('竹林','山林与旧道',['foot','hill','liuxi'],45,'落枝、野兔与小径。采集有时空手，雨天木料更难找。',['木料','狩猎']),
 hill:place('南山坡','山林与旧道',['foot','bamboo','mine','oldroad'],60,'山坡药材较多，狩猎也更危险；行动前明确提示擦伤风险。',['常见药材','狩猎']),
 mine:place('旧矿洞','山林与旧道',['hill'],45,'本批只开放入口浅层铁矿。深层好矿料已有分布规划，待装备与生产用途完成后开放。',['浅层铁矿','深层矿区（未开放）']),
 oldroad:place('山间旧道','山林与旧道',['hill'],60,'危险地段：可能遇拦路人。可以绕开；交手可能死亡，胜利没有神装。远山出口暂未开放。',['危险旧道','远山出口（未开放）'])
};
export const skills={carry:'搬运',forage:'采集',herb:'采药',fish:'钓鱼',mining:'采矿',hunt:'狩猎',farming:'农耕',cook:'烹饪',smelt:'冶炼',fist:'拳脚',battle:'临战判断',trade:'经商'};
export const items={food:'干粮',grain:'粮食',vegetable:'蔬菜',wood:'木料',herb:'常见药材',fish:'鲜鱼',ore:'铁矿石',iron:'铁料',meat:'猎物肉',rod:'钓竿',pick:'矿镐',trap:'猎具'};
const node=(name,places,minutes,energy,skill,chance,capacity,output,tool=null,risk=0,damage=0)=>({name,places,minutes,energy,skill,chance,capacity,output,tool,risk,damage});
export const resources={
 wood:node('拾柴整理木料',['foot','bamboo'],90,12,'forage',.75,3,{wood:2}),
 herb:node('寻找常见药材',['village','foot','hill'],90,14,'herb',.65,3,{herb:1}),
 fish:node('河岸钓鱼',['dock','ferry'],90,14,'fish',.65,3,{fish:1},'rod'),
 vegetables:node('帮农户分拣余菜',['fields'],60,10,'farming',.8,2,{vegetable:1}),
 ore:node('浅层采矿',['mine'],120,20,'mining',.7,3,{ore:2},'pick',.15,8),
 hunt:node('布置猎具狩猎',['bamboo','hill'],150,20,'hunt',.55,2,{meat:1},'trap',.15,8)
};
export const nodeDefs=Object.fromEntries(Object.entries(resources).flatMap(([key,d])=>d.places.map(place=>[place+':'+key,{...d,key,place}])));
export const recipes={rice:{name:'煮饭备干粮',input:{grain:2,wood:1},output:{food:3},minutes:60,energy:8,skill:'cook'},cookVegetables:{name:'做菜饭',input:{vegetable:1,grain:1,wood:1},output:{food:3},minutes:60,energy:8,skill:'cook'},smelt:{name:'炼制普通铁料',input:{ore:2,wood:1},output:{iron:1},minutes:120,energy:18,skill:'smelt'}};
export const markets={market:{open:480,close:1200,buy:{food:4,grain:2,wood:2,herb:4,rod:6,pick:14,trap:12},sell:{wood:1,herb:3,fish:5,ore:3,iron:7,meat:5,vegetable:2}},liuxi:{open:480,close:1080,buy:{food:5,grain:3,wood:3,herb:5},sell:{wood:1,herb:4,fish:7,ore:3,iron:8,meat:6,vegetable:3}}};
export const people={merchant:{name:'柳掌柜',age:43,place:'market',off:'inn',open:480,close:1200,role:'商人',line:'生意先算成本，别把所有钱都押在一趟路上。'},doctor:{name:'沈医者',age:38,place:'village',off:'inn',open:480,close:1080,role:'医者',line:'常见药材可自行处理轻伤，重伤先找我，诊金8文。'},smith:{name:'许铁匠',age:46,place:'workshop',off:'inn',open:420,close:1080,role:'铁匠',line:'普通矿石先配木料炼成铁料，好的材料以后也要有相应手艺。'},master:{name:'周师傅',age:51,place:'school',off:'inn',open:480,close:1080,role:'教习',line:'先练基础，山间旧道有危险，别凭几招拳脚就去拼命。'},boatman:{name:'贺船工',age:32,place:'dock',off:'village',open:360,close:1080,role:'船工',line:'官道和河岸都能到柳溪，雨天沿岸走得慢些。'},farmer:{name:'陈农户',age:57,place:'fields',off:'village',open:360,close:1080,role:'农户',line:'忙时招人整地，分拣后的余菜可以带走，不能直接拿地里的庄稼。'}};
export const talents={ordinary:{name:'平常资质',text:'没有隐藏加成。'},observant:{name:'观察细致',text:'寻找资源成功率增加3个百分点。'},enduring:{name:'耐劳',text:'工作与采集精力消耗减少2。'}};
