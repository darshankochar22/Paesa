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
    billsReceivable: (company_id: number, fy_id: number) => Promise<{ success: boolean; as_on?: string; rows: { ledger_id: number; party: string; bill: string; bill_date: string; due_date: string; credit_period: number; overdue_days: number; balance: number; ageing: string }[]; total: number; bucketTotals: Record<string, number>; error?: string }>;
    billsPayable: (company_id: number, fy_id: number) => Promise<{ success: boolean; as_on?: string; rows: { ledger_id: number; party: string; bill: string; bill_date: string; due_date: string; credit_period: number; overdue_days: number; balance: number; ageing: string }[]; total: number; bucketTotals: Record<string, number>; error?: string }>;
    cashFlow: (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; from_date: string | null; to_date: string | null; cashBankLedgers: { ledger_id: number; ledger_name: string; ledger_type: string }[]; byCounterLedger: { ledger_id: number; ledger_name: string; inflow: number; outflow: number; net: number }[]; byVoucherType: { voucher_type: string; inflow: number; outflow: number; net: number }[]; totalInflow: number; totalOutflow: number; netCashFlow: number; error?: string }>;
    fundsFlow: (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; from_date: string | null; to_date: string | null; fundsFromOperations: number; periodIncome: number; periodExpenses: number; sources: { particulars: string; amount: number }[]; applications: { particulars: string; amount: number }[]; totalSources: number; totalApplications: number; netWorkingCapitalChange: number; isNetIncrease: boolean; error?: string }>;
    stockSummary: (company_id: number, fy_id: number, as_on_date?: string) => Promise<{ success: boolean; as_on_date: string | null; items: { item_id: number; item_name: string; group_id: number | null; group_name: string; opening_qty: number; opening_value: number; inwards_qty: number; inwards_value: number; outwards_qty: number; outwards_value: number; closing_qty: number; closing_value: number }[]; groups: { group_id: number | null; group_name: string; closing_qty: number; closing_value: number; item_count: number }[]; totalClosingQty: number; totalClosingValue: number; error?: string }>;
    ratioAnalysis: (company_id: number, fy_id: number) => Promise<{ success: boolean; ratios: { key: string; label: string; unit: string; value: number | null }[]; components: Record<string, number>; error?: string }>;
  };

  banking: {
    getUnreconciled: (company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; error?: string; transactions: { entry_id: number; voucher_id: number; voucher_number?: string; date: string; type: string; amount: number; narration?: string; party_name?: string }[] }>;
    reconcile: (data: { entry_id: number; voucher_id: number; ledger_id: number; reconciled_date?: string; bank_date?: string; bank_reference?: string }) => Promise<{ success: boolean; error?: string }>;
    unreconcile: (entry_id: number) => Promise<{ success: boolean; error?: string; removed?: number }>;
    getStatement: (company_id: number, fy_id: number, ledger_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; error?: string; ledger_name: string; rows: { entry_id: number; voucher_id: number; voucher_number?: string; date: string; type: string; amount: number; is_reconciled: boolean; balance: number; bank_reference?: string | null; reconciliation_id?: number | null }[] }>;
    getSummary: (company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; error?: string; ledger_name: string; book_balance: number; reconciled_amount: number; unreconciled_amount: number; total_reconciled_count: number; total_unreconciled_count?: number; total_count?: number }>;
  };
}
