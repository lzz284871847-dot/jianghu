import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {npcSparringDay} from './npc-sparring.js';
import {makeLife,alive} from './npc-mortality.js';
import {makeChildLivelihood} from './npc-lineage.js';
import {npcCareerDay} from './npc-economy.js';
import {readFileSync} from 'node:fs';
const setup=(day=28)=>{const s=fresh();s.day=day;for(const n of Object.values(s.nodes))n.refreshDay=day%2?day+2:day+1;for(const id of ['dockhand01','farmhand01']){const p=s.npcWorld.individuals[id];p.energy=100;p.study.learnedDay=7;p.study.practice=120;p.study.lastDay=day;}return s;};
const pair=s=>['dockhand01','farmhand01'].map(id=>s.npcWorld.individuals[id]);
test('two real NPCs exchange bounded blows, spend exact move energy and earn no money or goods',()=>{
 const s=setup(),before=JSON.stringify({bag:s.bag,commerce:s.commerce,player:s.martial,cash:Object.values(s.npcWorld.individuals).map(p=>p.coins),food:Object.values(s.npcWorld.individuals).map(p=>p.food)});
 assert.equal(npcSparringDay(s,28).length,1);for(const p of pair(s)){assert.equal(p.study.lastSparDay,28);assert.ok(p.study.experience>=2&&p.study.experience<=6);assert.ok(p.study.mastery<=3);assert.ok(p.energy>=64&&p.energy<100);assert.match(p.history[0],/消耗精力[1-9]/);assert.equal(alive(p),true);}
 assert.equal(JSON.stringify({bag:s.bag,commerce:s.commerce,player:s.martial,cash:Object.values(s.npcWorld.individuals).map(p=>p.coins),food:Object.values(s.npcWorld.individuals).map(p=>p.food)}),before);
 assert.deepEqual(restore(JSON.stringify(s)).npcWorld,s.npcWorld);const snap=JSON.stringify(s);assert.deepEqual(npcSparringDay(s,28),[]);assert.equal(JSON.stringify(s),snap);
});
test('sparring excludes minors, elders, retired, ill, injured, hungry, tired and new learners',()=>{
 for(const block of ['minor','elder','retired','ill','rest','injury','hunger','energy','untrained','new','lesson','dead']){
  const s=setup(),p=pair(s)[0];if(block==='minor')p.age=15;if(block==='elder')p.age=65;if(block==='retired')p.retirement.active=true;if(block==='ill')p.life.sickDays=1;if(block==='rest')p.life.restDay=28;if(block==='injury')p.injuryDays=1;if(block==='hunger')p.hunger=40;if(block==='energy')p.energy=39;if(block==='untrained')p.study.practice=119;if(block==='new')p.study.learnedDay=28;if(block==='lesson')p.study.otherArts.spring_kick={learnedDay:28,practice:0,insight:0};if(block==='dead')p.life={...makeLife(),deathDay:27,frailty:100};
  const before=JSON.stringify(s);assert.deepEqual(npcSparringDay(s,28),[],block);assert.equal(JSON.stringify(s),before,block);
 }
 const s=setup();assert.deepEqual(npcSparringDay(s,29),[]);
});
test('odd participant is not charged and deterministic outcomes survive reload',()=>{
 const s=setup(),p=s.npcWorld.individuals.carter;p.study.learnedDay=7;p.study.practice=120;p.study.lastDay=28;
 const x=restore(JSON.stringify(s));assert.deepEqual(npcSparringDay(s,28),npcSparringDay(x,28));assert.deepEqual(s.npcWorld,x.npcWorld);
 const odd=s.npcWorld.individuals.farmhand01;assert.equal(odd.study.lastSparDay,0);assert.equal(odd.energy,100);
});
test('light sparring injuries persist and block real labor on the next recovery day',()=>{
 let injured;
 for(let day=28;day<=280&&!injured;day+=14){const s=setup(day);for(const p of pair(s))p.study.practice=2400;npcSparringDay(s,day);const p=pair(s).find(p=>p.injuryDays>0);if(p)injured={s,p,day};}
 assert.ok(injured);const {s,p,day}=injured;assert.equal(p.injuryDays,2);p.injuryDays--;const cash=p.coins;assert.equal(npcCareerDay(s,p,day+1),false);assert.equal(p.coins,cash);assert.equal(alive(p),true);
});
test('adult descendants participate using their own persisted energy and martial record',()=>{
 const s=setup(7000);s.npcWorld.individuals.farmhand01.study.practice=0;
 const v=makeChildLivelihood('chen-child-1',6999);v.study.learnedDay=6000;v.study.practice=120;v.energy=90;
 const c={id:'chen-child-1',bornDay:332,hunger:0,learning:20,lastDay:6999,life:makeLife(),livelihood:v};
 s.npcWorld.lineage={lastDay:6999,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[c]};
 const cash=v.coins;assert.equal(npcSparringDay(s,7000).length,1);assert.equal(v.study.lastSparDay,7000);assert.ok(v.energy<90);assert.equal(v.coins,cash);assert.match(v.history[0],/切磋/);
 s.npcWorld.lineage.lastDay=7000;assert.deepEqual(restore(JSON.stringify(s)).npcWorld.lineage.children[0].livelihood,v);
});
test('crossing midnight runs NPC sparring without player conversation or challenge',()=>{
 const s=setup(27);for(const n of Object.values(s.nodes))n.refreshDay=29;s.minute=1430;s.npcWorld.lastDay=27;for(const p of Object.values(s.npcWorld.individuals))p.lastDay=27;
 advance(s,10);assert.equal(s.day,28);assert.equal(pair(s)[0].study.lastSparDay,28);assert.equal(pair(s)[1].study.lastSparDay,28);assert.equal(s.combat,null);
});
test('legacy study migrates empty combat records and rejects invalid future or excessive progress',()=>{
 const s=setup();for(const p of Object.values(s.npcWorld.individuals))for(const k of ['experience','mastery','lastSparDay'])delete p.study[k];
 const x=restore(JSON.stringify(s));for(const p of Object.values(x.npcWorld.individuals)){assert.equal(p.study.experience,0);assert.equal(p.study.mastery,0);assert.equal(p.study.lastSparDay,0);}
 for(const [key,value] of [['experience',2401],['mastery',-1],['lastSparDay',29]]){const y=setup();pair(y)[0].study[key]=value;assert.throws(()=>restore(JSON.stringify(y)),/NPC人生/);}
});
test('sparring module is available offline',()=>assert.match(readFileSync(new URL('./sw.js',import.meta.url),'utf8'),/'npc-sparring.js'/));
test('a surviving younger child keeps the correct name after the elder child dies',()=>{
 const s=setup(7000);s.npcWorld.individuals.farmhand01.study.practice=0;
 const older={id:'chen-child-1',bornDay:332,hunger:0,learning:20,lastDay:6999,life:{...makeLife(),frailty:100,deathDay:6990},livelihood:makeChildLivelihood('chen-child-1',6999)};
 const v=makeChildLivelihood('chen-child-2',6999);v.study.learnedDay=6000;v.study.practice=120;
 s.npcWorld.lineage.children=[older,{id:'chen-child-2',bornDay:692,hunger:0,learning:20,lastDay:6999,life:makeLife(),livelihood:v}];
 const old=JSON.stringify(older);const notes=npcSparringDay(s,7000);assert.match(notes[0],/陈家孩子2/);assert.equal(JSON.stringify(older),old);
});
test('combat gains remain capped and history reports the actual zero gain at cap',()=>{
 const s=setup();for(const p of pair(s)){p.study.experience=2400;p.study.mastery=2400;}
 npcSparringDay(s,28);for(const p of pair(s)){assert.equal(p.study.experience,2400);assert.equal(p.study.mastery,2400);assert.match(p.history[0],/实战积累\+0、掌握\+0/);}
});
