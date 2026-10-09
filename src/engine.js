import {areas,npcs} from './world.js';
export const KEY='jianghu-single-v01';
export function fresh(name='无名客',trade='农家'){return {version:2,name:name.trim().slice(0,12)||'无名客',trade,day:1,hour:8,place:'青石镇',hp:100,maxHp:100,coins:30,food:2,herbs:0,skill:0,inner:0,learned:false,relations:{},combat:null,log:['你来到青石镇，先谋一口饭吃。']}}
export function restore(raw){const a=JSON.parse(raw);if(!a||typeof a.name!=='string'||!areas[a.place]||!Array.isArray(a.log))throw Error('存档格式无效');const s={...fresh(),...a,version:2};for(const k of ['day','hour','hp','maxHp','coins','food','herbs','skill','inner'])if(!Number.isSafeInteger(s[k])||s[k]<0||s[k]>1000000)throw Error('存档数值无效');if(s.day<1||s.hour>23||s.maxHp!==100||s.hp<1||s.hp>s.maxHp||!['农家','学徒','行商'].includes(s.trade))throw Error('存档状态无效');s.name=s.name.slice(0,12);s.log=s.log.filter(x=>typeof x==='string').slice(0,35);s.relations=Object.fromEntries(['master','merchant','porter'].map(k=>[k,Number.isSafeInteger(s.relations?.[k])?Math.max(0,Math.min(100,s.relations[k])):0]));s.learned=s.learned===true;if(s.combat){const c=s.combat;if(!['山贼','周师傅'].includes(c.name)||!Number.isInteger(c.hp)||c.hp<1||c.hp>60||!Number.isInteger(c.attack)||c.attack<1||c.attack>10||typeof c.spar!=='boolean')throw Error('战斗存档无效');s.combat={name:c.name,hp:c.hp,attack:c.attack,spar:c.name==='周师傅'};}return s}
export function note(s,t){s.log.unshift(`第${s.day}日 · ${t}`);s.log=s.log.slice(0,35)}
export function tick(s,h=1){s.hour+=h;while(s.hour>=24){s.hour-=24;s.day++}}
export function travel(s,to){if(s.combat||!areas[s.place].to.includes(to))return false;tick(s);s.place=to;note(s,`抵达${to}。`);return true}
export function interact(s,id){if(s.combat)return;const n=npcs(s).find(n=>n.id===id&&n.place===s.place);if(!n)return;note(s,`${n.name}：${n.text}`);s.relations[id]=Math.min(100,(s.relations[id]||0)+1);if(id==='master'&&!s.learned){s.learned=true;note(s,'周师傅教你基础吐纳，可自行修炼。')}tick(s)}
export function act(s,a,rng=Math.random){if(s.combat)return;if(![...areas[s.place].acts,'吃干粮','用草药','吐纳修炼','切磋'].includes(a))return;switch(a){
case '打零工':tick(s,3);s.coins+=12;s.hp=Math.max(1,s.hp-8);note(s,'搬运货物，赚得12文。');break;
case '休息':tick(s,2);s.hp=Math.min(100,s.hp+25);note(s,'歇息恢复25点体力。');break;
case '买干粮':if(!npcs(s).some(n=>n.id==='merchant'&&n.place===s.place)){note(s,'粮铺已打烊。');break}if(s.coins<5){note(s,'铜钱不足。');break}s.coins-=5;s.food++;tick(s);break;
case '卖干粮':if(!npcs(s).some(n=>n.id==='merchant'&&n.place===s.place)){note(s,'粮铺已打烊。');break}if(!s.food){note(s,'没有干粮。');break}s.food--;s.coins+=3;tick(s);break;
case '住店':if(s.coins<8){note(s,'住店需要8文。');break}s.coins-=8;s.hp=100;tick(s,8);note(s,'住店休养，体力恢复。');break;
case '练习拳脚':if(s.hp<=12){note(s,'体力不足，请休息。');break}s.hp-=12;s.skill+=2;tick(s,2);note(s,'基础拳脚熟练度增加2。');break;
case '吐纳修炼':if(!s.learned){note(s,'先向周师傅请教。');break}tick(s,2);s.inner+=2;s.hp=Math.min(100,s.hp+10);note(s,'吐纳熟练度增加2。');break;
case '吃干粮':case '用草药':{const k=a==='吃干粮'?'food':'herbs';if(!s[k]){note(s,'没有可用物品。');break}s[k]--;s.hp=Math.min(100,s.hp+(k==='food'?20:30));tick(s);note(s,'使用物品恢复体力。');break}
case '采集草药':tick(s,2);if(rng()<0.6){s.herbs++;note(s,'采到一株草药。')}else note(s,'此次没有收获。');break;
case '探路':tick(s);if(rng()<0.45){s.combat={name:'山贼',hp:35,attack:7,spar:false};note(s,'遇到拦路山贼，可战斗或撤离。')}else note(s,'你记下沿途地势，平安走过。');break;
case '切磋':if(!npcs(s).some(n=>n.id==='master'&&n.place===s.place))return;s.combat={name:'周师傅',hp:45,attack:5,spar:true};note(s,'周师傅答应点到为止。');break;
default:if(a==='与掌柜交谈')interact(s,'merchant');else{tick(s);note(s,'旅人说：周师傅白日在城外教拳，夜里回客栈歇息。')}
}}
export function fight(s,a){const c=s.combat;if(!c||!['出拳','运功','防守','撤离'].includes(a))return;if(a==='撤离'){s.combat=null;tick(s);note(s,'你脱身离开，不必逞强。');return}let guard=a==='防守';if(a==='运功'&&!s.learned){note(s,'尚未学会吐纳。');return}if(!guard)c.hp-=8+Math.floor(s.skill/4)+(a==='运功'?3+Math.floor(s.inner/4):0);if(c.hp<=0){s.skill+=3;if(!c.spar)s.coins+=10;s.combat=null;tick(s);note(s,c.spar?'切磋获胜，拳脚熟练度增加3。':'击退山贼，获得10文和3点拳脚熟练度。');return}s.hp=Math.max(0,s.hp-Math.max(1,c.attack-(guard?4:0)-Math.floor(s.inner/10)));note(s,`你${a}，${c.name}还击。`);if(s.hp<=0){s.combat=null;s.hp=35;s.place='客栈';s.coins=Math.max(0,s.coins-5);tick(s,4);note(s,'你失去战力，被路人送回客栈，花去至多5文养伤。')}}
