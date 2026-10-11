// Deterministic, bounded social contracts. No virtual money is created.
export const CONTRACT_VERSION=1;
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export function makeContracts(day=1){return {version:CONTRACT_VERSION,lastDay:day,entries:[],history:[]};}
export function contractsValid(root,day){
 return !!root&&root.version===CONTRACT_VERSION&&integer(root.lastDay,day)&&root.lastDay>=1&&Array.isArray(root.entries)&&root.entries.length<=32&&root.entries.every(c=>c&&typeof c.id==='string'&&c.id.length<=80&&typeof c.lender==='string'&&typeof c.borrower==='string'&&c.lender!==c.borrower&&integer(c.amount,1000000)&&integer(c.dueDay,1000000)&&['open','repaid','defaulted'].includes(c.status))&&Array.isArray(root.history)&&root.history.length<=24&&root.history.every(x=>typeof x==='string'&&x.length<=160);
}
export function openLoan(s,ledger,lenderId,borrowerId,amount,dueDay){
 const people=s.npcWorld.individuals,lender=people[lenderId],borrower=people[borrowerId];
 if(!lender||!borrower||lender===borrower||!integer(amount,1000000)||amount===0||!integer(dueDay,1000000)||dueDay<=s.day||lender.coins<amount||ledger.entries.length>=32)return false;
 const id=lenderId+':'+borrowerId+':'+s.day;
 if(ledger.entries.some(x=>x.id===id))return false;
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
  if(c.status!=='open'||day<c.dueDay)continue;
  const lender=s.npcWorld.individuals[c.lender],borrower=s.npcWorld.individuals[c.borrower];
  if(!lender||!borrower)continue;
  if(borrower.coins>=c.amount){borrower.coins-=c.amount;lender.coins+=c.amount;c.status='repaid';notes.push(borrower.name+'按约归还'+c.amount+'文。');}
  else {c.status='defaulted';notes.push(borrower.name+'无力偿还'+lender.name+'的'+c.amount+'文借款，留下违约记录。');}
 }
 ledger.history.unshift(...notes);ledger.history=ledger.history.slice(0,24);ledger.lastDay=day;
 return notes;
}
