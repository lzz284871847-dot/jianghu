// Legacy loan ledger validation only; no new loans, repayments or credit simulation.
export const CONTRACT_VERSION=1;
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export function makeContracts(day=1){return {version:CONTRACT_VERSION,lastDay:day,entries:[],history:[]};}
export function contractsValid(root,day){
 return !!root&&root.version===CONTRACT_VERSION&&integer(root.lastDay,day)&&root.lastDay>=1&&Array.isArray(root.entries)&&root.entries.length<=32&&root.entries.every(c=>c&&typeof c.id==='string'&&c.id.length<=80&&typeof c.lender==='string'&&typeof c.borrower==='string'&&c.lender!==c.borrower&&integer(c.amount,1000000)&&c.amount>0&&integer(c.dueDay,1000000)&&(c.reputationApplied===undefined||typeof c.reputationApplied==='boolean')&&['open','repaid','defaulted'].includes(c.status))&&Array.isArray(root.history)&&root.history.length<=24&&root.history.every(x=>typeof x==='string'&&x.length<=160);
}
