import test from 'node:test';
import assert from 'node:assert/strict';
import {makeContracts,openLoan,settleContracts} from './npc-contracts.js';
test('loans conserve currency',()=>{const s={day:1,npcWorld:{individuals:{a:{name:'A',coins:20},b:{name:'B',coins:0}}}};const l=makeContracts();assert.equal(openLoan(s,l,'a','b',5,3),true);assert.equal(s.npcWorld.individuals.a.coins,15);assert.equal(s.npcWorld.individuals.b.coins,5);s.day=3;settleContracts(s,l,3);assert.equal(s.npcWorld.individuals.a.coins,20);});
