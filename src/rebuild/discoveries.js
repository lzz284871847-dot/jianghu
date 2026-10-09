// 小机会来自固定内容；每个游戏日最多一次非战斗探索偶遇。
export const discoveries={
 herbs:{title:'路边的一小片药草',text:'旧道边有几株常见药草。并不是什么珍稀灵药，采下也需要花些功夫。',choices:[{id:'gather',label:'采一份药草',hours:0.5,energy:8,output:{herb:1},xp:{herb:1},result:'你仔细采下一份常见草药。'},{id:'leave',label:'不采，继续走',result:'你没有动这些药草。'}],after:'旧道边的那片常见药草已被路过的药农采走。'},
 traveler:{title:'扭伤脚的旅人',text:'一位赶路人坐在路边，脚踝肿了。他想回村里找医者，并没有什么惊天秘密。',choices:[{id:'medicine',label:'给他一份草药',hours:0.25,energy:2,input:{herb:1},result:'你把草药交给旅人。他简单处理伤处，慢慢往村里走，没有送你报酬。'},{id:'carry',label:'搀扶他到河湾村',hours:1,energy:12,to:'village',xp:{carry:1},result:'你撑扶旅人走到村口。他去找医者，道谢后与你分别。'},{id:'leave',label:'不参与，继续走',result:'你继续自己的路，旅人向下一位过路人求助。'}],after:'扭伤脚的旅人后来得到村民帮助，已经回到河湾村。'},
 purse:{title:'遗落的小钱袋',text:'泥土上有一只旧钱袋，里面只有3文铜钱。主人可能还会回来找。',choices:[{id:'return',label:'去镇上登记招领',hours:1.5,energy:0,to:'town',result:'你把钱袋交给镇上的值守人，留下招领消息，随后继续自己的生活。'},{id:'take',label:'拿走3文铜钱',hours:0.1,energy:0,coins:3,result:'你取走3文铜钱。这不是一份江湖宝藏，只是别人的零钱。'},{id:'leave',label:'留在原处',result:'你没有动钱袋。'}],after:'遗落的小钱袋被回来寻找的主人领走。'}
};
export function discoveryForRoll(value){return value<0.32?'herbs':value<0.42?'traveler':value<0.45?'purse':null}
