import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,move,act,trade,talk,socialChoice,adventureAction,martialAction} from './engine.js';
import {places} from './content.js';
import {present} from './adventures.js';
import {handbook} from './task-handbook.js';
import {activityGroups} from './activity-layout.js';
import {countyLifeBlocker,countyLifeOverview,countyLifeOptions} from './county-life.js';

// Ordinary starts; no injected money, materials, identities or levels. Controlled rolls
// reproduce both success and failure while every route uses real movement and game time.
function player(){const s=fresh();let count=0;
 const step=(fn,label)=>{assert.equal(fn(),true,label+' '+s.result.join('；'));count++;assert.deepEqual(restore(JSON.stringify(s)).adventures,s.adventures);};
 const walk=to=>{const queue=[[s.place]],seen=new Set();let path;while(queue.length){const p=queue.shift(),last=p.at(-1);if(last===to){path=p;break;}if(seen.has(last))continue;seen.add(last);for(const next of places[last].routes)queue.push([...p,next]);}assert.ok(path,to);for(const next of path.slice(1))step(()=>move(s,next,()=>1),'走到'+next);};
 const hours=(n=15)=>{let i=0;while(s.minute<480||s.minute+n>1080){assert.ok(i++<48,'营业等待不能无限循环');step(()=>act(s,'wait'),'等待营业');}};
 const rest=()=>{let i=0;while(s.energy<80||s.hp<80){assert.ok(i++<12);step(()=>act(s,'rest'),'免费歇息');}};
 const nextDay=()=>{walk('village');const day=s.day;let i=0;while(s.day===day){assert.ok(i++<4);step(()=>act(s,'sleep'),'免费借宿');}hours();};
 const contact=(id,n=15)=>{walk(({master:'school',farmer:'fields',merchant:'market',doctor:'village',boatman:'dock'})[id]);let i=0;while(!present(s,id,n)){assert.ok(i++<7,'应可在近期接洽'+id);nextDay();walk(({master:'school',farmer:'fields',merchant:'market',doctor:'village',boatman:'dock'})[id]);hours(n);}};
 const action=(id,rng=()=>0)=>step(()=>adventureAction(s,id,rng),id);
 return {s,step,walk,hours,rest,nextDay,contact,action,done:()=>{assert.ok(count>20);assert.ok(s.day<20);assert.equal(s.dead,false);return {day:s.day,actions:count};}};
}
test('谋生摆摊完整路线：真实花光30文、零钱恢复、失败成交、续租取货与收摊历史',t=>{
 const h=player(),{s}=h;h.walk('market');h.step(()=>trade(s,'buy','pick',1),'采购矿镐');h.step(()=>trade(s,'buy','rod',1),'采购钓竿');h.step(()=>trade(s,'buy','food',1),'购买干粮');h.action('stall:rent');assert.equal(s.coins,0);h.action('stall:stock:food');h.action('stall:high:food',()=>.99);assert.equal(s.coins,0);assert.equal(s.adventures.life.stall.stock.food,1);
 h.walk('county');h.rest();h.hours(180);h.step(()=>act(s,'work',()=>0),'零本金短工');assert.ok(s.coins>0);h.walk('market');h.hours(60);h.action('stall:low:food');assert.equal(s.adventures.life.stall.revenue,3);h.action('stall:stock:food');
 while(s.day<=s.adventures.life.stall.until)h.nextDay();h.walk('market');h.hours();assert.ok(countyLifeBlocker(s,'stall:low:food'));const raw=JSON.stringify(s);assert.equal(adventureAction(s,'stall:low:food'),false);assert.equal(s.adventures.life.stall.stock.food,1);assert.notEqual(JSON.stringify(s),raw);h.contact('merchant');h.action('stall:rent');assert.equal(s.adventures.life.stall.cost,12);h.action('stall:take');h.action('stall:close');
 assert.ok(countyLifeOverview(s).some(t=>t.includes('已收摊')&&t.includes('租金12文')&&t.includes('收入3文')&&t.includes('不等于净利润')));assert.equal(s.bag.pick,1);assert.equal(s.bag.rod,1);t.diagnostic(JSON.stringify(h.done()));
});
test('习武两门完整路线：实际学两门武艺、结识授艺者、函件往来、换门及真实师门陪练',t=>{
 const h=player(),{s}=h;h.walk('county');h.hours(180);h.step(()=>act(s,'work',()=>0),'习武前谋生');h.contact('master',60);h.step(()=>martialAction(s,'learn','qinghe_fist'),'付费长拳求学');h.contact('farmer',30);h.step(()=>talk(s,'farmer'),'结识陈农户');h.walk('village');h.hours(60);h.step(()=>martialAction(s,'learn','staff'),'付费农家棍法求学');
 while(s.relations.farmer<3){h.nextDay();h.contact('farmer',30);h.step(()=>talk(s,'farmer'),'分日结识农户');}h.contact('farmer',60);h.action('sect:join');h.step(()=>martialAction(s,'equip','staff'),'选用农家棍法');h.action('sect:guide');h.action('sect:letter:river');h.contact('master',30);h.action('sect:deliver:river');assert.equal(s.adventures.life.sect.trust,3);assert.ok(countyLifeBlocker(s,'sect:guide'));
 h.contact('farmer');h.action('sect:leave');while(s.relations.master<3){h.nextDay();h.contact('master',30);h.step(()=>talk(s,'master'),'分日结识周师傅');}h.contact('master',30);h.action('mentor:join');h.action('sect:letter:school');h.contact('farmer',30);h.action('sect:deliver:school');h.contact('master',60);h.rest();h.hours(60);h.step(()=>martialAction(s,'equip','qinghe_fist'),'选用长拳');h.action('mentor:task:spar');h.action('mentor:spar:start');
 for(let i=0;i<3;i++)h.step(()=>martialAction(s,'turn','guard',()=>1),'实际防守回合');h.step(()=>martialAction(s,'turn','flee'),'陪练收手');assert.equal(s.adventures.mentor.stage,1);h.contact('master');h.action('mentor:report');assert.equal(s.adventures.mentor.tasks.spar,'done');assert.equal(s.adventures.life.sect.river,false);assert.equal(s.adventures.life.sect.letters.river,'done');assert.equal(s.adventures.life.sect.letters.school,'done');assert.ok(s.martial.known.staff&&s.martial.known.qinghe_fist);t.diagnostic(JSON.stringify(h.done()));
});
test('探索熟人完整路线：有限搜寻、真实受伤诊治、旧合作失败、持续约定成功与再失败',t=>{
 const h=player(),{s}=h;h.walk('foot');h.step(()=>act(s,'wood',()=>0),'采集自用木料');h.contact('boatman');h.action('companion:boat:invite');h.walk('ferry');h.action('companion:boat:safe');h.action('companion:boat:work',()=>.99);assert.equal(s.adventures.companions.records.boat.status,'failed');h.rest();h.action('route:ferry:safe');h.walk('bamboo');h.rest();h.action('route:bamboo:deep');assert.ok(s.hp<100);assert.ok(s.injuries.bruise>0);const goods=s.bag.wood;assert.equal(adventureAction(s,'route:bamboo:deep'),false);assert.equal(s.bag.wood,goods);
 h.contact('doctor',60);h.step(()=>act(s,'doctor'),'付费处理实际伤势');assert.equal(s.hp,100);assert.deepEqual(s.injuries,{});h.contact('boatman',30);h.step(()=>socialChoice(s,'boatman','reconcile'),'赠自己口粮建立关系');h.action('bond:boatman:meet');h.nextDay();h.contact('boatman');h.action('bond:boatman:meet');h.action('bond:boatman:promise');h.hours(60);h.rest();h.hours(60);h.action('bond:boatman:work');h.action('bond:boatman:claim');assert.equal(s.adventures.life.bonds.boatman.promise.status,'done');
 h.nextDay();h.contact('boatman');h.action('bond:boatman:promise');h.hours(60);h.rest();h.hours(60);h.action('bond:boatman:work',()=>.99);assert.equal(s.adventures.life.bonds.boatman.promise.status,'failed');assert.ok(countyLifeOverview(s).some(t=>t.includes('再次合作未成')));assert.equal(adventureAction(s,'bond:boatman:claim'),false);assert.equal(s.adventures.sites.bamboo,'found');assert.equal(s.adventures.sites.ferry,'found');t.diagnostic(JSON.stringify(h.done()));
});
test('行动预览复用实际门槛且严格只读，不能扣钱物、掷结果、推进时间或改记录',()=>{
 const s=fresh();for(const place of ['fields','market','workshop','county']){s.place=place;const raw=JSON.stringify(s);for(const option of countyLifeOptions(s)){assert.equal(option.blocker,countyLifeBlocker(s,option.id));}assert.equal(JSON.stringify(s),raw);}
 s.place='market';assert.equal(countyLifeBlocker(s,'stall:rent'),null);s.coins=0;assert.match(countyLifeBlocker(s,'stall:rent'),/6文/);const option=activityGroups(s).find(g=>g.id==='stalls').options.find(o=>o.id==='stall:rent');assert.match(option.blocker,/6文/);assert.equal(s.minute,480);assert.equal(s.coins,0);
});
test('手册显示当前作业缺料、精力与付款原因，远处只引导道路而不误报当前位置',()=>{
 const s=fresh();s.place='workshop';s.relations.smith=3;adventureAction(s,'bond:smith:meet');s.day=2;s.nodes=Object.fromEntries(Object.entries(s.nodes).map(([k,n])=>[k,{...n,refreshDay:3}]));adventureAction(s,'bond:smith:meet');adventureAction(s,'bond:smith:promise');assert.match(handbook(s).cards.find(c=>c.group==='bonds').blocker,/木料/);s.bag.wood=1;s.energy=0;assert.match(handbook(s).cards.find(c=>c.group==='bonds').blocker,/精力/);s.place='county';assert.equal(handbook(s).cards.find(c=>c.group==='bonds').blocker,'');
});
