import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,choose,restore,trade,talk,equipmentAction,adventureAction} from '../county/engine.js';
import {growthPreview} from '../county/practice-growth.js';import {nextSkillMilestone} from '../county/skill-milestones.js';import {skillOverview} from '../county/skill-guide.js';
import {ordinaryRoute} from './qinghe-growth-route-helper.js';
test('ordinary work earns12 and costly gathering earns6/8 while failures still spend real attempts and effort',()=>{
 const s=fresh();assert.ok(act(s,'work',()=>0));assert.equal(s.skills.carry,12);assert.equal(s.energy,76);assert.equal(s.minute,660);
 const b=fresh();b.place='foot';assert.ok(act(b,'wood',()=>0));assert.equal(b.skills.forage,6);assert.equal(b.bag.wood,2);assert.ok(act(b,'wood',()=>1));assert.equal(b.skills.forage,8);assert.equal(b.bag.wood,2);assert.equal(b.nodes['foot:wood'].left,1);assert.equal(b.energy,76);
 const m=fresh();m.place='mine';m.bag.pick=1;assert.ok(act(m,'ore'));assert.equal(m.skills.mining,0);assert.ok(choose(m,'gather',()=>0));assert.equal(m.skills.mining,8);assert.equal(m.bag.ore,2);assert.equal(m.hp,92);
});
test('fatigue and cap previews match settlement without refunding materials or providing free XP on rejected work',()=>{
 const s=fresh();s.place='foot';s.energy=20;assert.match(growthPreview(s,'forage',12,6,2),/成功\+3 \/ 失败\+1.*疲惫减半/);assert.ok(act(s,'wood',()=>0));assert.equal(s.skills.forage,3);
 const c=fresh();c.place='workshop';c.skills.tailor=2098;c.bag.cloth=1;assert.match(growthPreview(c,'tailor',6,8,2),/成功\+2/);assert.ok(act(c,'craft:make:cord',()=>0));assert.equal(c.skills.tailor,2100);assert.equal(c.bag.cloth,0);assert.equal(c.coins,29);const xp=c.skills.tailor;assert.equal(act(c,'craft:make:cord',()=>0),false);assert.equal(c.skills.tailor,xp);
});
test('paid courses and real selfcraft have meaningful XP while purchased goods never grant production XP',()=>{
 const s=fresh();s.place='market';const cash=s.coins+s.npcWorld.individuals.scribe.coins;assert.ok(act(s,'civic:literacy'));assert.equal(s.skills.literacy,8);assert.equal(s.coins+s.npcWorld.individuals.scribe.coins,cash);assert.equal(act(s,'civic:literacy'),false);assert.ok(trade(s,'buy','cloth'));assert.equal(s.skills.tailor,0);s.place='workshop';assert.ok(act(s,'craft:make:cord',()=>0));assert.equal(s.skills.tailor,8);assert.equal(s.bag.cord,2);
 const b=fresh();b.place='workshop';b.bag.wood=2;b.bag.iron=8;b.bag.fine_ore=2;b.coins=100;b.relations.smith=8;assert.ok(equipmentAction(b,'craft','steel_blade',()=>0));assert.equal(b.skills.smelt,4);assert.equal(b.equipment.owned.steel_blade,undefined);assert.equal(b.bag.wood,0);
});
test('fatigue on finite actual orders uses the same half growth rule and keeps one-time loss',()=>{
 const s=fresh();s.place='workshop';s.skills.woodwork=300;s.relations.carpenter=4;s.npcWorld.individuals.carpenter.coins=100;Object.assign(s.bag,{hardwood:2,wood:4,cord:2});assert.ok(act(s,'professional:carpenter_frame:accept'));s.energy=22;assert.ok(act(s,'professional:carpenter_frame:work',()=>0));assert.equal(s.skills.woodwork,312);assert.equal(s.professionals.advanced.carpenter_frame.status,'claim');assert.equal(s.energy,0);assert.equal(act(s,'professional:carpenter_frame:work',()=>0),false);assert.equal(s.skills.woodwork,312);
});
test('viewing milestones or restoring saves neither grants XP nor unlocks an exclusive recipe',()=>{
 const s=fresh(),before=structuredClone(s);assert.deepEqual(nextSkillMilestone(s,'forage'),{required:30,name:'辨选硬木料',remaining:30});assert.equal(nextSkillMilestone(s,'literacy').required,6);assert.ok(skillOverview(s).untrained.flatMap(g=>g.rows).every(r=>r.goal));assert.deepEqual(s,before);assert.deepEqual(restore(JSON.stringify(s)),before);s.skills.woodwork=299;const row=skillOverview(s).trained.find(r=>r.key==='woodwork');assert.match(row.goal,/还差1经验/);assert.equal(s.professionals.advanced.carpenter_frame.status,'none');
});
test('basic martial practice and cheap sales retain their original XP and no migration boost',()=>{
 const s=fresh();s.place='school';assert.ok(act(s,'train'));assert.equal(s.skills.fist,2);const b=fresh();b.place='market';b.bag.wood=1;assert.ok(trade(b,'sell','wood'));assert.equal(b.skills.trade,1);assert.equal(restore(JSON.stringify(b)).skills.trade,1);
});
test('finite fieldwork and clinic cooperation halve growth using stamina after their actual work, once',()=>{
 const s=fresh();s.place='fields';s.bag.grain=1;assert.ok(adventureAction(s,'business:farm0:accept'));s.energy=20;assert.ok(adventureAction(s,'business:farm0:tend'));assert.equal(s.skills.farming,3);assert.equal(s.energy,10);assert.equal(adventureAction(s,'business:farm0:tend'),false);assert.equal(s.skills.farming,3);
 const b=fresh();b.place='village';b.bag.herb=2;b.bag.wood=1;assert.ok(adventureAction(b,'business:clinic0:accept'));b.energy=20;assert.ok(adventureAction(b,'business:clinic0:mix',()=>0));assert.equal(b.skills.herb,10);assert.equal(b.energy,8);assert.equal(b.bag.herb,0);assert.equal(adventureAction(b,'business:clinic0:mix'),false);
});
test('ordinary collecting route reaches hardwood preparation through real finite resources with default save RNG',t=>{
 const h=ordinaryRoute(),s=h.s;h.walk('bamboo');let tries=0;while(s.skills.forage<30){assert.ok(tries++<16);h.rest();while(!s.nodes['bamboo:wood'].left){h.nextDay();h.walk('bamboo');}h.plain('wood');}assert.ok(tries<=10);assert.ok(s.day<=8);assert.equal(nextSkillMilestone(s,'forage'),null);assert.ok(s.bag.wood>0);t.diagnostic(JSON.stringify({route:'gathering',attempts:tries,xp:s.skills.forage,...h.result()}));
});
test('ordinary tailor reaches finecloth preparation by spending actual cloth fees and default crafting outcomes',t=>{
 const h=ordinaryRoute(),s=h.s;h.buy('cloth',3);h.walk('workshop');let tries=0;while(s.skills.tailor<12){assert.ok(tries++<7);h.rest();h.hours(45);if(!s.bag.cloth)h.buy('cloth',2);h.walk('workshop');h.plain('craft:make:cord');}assert.ok(tries<=4);assert.ok(s.day<=3);assert.ok(s.bag.cord>0);t.diagnostic(JSON.stringify({route:'tailoring',attempts:tries,xp:s.skills.tailor,...h.result()}));
});
test('ordinary cultural route buys paper ink pays tuition and reaches real finite work without fake skill grants',t=>{
 const h=ordinaryRoute(),s=h.s;h.walk('market');h.plain('civic:literacy');for(const item of ['paper','ink'])h.step('buy:'+item,()=>trade(s,'buy',item,3));h.step('talk:scribe',()=>talk(s,'scribe'));h.plain('culture:calligraphy:lesson');h.plain('culture:calligraphy:practice');assert.ok(s.skills.calligraphy>=6);assert.equal(s.day,1);assert.equal(s.bag.paper,1);assert.equal(s.bag.ink,1);h.plain('culture:calligraphy:accept');h.plain('culture:calligraphy:draft');assert.ok(['claim','failed'].includes(s.culture.records.calligraphy.status));if(s.culture.records.calligraphy.status==='claim')h.plain('culture:calligraphy:claim');assert.equal(s.bag.paper,0);assert.equal(s.bag.ink,0);assert.ok(s.coins>=0);t.diagnostic(JSON.stringify({route:'culture',xp:s.skills.calligraphy,status:s.culture.records.calligraphy.status,...h.result()}));
});
