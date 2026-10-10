// 只记实际操作的有限进度，不增加职业等级或追溯编造历史。
export const careerLimits={tools:2,herbs:4,brew:1,shifts:3};
export const careers={
 smith:{name:'铁匠试作',teacher:'artisan',teacherName:'许铁匠',place:'forge',requires:{tools:2},needs:{tool:2},payment:36,action:'verifySmith',text:'实际制作工具2件，与许铁匠关系3；携工具2件在作坊验收，交付收36文，开放工具批单。'},
 healer:{name:'医者帮手',teacher:'doctor',teacherName:'沈医者',place:'village',requires:{herbs:4,brew:1},needs:{salve:2},payment:12,action:'verifyHealer',text:'实际采到草药4份、成功制药1次，与沈医者关系3；携药膏2份在村里验收，交付收12文，开放诊所配药。'},
 boat:{name:'熟练船工',teacher:'boatman',teacherName:'贺船工',place:'ferry',requires:{shifts:3},needs:{},payment:0,action:'verifyBoat',text:'完成码头/渡口零工、装船或护送合计3次，与贺船工关系3；在贺船工工作处确认，开放熟手装船。'}
};
const labels={tools:'制成工具',herbs:'实际采药',brew:'成功制药',shifts:'完成船运工作'};
export function newCareer(){return {tools:0,herbs:0,brew:0,shifts:0,passed:{}};}
export function recordCareer(s,key,n=1){const before=s.career[key];s.career[key]=Math.min(careerLimits[key],before+n);if(s.career[key]>before)s.result.push('职业进度：'+labels[key]+' '+before+'/'+careerLimits[key]+' → '+s.career[key]+'/'+careerLimits[key]+'（+'+(s.career[key]-before)+'）');}
export function careerProgress(s,key){return Object.entries(careers[key].requires).map(([k])=>labels[k]+' '+s.career[k]+'/'+careerLimits[k]).join('；');}
export function careerBlocker(s,key,teacherPlace){const def=careers[key];if(!Object.hasOwn(careers,key))return '没有这项职业目标。';if(s.career.passed[key])return '已经验收，不重复交付或收款。';if(Object.entries(def.requires).some(([k,n])=>s.career[k]<n))return '实际行动记录尚未达标。'+careerProgress(s,key);if(s.relations[def.teacher]<3)return '需要与'+def.teacherName+'关系3。';if(s.place!==teacherPlace||(key==='boat'?!['ferry','dock'].includes(s.place):s.place!==def.place))return '请在工作处找'+def.teacherName+'验收。';if(s.minute<480||s.minute+30>1080)return '验收需在08:00–18:00内做完，共半小时。';for(const [k,n] of Object.entries(def.needs))if(s.bag[k]<n)return '交付物品不足，请先备齐。';if(s.energy<2)return '精力不足，请先休息。';return '';}
export function validCareer(s){const c=s.career;if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['passed',...Object.keys(careerLimits)].includes(k)))return false;for(const [k,max] of Object.entries(careerLimits))if(!Number.isSafeInteger(c[k])||c[k]<0||c[k]>max)return false;return c.passed&&typeof c.passed==='object'&&!Array.isArray(c.passed)&&Object.entries(c.passed).every(([k,day])=>Object.hasOwn(careers,k)&&Number.isSafeInteger(day)&&day>=1&&day<=s.day&&Object.entries(careers[k].requires).every(([id,n])=>c[id]>=n));}
