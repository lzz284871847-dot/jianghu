import {progress} from './progression.js?v=1.0.50';
export const arts={
 steadySword:{name:'平川剑法',weapon:'sword',basic:'sword',move:'稳进剑',fee:20,text:'稳妥进攻：精力6，基础伤害比普通出剑多1（本武艺Lv2后多2），本段还击减少1；仍受疲劳、伤势和对方棍架影响。'},
 shelterStaff:{name:'护身棍法',weapon:'staff',basic:'staff',move:'护身棍',fee:20,text:'守中带攻：精力6，基础伤害比普通挥棍少2，本段还击减少4（至少受伤1）；不会额外蓄势。'}
};
export function activeArt(s){const a=Object.hasOwn(arts,s.art)?arts[s.art]:null;return a&&s.arts?.[s.art]&&s.weapon===a.weapon?a:null}
export function schoolBlocker(s){return s.place!=='liuxi'?'请到柳溪集的小武馆。':s.minute<480||s.minute+60>1080?'武馆授课须在08:00–18:00内完成一小时，请另选时间。':null}
export function learnArtBlocker(s,key){const a=Object.hasOwn(arts,key)?arts[key]:null;if(!a)return '没有这门武艺。';if(s.arts?.[key])return '已经学过这门武艺，不重复收费。';return schoolBlocker(s)||(progress(s.skills[a.basic]).level<2?'对应基础武学需达到Lv2。':s.weapon!==a.weapon?'请先装备对应兵器。':s.hp<25?'受伤太重，先休养。':s.energy<12?'学习需要精力12。':s.coins<a.fee?`学费需要${a.fee}文。`:null)}
export function artPracticeBlocker(s){if(!activeArt(s))return '先学习并选用与当前兵器对应的武艺。';if(!['road','bamboo','liuxi'].includes(s.place))return '可在城外小路、竹林或柳溪集练习武艺。';if(s.hp<25)return '受伤太重，先休养。';if(s.energy<16)return '练习需要精力16。';return null}
export function artMoveBlocker(s){return !activeArt(s)?'先选用与兵器对应的已学武艺。':s.energy<6?'武艺招式需要精力6。':null}
export function artAssessmentBlocker(s){if(s.place!=='liuxi'||s.minute<480||s.minute+5>1080)return '请在08:00–18:00到柳溪集武馆考较。';if(!activeArt(s))return '先选用与兵器对应的已学武艺。';if(s.artPassed?.[s.art])return '这门武艺已经通过考较。';if(progress(s.skills[s.art]).level<2)return '当前武艺需达到Lv2。';if(s.hp<70||s.energy<60)return '考较需要气血至少70、精力至少60。';return null}
export function validMartial(s){
 if(!s.arts||typeof s.arts!=='object'||Array.isArray(s.arts)||Object.keys(s.arts).some(k=>!Object.hasOwn(arts,k)))return false;
 if(Object.keys(arts).some(k=>typeof s.arts[k]!=='boolean'||!s.arts[k]&&s.skills[k]!==0))return false;
 if(s.art!==null&&(!Object.hasOwn(arts,s.art)||!s.arts[s.art]))return false;
 if(!s.artPassed||typeof s.artPassed!=='object'||Array.isArray(s.artPassed))return false;
 return Object.entries(s.artPassed).every(([key,day])=>Object.hasOwn(arts,key)&&s.arts[key]&&progress(s.skills[key]).level>=2&&Number.isSafeInteger(day)&&day>=1&&day<=s.day);
}
