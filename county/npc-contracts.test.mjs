import test from 'node:test';
import assert from 'node:assert/strict';
import {makeContracts,contractsValid} from './npc-contracts.js';
import {fresh,restore} from './engine.js';
import {tickNPCs} from './npc-simulation.js';
test('empty legacy loan ledger validates but creates no automatic credit',()=>{const s=fresh();assert.ok(contractsValid(makeContracts(),1));s.day=5;tickNPCs(s,5);assert.deepEqual(s.npcWorld.contracts,makeContracts());});
test('existing loan records survive loading and daily updates without repayment transfers',()=>{const s=fresh();s.npcWorld.contracts.entries=[{id:'old',lender:'shopassistant',borrower:'farmhand01',amount:3,dueDay:2,status:'open'}];const x=restore(JSON.stringify(s)),before=JSON.stringify(x.npcWorld.contracts);x.day=2;tickNPCs(x,2);assert.equal(JSON.stringify(x.npcWorld.contracts),before);assert.equal(x.npcWorld.contracts.entries[0].status,'open');});
test('legacy loan validator still rejects corrupted amounts and statuses',()=>{for(const patch of [{amount:-1},{status:'invented'},{dueDay:1000001}]){const l=makeContracts();l.entries=[{id:'old',lender:'shopassistant',borrower:'farmhand01',amount:3,dueDay:2,status:'open',...patch}];assert.equal(contractsValid(l,1),false);}});
