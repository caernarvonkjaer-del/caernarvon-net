// Simplified Accounting's running totals (Part II-III). Moved from
// src/legacy-app.js by Milestone 70's 70B; loaded eagerly (through
// src/features-loader.js since 70K) because the sidebar's headline total reads
// it for a Simplified filing whose feature has never been opened.
import { getD } from '../../core/state.js';

// The open filing's totals, or those of the filing given (the dashboard's
// headline total for a filing that is not open, Milestone 70, 70J).
export function calcTotals(d=getD()){
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
