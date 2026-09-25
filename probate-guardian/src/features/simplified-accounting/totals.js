// Simplified Accounting's running totals (Part II-III). Moved from
// src/legacy-app.js by Milestone 70's 70B; loaded eagerly (through
// src/legacy-bridge.js) because the sidebar's headline total reads it for a
// Simplified filing whose feature has never been opened.
import { getD } from '../../core/state.js';

export function calcTotals(){
  const d=getD();
  const n=v=>parseFloat(v)||0;
  const starting=n(d.startingBalance);
  const interest=n(d.interestIncome);
  const deposits=n(d.depositsSettlement);
  const totalIncome=interest+deposits;
  const serviceCharges=n(d.serviceCharges);
  const fedTax=n(d.federalIncomeTax);
  const totalDisbursements=serviceCharges+fedTax;
  const remaining=starting+totalIncome-totalDisbursements;
  return {starting,interest,deposits,totalIncome,serviceCharges,fedTax,totalDisbursements,remaining};
}
