import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore} from './engine.js';
import {advance} from './world.js';
import {makeLife,settleEstates,lifeValid} from './npc-mortality.js';
import {makeChildLivelihood,lineageDay,lineageValid} from './npc-lineage.js';
import {npcCareerDay,npcProduce} from './npc-economy.js';
import {marketPrice} from './commerce.js';
const setup=()=>{
 const s=fresh();s.day=7000;s.npcWorld.lastDay=6999;
 for(const n of Object.values(s.nodes))n.refreshDay=7001;
 for(const p of Object.values(s.npcWorld.individuals))p.lastDay=6999;
 s.npcWorld.lineage={lastDay:6999,courtshipDay:2,marriedDay:32,conceivedDay:0,children:[332,692].map((bornDay,i)=>({life:makeLife(),livelihood:makeChildLivelihood(),id:'chen-child-'+(i+1),bornDay,hunger:0,learning:30,lastDay:6999}))};
 return s;
};
const kill=p=>{p.life={...makeLife(),frailty:100,deathDay:7000};};
const cash=s=>s.commerce.budget.market+s.commerce.budget.liuxi+Object.values(s.npcWorld.individuals).reduce((n,p)=>n+p.coins,0)+s.npcWorld.lineage.children.reduce((n,c)=>n+c.livelihood.coins,0);
const worker=(c,occupation='farmer')=>({...c.livelihood,id:c.id,name:'孩子',home:'market',level:'ordinary',hunger:0,occupation});
test('estate sells one real vegetable at the current quote and conserves cash and stock',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;kill(p);p.cargo=3;
 const before=cash(s),stock=s.commerce.stock.market.vegetable,budget=s.commerce.budget.market,quote=marketPrice(s,'market','sell','vegetable'),days=p.workDays;
 settleEstates(s);assert.equal(cash(s),before);assert.equal(p.cargo,2);assert.equal(s.commerce.stock.market.vegetable,stock+1);assert.equal(s.commerce.budget.market,budget-quote);assert.equal(p.coins,0);assert.equal(p.workDays,days);
 const snap=JSON.stringify(s.npcWorld);settleEstates(s);assert.equal(JSON.stringify(s.npcWorld),snap);assert.equal(p.cargo,2);
 s.day++;settleEstates(s);assert.equal(p.cargo,1);assert.equal(cash(s),before);
});
test('insolvency, closed shop, full shelf and no heirs preserve unsold estate cargo',()=>{
 for(const obstacle of ['budget','closed','stock','heirs']){
  const s=setup(),p=s.npcWorld.individuals.farmhand01;kill(p);p.cargo=2;
  if(obstacle==='budget')s.commerce.budget.market=0;
  if(obstacle==='closed')s.society.districts.market.closedUntil=s.day;
  if(obstacle==='stock')s.commerce.stock.market.vegetable=30;
  if(obstacle==='heirs'){s.npcWorld.lineage.children=[];kill(s.npcWorld.individuals.shopassistant);}
  const before=cash(s),stock=s.commerce.stock.market.vegetable;settleEstates(s);
  assert.equal(p.cargo,2,obstacle);assert.equal(cash(s),before);assert.equal(s.commerce.stock.market.vegetable,stock);
 }
});
test('only one qualified living adult succeeds and starts with personal skills',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;kill(p);p.careerSkills.forage=400;
 lineageDay(s,s.day);const cs=s.npcWorld.lineage.children;
 assert.equal(cs.filter(c=>c.livelihood.occupation==='farmer').length,1);assert.equal(cs[0].livelihood.occupation,'farmer');assert.equal(cs[0].livelihood.careerSkills.forage,0);assert.equal(p.careerSkills.forage,400);
 assert.equal(lineageValid(s),true);const x=restore(JSON.stringify(s));assert.equal(x.npcWorld.lineage.children[0].livelihood.occupation,'farmer');
});
test('living father, insufficient learning and minors cannot take the farm',()=>{
 for(const obstacle of ['father','learning','age']){
  const s=setup();if(obstacle!=='father')kill(s.npcWorld.individuals.farmhand01);
  for(const [i,c] of s.npcWorld.lineage.children.entries()){
   if(obstacle==='learning')c.learning=19;
   if(obstacle==='age'){c.bornDay=6000+i*360;c.lastDay=6999;}
  }
  lineageDay(s,s.day);assert.equal(s.npcWorld.lineage.children.some(c=>c.livelihood.occupation==='farmer'),false,obstacle);
 }
});
test('farm harvest uses actual effort and failure risk, with no production for other roles',()=>{
 const s=setup(),c=s.npcWorld.lineage.children[0],p=worker(c);
 assert.equal(npcProduce(s,p,7002),true);assert.equal(p.cargo,1);assert.equal(p.energy,82);assert.equal(p.careerSkills.forage,1);
 p.energy=100;assert.equal(npcProduce(s,p,7008),false);assert.equal(p.energy,82);assert.equal(p.cargo,1);assert.equal(p.careerSkills.forage,1);
 p.occupation='carrier';p.energy=100;assert.equal(npcProduce(s,p,7002),false);assert.equal(p.energy,100);
});
test('unfunded farming changes career without destroying held produce',()=>{
 const s=setup(),p=worker(s.npcWorld.lineage.children[0]);p.cargo=2;p.unemployedDays=6;s.commerce.budget.market=0;
 npcCareerDay(s,p,7000);assert.equal(p.occupation,'carrier');assert.equal(p.cargo,2);assert.equal(p.coins,0);
});
test('each career sells at most one held vegetable per day, including job changes',()=>{
 for(const job of ['original','farmer','carrier','shopworker']){
  const s=setup(),p=worker(s.npcWorld.lineage.children[0],job);p.cargo=3;p.energy=0;
  const stock=s.commerce.stock.market.vegetable,budget=s.commerce.budget.market;
  npcCareerDay(s,p,7000);assert.equal(p.cargo,2,job);assert.equal(s.commerce.stock.market.vegetable,stock+1);
  assert.equal(s.commerce.budget.market+p.coins,budget);
 }
});
test('a deceased successor estate sells retained vegetables to living relatives',()=>{
 const s=setup(),c=s.npcWorld.lineage.children[0];kill(c);c.livelihood.cargo=2;
 const before=cash(s);settleEstates(s);assert.equal(c.livelihood.cargo,1);assert.equal(cash(s),before);assert.equal(c.livelihood.coins,0);assert.equal(c.livelihood.workDays,0);
});
test('4.4 saves migrate only new fields, preserving money and history',()=>{
 const s=setup();s.npcWorld.lineage.lastDay=7000;
 for(const p of Object.values(s.npcWorld.individuals))delete p.life.estateDay;
 for(const c of s.npcWorld.lineage.children){delete c.life.estateDay;delete c.livelihood.cargo;}
 for(const n of Object.values(s.nodes))n.refreshDay=7001;
 const before=cash(s),x=restore(JSON.stringify(s));assert.equal(cash(x),before);assert.equal(x.npcWorld.individuals.farmhand01.life.estateDay,0);
 for(const c of x.npcWorld.lineage.children){assert.equal(c.life.estateDay,0);assert.equal(c.livelihood.cargo,0);assert.deepEqual(c.livelihood.history,[]);}
 assert.equal(lineageValid(x),true);assert.deepEqual(restore(JSON.stringify(x)).npcWorld,x.npcWorld);
});
test('daily world advances trigger death, succession and estate sale without interaction',()=>{
 const s=setup(),p=s.npcWorld.individuals.farmhand01;p.age=75;p.life.frailty=99;p.cargo=2;
 s.day=6999;s.minute=480;advance(s,1440-s.minute);
 assert.equal(p.life.deathDay,7000);assert.equal(s.npcWorld.lineage.children[0].livelihood.occupation,'farmer');assert.equal(p.cargo,1);assert.equal(p.life.estateDay,7000);
});
test('estate settlement dates must follow a real death and never lie in the future',()=>{
 assert.equal(lifeValid({...makeLife(),estateDay:1},7000),false);
 assert.equal(lifeValid({...makeLife(),frailty:100,deathDay:7000,estateDay:6999},7000),false);
 assert.equal(lifeValid({...makeLife(),frailty:100,deathDay:7000,estateDay:7001},7000),false);
});
