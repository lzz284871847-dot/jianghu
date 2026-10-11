// Run: node --test county/martial-regression.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,restore,martialAction,act,choose} from './engine.js';
import {advance} from './world.js';
import {catalogCheck,OPPONENTS} from './martial-data.js';
import {combatCatalogValid,newCombat,intent,resolve} from './combat-core.js';
import {moveCatalogValid} from './martial-moves.js';

test('complete martial catalogue',()=>{
 assert.deepEqual(catalogCheck(),{arts:18,moves:54,opponents:12,injuries:6,distances:5});
 assert.ok(combatCatalogValid());assert.ok(moveCatalogValid());
});
test('old county save migrates and roundtrips',()=>{
 const old=fresh();delete old.martial;delete old.injuries;delete old.injuryRecovery;
 const loaded=restore(JSON.stringify(old));
 assert.deepEqual(loaded.martial.known,{});assert.deepEqual(loaded.injuries,{});
 assert.deepEqual(restore(JSON.stringify(loaded)).martial.known,{});
});
test('learn, train and fight in school survive save',()=>{
 const s=fresh();s.place='school';
 assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 assert.equal(s.minute,540);
 assert.equal(martialAction(s,'train','qinghe_fist'),true);
 assert.equal(s.minute,660);
 assert.equal(martialAction(s,'challenge','brawler'),true);
 assert.equal(restore(JSON.stringify(s)).combat.opponent,'brawler');
 assert.equal(martialAction(s,'move','qinghe_fist_1',()=>0.5),true);
 assert.ok(s.combat===null||s.combat.round===1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('bleeding and death are irreversible in restored state',()=>{
 const s=fresh();s.hp=1;s.injuries={cut:3};
 advance(s,1440);
 assert.equal(s.dead,true);assert.equal(s.hp,0);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('minor injuries treatable at full health',()=>{
 const s=fresh();s.injuries={bruise:1};s.bag.herb=1;
 assert.equal(martialAction(s,'train','qinghe_fist'),false);
 // Ordinary treatment uses the existing action pipeline.
 assert.equal(act(s,'heal'),true);assert.equal(s.injuries.bruise,undefined);
});


test('tactical combat accepts basic strike and heavy',()=>{
 const s=fresh();s.place='school';assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 assert.equal(martialAction(s,'challenge','brawler'),true);
 assert.equal(martialAction(s,'turn','strike',()=>0.5),true);
 assert.equal(s.combat?.round,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('roadside fight uses tactical rules for trained character',()=>{
 const s=fresh();s.place='school';assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 s.place='oldroad';s.pending={type:'bandit'};
 assert.equal(choose(s,'fight'),true);
 assert.equal(s.combat.opponent,'brawler');
 assert.equal(s.pending,null);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('untrained roadside encounter remains playable and saveable',()=>{
 const s=fresh();s.place='oldroad';s.pending={type:'bandit'};
 assert.equal(choose(s,'fight'),true);
 assert.equal(s.combat.hp,28);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('higher martial tiers cannot be purchased without prerequisite practice',()=>{
 const s=fresh();s.place='school';s.coins=500;
 assert.equal(martialAction(s,'learn','stone_palm'),false);
 assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 assert.equal(martialAction(s,'learn','spring_kick'),true);
 assert.equal(martialAction(s,'learn','stone_palm'),false);
 s.martial.practice.qinghe_fist=120;s.martial.practice.spring_kick=119;
 assert.equal(martialAction(s,'learn','stone_palm'),false);
 s.martial.practice.spring_kick=120;
 assert.equal(martialAction(s,'learn','stone_palm'),false);
 s.relations.master=5;
 assert.equal(martialAction(s,'learn','stone_palm'),true);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('martial teachers demand the appropriate place and trust',()=>{
 const s=fresh();s.coins=500;s.place='school';
 assert.equal(martialAction(s,'learn','wood_knife'),false);
 s.place='village';assert.equal(martialAction(s,'learn','wood_knife'),true);
 assert.equal(martialAction(s,'learn','qinghe_fist'),false);
 s.place='school';assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 assert.equal(martialAction(s,'learn','spring_kick'),true);
 s.martial.practice.qinghe_fist=120;s.martial.practice.spring_kick=120;
 assert.equal(martialAction(s,'learn','stone_palm'),false);
 s.relations.master=5;assert.equal(martialAction(s,'learn','stone_palm'),true);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('footwork evades enemy blows that would hit ordinary attacks',()=>{
 const agile=fresh();agile.place='school';assert.equal(martialAction(agile,'learn','footwork'),true);
 assert.equal(martialAction(agile,'challenge','brawler'),true);
 agile.combat.distance=0;
 assert.equal(martialAction(agile,'move','footwork_1',()=>.6),true);
 assert.equal(agile.hp,100);
 assert.equal(agile.combat.distance,1);
 const plain=fresh();plain.place='school';assert.equal(martialAction(plain,'learn','qinghe_fist'),true);
 assert.equal(martialAction(plain,'challenge','brawler'),true);
 plain.combat.distance=0;
 assert.equal(martialAction(plain,'move','qinghe_fist_1',()=>.6),true);
 assert.ok(plain.hp<100);
 assert.doesNotThrow(()=>restore(JSON.stringify(agile)));
});
test('breathing techniques restore stamina while exposed to enemy pressure',()=>{
 const s=fresh();s.place='school';assert.equal(martialAction(s,'learn','breath'),true);
 assert.equal(martialAction(s,'challenge','brawler'),true);
 s.energy=30;s.combat.distance=0;
 assert.equal(martialAction(s,'move','breath_1',()=>.6),true);
 assert.equal(s.energy,31);
 assert.equal(s.combat.playerGuard,4);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('reach fighters strike at distance three while ordinary brawlers approach',()=>{
 const spear=newCombat('spearman','qinghe_fist');spear.distance=3;
 const brawler=newCombat('brawler','qinghe_fist');brawler.distance=3;
 assert.equal(intent(spear),'strike');assert.equal(intent(brawler),'advance');
 const player=fresh();
 resolve(spear,player,'guard',()=>0.1);
 assert.equal(spear.distance,3);
 assert.ok(player.hp<100);
 assert.doesNotThrow(()=>restore(JSON.stringify(player)));
});
test('skirmishers withdraw when crowded but close in when out of range',()=>{
 const c=newCombat('skirmisher','qinghe_fist');c.distance=1;
 assert.equal(intent(c),'retreat');
 c.distance=4;assert.equal(intent(c),'advance');
});

test('counter fighter punishes reckless heavy strikes but not ordinary strikes',()=>{
 const heavy=fresh(),h=newCombat('boxer','qinghe_fist');h.distance=1;
 const hr=resolve(h,heavy,'heavy',()=>0.1);
 assert.equal(hr.enemyIntent,'guard');assert.equal(heavy.hp,88);
 assert.ok(hr.log.some(x=>x.includes('守中反击')));
 const ordinary=fresh(),o=newCombat('boxer','qinghe_fist');o.distance=1;
 const sr=resolve(o,ordinary,'strike',()=>0.1);
 assert.equal(ordinary.hp,100);
 assert.equal(sr.log.some(x=>x.includes('守中反击')),false);
 const weak=fresh(),w=newCombat('brawler','qinghe_fist');w.distance=1;
 assert.equal(intent(w),'heavy');
 assert.doesNotThrow(()=>restore(JSON.stringify(heavy)));
});

test('feint breaks a guarding expert stance and opens the next strike',()=>{
 const direct=fresh(),guarding=newCombat('boxer','qinghe_fist');guarding.distance=1;
 const baseline=resolve(guarding,direct,'strike',()=>0.1);
 assert.equal(baseline.enemyHpDelta,-3);
 const clever=fresh(),c=newCombat('boxer','qinghe_fist');c.distance=1;
 const feint=resolve(c,clever,'feint',()=>0.1);
 assert.equal(feint.enemyIntent,'guard');
 assert.equal(c.enemyGuard,0);
 assert.equal(c.enemyStance,'失衡');
 const followup=resolve(c,clever,'strike',()=>0.1);
 assert.equal(followup.enemyHpDelta,-11);
 assert.equal(c.enemyStance,'游走'); // Expert reacts to the follow-up with an evasive feint.
 assert.doesNotThrow(()=>restore(JSON.stringify(clever)));
});

test('footwork creates space against brawlers but spear reach still threatens',()=>{
 const foot=fresh();foot.place='school';assert.equal(martialAction(foot,'learn','footwork'),true);
 assert.equal(martialAction(foot,'challenge','spearman'),true);
 foot.combat.distance=2;
 assert.equal(martialAction(foot,'move','footwork_1',()=>.1),true);
 assert.equal(foot.combat.distance,3);
 assert.ok(foot.hp<100,'spear fighter still reaches at distance three');
 const boxer=fresh();boxer.place='school';assert.equal(martialAction(boxer,'learn','footwork'),true);
 assert.equal(martialAction(boxer,'challenge','brawler'),true);
 boxer.combat.distance=2;
 assert.equal(martialAction(boxer,'move','footwork_1',()=>.1),true);
 assert.equal(boxer.hp,100,'ordinary brawler cannot reach through the created gap');
 assert.doesNotThrow(()=>restore(JSON.stringify(foot)));
});

test('narrow martial victory grants more insight than an easy victory',()=>{
 function win(hp){
  const s=fresh();s.place='school';
  assert.equal(martialAction(s,'learn','qinghe_fist'),true);
  assert.equal(martialAction(s,'challenge','brawler'),true);
  s.hp=hp;s.combat.distance=1;s.combat.enemyHp=1;
  assert.equal(martialAction(s,'turn','strike',()=>0.1),true);
  assert.equal(s.combat,null);
  assert.equal(s.hp,hp);
  assert.doesNotThrow(()=>restore(JSON.stringify(s)));
  return s;
 }
 const easy=win(100),narrow=win(25);
 assert.equal(easy.martial.insight.qinghe_fist,2);
 assert.equal(narrow.martial.insight.qinghe_fist,6);
 assert.equal(easy.coins,22);
 assert.equal(narrow.coins,22);
 assert.ok(narrow.result.some(x=>x.includes('险胜保命')));
});
test('victory earned by martial technique receives the same one-time outcome',()=>{
 const s=fresh();s.place='school';
 assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 assert.equal(martialAction(s,'challenge','brawler'),true);
 s.combat.distance=1;s.combat.enemyHp=1;
 assert.equal(martialAction(s,'move','qinghe_fist_1',()=>0.1),true);
 assert.equal(s.combat,null);
 assert.equal(s.martial.insight.qinghe_fist,2);
 assert.equal(s.result.filter(x=>x.includes('实战领悟 +')).length,1);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});
test('successful retreat leaves injuries and gives no victory bonus',()=>{
 const s=fresh();s.place='school';assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 assert.equal(martialAction(s,'challenge','brawler'),true);
 s.hp=45;s.injuries={bruise:1};s.combat.distance=3;
 assert.equal(martialAction(s,'turn','flee',()=>0.1),true);
 assert.equal(s.combat,null);assert.equal(s.hp,45);
 assert.equal(s.injuries.bruise,1);
 assert.equal(s.martial.insight.qinghe_fist,0);
 assert.ok(s.result.some(x=>x.includes('未获得胜利奖励')));
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('repeated victories against the same opponent give no extra insight that day',()=>{
 const s=fresh();s.place='school';
 assert.equal(martialAction(s,'learn','qinghe_fist'),true);
 function victory(){
  assert.equal(martialAction(s,'challenge','brawler'),true);
  s.combat.distance=1;s.combat.enemyHp=1;
  assert.equal(martialAction(s,'turn','strike',()=>0.1),true);
  assert.equal(s.combat,null);
 }
 victory();
 assert.equal(s.martial.insight.qinghe_fist,2);
 victory();
 assert.equal(s.martial.insight.qinghe_fist,2);
 assert.ok(s.result.some(x=>x.includes('再战无额外领悟')));
 s.day++;
 victory();
 assert.equal(s.martial.insight.qinghe_fist,4);
 assert.doesNotThrow(()=>restore(JSON.stringify(s)));
});

test('lasting injuries reduce attack reliability and make escape harder',()=>{
 const healthy=fresh(),wounded=fresh();
 const a=newCombat('brawler','qinghe_fist'),b=newCombat('brawler','qinghe_fist');
 a.distance=1;b.distance=1;
 wounded.injuries={strain:2,fracture:1};
 const clean=resolve(a,healthy,'strike',()=>0.65);
 const hurt=resolve(b,wounded,'strike',()=>0.65);
 assert.ok(clean.enemyHpDelta<0);
 assert.equal(hurt.enemyHpDelta,0);
 const normalFlee=newCombat('brawler','qinghe_fist'),injuredFlee=newCombat('brawler','qinghe_fist');
 normalFlee.distance=3;injuredFlee.distance=3;
 const safe=fresh(),limping=fresh();limping.injuries={fracture:2};
 assert.equal(resolve(normalFlee,safe,'flee',()=>0.5).ended,'escaped');
 assert.equal(resolve(injuredFlee,limping,'flee',()=>0.5).ended,null);
 assert.ok(limping.combat===null);
 assert.doesNotThrow(()=>restore(JSON.stringify(limping)));
});

test('daily reward history migrates from older martial saves and rejects forged entries',()=>{
 const old=fresh();delete old.martial.rewardDays;
 const migrated=restore(JSON.stringify(old));
 assert.deepEqual(migrated.martial.rewardDays,{});
 assert.doesNotThrow(()=>restore(JSON.stringify(migrated)));
 migrated.martial.rewardDays={brawler:migrated.day};
 assert.doesNotThrow(()=>restore(JSON.stringify(migrated)));
 migrated.martial.rewardDays={unknown:migrated.day};
 assert.throws(()=>restore(JSON.stringify(migrated)),/战斗奖励记录无效/);
 migrated.martial.rewardDays={brawler:migrated.day+1};
 assert.throws(()=>restore(JSON.stringify(migrated)),/战斗奖励记录无效/);
});

test('all twelve opponents are accessible and survive save/load',()=>{
 for(const opponent of Object.keys(OPPONENTS)){
  const s=fresh();s.place='school';
  assert.equal(martialAction(s,'learn','qinghe_fist'),true);
  assert.equal(martialAction(s,'challenge',opponent),true,opponent);
  assert.equal(restore(JSON.stringify(s)).combat.opponent,opponent);
 }
});

import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
test('county app, modules and offline cache all use the same release version',()=>{
 const dir=fileURLToPath(new URL('.',import.meta.url));
 const modules=['index.html','sw.js','app.js','storage.js','commands.js','world.js','engine.js','content.js','progression.js','martial-moves.js','martial-progression.js','combat-core.js','injury.js','manifest.webmanifest'];
 for(const name of modules){
  const content=readFileSync(join(dir,name),'utf8');
  assert.doesNotMatch(content,/\?v=0\.(?:1|2)\.0/,name+' stale cache-buster');
 }
 assert.match(readFileSync(join(dir,'sw.js'),'utf8'),/VERSION='0\.5\.0'/);
 assert.match(readFileSync(join(dir,'content.js'),'utf8'),/VERSION='0\.5\.0'/);
 assert.match(readFileSync(join(dir,'index.html'),'utf8'),/青河县 0\.5\.0/);
});
