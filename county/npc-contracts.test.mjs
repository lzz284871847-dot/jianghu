import test from 'node:test';
import assert from 'node:assert/strict';
import {makeContracts,openLoan,settleContracts} from './npc-contracts.js';
test('loans conserve currency',()=>{const s={day:1,npcWorld:{individuals:{a:{name:'A',coins:20},b:{name:'B',coins:0}}}};const l=makeContracts();assert.equal(openLoan(s,l,'a','b',5,3),true);assert.equal(s.npcWorld.individuals.a.coins,15);assert.equal(s.npcWorld.individuals.b.coins,5);s.day=3;settleContracts(s,l,3);assert.equal(s.npcWorld.individuals.a.coins,20);});

test('open debt blocks repeated borrowing',()=>{const s={day:1,npcWorld:{individuals:{a:{name:'A',coins:30},b:{name:'B',coins:0}}}};const l=makeContracts();assert.equal(openLoan(s,l,'a','b',5,3),true);s.day=2;assert.equal(openLoan(s,l,'a','b',5,4),false);assert.equal(l.entries.length,1);});
test('unpaid debt defaults without minting coins',()=>{const s={day:1,npcWorld:{individuals:{a:{name:'A',coins:20},b:{name:'B',coins:0}}}};const l=makeContracts();openLoan(s,l,'a','b',5,3);s.npcWorld.individuals.b.coins=0;s.day=3;settleContracts(s,l,3);assert.equal(l.entries[0].status,'defaulted');assert.equal(s.npcWorld.individuals.a.coins,15);assert.deepEqual(settleContracts(s,l,3),[]);});

test('expired debt affects friendship',async()=>{const {applyContractReputation}=await import('./npc-contracts.js');const s={npcWorld:{social:{bonds:{'farmhand01:shopassistant':{trust:55,resentment:0}}}}};const ledger={entries:[{dueDay:4,lender:'shopassistant',borrower:'farmhand01',status:'defaulted'}]};applyContractReputation(s,ledger,4);assert.equal(s.npcWorld.social.bonds['farmhand01:shopassistant'].trust,40);assert.equal(s.npcWorld.social.bonds['farmhand01:shopassistant'].resentment,20);});

test('autonomous loan respects need, trust and existing debt',async()=>{
 const {autonomousLoans}=await import('./npc-contracts.js');
 const s={day:5,npcWorld:{individuals:{farmhand01:{name:'陈二',coins:1,hunger:70},shopassistant:{name:'小莲',coins:20}},social:{bonds:{'farmhand01:shopassistant':{trust:55,resentment:0}}}}};
 const l=makeContracts(4);
 assert.equal(autonomousLoans(s,l,5).length,1);
 assert.equal(s.npcWorld.individuals.farmhand01.coins,6);
 assert.equal(s.npcWorld.individuals.shopassistant.coins,15);
 assert.equal(autonomousLoans(s,l,5).length,0);
 s.day=10;s.npcWorld.social.bonds['farmhand01:shopassistant'].resentment=50;
 assert.equal(autonomousLoans(s,l,10).length,0);
});

test('debt reputation applies only once on replay',async()=>{
 const {applyContractReputation}=await import('./npc-contracts.js');
 const bond={trust:55,resentment:0};
 const s={npcWorld:{social:{bonds:{'farmhand01:shopassistant':bond}}}};
 const ledger={entries:[{dueDay:4,lender:'shopassistant',borrower:'farmhand01',status:'defaulted'}]};
 applyContractReputation(s,ledger,4);applyContractReputation(s,ledger,4);
 assert.equal(bond.trust,40);assert.equal(bond.resentment,20);
});

test('older Qinghe saves acquire an empty contract ledger',async()=>{
 const {fresh,restore}=await import('./engine.js');
 const old=fresh();delete old.npcWorld.contracts;
 const loaded=restore(JSON.stringify(old));
 assert.equal(loaded.npcWorld.contracts.version,1);
 assert.equal(loaded.npcWorld.contracts.entries.length,0);
});

test('contract ledger rejects zero-value loans',async()=>{
 const {contractsValid}=await import('./npc-contracts.js');
 const ledger=makeContracts(1);
 ledger.entries.push({id:'a:b:1',lender:'a',borrower:'b',amount:0,dueDay:3,status:'open'});
 assert.equal(contractsValid(ledger,3),false);
});
test('completed debts are eventually removed from ledger',()=>{
 const s={day:1,npcWorld:{individuals:{a:{name:'A',coins:20},b:{name:'B',coins:0}}}};
 const ledger=makeContracts();openLoan(s,ledger,'a','b',5,3);
 s.day=3;settleContracts(s,ledger,3);
 s.day=34;settleContracts(s,ledger,34);
 assert.equal(ledger.entries.length,0);
});
