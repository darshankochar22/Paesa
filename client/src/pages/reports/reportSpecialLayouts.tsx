// Special (non-ReportTable) layout dispatch — extracted from ReportRunner.tsx
// (behaviour unchanged): maps a reportType to its dedicated layout component.
import { BalanceSheetLayout } from '@/components/reports/BalanceSheetLayout';
import { StockSummaryLayout } from '@/components/reports/StockSummaryLayout';
import StockItemSelectionLayout from '@/components/reports/StockSelectionLayout';
import { TrialBalanceLayout } from '@/components/reports/TrialBalanceLayout';
import { ProfitLossLayout } from '@/components/reports/ProfitnLossLayout';
import GroupSummaryLayout from '@/components/reports/GroupSummaryLayout';
import LedgerMonthlySummaryLayout from '@/components/reports/LedgerMonthlySummaryLayout';
import LedgerVouchersLayout from '@/components/reports/LedgerVouchersLayout';
import { RatioAnalysisLayout } from '@/components/reports/RatioAnalysisLayout';
import CashBankSummaryLayout from '@/components/reports/CashBankSummaryLayout';
import GroupVouchersLayout from '@/components/reports/GroupVouchersLayout';
import ContraRegisterLayout from '@/components/reports/ContraRegisterLayout';
import PaymentRegisterLayout from '@/components/reports/PaymentRegisterLayout';
import ReceiptRegisterLayout from '@/components/reports/ReceiptRegisterLayout';
import SalesRegisterLayout from '@/components/reports/SalesRegisterLayout';
import PurchaseRegisterLayout from '@/components/reports/PurchaseRegisterLayout';
import CreditNoteRegisterLayout from '@/components/reports/CreditNoteRegisterLayout';
import DebitNoteRegisterLayout from '@/components/reports/DebitNoteRegisterLayout';
import JournalRegisterLayout from '@/components/reports/JournalRegisterLayout';
import MemorandumRegisterLayout from '@/components/reports/MemorandumRegisterLayout';
import ReversingJournalRegisterLayout from '@/components/reports/ReversingJournalRegisterLayout';
import VoucherClarificationLayout from '@/components/reports/VoucherClarificationLayout';
import BillsLayout from '@/components/reports/BillsLayout';
import LedgerOutstandingsLayout from '@/components/reports/LedgerOutstandingsLayout';
import GroupOutstandingsLayout from '@/components/reports/GroupOutstandingsLayout';
import InterestBillsLayout from '@/components/reports/InterestBillsLayout';
import InterestLedgerLayout from '@/components/reports/InterestLedgerLayout';
import InterestGroupLayout from '@/components/reports/InterestGroupLayout';
import CostCategorySummaryLayout from '@/components/reports/CostCategorySummaryLayout';
import CostCentreSummaryLayout from '@/components/reports/CostCentreSummaryLayout';
import CostCentreBreakupLayout from '@/components/reports/CostCentreBreakupLayout';
import CostCentreLedgerLayout from '@/components/reports/CostCentreLedgerLayout';
import CostCentreWisePLLayout from '@/components/reports/CostCentreWisePLLayout';
import StatisticsLayout from '@/components/reports/StatisticsLayout';
import MultiPaySlipLayout from '@/components/reports/MultiPaySlipLayout';
import PaySheetLayout from '@/components/reports/PaySheetLayout';
import AttendanceSheetLayout from '@/components/reports/AttendanceSheetLayout';
import PaymentAdviceLayout from '@/components/reports/PaymentAdviceLayout';
import EmployeesWithoutEmailLayout from '@/components/reports/EmployeesWithoutEmailLayout';
import PayrollStatementLayout from '@/components/reports/PayrollStatementLayout';
import EmployeePayHeadBreakupLayout from '@/components/reports/EmployeePayHeadBreakupLayout';
import PayHeadEmployeeBreakupLayout from '@/components/reports/PayHeadEmployeeBreakupLayout';

export function renderSpecialLayout(
  reportType: string,
  { fromDate, toDate }: { fromDate: string; toDate: string },
) {
  return reportType === 'balance-sheet' ? (
    <BalanceSheetLayout />
  ) : reportType === 'stock-summary' ? (
    <StockSummaryLayout />
  ) : reportType === 'stock-item' ? (
    <StockItemSelectionLayout />
  ) : reportType === 'profit-loss' ? (
    <ProfitLossLayout fromDate={fromDate} toDate={toDate} />
  ) : reportType === 'trial-balance' ? (
    <TrialBalanceLayout />
  ) : reportType === 'group-summary' ? (
    <GroupSummaryLayout />
  ) : reportType === 'ledger-summary' ? (
    <LedgerMonthlySummaryLayout />
  ) : reportType === 'ledger' ? (
    <LedgerVouchersLayout fromDate={fromDate} toDate={toDate} />
  ) : reportType === 'ratio-analysis' ? (
    <RatioAnalysisLayout />
  ) : reportType === 'group-vouchers' ? (
    <GroupVouchersLayout />
  ) : reportType === 'cash-bank' ? (
    <CashBankSummaryLayout />
  ) : reportType === 'outstandings-receivable' ? (
    <BillsLayout mode="receivable" />
  ) : reportType === 'outstandings-payable' ? (
    <BillsLayout mode="payable" />
  ) : reportType === 'ledger-outstandings' || reportType === 'outstandings-ledger' ? (
    <LedgerOutstandingsLayout />
  ) : reportType === 'group-outstandings' || reportType === 'outstandings-group' ? (
    <GroupOutstandingsLayout />
  ) : reportType === 'interest-receivable' ? (
    <InterestBillsLayout mode="receivable" fromDate={fromDate} toDate={toDate} />
  ) : reportType === 'interest-payable' ? (
    <InterestBillsLayout mode="payable" fromDate={fromDate} toDate={toDate} />
  ) : reportType === 'interest-calculation-ledger-wise' ? (
    <InterestLedgerLayout fromDate={fromDate} toDate={toDate} />
  ) : reportType === 'interest-calculation-group-wise' ? (
    <InterestGroupLayout fromDate={fromDate} toDate={toDate} />
  ) : reportType === 'contra-register' ? (
    <ContraRegisterLayout />
  ) : reportType === 'payment-register' ? (
    <PaymentRegisterLayout />
  ) : reportType === 'receipt-register' ? (
    <ReceiptRegisterLayout />
  ) : reportType === 'sales-register' ? (
    <SalesRegisterLayout />
  ) : reportType === 'purchase-register' ? (
    <PurchaseRegisterLayout />
  ) : reportType === 'credit-note-register' ? (
    <CreditNoteRegisterLayout />
  ) : reportType === 'debit-note-register' ? (
    <DebitNoteRegisterLayout />
  ) : reportType === 'journal-register' ? (
    <JournalRegisterLayout />
  ) : reportType === 'memorandum-register' ? (
    <MemorandumRegisterLayout />
  ) : reportType === 'reversing-journal-register' ? (
    <ReversingJournalRegisterLayout />
  ) : reportType === 'voucher-clarification' ? (
    <VoucherClarificationLayout />
  ) : reportType === 'cost-category-summary' ? (
    <CostCategorySummaryLayout />
  ) : reportType === 'cost-centre-summary' ? (
    <CostCentreSummaryLayout />
  ) : reportType === 'cost-centre-break-up' ? (
    <CostCentreBreakupLayout />
  ) : reportType === 'cost-centre-ledger' ? (
    <CostCentreLedgerLayout />
  ) : reportType === 'cost-centre-wise-p-and-l' ? (
    <CostCentreWisePLLayout />
  ) : reportType === 'statistics' ? (
    <StatisticsLayout />
  ) : reportType === 'pay-slip' ? (
    <MultiPaySlipLayout />
  ) : reportType === 'pay-sheet' ? (
    <PaySheetLayout />
  ) : reportType === 'attendance-sheet' ? (
    <AttendanceSheetLayout />
  ) : reportType === 'payment-advice' ? (
    <PaymentAdviceLayout />
  ) : reportType === 'employees-without-email' ? (
    <EmployeesWithoutEmailLayout />
  ) : reportType === 'payroll-statement' ? (
    <PayrollStatementLayout />
  ) : reportType === 'employee-pay-head-breakup' ? (
    <EmployeePayHeadBreakupLayout />
  ) : reportType === 'pay-head-employee-breakup' ? (
    <PayHeadEmployeeBreakupLayout />
  ) : null;
}
