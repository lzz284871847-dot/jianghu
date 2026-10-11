import {travelBusy} from './npc-journeys.js?v=4.26.0';
import {alive} from './npc-mortality.js?v=4.26.0';
// Deterministic, bounded social contracts. No virtual money is created.
export const CONTRACT_VERSION=1;
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export function makeContracts(day=1){return {version:CONTRACT_VERSION,lastDay:day,entries:[],history:[]};}
export function contractsValid(root,day){
 return !!root&&root.version===CONTRACT_VERSION&&integer(root.lastDay,day)&&root.lastDay>=1&&Array.isArray(root.entries)&&root.entries.length<=32&&root.entries.every(c=>c&&typeof c.id==='string'&&c.id.length<=80&&typeof c.lender==='string'&&typeof c.borrower==='string'&&c.lender!==c.borrower&&integer(c.amount,1000000)&&c.amount>0&&integer(c.dueDay,1000000)&&(c.reputationApplied===undefined||typeof c.reputationApplied==='boolean')&&['open','repaid','defaulted'].includes(c.status))&&Array.isArray(root.history)&&root.history.length<=24&&root.history.every(x=>typeof x==='string'&&x.length<=160);
}
export function openLoan(s,ledger,lenderId,borrowerId,amount,dueDay){
 const people=s.npcWorld.individuals,lender=people[lenderId],borrower=people[borrowerId];
 if(!lender||!borrower||!alive(lender)||!alive(borrower)||lender===borrower||travelBusy(s,lenderId)||travelBusy(s,borrowerId)||!integer(amount,1000000)||amount===0||!integer(dueDay,1000000)||dueDay<=s.day||lender.coins<amount||borrower.coins>1000000-amount||ledger.entries.length>=32)return false;
 const id=lenderId+':'+borrowerId+':'+s.day;
 if(ledger.entries.some(x=>x.id===id||(x.status==='open'&&x.lender===lenderId&&x.borrower===borrowerId)))return false;
 lender.coins-=amount;borrower.coins+=amount;
 ledger.entries.push({id,lender:lenderId,borrower:borrowerId,amount,dueDay,status:'open'});
 ledger.history.unshift(lender.name+'借给'+borrower.name+amount+'文，约定第'+dueDay+'日归还。');
 ledger.history.length=Math.min(24,ledger.history.length);
 return true;
}
export function settleContracts(s,ledger,day){
 if(ledger.lastDay>=day)return [];
 const notes=[];
 for(const c of ledger.entries){
  if(c.status!=='open')continue;
  const lender=s.npcWorld.individuals[c.lender],borrower=s.npcWorld.individuals[c.borrower];
  if(!lender||!borrower||day<c.dueDay&&alive(borrower))continue;
  if(borrower.coins>=c.amount){borrower.coins-=c.amount;lender.coins+=c.amount;c.status='repaid';notes.push(borrower.name+'按约归还'+c.amount+'文。');}
  else {c.status='defaulted';notes.push(borrower.name+'无力偿还'+lender.name+'的'+c.amount+'文借款，留下违约记录。');}
 }
 ledger.history.unshift(...notes);ledger.history=ledger.history.slice(0,24);ledger.entries=ledger.entries.filter(x=>x.status==='open'||day-x.dueDay<=30);ledger.lastDay=day;
 return notes;
}

export function autonomousLoans(s,ledger,day){
 const bond=s.npcWorld.social.bonds['farmhand01:shopassistant'];
 const borrower=s.npcWorld.individuals?.farmhand01;
 const lender=s.npcWorld.individuals?.shopassistant;
 if(day%5!==0||!bond||!borrower||!lender||bond.trust<45||bond.resentment>=45||borrower.hunger<50||borrower.coins>3||lender.coins<15)return [];
 return openLoan(s,ledger,'shopassistant','farmhand01',5,day+4)?['小莲借给陈二五文钱。']:[];
}

export function applyContractReputation(s,ledger,day){
 const bond=s.npcWorld.social.bonds['farmhand01:shopassistant'];
 if(!bond||!alive(s.npcWorld.individuals?.farmhand01)||!alive(s.npcWorld.individuals?.shopassistant))return [];
 const notes=[];
 for(const loan of ledger.entries){
  if(loan.dueDay>day||loan.lender!=='shopassistant'||loan.borrower!=='farmhand01'||loan.reputationApplied)continue;
  if(loan.status==='defaulted'){
   bond.trust=Math.max(0,bond.trust-15);
   bond.resentment=Math.min(100,bond.resentment+20);
   notes.push('陈二未能还钱，小莲不再轻信。');
  }else if(loan.status==='repaid'){
   bond.trust=Math.min(100,bond.trust+4);
  }else continue;
  loan.reputationApplied=true;
 }
 return notes;
}
