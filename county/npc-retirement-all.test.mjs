import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,act,martialAction} from './engine.js';
import {advance} from './world.js';
import {tickNPCs} from './npc-simulation.js';
import {npcRetirementDay,npcCareerDay,npcApplyShop,npcWork} from './npc-economy.js';
import {schoolDay,schoolCanTeach} from './npc-school.js';
import {clinicDay,payClinic} from './npc-clinic.js';
const setup=(day=28)=>{const s=fresh();s.day=day;s.weather='晴';s.npcWorld.lastDay=day-1;for(const p of Object.values(s.npcWorld.individuals))p.lastDay=day-1;for(const n of Object.values(s.nodes))n.refreshDay=day%2?day+2:day+1;return s;};
const ready=p=>{p.age=65;p.coins=200;p.food=5;p.workDays=40;};
const qualify=p=>{Object.assign(p.study,{learnedDay:7,practice:120,teacherTrust:15,lastDay:27});p.study.mentor.joinedDay=14;for(const id of ['stone_palm','river_knife'])p.study.otherArts[id]={learnedDay:21,practice:120,insight:30};};
test('all eighteen existing residents may retire using earned reserves with no gifts or copied skills',()=>{
 const s=setup();for(const p of Object.values(s.npcWorld.individuals)){ready(p);const before=JSON.stringify([p.coins,p.food,p.cargo,p.careerSkills,p.study,s.commerce]);assert.equal(npcRetirementDay(s,p,65,28),true,p.id);assert.equal(p.retirement.active,true,p.id);assert.equal(JSON.stringify([p.coins,p.food,p.cargo,p.careerSkills,p.study,s.commerce]),before);assert.equal(npcCareerDay(s,p,28),false);}
 assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);const snap=JSON.stringify(s);for(const p of Object.values(s.npcWorld.individuals))npcRetirementDay(s,p,65,28);assert.equal(JSON.stringify(s),snap);
});
test('ordinary elder autonomously retires before paid work, while meals continue across midnight',()=>{
 const s=setup(27),p=s.npcWorld.individuals.dockhand01;ready(p);s.npcWorld.lastDay=27;s.minute=1430;for(const q of Object.values(s.npcWorld.individuals))q.lastDay=27;const work=p.workDays;advance(s,10);assert.equal(s.day,28);assert.equal(p.retirement.active,true);assert.equal(p.workDays,work);assert.equal(p.careerSkills.carry,0);assert.ok(p.food<5);assert.ok(p.coins<=200);assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);
});
test('retired shopworker releases an actual vacancy; impoverished elder cannot evict replacements',()=>{
 const s=setup(),p=s.npcWorld.individuals.smithapprentice;ready(p);p.occupation='craftsman';npcRetirementDay(s,p,65,28);const a=s.npcWorld.individuals.dockhand01,b=s.npcWorld.individuals.dockhand02;assert.equal(npcApplyShop(s,a,28),true);assert.equal(npcApplyShop(s,b,28),true);s.day=29;p.coins=29;npcRetirementDay(s,p,65,29);assert.equal(p.occupation,'carrier');assert.equal(npcApplyShop(s,p,29),false);assert.equal(npcWork(s,p,29),false);const budget=s.commerce.budget.market;assert.equal(npcCareerDay(s,p,29),true);assert.equal(p.coins,32);assert.equal(s.commerce.budget.market,budget-3);assert.equal(a.occupation,'shopworker');assert.equal(b.occupation,'shopworker');
});
test('living retired doctor yields office only to an actually trained resident, without inheritance',()=>{
 const s=setup(),old=s.npcWorld.individuals.doctor,p=s.npcWorld.individuals.herbalist;ready(old);npcRetirementDay(s,old,65,28);s.npcWorld.clinic.learners[p.id]={practice:20,lastDay:21};const coins=Object.values(s.npcWorld.individuals).map(p=>p.coins),herbs=s.commerce.stock.market.herb;assert.equal(clinicDay(s,28).length,1);assert.equal(s.npcWorld.clinic.holder,p.id);assert.equal(old.life.deathDay,0);assert.deepEqual(Object.values(s.npcWorld.individuals).map(p=>p.coins),coins);assert.equal(s.commerce.stock.market.herb,herbs);assert.equal(payClinic(s,p,old),null);assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);
 s.day=29;old.coins=29;npcRetirementDay(s,old,65,29);clinicDay(s,29);assert.equal(s.npcWorld.clinic.holder,p.id);assert.equal(old.occupation,'carrier');
});
test('living retired teacher yields to real martial experience and does not automatically reclaim office',()=>{
 const s=setup(),old=s.npcWorld.individuals.master,p=s.npcWorld.individuals.dockhand01;ready(old);qualify(p);npcRetirementDay(s,old,65,28);const coins=Object.values(s.npcWorld.individuals).map(p=>p.coins),study=JSON.stringify(p.study);assert.equal(schoolCanTeach(s,'qinghe_fist'),false);assert.equal(schoolDay(s,28).length,1);assert.equal(s.npcWorld.school.holder,p.id);assert.equal(old.life.deathDay,0);assert.deepEqual(Object.values(s.npcWorld.individuals).map(p=>p.coins),coins);assert.equal(JSON.stringify(p.study),study);s.day=29;old.coins=29;npcRetirementDay(s,old,65,29);schoolDay(s,29);assert.equal(s.npcWorld.school.holder,p.id);assert.equal(old.occupation,'carrier');for(const n of Object.values(s.nodes))n.refreshDay=31;assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);
});
test('unqualified successors leave vacancies; retired original providers refuse player services without fees',()=>{
 for(const id of ['doctor','master','farmer']){const s=setup(),p=s.npcWorld.individuals[id];ready(p);npcRetirementDay(s,p,65,28);s.minute=480;s.hp=50;s.place=id==='master'?'school':'village';const before=[s.coins,s.minute,s.hp,s.energy];assert.equal(id==='doctor'?act(s,'doctor'):martialAction(s,'learn',id==='master'?'qinghe_fist':'staff'),false);assert.deepEqual([s.coins,s.minute,s.hp,s.energy],before);assert.match(s.result.join(' '),/退养/);if(id==='doctor'){clinicDay(s,28);assert.equal(s.npcWorld.clinic.holder,'');}if(id==='master'){schoolDay(s,28);assert.equal(s.npcWorld.school.holder,'');}}
});
test('daily retirement frees specialist office for next-day succession, while old saves never invent retirement',()=>{
 const s=setup(),d=s.npcWorld.individuals.doctor,p=s.npcWorld.individuals.herbalist;ready(d);s.npcWorld.clinic.learners[p.id]={practice:20,lastDay:21};tickNPCs(s,28);assert.equal(d.retirement.active,true);s.day=29;tickNPCs(s,29);assert.equal(s.npcWorld.clinic.holder,p.id);assert.equal(d.life.deathDay,0);for(const q of Object.values(s.npcWorld.individuals))delete q.retirement;for(const n of Object.values(s.nodes))n.refreshDay=31;const wallets=Object.values(s.npcWorld.individuals).map(p=>p.coins),x=restore(JSON.stringify(s));assert.ok(Object.values(x.npcWorld.individuals).every(p=>!p.retirement.active));assert.deepEqual(Object.values(x.npcWorld.individuals).map(p=>p.coins),wallets);
});
