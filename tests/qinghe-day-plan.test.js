import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,move,trade,restore} from '../county/engine.js';
import {dayOptions,dayOptionSkill,daySkillGroups,parseDayNumbers,runDayPlan} from '../county/day-plan.js';
const numbers=(list,...ids)=>ids.map(id=>list.findIndex(a=>a.id===id)+1);
test('number syntax is unambiguous, validated before action, and disallows duplicate work',()=>{
 assert.deepEqual(parseDayNumbers('126',20),[1,2,6]);assert.deepEqual(parseDayNumbers('1 2 12',20),[1,2,12]);assert.deepEqual(parseDayNumbers('#12',20),[12]);assert.deepEqual(parseDayNumbers('#1 #2 #12',20),[1,2,12]);
 for(const input of ['','0','10','11','1 nope','1 21','1.2','#0','1 2 #3x','1 ##2'])assert.throws(()=>parseDayNumbers(input,20));
});
test('listing does not change saves or RNG, and a real ordered plan equals manual actions',()=>{
 const s=fresh(),manual=structuredClone(s),before=structuredClone(s),list=dayOptions(s);assert.deepEqual(s,before);assert.ok(list.length>9);assert.equal(new Set(list.map(a=>a.id)).size,list.length);
 let saves=0;const report=runDayPlan(s,list,numbers(list,'act:work','act:rest','act:wait'),()=>saves++);assert.ok(act(manual,'work'));assert.ok(act(manual,'rest'));assert.ok(act(manual,'wait'));assert.deepEqual(s,manual);assert.equal(saves,3);assert.equal(report.report.length,3);assert.equal(report.stop,'');assert.match(report.report[0].result.join(''),/接下活计/);assert.deepEqual(restore(JSON.stringify(s)),s);
});
test('changing conditions stop the original snapshot without substituting renumbered actions',()=>{
 const s=fresh(),list=dayOptions(s),before=structuredClone(s);s.energy=0;const out=runDayPlan(s,list,numbers(list,'act:work','act:rest'));assert.equal(out.report.length,0);assert.match(out.stop,/不能办理/);assert.equal(s.minute,before.minute);assert.equal(s.energy,0);
});
test('crossing the day or moving stops before later entries and preserves settled costs',()=>{
 const s=fresh();s.minute=1400;const list=dayOptions(s);const out=runDayPlan(s,list,numbers(list,'act:rest','act:wait'));assert.equal(out.report.length,1);assert.match(out.stop,/新的一日/);assert.equal(s.day,2);
 const traveler=fresh(),m=structuredClone(traveler),roads=dayOptions(traveler);const trip=runDayPlan(traveler,roads,numbers(roads,'move:market','act:rest'));assert.ok(move(m,'market'));assert.deepEqual(traveler,m);assert.equal(trip.report.length,1);assert.match(trip.stop,/新的地方/);
});
test('risky gathering opens the existing decision without consuming its cost or later work',()=>{
 const s=fresh();s.place='mine';s.bag.pick=1;const list=dayOptions(s),key=list.find(a=>a.key==='ore');assert.ok(key);const b=structuredClone(s);const out=runDayPlan(s,list,numbers(list,key.id,'act:rest'));assert.equal(s.pending?.type,'resource');assert.equal(s.minute,b.minute);assert.equal(s.energy,b.energy);assert.equal(out.report.length,1);assert.match(out.stop,/需要处理/);assert.equal(dayOptions(s).length,0);
});
test('a separate decision is never silently performed, including later selections',()=>{
 const s=fresh(),list=dayOptions(s),choice=list.find(a=>a.review),b=structuredClone(s);assert.ok(choice);const out=runDayPlan(s,list,numbers(list,choice.id,'act:work'));assert.deepEqual(s,b);assert.equal(out.reviewId,choice.id);assert.equal(out.report.length,0);assert.match(out.stop,/尚未执行/);
});

test('current trade and training entries use real stock, money and skill actions',()=>{
 const s=fresh();s.place='market';const m=structuredClone(s),list=dayOptions(s);assert.ok(list.some(a=>a.id==='buy:food'));const out=runDayPlan(s,list,numbers(list,'buy:food'));assert.equal(out.report.length,1);assert.ok(trade(m,'buy','food'));assert.deepEqual(s,m);s.coins=0;assert.ok(!dayOptions(s).some(a=>a.id==='buy:food'));
 const student=fresh();student.place='school';const old=structuredClone(student),lessons=dayOptions(student);assert.ok(lessons.some(a=>a.id==='act:train'));runDayPlan(student,lessons,numbers(lessons,'act:train'));assert.ok(act(old,'train'));assert.deepEqual(student,old);
});

test('skill categories follow actual resource, recipe, profession and cooperation skills rather than location',()=>{
 const samples=[['act','vegetables','farming'],['act','wood','forage'],['act','rice','cook'],['buy','food','trade'],['talk','merchant','social'],['move','dock','daily'],['adventure','professional:carpenter_crate:work','woodwork'],['adventure','professional:tanner:lesson','leatherwork'],['adventure','craft:make:forest_staff','woodwork'],['adventure','culture:chess:practice','chess'],['adventure','civic:audit','accounting'],['adventure','bond:merchant:work_careful','trade'],['adventure','bond:doctor:meet','social'],['adventure','business:clinic0:mix','herb']];
 for(const [kind,key,expected] of samples)assert.equal(dayOptionSkill({kind,key}),expected,key);
});
test('grouping is read-only, includes only present options, and preserves each original action exactly once',()=>{
 for(const place of ['county','market','fields','workshop','dock']){const s=fresh();s.place=place;const before=structuredClone(s),options=dayOptions(s),copy=structuredClone(options),groups=daySkillGroups(options),flat=groups.flatMap(g=>g.options);assert.deepEqual(s,before);assert.deepEqual(options,copy);assert.deepEqual(flat.map(a=>a.id).sort(),options.map(a=>a.id).sort());assert.equal(new Set(flat.map(a=>a.id)).size,options.length);assert.ok(groups.every(g=>g.options.length));for(const g of groups)assert.ok(g.options.every(a=>dayOptionSkill(a)===g.key));}
 assert.deepEqual(daySkillGroups([]),[]);
});
test('numbers from skill-grouped lists still execute frozen action IDs in the selected order',()=>{
 const s=fresh(),manual=structuredClone(s),snapshot=daySkillGroups(dayOptions(s)).flatMap(g=>g.options);const picked=numbers(snapshot,'act:work','act:rest','act:wait');const out=runDayPlan(s,snapshot,picked);assert.ok(act(manual,'work'));assert.ok(act(manual,'rest'));assert.ok(act(manual,'wait'));assert.deepEqual(s,manual);assert.equal(out.report.length,3);
 const trader=fresh();trader.place='market';const groups=daySkillGroups(dayOptions(trader)),trades=groups.find(g=>g.key==='trade').options;assert.ok(trades.every(a=>dayOptionSkill(a)==='trade'));const other=structuredClone(trader);const result=runDayPlan(trader,trades,numbers(trades,'buy:food'));assert.ok(trade(other,'buy','food'));assert.deepEqual(trader,other);assert.equal(result.report.length,1);
});
