import {SCENE_ART} from './scene-art.js?v=5.40.0';
import {places,people,resources} from './content.js?v=5.40.0';
import {npcPlace} from './world.js?v=5.40.0';
import {npcAt} from './npc-simulation.js?v=5.40.0';
import {healthSummary} from './npc-health.js?v=5.40.0';
import {ALL_ARTISAN_ORDERS as ARTISAN_ORDERS} from './artisan-orders.js?v=5.40.0';
import {CULTURE} from './culture.js?v=5.40.0';
import {QUESTS,CAREERS,ORGANIZATIONS} from './adventure-data.js?v=5.40.0';
import {FOREST_CONTRACTS} from './forest-contracts.js?v=5.40.0';
import {OUTINGS} from './outings.js?v=5.40.0';
import {BUSINESSES} from './business.js?v=5.40.0';
import {THREADS} from './threads.js?v=5.40.0';
import {COOPERATIONS} from './companions.js?v=5.40.0';

// Read-only local scene: the coordinates are a diagram, not new movement or NPC simulation.
const f=(id,name,panel,group='')=>({id,name,panel,group});
export const LOCAL_SCENES={
 county:{lane:'县城街口',terrain:'town',facilities:[f('office','县衙告示','events','law'),f('jobs','短工接洽','field')]},
 market:{lane:'市集长街',terrain:'town',facilities:[f('shop','粮铺杂货','bag'),f('stalls','摊位与合作','events','stalls')]},
 inn:{lane:'客栈前院',terrain:'town',facilities:[f('rooms','客栈住宿','field'),f('gathering','堂前活动','events','contacts')]},
 workshop:{lane:'作坊巷',terrain:'town',facilities:[f('forge','铁匠炉','equipment'),f('bench','手艺台','events','craft'),f('stove','公用灶','events','kitchen')]},
 school:{lane:'武馆练场',terrain:'town',facilities:[f('training','练武场','field'),f('challenge','战术挑战','events','challenge')]},
 road:{lane:'城郊官道',terrain:'forest',facilities:[f('roadside','沿途事务','events','explore')]},
 village:{lane:'村口小路',terrain:'village',facilities:[f('clinic','药铺制药台','events','medicine'),f('lodging','村中借宿','field')]},
 fields:{lane:'田间小径',terrain:'village',facilities:[f('vegetables','田间资源','resources'),f('work','田间短工','field')]},
 dock:{lane:'码头栈道',terrain:'water',facilities:[f('loading','装船短工','field'),f('fishing','河边钓位','resources')]},
 ferry:{lane:'渡口沿岸',terrain:'water',facilities:[f('fishing','旧钓位','resources'),f('site','渡口旧址','events','explore')]},
 liuxi:{lane:'柳溪集街口',terrain:'water',facilities:[f('shop','小集商铺','bag'),f('jobs','集上短工','field')]},
 foot:{lane:'南山主径',terrain:'forest',facilities:[f('resources','林间资源','resources'),f('trail','辨路与山林事务','events','forest')]},
 bamboo:{lane:'竹林小径',terrain:'forest',facilities:[f('resources','竹林资源','resources'),f('site','林间探索','events','explore')]},
 hill:{lane:'山坡小径',terrain:'forest',facilities:[f('resources','山坡资源','resources'),f('trail','野外察看','events','field')]},
 mine:{lane:'矿洞入口',terrain:'forest',facilities:[f('ore','矿脉','resources'),f('dungeon','废弃矿道','events','dungeon')]},
 oldroad:{lane:'荒山旧道',terrain:'forest',facilities:[f('fort','旧堡入口','events','fort'),f('raid','匪寨接洽','events','raid'),f('resources','险坡资源','resources')]}
};
const hints={merchant:'买卖 · 委托',doctor:'诊治 · 学方',smith:'打造 · 合作',master:'学武 · 考较',farmer:'农活 · 考较',boatman:'装船 · 护送',carpenter:'木工 · 订单',tailor:'裁缝 · 订单',tanner:'制革 · 订单',scribe:'识字 · 书法',bookkeeper:'账算 · 教学',chessfriend:'棋艺 · 对弈',musician:'音律 · 小聚',hunter:'狩猎 · 同行',stallholder:'买卖 · 交接',smithapprentice:'近况 · 同行'};
export function localScene(s){
 const scene=LOCAL_SCENES[s.place],actors=[];
 for(const [id,d] of Object.entries(people))if(npcPlace(s,id)===s.place){const n=s.npcWorld.individuals[id];actors.push({id,name:d.name,role:d.role,hint:s.place!==d.place?'交谈 · 非工作地点':hints[id]||'交谈 · 近况',status:healthSummary(n,s.day),interactive:true});}
 for(const n of npcAt(s,s.place))if(!Object.hasOwn(people,n.id))actors.push({id:n.id,name:n.name,role:n.role,hint:hints[n.id]||'查看近况',status:healthSummary(n,s.day),interactive:false});
 if(s.place==='county'&&s.minute>=480&&s.minute<1080)actors.unshift({id:'constable',name:'赵捕快',role:'县衙接洽',hint:'报案 · 治安委托',status:'在岗',interactive:true});
 return {...scene,art:SCENE_ART[scene.terrain],name:places[s.place].name,actors,facilities:scene.facilities,exits:places[s.place].routes.map(id=>({id,name:places[id].name})),resources:Object.entries(resources).filter(([,r])=>r.places.includes(s.place)).map(([id,r])=>({id,name:r.name}))};
}
// Associate only an already-exposed action with its real contact. Self-work stays on facilities.
export function localActionContact(s,option){
 const [kind,key,step]=option.id.split(':');
 if(kind==='professional')return ARTISAN_ORDERS[key]?.teacher??(Object.hasOwn(people,key)?key:null);
 if(kind==='culture')return CULTURE[key]?.teacher??null;
 if(kind==='civic')return ({literacy:'scribe',accounting:'bookkeeper',bargain:'merchant'})[key]??null;
 if(kind==='assessment')return key;
 if(kind==='medicine')return key==='learn'?'doctor':null;
 if(kind==='forest')return ['accept','decline','claim'].includes(step)?FOREST_CONTRACTS[key]?.holder:null;
 if(kind==='quest'||kind==='retry')return QUESTS[key]?.giver??null;
 if(kind==='deliver'){const q=s.adventures.quest;return q?(q.id==='escort'?'stallholder':QUESTS[q.id].giver):null;}
 if(kind==='career'||kind==='order')return CAREERS[key]?.holder??null;
 if(kind==='business')return ['accept','mix','deliver'].includes(step)?BUSINESSES[key]?.giver??null:null;
 if(kind==='outing')return ['claim','inquire','talk'].includes(step)?OUTINGS[key]?.holder:null;
 if(kind==='thread')return THREADS[key]?.holder??null;
 if(kind==='companion')return step==='claim'?COOPERATIONS[key]?.payer:COOPERATIONS[key]?.actor;
 if(kind==='bond')return key;
 if(kind==='mentor')return 'master';
 if(kind==='sect')return key==='join'?'farmer':key==='deliver'?(step==='school'?'farmer':'master'):key==='letter'?(step==='school'?'master':'farmer'):s.adventures.life.sect.river?'farmer':'master';
 if(kind==='join')return ORGANIZATIONS[key]?.holder??null;
 if(kind==='memberFood')return 'merchant';
 if(kind==='law')return s.place==='county'?'constable':null;
 // Late opportunities often spell the contact's name in their existing label.
 return Object.keys(people).find(id=>option.label?.includes(people[id].name))??null;
}
