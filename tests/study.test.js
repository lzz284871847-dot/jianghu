import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,restore,tick,fight} from '../src/engine.js';
import {skills,skillCap,skillLevel,gain,mastery,skillLines} from '../src/progression.js';
import {studyOptions,studyProblem} from '../src/study.js';

function ready(name){const s=fresh();tick(s,30*24);s[skills[name]]=100;s.place='作坊';s.coins=100;s.learned=true;return s}
test('进阶必须满额且历练够时，失败不扣钱精力或时间',()=>{
 const s=fresh();s.place='河边';s.fishing=100;assert.equal(studyOptions(s).length,1);
 act(s,'进修：钓鱼');assert.match(s.lastAction[0],/历练30日/);assert.equal(s.coins,30);assert.equal(s.energy,100);assert.equal(s.hour,8);
 tick(s,30*24);s.fishing=99;act(s,'进修：钓鱼');assert.match(s.lastAction[0],/完成当前/);assert.equal(skillLevel(s,'钓鱼'),1);
 act(s,'进修：toString');assert.match(s.lastAction[0],/没有这项/);
});
test('主动进阶耗费四小时、12精力及费用；积累保留但经验不自动增加',()=>{
 const s=ready('钓鱼');s.place='河边';const before=mastery(s,'钓鱼');act(s,'进修：钓鱼');
 assert.equal(s.fishing,0);assert.equal(skillLevel(s,'钓鱼'),2);assert.equal(skillCap(s,'钓鱼'),300);assert.equal(s.hour,12);assert.equal(s.energy,88);assert.equal(s.coins,88);assert.equal(mastery(s,'钓鱼'),before);
 assert.match(s.lastAction.join('\n'),/Lv1 100\/100.*Lv2 0\/300/);s.rod=1;act(s,'钓鱼',()=>0);assert.equal(s.fishing,2);assert.ok(s.lastAction.includes('钓鱼 Lv2：0/300 → 2/300（+2）'));
 assert.equal(restore(JSON.stringify(s)).skillLevels.钓鱼,2);
});
test('武学进阶要求师傅在场，费用转入NPC，进阶后实战不会变弱',()=>{
 const s=ready('拳脚');s.place='城外小路';const wallet=s.world.npcMoney.master;act(s,'进修：拳脚');assert.equal(s.world.npcMoney.master,wallet+12);
 s.combat={name:'周师傅',hp:45,attack:5,spar:true};fight(s,'出拳');assert.equal(s.combat.hp,33);assert.equal(s.skill,1);
 const a=ready('拳脚');a.place='城外小路';a.hour=20;act(a,'进修：拳脚');assert.match(a.lastAction[0],/周师傅/);assert.equal(a.skill,100);
});
test('Lv2封顶后等待90日才能进阶；Lv3封顶不能无限进阶',()=>{
 const s=ready('锻造');act(s,'进修：锻造');s.forge=300;act(s,'进修：锻造');assert.match(s.lastAction[0],/历练90日/);
 tick(s,90*24);s.energy=100;act(s,'进修：锻造');assert.equal(skillLevel(s,'锻造'),3);assert.equal(s.forge,0);assert.equal(skillCap(s,'锻造'),600);assert.equal(s.coins,64);
 s.forge=599;assert.match(gain(s,'锻造',5),/599\/600 → 600\/600（\+1）.*完成/);assert.equal(studyOptions(s).length,0);act(s,'进修：锻造');assert.match(s.lastAction[0],/最高阶段/);
 assert.ok(skillLines(s).includes('锻造 Lv3：600/600【完成】'));
});
test('所有已实现技能都有进阶地点，资金及精力不足会阻止操作',()=>{
 const places={拳脚:'城外小路',吐纳:'城外小路',搬运:'青石镇',采药:'河边',药材辨识:'作坊',制药:'作坊',锻造:'作坊',火候控制:'作坊',材料辨识:'作坊',烹饪:'作坊',经商:'粮铺',钓鱼:'河边'};
 for(const [name,key] of Object.entries(skills)){const s=ready(name);s.place=places[name];assert.equal(studyProblem(s,name),null);act(s,'进修：'+name);assert.equal(skillLevel(s,name),2);assert.equal(s[key],0)}
 const s=ready('锻造');s.coins=11;act(s,'进修：锻造');assert.equal(s.forge,100);s.coins=100;s.energy=11;act(s,'进修：锻造');assert.equal(s.forge,100);assert.equal(s.coins,100);
});
test('迁移旧存档保留经验，拒绝伪造阶段、越界经验及未来进修日期',()=>{
 const s=fresh();s.forge=100;delete s.skillLevels;delete s.studyDays;s.version=8;const migrated=restore(JSON.stringify(s));assert.equal(migrated.forge,100);assert.equal(skillLevel(migrated,'锻造'),1);
 assert.throws(()=>restore(JSON.stringify({...fresh(),skillLevels:{锻造:4}})));
 assert.throws(()=>restore(JSON.stringify({...fresh(),skillLevels:{锻造:2},forge:301})));
 assert.throws(()=>restore(JSON.stringify({...fresh(),studyDays:{锻造:2}})));
});
