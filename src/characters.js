export const characters={
master:{age:46,personality:'谨慎',job:'拳师',family:'家人在邻县，独自在镇上教拳',interest:'教拳、饮茶',goal:'维持教拳生计，攒钱探亲',ability:'基础拳脚与吐纳',gift:'food',giftGain:3},
merchant:{age:39,personality:'谨慎',job:'粮商',family:'与妻子共同照看粮铺',interest:'算盘、行情',goal:'稳定库存，维持铺子开销',ability:'粮食买卖',gift:'food',giftGain:1},
porter:{age:26,personality:'随和',job:'脚夫',family:'与母亲住在青石镇',interest:'赶集、听旅人讲见闻',goal:'搬货攒钱，照顾家人',ability:'搬运、识路',gift:'food',giftGain:4},
doctor:{age:34,personality:'谨慎',job:'乡村医者',family:'与父亲居住在河湾村',interest:'辨药、整理药方',goal:'收集药材，为村民治病',ability:'辨识草药、治疗外伤',gift:'herbs',giftGain:5},
farmer:{age:42,personality:'勤奋',job:'农户',family:'与妻儿住在河湾村',interest:'农事、修补农具',goal:'照料田地，准备下一季种子',ability:'农耕、简单修补',gift:'tools',giftGain:5}
};
export function relationName(value){return value>=60?'朋友':value>=20?'熟人':value>0?'点头之交':'陌生人'}
export function recordMap(value){const out={};for(const id of Object.keys(characters)){if(value?.[id]!==undefined){if(!Number.isSafeInteger(value[id])||value[id]<1)throw Error('互动记录无效');out[id]=value[id]}}return out}
