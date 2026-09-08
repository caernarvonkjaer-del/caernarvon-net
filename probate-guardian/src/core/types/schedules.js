// Type definitions for Schedule rows and repeatable group items.

/**
 * @typedef {Object} SchAItem
 * @property {string} payer - Payer or source of income.
 * @property {string} description - Explanation or type of receipt.
 * @property {string} bank - Deposited institution.
 * @property {string} accountNo - Account number deposited into.
 * @property {string | number} amount - Received dollar amount.
 */

/**
 * @typedef {Object} SchBItem
 * @property {string} bankAcct - Account name/number drawn from.
 * @property {string} checkNo - Check or transaction reference number.
 * @property {string} [periodFrom] - Service billing period start date.
 * @property {string} [periodTo] - Service billing period end date.
 * @property {string} datePaid - Disbursement date.
 * @property {string} payee - Name of vendor, provider, or individual paid.
 * @property {string} [courtOrderDate] - Date of authorizing court order.
 * @property {string | number} amount - Disbursed dollar amount.
 * @property {string} [description] - Description of expense (Sch B-4).
 * @property {string} [category] - Budget category (Sch B-4).
 */

/**
 * @typedef {Object} SchCItem
 * @property {string} description - Description of capital asset sold/liquidated.
 * @property {string} date - Date of capital transaction.
 * @property {string | number} gain - Capital gain amount.
 * @property {string | number} loss - Capital loss amount.
 */

/**
 * @typedef {Object} SchD1Item
 * @property {string} description - Bank name and account description.
 * @property {string} accountNo - Account number.
 * @property {string} restricted - 'Yes' | 'No' depository restriction flag.
 * @property {string} [type] - Account type (checking, savings, money market).
 * @property {string | number} fullAmount - Total account balance.
 * @property {string | number} wardPct - Percentage ownership of the ward.
 * @property {string | number} [restrictedAmt] - Amount under court depository order.
 */

/**
 * @typedef {Object} SchD2Item
 * @property {string} description - Company name, CUSIP, or security description.
 * @property {string} [residence] - 'Yes' | 'No' homestead or residence flag.
 * @property {string} [income] - 'Yes' | 'No' dividend/income producing flag.
 * @property {string | number} fullValue - Market value of entire asset.
 * @property {string | number} wardPct - Ward's fractional ownership percentage.
 * @property {string | number} [carryingValue] - Carrying or inventory value.
 * @property {string | number} wardValue - Ward's share of market value.
 */

/**
 * @typedef {Object} SchD3Item
 * @property {string} description - Real property legal or street description.
 * @property {string | number} fullAmount - Total assessed or appraised value.
 * @property {string | number} wardPct - Ward's fractional ownership percentage.
 * @property {string | number} [carryingValue] - Historical carrying value.
 * @property {string | number} wardAmount - Ward's dollar share of real estate value.
 */

/**
 * @typedef {Object} SchD4Item
 * @property {string} description - Vehicle, jewelry, art, or personal effect description.
 * @property {string} [restricted] - 'Yes' | 'No' safekeeping restriction flag.
 * @property {string | number} fullAmount - Total value.
 * @property {string | number} wardPct - Ward percentage.
 * @property {string | number} [carryingValue] - Carrying value.
 * @property {string | number} wardValue - Ward's dollar share of value.
 * @property {string | number} [restrictedAmt] - Restricted amount.
 */

/**
 * @typedef {Object} SchD5Item
 * @property {string} description - Other asset or receivable description.
 * @property {string} [loanNo] - Note or receivable identifier.
 * @property {string} [loanType] - Classification of asset/liability.
 * @property {string | number} [fullDebt] - Total value or debt.
 * @property {string | number} wardPct - Ward percentage.
 * @property {string | number} wardBalance - Ward's share or remaining balance.
 */

/**
 * @typedef {SchD1Item | SchD2Item | SchD3Item | SchD4Item | SchD5Item} SchDItem
 */

/**
 * @typedef {Object} SchEItem
 * @property {string} bankName - Depository institution name.
 * @property {string} transferInDate - Date received in account.
 * @property {string | number} transferInAmt - Amount received.
 * @property {string} transferOutDate - Date transferred out.
 * @property {string | number} transferOutAmt - Amount transferred out.
 */

/**
 * @typedef {Object} SchFItem
 * @property {string} description - Claim or contingent liability description.
 * @property {string} bank - Claimant or institution.
 * @property {string} accountNo - Account or reference number.
 * @property {string} courtOrderDate - Date authorized or submitted.
 * @property {string | number} salePrice - Claimed amount or sale price.
 */

/**
 * @typedef {Object} RemunerationItem
 * @property {string} guardian - Name of guardian receiving remuneration.
 * @property {string} type - Fee or reimbursement type.
 * @property {string} description - Description and basis for compensation.
 * @property {string | number} [amount] - Dollar amount requested or approved.
 */

/**
 * @typedef {Object} PlanResidenceItem
 * @property {string} [name] - Facility or provider residence name.
 * @property {string} [street] - Street address.
 * @property {string} [city] - City.
 * @property {string} [state] - State abbreviation.
 * @property {string} [zip] - Postal code.
 * @property {string} [phone] - Telephone number.
 */

/**
 * @typedef {Object} PlanProviderItem
 * @property {string} [first] - Provider first name.
 * @property {string} [last] - Provider last name.
 * @property {string} [specialty] - Medical practice or specialty.
 * @property {string} [address] - Practice address.
 * @property {string} [phone] - Telephone number.
 * @property {string} [examDate] - Date of last examination.
 * @property {string} [nextDate] - Scheduled date of next examination.
 */

export {};
