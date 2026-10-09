import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,fight,restore,tick} from '../src/engine.js';
import {skills,date} from '../src/progression.js';

const gains=s=>Object.entries(skills).filter(([,key])=>s[key]>0).map(([name])=>name).sort();
test('行动经验归属：买材料不刷经商、劳作不涨武艺',()=>{
 const s=fresh();s.place='作坊';act(s,'买铁料');act(s,'买木料');assert.deepEqual(gains(s),[]);
 s.place='粮铺';act(s,'买干粮');assert.deepEqual(gains(s),[]);
 s.place='青石镇';act(s,'打零工');assert.deepEqual(gains(s),['搬运']);
});
test('采药失败只练搜索采集，收获后才练药材辨识',()=>{
 const s=fresh();s.place='河边';act(s,'采集草药',()=>1);assert.equal(s.gather,2);assert.equal(s.identify,0);
 act(s,'采集草药',()=>0);assert.equal(s.gather,4);assert.equal(s.identify,2);assert.equal(s.herbs,1);
});
test('战斗每回合一分钟、出拳与运功分别结算相关技能，撤离不加经验',()=>{
 const s=fresh();s.learned=true;s.combat={name:'周师傅',hp:45,attack:5,spar:true};
 fight(s,'出拳');assert.equal(s.skill,1);assert.equal(s.inner,0);assert.equal(s.minute,1);
 fight(s,'运功');assert.equal(s.skill,2);assert.equal(s.inner,1);assert.equal(s.minute,2);
 assert.ok(s.lastAction.some(x=>/吐纳.*\+1/.test(x)));
 fight(s,'防守');assert.equal(s.skill,2);assert.equal(s.inner,1);assert.equal(s.minute,3);
 fight(s,'撤离');assert.equal(s.skill,2);assert.equal(s.minute,4);assert.equal(s.energy,85);
});
test('胜利不重复发经验，疲劳削弱出招，精力不足不伤敌不耗时',()=>{
 const s=fresh();s.combat={name:'山贼',hp:1,attack:7,spar:false};fight(s,'出拳');assert.equal(s.skill,1);assert.equal(s.coins,40);
 const a=fresh();a.energy=9;a.combat={name:'山贼',hp:35,attack:7,spar:false};fight(a,'出拳');assert.equal(a.combat.hp,31);
 a.energy=3;const before=structuredClone(a.combat);fight(a,'运功');assert.deepEqual(a.combat,before);assert.equal(a.minute,1);
});
test('锻造耗尽精力时确有失败风险，材料与所有相关技能均结算',()=>{
 const s=fresh();s.place='作坊';s.iron=2;s.wood=1;s.energy=24;act(s,'锻造工具',()=>0);
 assert.equal(s.tools,0);assert.equal(s.energy,0);assert.equal(s.iron,0);assert.equal(s.wood,0);
 assert.deepEqual(gains(s),['材料辨识','火候控制','锻造'].sort());
 assert.ok(s.lastAction.includes('材料消耗：铁料 -2、木料 -1'));
 assert.ok(s.lastAction.includes('当前库存：铁料 0、木料 0、铁制工具 0'));
});
test('失败请求不结算技能、满额技能不会增长或反复打印加零',()=>{
 const s=fresh();s.place='作坊';act(s,'制作药粉');assert.deepEqual(gains(s),[]);assert.equal(s.hour,8);
 s.herbs=2;s.medicine=100;s.identify=100;act(s,'制作药粉',()=>1);
 assert.equal(s.medicine,100);assert.equal(s.identify,100);assert.ok(!s.lastAction.some(x=>/Lv1/.test(x)));
});
test('无需恢复时不浪费食物药品，有伤时气血变化即时显示',()=>{
 const s=fresh();s.herbs=1;s.powder=1;act(s,'吃干粮');act(s,'用草药');act(s,'用药粉');assert.equal(s.food,2);assert.equal(s.herbs,1);assert.equal(s.powder,1);assert.equal(s.hour,8);
 s.hp=80;act(s,'用药粉');assert.equal(s.hp,100);assert.equal(s.powder,0);assert.ok(s.lastAction.includes('气血：80 → 100（+20）'));
});
test('分钟时钟跨日推进世界、旧存档迁移、非法分钟拒绝',()=>{
 const s=fresh();s.hour=23;s.minute=59;tick(s,1/60);assert.equal(s.day,2);assert.equal(s.hour,0);assert.equal(s.minute,0);assert.equal(s.world.processedDay,2);
 s.minute=7;assert.match(date(s),/00:07/);assert.equal(restore(JSON.stringify(s)).minute,7);
 const old=fresh();delete old.minute;old.version=7;assert.equal(restore(JSON.stringify(old)).minute,0);
 assert.throws(()=>restore(JSON.stringify({...s,minute:60})));
});
