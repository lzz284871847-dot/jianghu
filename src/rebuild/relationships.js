// 阶段只描述熟悉程度，不自动建立师徒、朋友或其他身份关系。
const services={master:{name:'武艺请教',base:6,discount:4,threshold:5},artisan:{name:'锻造请教',base:6,discount:4,threshold:5},doctor:{name:'医者诊金',base:8,discount:6,threshold:10}};
export function relationshipStage(n){return n===0?'陌生':n<5?'见过面':n<20?'熟人':n<50?'相熟':'熟络'}
export function relationshipSummary(s,id){return `${relationshipStage(s.relations[id])} · 关系 ${s.relations[id]}/100`}
export function relationshipFee(s,id){const service=services[id];return service?s.relations[id]>=service.threshold?service.discount:service.base:null}
export function relationshipBenefit(s,id){
 const service=services[id];
 if(!service)return '交谈或赠送合心意的物品可增进熟悉程度，每天分别结算一次。';
 return s.relations[id]>=service.threshold?`熟人优惠已生效：${service.name}${service.base} → ${service.discount}文。`:`当前${service.name}${service.base}文；关系再增加${service.threshold-s.relations[id]}点，减至${service.discount}文。`;
}
export function relationshipChange(s,id,before){
 const after=s.relations[id],lines=[`关系：${before}/100 → ${after}/100（+${after-before}）`];
 if(relationshipStage(before)!==relationshipStage(after))lines.push(`熟悉程度：${relationshipStage(before)} → ${relationshipStage(after)}`);
 const service=services[id];if(service&&before<service.threshold&&after>=service.threshold)lines.push(relationshipBenefit(s,id));
 if(after===100&&before<100)lines.push('关系数值已到上限；不会自动建立师徒或其他身份关系。');
 return lines;
}
