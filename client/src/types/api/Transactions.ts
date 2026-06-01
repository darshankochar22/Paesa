import type { VoucherRecordType } from '../entities/Voucher';
import type { LedgerType } from '../entities/Ledger';
import type { DaybookEntryType } from '../entities/Daybook';

export interface VoucherAPI {
  voucher: {
    create: (data: Partial<VoucherRecordType>) => Promise<{ success: boolean; voucher: VoucherRecordType; error?: string }>;
    getAll: (company_id: number, fy_id: number) => Promise<{ success: boolean; vouchers: VoucherRecordType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; voucher: VoucherRecordType; error?: string }>;
    update: (data: Partial<VoucherRecordType>) => Promise<{ success: boolean; voucher: VoucherRecordType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    cancel: (id: number) => Promise<{ success: boolean; error?: string }>;
    getDaybook: (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; vouchers: VoucherRecordType[]; error?: string }>;
    getByType: (company_id: number, fy_id: number, type: string) => Promise<{ success: boolean; vouchers: VoucherRecordType[]; error?: string }>;
    getByLedger: (company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; vouchers: VoucherRecordType[]; error?: string }>;
    getNextNumber: (company_id: number, fy_id: number, type: string) => Promise<{ success: boolean; nextNumber?: number; voucher_number?: string; error?: string }>;
    getLedgerBalance: (ledger_id: number, company_id: number, fy_id: number) => Promise<{ success: boolean; balance?: string; rawBalance?: number; error?: string }>;
    searchLedgers: (company_id: number, searchTerm: string) => Promise<{ success: boolean; ledgers: LedgerType[]; error?: string }>;
    getPendingBills: (ledger_id: number, company_id: number, fy_id: number) => Promise<{ success: boolean; pendingBills?: { bill_name: string; bill_date: string; due_date: string; credit_period: string; balance: number; final_balance: number }[]; defaultCreditPeriod?: number; error?: string }>;
  };

  report: {
    trialBalance: (company_id: number, fy_id: number) => Promise<{ success: boolean; rows: { ledger_id: number; ledger_name: string; debit: number; credit: number }[]; totalDebit: number; totalCredit: number }>;
    balanceSheet: (company_id: number, fy_id: number) => Promise<{ success: boolean; assets: { ledger_id: number; ledger_name: string; balance: number }[]; liabilities: { ledger_id: number; ledger_name: string; balance: number }[]; totalAssets: number; totalLiabilities: number }>;
    profitLoss: (company_id: number, fy_id: number) => Promise<{ success: boolean; income: { ledger_id: number; ledger_name: string; balance: number }[]; expenses: { ledger_id: number; ledger_name: string; balance: number }[]; totalIncome: number; totalExpenses: number; netProfit: number; isProfit: boolean }>;
    ledgerReport: (company_id: number, fy_id: number, ledger_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; ledger_name: string; opening_balance: number; rows: { date: string; voucher_type: string; debit: number; credit: number; balance: number; narration: string }[]; closing_balance: number }>;
    cashBook: (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; ledger_name: string; rows: { date: string; voucher_type: string; debit: number; credit: number; balance: number }[] }>;
    bankBook: (company_id: number, fy_id: number, ledger_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; ledger_name: string; rows: { date: string; voucher_type: string; debit: number; credit: number; balance: number }[] }>;
    daybook: (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; vouchers: DaybookEntryType[] }>;
  };

  banking: {
    getUnreconciled: (company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; transactions: { entry_id: number; voucher_id: number; date: string; type: string; amount: number }[] }>;
    reconcile: (data: { entry_id: number; voucher_id: number; ledger_id: number; reconciled_date?: string; bank_date?: string; bank_reference?: string }) => Promise<{ success: boolean; error?: string }>;
    unreconcile: (entry_id: number) => Promise<{ success: boolean; error?: string }>;
    getStatement: (company_id: number, fy_id: number, ledger_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; ledger_name: string; rows: { entry_id: number; date: string; type: string; amount: number; is_reconciled: boolean; balance: number }[] }>;
    getSummary: (company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; ledger_name: string; book_balance: number; reconciled_amount: number; unreconciled_amount: number; total_reconciled_count: number }>;
  };
}
