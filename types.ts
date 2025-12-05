export interface AccountRow {
  [key: string]: any;
}

export interface BalanceRow {
  [key: string]: any;
}

export interface ManualEntry {
  id: number;
  type: 'receipt' | 'expenditure';
  category: string;
  details: string;
  cash: number;
  bank: number;
}

export interface StatementData {
  receipts: StatementItem[];
  expenditures: StatementItem[];
  totals: StatementTotals;
  period: {
    month: string;
    year: string;
    prevMonthName: string;
  };
}

export interface StatementItem {
  details: string;
  cash: number;
  bank: number;
}

export interface StatementTotals {
  openingCash: number;
  openingBank: number;
  receiptsCash: number;
  receiptsBank: number;
  expenditureCash: number;
  expenditureBank: number;
  closingCash: number;
  closingBank: number;
}

export interface FileData {
  name: string;
  data: any[];
}