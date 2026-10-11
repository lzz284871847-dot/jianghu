import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {makeLineage,lineageDay,lineageValid,childAge,childStage,lineageSummary} from './npc-lineage.js';
const prepare=s=>{for(const id of ['farmhand01','shopassistant']){const p=s.npcWorld.individuals[id];p.workDays=20;p.coins=80;p.food=3;}s.npcWorld.social.bonds['farmhand01:shopassistant'].trust=80;};
const tick=(s,d)=>{s.day=d;return lineageDay(s,d);};
const marriage=s=>{prepare(s);tick(s,2);tick(s,32);};
const birth=s=>{marriage(s);tick(s,62);tick(s,332);};

test('old saves start lineage on their current day without invented relatives or assets',()=>{
 const s=fresh();advance(s,1440*10);delete s.npcWorld.lineage;
 const before=JSON.stringify([s.coins,s.bag,s.npcWorld.individuals,s.npcWorld.households]);
 const x=restore(JSON.stringify(s));assert.deepEqual(x.npcWorld.lineage,makeLineage(s.day));
 assert.equal(JSON.stringify([x.coins,x.bag,x.npcWorld.individuals,x.npcWorld.households]),before);
});
test('marriage requires adulthood, earned work, trust and thirty stable days',()=>{
 const s=fresh();prepare(s);const p=s.npcWorld.individuals.farmhand01;
 p.age=17;tick(s,2);assert.equal(s.npcWorld.lineage.courtshipDay,0);
 p.age=19;tick(s,3);assert.equal(s.npcWorld.lineage.courtshipDay,3);
 tick(s,32);assert.equal(s.npcWorld.lineage.marriedDay,0);
 tick(s,33);assert.equal(s.npcWorld.lineage.marriedDay,33);assert.ok(lineageValid(s));
});
test('hardship interrupts courtship and marriage grants no money or food',()=>{
 const s=fresh();prepare(s);tick(s,2);
 s.npcWorld.individuals.farmhand01.hunger=80;tick(s,20);assert.equal(s.npcWorld.lineage.courtshipDay,0);
 s.npcWorld.individuals.farmhand01.hunger=0;tick(s,21);
 const sum=()=>['farmhand01','shopassistant'].map(id=>{const p=s.npcWorld.individuals[id];return [p.coins,p.food];});
 const before=sum();tick(s,51);assert.deepEqual(sum(),before);assert.equal(s.npcWorld.lineage.marriedDay,51);
});
test('pregnancy respects waiting period, gestation and bounded child identities',()=>{
 const s=fresh();marriage(s);tick(s,61);assert.equal(s.npcWorld.lineage.conceivedDay,0);
 tick(s,62);assert.equal(s.npcWorld.lineage.conceivedDay,62);
 tick(s,331);assert.equal(s.npcWorld.lineage.children.length,0);
 tick(s,332);assert.equal(s.npcWorld.lineage.children[0].bornDay,332);
 tick(s,421);assert.equal(s.npcWorld.lineage.conceivedDay,0);
 tick(s,422);tick(s,692);assert.equal(s.npcWorld.lineage.children.length,2);
 tick(s,900);assert.equal(s.npcWorld.lineage.conceivedDay,0);assert.ok(lineageValid(s));
});
test('feeding consumes exactly one existing ration, famine raises child hunger',()=>{
 const s=fresh();birth(s);const c=s.npcWorld.lineage.children[0];
 for(const id of ['farmhand01','shopassistant'])s.npcWorld.individuals[id].food=0;
 s.npcWorld.households.chen.food=1;
 tick(s,333);assert.equal(s.npcWorld.households.chen.food,0);assert.equal(c.hunger,0);
 tick(s,334);assert.equal(c.hunger,22);tick(s,335);tick(s,336);assert.equal(c.hunger,66);
 const snapshot=JSON.stringify(s.npcWorld);tick(s,336);assert.equal(JSON.stringify(s.npcWorld),snapshot);
});
test('spousal aid transfers food and schooling requires a fed child and parent effort',()=>{
 const s=fresh();birth(s);const a=s.npcWorld.individuals.farmhand01,b=s.npcWorld.individuals.shopassistant,c=s.npcWorld.lineage.children[0];
 a.food=0;a.hunger=50;b.food=3;
 tick(s,333);assert.equal(a.food+b.food,2);assert.ok(a.history.some(t=>t.includes('配偶')));
 a.hunger=0;a.food=2;a.energy=40;c.hunger=0;
 const d=2493;assert.equal(childAge(c,d),6);tick(s,d);assert.equal(c.learning,1);assert.equal(a.energy,38);
 a.food=0;b.food=0;c.hunger=80;tick(s,d+3);assert.equal(c.learning,1);
});
test('child stage follows exact 360-day birthdays and adulthood news is emitted once',()=>{
 const s=fresh();birth(s);const c=s.npcWorld.lineage.children[0];
 assert.equal(childAge(c,691),0);assert.equal(childAge(c,692),1);
 assert.equal(childStage(c,332+6*360),'少年');
 tick(s,332+16*360-1);const notes=tick(s,332+16*360);
 assert.ok(notes.some(t=>t.includes('成年')));assert.equal(childStage(c,s.day),'成年');
 assert.deepEqual(tick(s,s.day),[]);assert.ok(lineageSummary(s).some(t=>t.includes('16岁')));
});
test('forged lineage dates, identities and values are rejected',()=>{
 const s=fresh();birth(s);assert.ok(lineageValid(s));
 for(const mutate of [l=>l.children[0].id='intruder',l=>l.marriedDay=1,l=>l.children[0].hunger=-1,l=>l.children[0].bornDay=s.day+1,l=>l.conceivedDay=s.day+1,l=>l.children.push({...l.children[0]}),l=>l.children=null]){
  const x=structuredClone(s);mutate(x.npcWorld.lineage);assert.equal(lineageValid(x),false);
 }
});
test('world cross-day tick starts courtship autonomously and saves do not replay it',()=>{
 const s=fresh();prepare(s);advance(s,1440-s.minute);
 assert.equal(s.npcWorld.lineage.courtshipDay,2);
 const restored=restore(JSON.stringify(s));assert.deepEqual(restored.npcWorld.lineage,s.npcWorld.lineage);
 const snap=JSON.stringify(restored.npcWorld.lineage);lineageDay(restored,2);assert.equal(JSON.stringify(restored.npcWorld.lineage),snap);
});
test('family overview and offline manifest include lineage module',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const [file,text] of [['app.js',"$('family-life').replaceChildren(...lineageSummary(s)"],['index.html','id="family-life"'],['sw.js',"'npc-lineage.js'"]])assert.ok((await readFile(new URL('./'+file,import.meta.url),'utf8')).includes(text));
});

test('a full year of real world simulation remains restorable with bounded family records',()=>{
 const s=fresh();prepare(s);
 for(let day=0;day<365;day++)advance(s,1440);
 assert.ok(lineageValid(s));assert.equal(s.npcWorld.lineage.lastDay,s.day);
 assert.equal(Object.keys(s.npcWorld.individuals).length,18);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('a save with a born child restores without changing parents, family stores or child state',()=>{
 const s=fresh();birth(s);
 for(const node of Object.values(s.nodes))node.refreshDay=s.day%2===0?s.day+1:s.day+2;
 const x=restore(JSON.stringify(s));assert.deepEqual(x.npcWorld,s.npcWorld);
});

test('every county module import uses the current offline version, including storage and commands',async()=>{
 const {readFile,readdir}=await import('node:fs/promises');
 const {VERSION}=await import('./content.js');
 for(const file of (await readdir(new URL('./',import.meta.url))).filter(f=>f.endsWith('.js'))){
  const source=await readFile(new URL('./'+file,import.meta.url),'utf8');
  for(const match of source.matchAll(/['"]\.\/[^'"]+\.js(?:\?v=([^'"]+))?['"]/g))assert.equal(match[1],VERSION,file+' has a stale module reference');
 }
});
