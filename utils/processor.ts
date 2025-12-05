import { AccountRow, BalanceRow, ManualEntry, StatementData, StatementItem, StatementTotals } from '../types';
import { addSpacesToText, monthNames, getPreviousMonthName } from './formatting';

// Helper to normalize field names
const normalizeFieldName = (name: string): string => {
    return String(name || '').trim().toLowerCase();
};

const cleanNumericValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return String(value);
    let cleaned = String(value).trim();
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    cleaned = cleaned.replace(/\s+/g, '');
    return cleaned;
};

const parseNumericValue = (value: any): number => {
    if (!value) return 0;
    const cleaned = cleanNumericValue(value);
    return parseFloat(cleaned.replace(/,/g, '')) || 0;
};

// Flexible field getter
const getFieldValue = (row: any, possibleNames: string[], isNumeric = false): any => {
    if (!row || typeof row !== 'object') return '';
    
    for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return isNumeric ? cleanNumericValue(row[name]) : String(row[name]).trim();
        }
        
        const keys = Object.keys(row);
        const normalizedName = normalizeFieldName(name);
        
        for (const key of keys) {
            const normalizedKey = normalizeFieldName(key);
            if (normalizedKey === normalizedName) {
                const value = row[key];
                if (value !== undefined && value !== null && value !== '') {
                    return isNumeric ? cleanNumericValue(value) : String(value).trim();
                }
            }
        }
    }
    return '';
};

const monthNameToNumber: { [key: string]: string } = {
    'january': '1', 'jan': '1', 'february': '2', 'feb': '2', 'march': '3', 'mar': '3',
    'april': '4', 'apr': '4', 'may': '5', 'june': '6', 'jun': '6',
    'july': '7', 'jul': '7', 'august': '8', 'aug': '8', 'september': '9', 'sep': '9', 'sept': '9',
    'october': '10', 'oct': '10', 'november': '11', 'nov': '11', 'december': '12', 'dec': '12'
};

const monthToNumber = (monthValue: any): string => {
    if (!monthValue) return '';
    const monthStr = String(monthValue).trim().toLowerCase();
    const num = parseInt(monthStr);
    if (!isNaN(num) && num >= 1 && num <= 12) return String(num);
    return monthNameToNumber[monthStr] || monthStr;
};

// Transaction Logic
const determineTransactionType = (row: AccountRow, isReceipt: boolean): 'cash' | 'bank' => {
    const bankCashCheque = String(getFieldValue(row, ['Bank_cash_cheque', 'bank_cash_cheque', 'Bank Cash Cheque']) || '').toLowerCase();
    const details = String(getFieldValue(row, ['Details', 'details', 'Detail']) || '').toLowerCase();
    const bankWithdrawl = parseNumericValue(getFieldValue(row, ['Bank_withdrawl', 'bank_withdrawl', 'Bank_withdrawal', 'Bank Withdrawal']));
    
    if (bankWithdrawl > 0) return isReceipt ? 'cash' : 'bank';
    
    if (bankCashCheque.includes('bank') || bankCashCheque.includes('cheque') || bankCashCheque.includes('dd')) return 'bank';
    if (bankCashCheque.includes('cash')) return 'cash';
    
    if (details.includes('cheque') || details.includes('bank') || details.includes('dd') || 
        details.includes('neft') || details.includes('rtgs') || details.includes('online')) return 'bank';
    
    if (details.includes('cash') || details.includes('withdraw')) return 'cash';
    
    if (row.Investments || row.investments || row.Investment || row.investment) return 'bank';
    
    return 'bank'; // Default
};

export const generateStatementData = (
    accountsData: AccountRow[], 
    balanceData: BalanceRow[], 
    year: string, 
    month: string,
    manualEntries: ManualEntry[]
): StatementData => {
    
    // 1. Filter Accounts
    const filteredAccounts = accountsData.filter(row => {
        let rowMonth = getFieldValue(row, ['month', 'Month', 'MONTH', 'MON', 'Mon'], false);
        let rowYear = getFieldValue(row, ['year', 'Year', 'YEAR', 'YR', 'Yr'], true);

        if (!rowMonth) {
            const keys = Object.keys(row);
            const monthKey = keys.find(k => normalizeFieldName(k).includes('month'));
            if (monthKey) rowMonth = String(row[monthKey]).trim();
        }
        if (!rowYear) {
            const keys = Object.keys(row);
            const yearKey = keys.find(k => normalizeFieldName(k).includes('year'));
            if (yearKey) rowYear = cleanNumericValue(row[yearKey]);
        }

        const normalizedRowMonth = monthToNumber(rowMonth);
        const normalizedSelectedMonth = String(parseInt(month) || month).trim();
        const normalizedRowYear = String(parseInt(parseNumericValue(rowYear) || rowYear) || '').trim();
        const normalizedSelectedYear = String(parseInt(year) || year).trim();

        return normalizedRowMonth === normalizedSelectedMonth && normalizedRowYear === normalizedSelectedYear;
    });

    // 2. Get Opening Balances (Previous Month's Closing)
    const currentMonthNum = parseInt(month);
    const currentYearNum = parseInt(year);
    let prevMonth = currentMonthNum - 1;
    let prevYear = currentYearNum;
    if (prevMonth === 0) { prevMonth = 12; prevYear = currentYearNum - 1; }

    const prevBalance = balanceData.find(row => {
        let rowMonth = getFieldValue(row, ['month', 'Month', 'MONTH'], false);
        let rowYear = getFieldValue(row, ['year', 'Year', 'YEAR'], true);
        
        const normMonth = monthToNumber(rowMonth);
        const normYear = String(parseInt(parseNumericValue(rowYear) || rowYear) || '').trim();
        
        return normMonth === String(prevMonth) && normYear === String(prevYear);
    });

    let openingCash = 0;
    let openingBank = 0;

    if (prevBalance) {
        openingCash = parseNumericValue(getFieldValue(prevBalance, ['Cash_on_hand', 'cash_on_hand', 'Cash On Hand'], true));
        openingBank = parseNumericValue(getFieldValue(prevBalance, ['Bank_balance', 'bank_balance', 'Bank Balance'], true));
    } else {
         // Fallback to current month first entry if prev not found (logic from original script)
         const currentBalance = balanceData.find(row => {
            let rowMonth = getFieldValue(row, ['month', 'Month', 'MONTH'], false);
            let rowYear = getFieldValue(row, ['year', 'Year', 'YEAR'], true);
            const normMonth = monthToNumber(rowMonth);
            const normYear = String(parseInt(parseNumericValue(rowYear) || rowYear) || '').trim();
            return normMonth === String(month) && normYear === String(year);
         });
         if (currentBalance) {
            openingCash = parseNumericValue(getFieldValue(currentBalance, ['Cash_on_hand', 'cash_on_hand', 'Cash On Hand'], true));
            openingBank = parseNumericValue(getFieldValue(currentBalance, ['Bank_balance', 'bank_balance', 'Bank Balance'], true));
         }
    }

    // 3. Process Receipts and Expenditures
    const receiptsMap = new Map<string, StatementItem>();
    const expendituresMap = new Map<string, StatementItem>();

    filteredAccounts.forEach(row => {
        const receipts = parseNumericValue(getFieldValue(row, ['Receipts', 'receipts', 'Receipt']));
        const expenditure = parseNumericValue(getFieldValue(row, ['Expenditure', 'expenditure', 'Expenditure']));
        const investments = parseNumericValue(getFieldValue(row, ['Investments', 'investments', 'Investment']));
        const bankWithdrawl = parseNumericValue(getFieldValue(row, ['Bank_withdrawl', 'bank_withdrawl', 'Bank_withdrawal', 'Bank Withdrawal']));
        const detailsRaw = getFieldValue(row, ['Details', 'details', 'Detail'], false) || '';
        const details = addSpacesToText(detailsRaw); // Apply cleaning immediately for display
        const detailsLower = detailsRaw.toLowerCase();

        // Handle Cash Withdrawal
        if (bankWithdrawl > 0) {
            // Receipt (Cash)
            const rKey = detailsRaw || 'Cash withdrawal';
            const rKeyDisplay = details || 'Cash withdrawal';
            if (!receiptsMap.has(rKey)) receiptsMap.set(rKey, { details: rKeyDisplay, cash: 0, bank: 0 });
            receiptsMap.get(rKey)!.cash += bankWithdrawl;

            // Expenditure (Bank)
            const eKey = 'Cash withdrawal';
            if (!expendituresMap.has(eKey)) expendituresMap.set(eKey, { details: 'Cash withdrawal', cash: 0, bank: 0 });
            expendituresMap.get(eKey)!.bank += bankWithdrawl;
        }

        // Handle Receipts
        if (receipts > 0 && bankWithdrawl === 0) {
             const type = determineTransactionType(row, true);
             if (!receiptsMap.has(detailsRaw)) receiptsMap.set(detailsRaw, { details: details, cash: 0, bank: 0 });
             if (type === 'cash') receiptsMap.get(detailsRaw)!.cash += receipts;
             else receiptsMap.get(detailsRaw)!.bank += receipts;
        }

        // Handle Transfers (Deposited in Bank)
        if (detailsLower.includes('deposited in bank') || detailsLower.includes('deposited to bank')) {
            const amount = receipts || expenditure;
            if (amount > 0) {
                // Receipt (Bank)
                if (!receiptsMap.has(detailsRaw)) receiptsMap.set(detailsRaw, { details, cash: 0, bank: 0 });
                receiptsMap.get(detailsRaw)!.bank += amount;
                
                // Expenditure (Cash)
                if (!expendituresMap.has(detailsRaw)) expendituresMap.set(detailsRaw, { details, cash: 0, bank: 0 });
                expendituresMap.get(detailsRaw)!.cash += amount;
            }
            return; // Skip standard processing
        }

        // Handle Expenditures
        if (expenditure > 0 && investments === 0) {
             const type = determineTransactionType(row, false);
             if (!expendituresMap.has(detailsRaw)) expendituresMap.set(detailsRaw, { details, cash: 0, bank: 0 });
             if (type === 'cash') expendituresMap.get(detailsRaw)!.cash += expenditure;
             else expendituresMap.get(detailsRaw)!.bank += expenditure;
        }

        // Handle Investments
        if (investments > 0) {
            const invDetails = detailsLower.includes('investment') ? details : 'Investment under fixed deposits';
            if (!expendituresMap.has(invDetails)) expendituresMap.set(invDetails, { details: invDetails, cash: 0, bank: 0 });
            expendituresMap.get(invDetails)!.bank += investments;
        }
    });

    // 4. Add Manual Entries
    manualEntries.forEach(entry => {
        const details = entry.details;
        const targetMap = entry.type === 'receipt' ? receiptsMap : expendituresMap;
        
        // We use details as key for simple merging, but could use ID if we wanted separate rows
        const key = details; 
        if (!targetMap.has(key)) targetMap.set(key, { details, cash: 0, bank: 0 });
        const item = targetMap.get(key)!;
        item.cash += entry.cash;
        item.bank += entry.bank;
    });

    // 5. Calculate Closing Balances
    // Using filtered balance data for the selected month to get closing balance
    const monthBalances = balanceData.filter(row => {
        let rowMonth = getFieldValue(row, ['month', 'Month', 'MONTH'], false);
        const normMonth = monthToNumber(rowMonth);
        const normYear = String(parseInt(parseNumericValue(getFieldValue(row, ['year', 'Year', 'YEAR'], true)) || getFieldValue(row, ['year', 'Year', 'YEAR'], true)) || '').trim();
        return normMonth === String(month) && normYear === String(year);
    });

    let closingCash = 0;
    let closingBank = 0;
    if (monthBalances.length > 0) {
        const last = monthBalances[monthBalances.length - 1];
        closingCash = parseNumericValue(getFieldValue(last, ['Cash_on_hand', 'cash_on_hand', 'Cash On Hand'], true));
        closingBank = parseNumericValue(getFieldValue(last, ['Bank_balance', 'bank_balance', 'Bank Balance'], true));
    }

    // 6. Calculate Totals
    const receiptsArr = Array.from(receiptsMap.values());
    const expendituresArr = Array.from(expendituresMap.values());

    let receiptsCash = openingCash; // Include opening in total receipts flow? 
    // Wait, the original script does: totalReceiptsCash += openingBalances.cash; inside the display logic.
    // But keeps a separate variable for "totalReceiptsCash" calculated from rows.
    // Let's stick to row sums here, and combine in the UI/Export logic.
    
    // Sum only the transaction rows
    const rCashSum = receiptsArr.reduce((acc, item) => acc + item.cash, 0);
    const rBankSum = receiptsArr.reduce((acc, item) => acc + item.bank, 0);
    const eCashSum = expendituresArr.reduce((acc, item) => acc + item.cash, 0);
    const eBankSum = expendituresArr.reduce((acc, item) => acc + item.bank, 0);

    // Total Flow: Opening + Receipts = Expenditure + Closing
    // The original script visualizes:
    // Receipts Table: Opening + Rows -> Total A
    // Expenditure Table: Rows + Closing -> Total B
    // Total A should equal Total B ideally.

    return {
        receipts: receiptsArr,
        expenditures: expendituresArr,
        totals: {
            openingCash,
            openingBank,
            receiptsCash: rCashSum + openingCash, // Total including opening
            receiptsBank: rBankSum + openingBank,
            expenditureCash: eCashSum + closingCash, // Total including closing
            expenditureBank: eBankSum + closingBank,
            closingCash,
            closingBank
        },
        period: {
            month: monthNames[month],
            year,
            prevMonthName: getPreviousMonthName(month)
        }
    };
};