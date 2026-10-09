// 内容与规则分开：全部事件、人物和行动均来自代码，不使用生成式剧情。
export const locations={
 town:{name:'青石镇',tag:'街市 · 买卖与接活',text:'石板路两旁是粮铺和茶摊。有人赶集，有人找活，也有人只是坐着听闲话。',routes:['inn','forge','dock','village','road'],actions:['work','browse']},
 inn:{name:'长安客栈',tag:'歇脚 · 消息与人物',text:'窗边的旅人喝着茶，店小二收拾空碗。周师傅收工后常来这里歇脚。',routes:['town'],actions:['sleep','browse']},
 forge:{name:'周记作坊',tag:'手艺 · 打造与烹饪',text:'炉边摆着铁料和木柄。这里接小件农具的活，手艺可以从最普通的一把锄头练起。',routes:['town'],actions:['forge','cook','cookMeat','cookVegetables','smelt','craftStaff','craftSword','craftTrap']},
 dock:{name:'青石码头',tag:'谋生 · 搬货与钓鱼',text:'船工吆喝着卸货，河岸边也有安静的钓位。靠力气和耐心，都能谋一份生活。',routes:['town','village'],actions:['work','fish']},
 village:{name:'河湾村',tag:'邻里 · 采药与休养',text:'田埂穿过村舍，沈医者在院中晾药。村民愿意让过路人借宿，药炉也能借用；先向沈医者学习基础制药。',routes:['town','dock','hill'],actions:['gather','sleep','brew','plant','tend','harvest']},
 road:{name:'城外小路',tag:'江湖 · 练拳与探索',text:'周师傅白日在树荫下教拳。再往远处走，便是行脚人和商队经过的竹林。',routes:['town','hill','bamboo'],actions:['train','explore']},
 hill:{name:'南山坡',tag:'野外 · 草药与行路',text:'山风吹过草丛，旧道绕向竹林。草药不会处处都有，旧矿点可采矿，草丛间可用简易猎具捕猎，也可以只是看看路。',routes:['village','road','bamboo'],actions:['gather','mine','hunt','explore']},
 bamboo:{name:'竹林',tag:'野外 · 练武与偶遇',text:'竹影落在土路上，脚步声在林间格外清楚。这里适合练拳，也能捡拾落枝整理木料，遇事可以转身离开。',routes:['road','hill'],actions:['train','gather','collectWood','explore']}
};
export const skills={fist:'拳脚',inner:'吐纳',carry:'搬运',herb:'采药',forge:'锻造',cook:'烹饪',trade:'经商',fish:'钓鱼',staff:'棍法',sword:'剑术',forage:'采集',mining:'采矿',woodwork:'木工',medicine:'制药',hunt:'狩猎',farming:'农耕',escort:'护送',battle:'临战判断'};
export const items={food:'干粮',herb:'草药',iron:'铁料',wood:'木料',tool:'铁制工具',fish:'鲜鱼',rod:'钓竿',staff:'木棍',sword:'普通铁剑',ore:'铁矿石',salve:'普通药膏',trap:'简易猎具',meat:'猎物肉',seed:'菜种',vegetable:'蔬菜'};
export const people={
 artisan:{gift:'iron',name:'许铁匠',role:'作坊铁匠',personality:'务实',interest:'炉火与农具',goal:'把农具做好，也教新手学会基本手艺',line:'先学会看火色和落锤，再想打什么名剑。普通农具做结实了，也是一门饭碗。'},
 master:{gift:'food',name:'周师傅',role:'基础武艺师傅',personality:'直爽',interest:'习武与喝茶',goal:'把基础拳脚、棍法与剑术教给肯下功夫的人',line:'学拳是为了站稳脚跟，能不打的时候，也要懂得不打。'},
 merchant:{gift:'fish',name:'柳掌柜',role:'街市商人',personality:'精明',interest:'各地货价',goal:'把小铺经营好',line:'做买卖先从一两件货开始，赔得起，才学得会。'},
 doctor:{gift:'herb',name:'沈医者',role:'乡村医者',personality:'温和',interest:'草药与乡邻',goal:'收齐本月常用的药材',line:'山上寻药也要量力，受了伤就别硬撑。'},
 porter:{gift:'food',name:'阿平',role:'码头脚夫',personality:'随和',interest:'船上的见闻',goal:'攒钱修一修家里的屋顶',line:'码头有活就做，没活的时候，我也会钓两条鱼。'}
};
export const npcSchedules={master:{place:'road',from:7,to:18,off:'inn'},merchant:{place:'town',from:8,to:20,off:'inn'},doctor:{place:'village',from:8,to:18,off:'inn'},artisan:{place:'forge',from:7,to:18,off:'inn'},porter:{place:'dock',from:6,to:18,off:'inn'}};
export const jobs={
 fieldWork:{name:'田间短工',place:'village',text:'帮村民整地除草，雇主提供工具；三小时、精力24，工钱12文。06:00–18:00内完成，每日一份。',hours:3,energy:24,reward:12,skill:'farming',shift:[6,18]},
 smithWork:{name:'作坊短工',place:'forge',text:'需锻造Lv2，帮作坊加工小件农具，雇主提供材料工具，成品归作坊；三小时、精力24，工钱16文。07:00–18:00内完成，每日一份。',hours:3,energy:24,reward:16,skill:'forge',requires:{forge:2},shift:[7,18]},
 escortMedicine:{name:'短途护送药包',start:'town',place:'village',route:['road','hill','village'],text:'从街市领取封好的药包，沿城外小路、南山坡送到河湾村。按顺序经过交接点，三日内交付；途中遇事可以自行处理或放弃。交付半小时、精力6，报酬10文。',energy:6,reward:10,xp:{escort:1,carry:1}},
 firewood:{name:'村里收柴',place:'village',text:'村民需要木料3份生火，可拾柴整理或买来，三日内送到河湾村。',needs:{wood:3},reward:8,skill:'trade',boardDay:0},
 freshFish:{name:'船家收鱼',place:'dock',text:'船家需要鲜鱼2条做饭，三日内送到码头。',needs:{fish:2},reward:12,skill:'trade',boardDay:1},
 oreSupply:{name:'作坊收矿',place:'forge',text:'作坊收铁矿石2份，三日内送来；无需先炼成铁料。',needs:{ore:2},reward:10,skill:'trade',boardDay:2},
 unload:{name:'码头卸货',place:'dock',text:'替船行卸一批货，靠力气赚一笔工钱。',hours:3,energy:24,reward:18,skill:'carry'},
 tools:{name:'一件农具',place:'forge',text:'作坊需要一件铁制工具；自己备料制作，再交货。',needs:{tool:1},reward:22,skill:'trade'},
 herbs:{name:'医者收药',place:'village',text:'给沈医者送两份草药，采来的或买来的都可以。',needs:{herb:2},reward:12,skill:'trade'}
};
export const recipes={cookVegetables:{name:'做菜饭干粮',hours:1,energy:8,input:{vegetable:2,wood:1},output:{food:2},skill:'cook'},craftTrap:{name:'制作简易猎具',hours:2,energy:14,input:{wood:2,iron:1},output:{trap:1},skill:'woodwork'},cookMeat:{name:'做烤肉干粮',hours:1,energy:8,input:{meat:1,wood:1},output:{food:2},skill:'cook'},brew:{name:'调制普通药膏',place:'village',hours:1,energy:10,input:{herb:2,wood:1},output:{salve:2},skill:'medicine',knowledge:'learnedMedicine'},craftStaff:{name:'制作木棍',hours:2,energy:14,input:{wood:2},output:{staff:1},skill:'woodwork'},craftSword:{name:'锻造普通铁剑',hours:4,energy:32,input:{iron:4,wood:1},output:{sword:1},skill:'forge',level:2},smelt:{name:'炼制铁料',hours:2,energy:18,input:{ore:2,wood:2},output:{iron:2},skill:'forge'},forge:{name:'打造工具',hours:3,energy:24,input:{iron:2,wood:1},output:{tool:1},skill:'forge'},cook:{name:'做一份鱼饭',hours:1,energy:8,input:{fish:1,wood:1},output:{food:2},skill:'cook'}};
export const actionNames={forgeLesson:'请教基础锻造',plant:'借地播种',tend:'照料菜地',harvest:'收获蔬菜',cookVegetables:'做菜饭干粮',hunt:'布置猎具捕猎',craftTrap:'制作简易猎具',cookMeat:'做烤肉干粮',brew:'调制普通药膏',useSalve:'使用普通药膏',craftStaff:'制作木棍',craftSword:'锻造普通铁剑',collectWood:'拾柴整理木料',mine:'浅层采矿',smelt:'炼制铁料',work:'打零工',browse:'听街谈',train:'练习拳脚',inner:'吐纳修炼',gather:'采药',fish:'钓鱼',forge:'打造工具',cook:'做鱼饭',rest:'歇息片刻',sleep:'睡一觉',eat:'吃干粮',heal:'用草药',treat:'请医者治疗',explore:'沿路探索',spar:'请教切磋',deliver:'完成约定'};
export const events={
 cart:{title:'货车陷泥',place:'road',text:'脚夫正试着把货车推出来。商队有些着急，但这件事与你并没有必然关系。',choices:[{id:'help',label:'帮忙推车',hours:1,energy:12,skill:'carry',xp:1,relation:'porter',change:2,result:'你与脚夫合力推车，商队继续赶路。阿平记住了你的帮忙。'},{id:'tell',label:'回镇上报信',hours:1,to:'town',result:'镇上的脚行派了人去，剩下的事情由他们处理。'},{id:'leave',label:'不参与',result:'你沿自己的路走，脚夫仍在设法处理。'}],after:'脚行帮忙处理了陷泥的货车，商队继续赶路。'},
 child:{title:'走散的孩子',place:'town',text:'一个孩子在茶摊旁找家人。摊主正在问他住在哪里。',choices:[{id:'help',label:'陪摊主一起找',hours:1,energy:4,relation:'merchant',change:2,result:'你们在粮铺找到孩子的家人。他们道谢后领着孩子回去了。'},{id:'leave',label:'交给摊主，继续自己的事',result:'摊主继续照看孩子，你没有插手。'}],after:'茶摊旁走散的孩子已由街坊送回家。'},
 duel:{title:'两位过路武者争执',place:'bamboo',text:'两人争论一场比试的胜负，语气越来越重。几名行脚人站在远处观望。',choices:[{id:'watch',label:'站远些看一会儿',hours:0.5,energy:2,result:'两人短暂交手后被同伴劝开，各自离去。你看了热闹，没有卷进去。'},{id:'leave',label:'绕路离开',hours:0.25,result:'你绕开争执，不必替陌生人分出高下。'}],after:'竹林里争执的两位武者已被同伴劝开。'},
 herbs:{title:'医者晾药遇雨',place:'village',text:'一阵急雨将至，沈医者正匆忙往屋里收药。',choices:[{id:'help',label:'帮她收药',hours:0.5,energy:4,relation:'doctor',change:2,result:'药材及时收进屋里。沈医者请你坐下避雨。'},{id:'leave',label:'先走自己的路',result:'沈医者喊邻人帮忙，你继续自己的事。'}],after:'河湾村的药材及时收进屋里，没有淋坏。'},
 fair:{title:'临时小集',place:'dock',text:'一艘货船带来了小摊贩。码头有人卖旧器物，也有人只来看热闹。',choices:[{id:'browse',label:'逛一逛，了解行情',hours:1,energy:4,skill:'trade',xp:1,result:'你比较了几家的价钱，记住了常见货物的行情。没有买下任何东西。'},{id:'leave',label:'不逛了',result:'小集还在继续，你有自己的安排。'}],after:'码头的小集散了，船上的商贩去了下一站。'},
 rain:{title:'山道落石',place:'hill',text:'几块碎石挡住了旧道，过路人正在商量清理。',choices:[{id:'help',label:'一起清理',hours:1,energy:12,skill:'carry',xp:1,result:'你们把碎石搬到路边，旧道重新可以通行。'},{id:'leave',label:'绕开，不参与',hours:0.5,result:'你从旁边绕过，其他行人继续清理。'}],after:'南山坡的落石已由过路人清理。'}
};
