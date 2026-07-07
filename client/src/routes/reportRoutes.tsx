import { ReportRunner } from '../pages/reports/ReportRunner.tsx';
import CategoryMenuPage from '../pages/reports/CategoryMenuPage.tsx';

// Report menu hubs
import DisplayMoreReports from '../pages/menu/reports/DisplayMoreReports.tsx';
import StatutoryReports from '../pages/menu/reports/StatutoryReports.tsx';
import GSTReports from '../pages/menu/reports/GSTReports.tsx';
import TDSReportsStatutory from '../pages/menu/reports/TDSReportsStatutory.tsx';
import TDSChallanReconciliation from '../pages/master/statutory/tds-return/TDSChallanReconciliation.tsx';
import Form26Q from '../pages/master/statutory/tds-return/Form26Q.tsx';
import TCSReportsStatutory from '../pages/menu/reports/TCSReportsStatutory.tsx';
import {
  TDSReturnTransactionBook,
  TDSOutstandings,
  LedgersWithoutPAN,
} from '../pages/master/statutory/tds-return/TDSRegisters.tsx';
import TCSChallanReconciliation from '../pages/master/statutory/tcs-return/TCSChallanReconciliation.tsx';
import Form27EQ, {
  Form27EQCollectionDetails,
} from '../pages/master/statutory/tcs-return/Form27EQ.tsx';
import {
  Form27EQNotRelevant,
  Form27EQVoucherRegister,
  Form27EQUncertain,
  Form27EQUncertainResolution,
} from '../pages/master/statutory/tcs-return/Form27EQDrills.tsx';
import {
  TCSReturnTransactionBook,
  TCSOutstandings,
  TCSLedgersWithoutPAN,
  TCSChallanDetailsOfBuyer,
} from '../pages/master/statutory/tcs-return/TCSRegisters.tsx';
import PayrollReportsStatutory, {
  PFReportsMenu,
  PFEReturnMenu,
} from '../pages/menu/reports/PayrollReportsStatutory.tsx';
import PayrollStatutorySummary, {
  PayrollStatutoryPayHeadDetails,
} from '../pages/reports/payroll/PayrollStatutorySummary.tsx';
import PFForm5, {
  PFForm10,
  PFForm12A,
  PFMonthlyStatement,
  PFECR,
  PFForm6A,
  PFForm3A,
} from '../pages/reports/payroll/PFForms.tsx';
import Form27Q from '../pages/master/statutory/tds-return/Form27Q.tsx';
import {
  Form27QNotRelevant,
  Form27QVoucherRegister,
} from '../pages/master/statutory/tds-return/Form27QNotRelevant.tsx';
import {
  Form27QUncertain,
  Form27QUncertainResolution,
} from '../pages/master/statutory/tds-return/Form27QUncertain.tsx';
import AccountBooks from '../pages/menu/reports/AccountBooks.tsx';
import StatementsOfAccounts from '../pages/menu/reports/StatementsOfAccounts.tsx';
import InventoryBooks from '../pages/menu/reports/InventoryBooks.tsx';
import StatementsOfInventory from '../pages/menu/reports/StatementsOfInventory.tsx';
import MovementAnalysisMenu from '../pages/menu/reports/MovementAnalysisMenu.tsx';
import ItemCostAnalysisMenu from '../pages/menu/reports/ItemCostAnalysisMenu.tsx';
import ExceptionReports from '../pages/menu/reports/ExceptionReports.tsx';
import PayrollReports from '../pages/menu/reports/PayrollReports.tsx';
import PayrollStatutoryReportsMenu from '../pages/menu/reports/PayrollStatutoryReportsMenu.tsx';
import JobWorkReports from '../pages/menu/reports/JobWorkReports.tsx';
import AnalysisVerification from '../pages/menu/reports/AnalysisVerification.tsx';
import OutStandingsMenu from '../pages/menu/reports/OutStandingsMenu.tsx';
import CostCentresMenu from '../pages/menu/reports/CostCentresMenu.tsx';
import InterestCalculationsMenu from '../pages/menu/reports/InterestCalculationsMenu.tsx';

// Accounts reports
import LedgerReport from '../pages/reports/accounts/LedgerReport.tsx';
import GroupSummary from '../pages/reports/accounts/GroupSummary.tsx';
import LedgerMonthlySummary from '../pages/reports/accounts/LedgerMonthlySummary.tsx';
import SalesRegister from '../pages/reports/accounts/SalesRegister.tsx';
import PurchaseRegister from '../pages/reports/accounts/PurchaseRegister.tsx';
import JournalRegister from '../pages/reports/accounts/JournalRegister.tsx';
import DebitNoteRegister from '../pages/reports/accounts/DebitNoteRegister.tsx';
import CreditNoteRegister from '../pages/reports/accounts/CreditNoteRegister.tsx';
import ProfitLoss from '../pages/reports/accounts/ProfitLoss.tsx';
import BalanceSheet from '../pages/reports/accounts/BalanceSheet.tsx';
import CashFlowStatement from '../pages/reports/accounts/CashFlowStatement.tsx';
import FundsFlowStatement from '../pages/reports/accounts/FundsFlowStatement.tsx';
import RatioAnalysis from '../pages/reports/accounts/RatioAnalysis.tsx';
import OutstandingsReceivable from '../pages/reports/accounts/OutstandingsReceivable.tsx';
import OutstandingsPayable from '../pages/reports/accounts/OutstandingsPayable.tsx';
import OutstandingsLedgerSelect from '../pages/reports/accounts/OutstandingsLedger.tsx';
import OutstandingsGroupSelect from '../pages/reports/accounts/OutstandingsGroupSelect.tsx';
import CostCentreSummary from '../pages/reports/accounts/CostCentreSummary.tsx';
import CostCategorySummary from '../pages/reports/accounts/CostCategorySummary.tsx';
import Statistics from '../pages/reports/accounts/Statistics.tsx';
import CashBankReport from '../pages/reports/accounts/CashBankReport.tsx';
import LedgerSelect from '../pages/reports/accounts/LedgerSelect.tsx';
import GroupSelect from '../pages/reports/accounts/GroupSelect.tsx';
import GroupVouchersSelect from '../pages/reports/accounts/GroupVouchersSelect.tsx';
import StatisticsVoucherRegister from '../pages/reports/StatisticsVoucherRegister.tsx';

// Inventory reports
import StockSummary from '../pages/reports/inventory/StockSummary.tsx';
import StockItemReport from '../pages/reports/inventory/StockItemReport.tsx';
import StockGroupReport from '../pages/reports/inventory/StockGroupReport.tsx';
import StockCategoryReport from '../pages/reports/inventory/StockCategoryReport.tsx';
import GodownReport from '../pages/reports/inventory/GodownReport.tsx';
import BatchVouchers from '../pages/reports/inventory/BatchVouchers.tsx';
import GodownSummary from '../pages/reports/inventory/GodownSummary.tsx';
import StockGroupSummary from '../pages/reports/inventory/StockGroupSummary.tsx';
import StockCategorySummary from '../pages/reports/inventory/StockCategorySummary.tsx';
import StockJournalRegister from '../pages/reports/inventory/StockJournalRegister.tsx';
import PhysicalStockRegister from '../pages/reports/inventory/PhysicalStockRegister.tsx';
import MovementAnalysis from '../pages/reports/inventory/MovementAnalysis.tsx';
import StockGroupAnalysis from '../pages/reports/inventory/StockGroupAnalysis.tsx';
import StockCategoryAnalysis from '../pages/reports/inventory/StockCategoryAnalysis.tsx';
import StockItemAnalysis from '../pages/reports/inventory/StockItemAnalysis.tsx';
import GroupAnalysis from '../pages/reports/inventory/GroupAnalysis.tsx';
import LedgerAnalysis from '../pages/reports/inventory/LedgerAnalysis.tsx';
import TransferAnalysis from '../pages/reports/inventory/TransferAnalysis.tsx';
import SalesOrderBook from '../pages/reports/inventory/SalesOrderBook.tsx';
import PurchaseOrderBook from '../pages/reports/inventory/PurchaseOrderBook.tsx';
import AgeingAnalysis from '../pages/reports/inventory/AgeingAnalysis.tsx';
import CostEstimation from '../pages/reports/inventory/CostEstimation.tsx';
import ItemCostAnalysis from '../pages/reports/inventory/ItemCostAnalysis.tsx';
import JobWorkAnalysis from '../pages/reports/inventory/JobWorkAnalysis.tsx';
import InventoryVoucherRegister from '../pages/reports/inventory/InventoryVoucherRegister.tsx';
import SalesOrderOutstanding from '../pages/reports/inventory/SalesOrderOutstanding.tsx';
import PurchaseOrderOutstanding from '../pages/reports/inventory/PurchaseOrderOutstanding.tsx';
import WorkOrderOutstanding from '../pages/reports/inventory/WorkOrderOutstanding.tsx';
import StockQuery from '../pages/reports/inventory/StockQuery.tsx';
import BillsPending from '../pages/reports/inventory/BillsPending.tsx';
import OrderOutstanding from '../pages/reports/inventory/OrderOutstanding.tsx';
import ReorderStatus from '../pages/reports/inventory/ReorderStatus.tsx';

// Payroll report layouts
import MultiPaySlipLayout from '../components/reports/MultiPaySlipLayout.tsx';
import PaySheetLayout from '../components/reports/PaySheetLayout.tsx';
import AttendanceSheetLayout from '../components/reports/AttendanceSheetLayout.tsx';
import PaymentAdviceLayout from '../components/reports/PaymentAdviceLayout.tsx';
import EmployeesWithoutEmailLayout from '../components/reports/EmployeesWithoutEmailLayout.tsx';
import PayrollStatementLayout from '../components/reports/PayrollStatementLayout.tsx';
import EmployeePayHeadBreakupLayout from '../components/reports/EmployeePayHeadBreakupLayout.tsx';
import PayHeadEmployeeBreakupLayout from '../components/reports/PayHeadEmployeeBreakupLayout.tsx';

// Job Work reports
import JobWorkOrderSummary from '../pages/reports/inventory/jobwork/JobWorkOrderSummary.tsx';
import JobWorkStock from '../pages/reports/inventory/jobwork/JobWorkStock.tsx';
import JobWorkVariance from '../pages/reports/inventory/jobwork/JobWorkVariance.tsx';
import JobWorkAgeingAnalysis from '../pages/reports/inventory/jobwork/JobWorkAgeingAnalysis.tsx';
import JobWorkAnnexure from '../pages/reports/inventory/jobwork/JobWorkAnnexure.tsx';

// Exception reports
import OverdueReceivables from '../pages/reports/exception/OverdueReceivables.tsx';
import OverduePayables from '../pages/reports/exception/OverduePayables.tsx';
import PendingDocuments from '../pages/reports/exception/PendingDocuments.tsx';
import NegativeStock from '../pages/reports/exception/NegativeStock.tsx';
import NegativeLedger from '../pages/reports/exception/NegativeLedger.tsx';
import EditLogSummary from '../pages/reports/exception/EditLogSummary.tsx';

import type { RouteConfig } from './types';

export const reportRoutes: RouteConfig[] = [
  // Display / menu hubs
  { path: '/reports/display-more', element: <DisplayMoreReports /> },
  { path: '/reports/statutory', element: <StatutoryReports /> },
  { path: '/reports/statutory/gst', element: <GSTReports /> },
  { path: '/reports/statutory/tds', element: <TDSReportsStatutory /> },
  { path: '/reports/statutory/tds/challan-reconciliation', element: <TDSChallanReconciliation /> },
  { path: '/reports/statutory/tds/form-26q', element: <Form26Q /> },
  { path: '/reports/statutory/tds/form-27q', element: <Form27Q /> },
  { path: '/reports/statutory/tds/form-27q/not-relevant', element: <Form27QNotRelevant /> },
  { path: '/reports/statutory/tds/form-27q/register', element: <Form27QVoucherRegister /> },
  { path: '/reports/statutory/tds/form-27q/uncertain', element: <Form27QUncertain /> },
  {
    path: '/reports/statutory/tds/form-27q/uncertain/resolution',
    element: <Form27QUncertainResolution />,
  },
  {
    path: '/reports/statutory/tds/return-transaction-book',
    element: <TDSReturnTransactionBook />,
  },
  { path: '/reports/statutory/tds/outstandings', element: <TDSOutstandings /> },
  { path: '/reports/statutory/tds/ledgers-without-pan', element: <LedgersWithoutPAN /> },
  { path: '/reports/statutory/tcs', element: <TCSReportsStatutory /> },
  { path: '/reports/statutory/tcs/challan-reconciliation', element: <TCSChallanReconciliation /> },
  { path: '/reports/statutory/tcs/form-27eq', element: <Form27EQ /> },
  { path: '/reports/statutory/tcs/form-27eq/not-relevant', element: <Form27EQNotRelevant /> },
  { path: '/reports/statutory/tcs/form-27eq/register', element: <Form27EQVoucherRegister /> },
  { path: '/reports/statutory/tcs/form-27eq/uncertain', element: <Form27EQUncertain /> },
  {
    path: '/reports/statutory/tcs/form-27eq/uncertain/resolution',
    element: <Form27EQUncertainResolution />,
  },
  {
    path: '/reports/statutory/tcs/form-27eq/collection-details',
    element: <Form27EQCollectionDetails />,
  },
  {
    path: '/reports/statutory/tcs/return-transaction-book',
    element: <TCSReturnTransactionBook />,
  },
  { path: '/reports/statutory/tcs/outstandings', element: <TCSOutstandings /> },
  { path: '/reports/statutory/tcs/ledgers-without-pan', element: <TCSLedgersWithoutPAN /> },
  {
    path: '/reports/statutory/tcs/challan-details-of-buyer',
    element: <TCSChallanDetailsOfBuyer />,
  },
  { path: '/reports/statutory/payroll', element: <PayrollReportsStatutory /> },
  { path: '/reports/statutory/payroll/summary', element: <PayrollStatutorySummary /> },
  {
    path: '/reports/statutory/payroll/pay-head-details',
    element: <PayrollStatutoryPayHeadDetails />,
  },
  { path: '/reports/statutory/payroll/pf', element: <PFReportsMenu /> },
  { path: '/reports/statutory/payroll/pf/form-5', element: <PFForm5 /> },
  { path: '/reports/statutory/payroll/pf/form-10', element: <PFForm10 /> },
  { path: '/reports/statutory/payroll/pf/form-12a', element: <PFForm12A /> },
  { path: '/reports/statutory/payroll/pf/monthly-statement', element: <PFMonthlyStatement /> },
  { path: '/reports/statutory/payroll/pf/ecr', element: <PFECR /> },
  { path: '/reports/statutory/payroll/pf/form-3a', element: <PFForm3A /> },
  { path: '/reports/statutory/payroll/pf/form-6a', element: <PFForm6A /> },
  { path: '/reports/statutory/payroll/pf/e-return', element: <PFEReturnMenu /> },
  { path: '/reports/statutory/payroll/pf/e-return/form-5', element: <PFForm5 /> },
  { path: '/reports/account-books', element: <AccountBooks /> },
  { path: '/reports/statements-of-accounts', element: <StatementsOfAccounts /> },
  { path: '/reports/inventory-books', element: <InventoryBooks /> },
  { path: '/reports/statements-of-inventory', element: <StatementsOfInventory /> },
  { path: '/reports/exception', element: <ExceptionReports /> },
  { path: '/reports/payroll-hr', element: <PayrollReports /> },
  { path: '/reports/payroll-hr/statutory-reports', element: <PayrollStatutoryReportsMenu /> },
  {
    path: '/reports/payroll-hr/payroll-register',
    element: (
      <InventoryVoucherRegister
        voucherType="Payroll"
        title="Payroll Register"
        variant="accounting"
        subtitle="Payroll"
      />
    ),
  },
  // Payroll report sub-pages (#125–#131)
  { path: '/reports/payroll-hr/pay-slip', element: <MultiPaySlipLayout /> },
  { path: '/reports/payroll-hr/pay-sheet', element: <PaySheetLayout /> },
  { path: '/reports/payroll-hr/attendance-sheet', element: <AttendanceSheetLayout /> },
  { path: '/reports/payroll-hr/payment-advice', element: <PaymentAdviceLayout /> },
  { path: '/reports/payroll-hr/employees-without-email', element: <EmployeesWithoutEmailLayout /> },
  { path: '/reports/payroll-hr/payroll-statement', element: <PayrollStatementLayout /> },
  {
    path: '/reports/payroll-hr/employee-pay-head-breakup',
    element: <EmployeePayHeadBreakupLayout />,
  },
  {
    path: '/reports/payroll-hr/pay-head-employee-breakup',
    element: <PayHeadEmployeeBreakupLayout />,
  },
  { path: '/reports/job-work', element: <JobWorkReports /> },
  { path: '/reports/analysis-verification', element: <AnalysisVerification /> },

  // Category menu pages
  {
    path: '/reports/gateway',
    element: (
      <CategoryMenuPage
        title="Gateway of Business"
        categorySlug="gateway"
        description="Central navigation hub for all 585 reports across every category."
      />
    ),
  },
  {
    path: '/reports/financial-statements',
    element: (
      <CategoryMenuPage
        title="Financial Statements"
        categorySlug="financial-statements"
        description="Profit & Loss, Balance Sheet, Cash Flow, Funds Flow, Ratio Analysis and related financial reports."
      />
    ),
  },
  {
    path: '/reports/receivables-payables',
    element: (
      <CategoryMenuPage
        title="Receivables & Payables"
        categorySlug="receivables-payables"
        description="Bills receivable, bills payable, outstanding reports, ageing analysis and party-wise summaries."
      />
    ),
  },
  {
    path: '/reports/cash-bank-finance',
    element: (
      <CategoryMenuPage
        title="Cash, Bank & Finance"
        categorySlug="cash-bank-finance"
        description="Cash book, bank book, day book, bank reconciliation, cheque management and financial analytics."
      />
    ),
  },
  {
    path: '/reports/sales-purchase-party',
    element: (
      <CategoryMenuPage
        title="Sales, Purchase & Party"
        categorySlug="sales-purchase-party"
        description="Sales register, purchase register, sales/purchase order books, party outstandings and day books."
      />
    ),
  },
  {
    path: '/reports/inventory-stock',
    element: (
      <CategoryMenuPage
        title="Inventory & Stock"
        categorySlug="inventory-stock"
        description="Stock summary, stock query, movement analysis, godown reports, batch tracking and reorder status."
      />
    ),
  },
  {
    path: '/reports/manufacturing-costing',
    element: (
      <CategoryMenuPage
        title="Manufacturing & Costing"
        categorySlug="manufacturing-costing"
        description="Manufacturing journal, production analysis, cost centre summary, budget variance and costing reports."
      />
    ),
  },
  {
    path: '/reports/gst',
    element: (
      <CategoryMenuPage
        title="GST Reports"
        categorySlug="gst"
        description="GSTR-1, GSTR-2A/2B, GSTR-3B, annual computation, reconciliation, e-invoice status and GST analytics."
      />
    ),
  },
  {
    path: '/reports/e-invoice-eway-bill',
    element: (
      <CategoryMenuPage
        title="E-Invoice & E-Way Bill"
        categorySlug="e-invoice-eway-bill"
        description="E-invoice status, IRN generation, e-way bill tracking and compliance reports."
      />
    ),
  },
  {
    path: '/reports/tds',
    element: (
      <CategoryMenuPage
        title="TDS Reports"
        categorySlug="tds"
        description="TDS computation, TDS payable, Form 26Q/24Q, TDS analysis and deduction registers."
      />
    ),
  },
  {
    path: '/reports/tcs',
    element: (
      <CategoryMenuPage
        title="TCS Reports"
        categorySlug="tcs"
        description="TCS computation, TCS payable, Form 27EQ, TCS analysis and collection registers."
      />
    ),
  },
  {
    path: '/reports/legacy-statutory',
    element: (
      <CategoryMenuPage
        title="Legacy & Statutory"
        categorySlug="legacy-statutory"
        description="VAT, excise, service tax, sales tax and other legacy statutory compliance reports."
      />
    ),
  },
  {
    path: '/reports/audit-security',
    element: (
      <CategoryMenuPage
        title="Audit & Security"
        categorySlug="audit-security"
        description="Edit log, audit trail, verification, user access logs and data integrity reports."
      />
    ),
  },

  // Sub-menus under statements-of-accounts
  { path: '/reports/statements-of-accounts/outstandings', element: <OutStandingsMenu /> },
  {
    path: '/reports/statements-of-accounts/interest-calculations',
    element: <InterestCalculationsMenu />,
  },
  { path: '/reports/statements-of-accounts/cost-centres', element: <CostCentresMenu /> },
  { path: '/reports/statements-of-accounts/statistics', element: <Statistics /> },
  {
    path: '/reports/statements-of-accounts/statistics/voucher/:voucherType',
    element: <StatisticsVoucherRegister />,
  },

  // Sub-menus under statements-of-inventory
  { path: '/reports/statements-of-inventory/stock-query', element: <StockQuery /> },
  { path: '/reports/statements-of-inventory/movement-analysis', element: <MovementAnalysisMenu /> },
  { path: '/reports/statements-of-inventory/ageing-analysis', element: <AgeingAnalysis /> },
  { path: '/reports/statements-of-inventory/job-work-analysis', element: <JobWorkAnalysis /> },
  { path: '/reports/statements-of-inventory/cost-estimation', element: <CostEstimation /> },
  {
    path: '/reports/statements-of-inventory/item-cost-analysis',
    element: <ItemCostAnalysisMenu />,
  },
  {
    path: '/reports/statements-of-inventory/item-cost-analysis/stock-group',
    element: <ItemCostAnalysis mode="group" />,
  },
  {
    path: '/reports/statements-of-inventory/item-cost-analysis/stock-item',
    element: <ItemCostAnalysis mode="item" />,
  },
  {
    path: '/reports/statements-of-inventory/item-cost-analysis/cost-track',
    element: <ItemCostAnalysis mode="track" />,
  },
  { path: '/reports/statements-of-inventory/reorder-status', element: <ReorderStatus /> },
  {
    path: '/reports/statements-of-inventory/sales-order-outstandings',
    element: <OrderOutstanding mode="sales" />,
  },
  {
    path: '/reports/statements-of-inventory/purchase-order-outstandings',
    element: <OrderOutstanding mode="purchase" />,
  },
  {
    path: '/reports/statements-of-inventory/sale-bills-pending',
    element: <BillsPending mode="sales" />,
  },
  {
    path: '/reports/statements-of-inventory/purchase-bills-pending',
    element: <BillsPending mode="purchase" />,
  },

  // Cash/Bank
  { path: '/reports/accounts/cash-bank', element: <CashBankReport /> },

  // Accounts reports
  { path: '/reports/accounts/ledger', element: <LedgerReport /> },
  { path: '/reports/accounts/ledger-select', element: <LedgerSelect /> },
  { path: '/reports/accounts/group-summary', element: <GroupSummary /> },
  { path: '/reports/accounts/group-summary/:groupId', element: <GroupSummary /> },
  { path: '/reports/accounts/group-vouchers/:groupId', element: <ReportRunner /> },
  { path: '/reports/accounts/group-select', element: <GroupSelect /> },
  { path: '/reports/accounts/group-vouchers-select', element: <GroupVouchersSelect /> },
  { path: '/reports/accounts/ledger-summary/:ledgerId', element: <LedgerMonthlySummary /> },
  { path: '/reports/accounts/sales-register', element: <SalesRegister /> },
  { path: '/reports/accounts/purchase-register', element: <PurchaseRegister /> },
  { path: '/reports/accounts/journal-register', element: <JournalRegister /> },
  { path: '/reports/accounts/debit-note-register', element: <DebitNoteRegister /> },
  { path: '/reports/accounts/credit-note-register', element: <CreditNoteRegister /> },
  { path: '/reports/accounts/profit-loss', element: <ProfitLoss /> },
  { path: '/reports/accounts/balance-sheet', element: <BalanceSheet /> },
  { path: '/reports/accounts/cash-flow', element: <CashFlowStatement /> },
  { path: '/reports/accounts/funds-flow', element: <FundsFlowStatement /> },
  { path: '/reports/accounts/ratio-analysis', element: <RatioAnalysis /> },
  { path: '/reports/accounts/outstandings-receivable', element: <OutstandingsReceivable /> },
  { path: '/reports/accounts/outstandings-payable', element: <OutstandingsPayable /> },
  { path: '/reports/accounts/ledger-outstandings', element: <OutstandingsLedgerSelect /> },
  { path: '/reports/accounts/outstandings-ledger', element: <ReportRunner /> },
  { path: '/reports/accounts/group-outstandings', element: <OutstandingsGroupSelect /> },
  { path: '/reports/accounts/outstandings-group', element: <ReportRunner /> },
  { path: '/reports/accounts/interest-receivable', element: <ReportRunner /> },
  { path: '/reports/accounts/interest-payable', element: <ReportRunner /> },
  { path: '/reports/accounts/interest-calculation-ledger-wise', element: <ReportRunner /> },
  { path: '/reports/accounts/interest-calculation-group-wise', element: <ReportRunner /> },
  { path: '/reports/accounts/cost-centre-summary', element: <CostCentreSummary /> },
  { path: '/reports/accounts/cost-category-summary', element: <CostCategorySummary /> },
  { path: '/reports/accounts/cost-centre-break-up', element: <ReportRunner /> },
  { path: '/reports/accounts/cost-centre-ledger', element: <ReportRunner /> },
  { path: '/reports/accounts/cost-centre-wise-p-and-l', element: <ReportRunner /> },
  { path: '/reports/accounts/statistics', element: <Statistics /> },
  { path: '/reports/accounts/voucher-clarification', element: <ReportRunner /> },

  // Inventory reports
  { path: '/reports/inventory/stock-summary', element: <StockSummary /> },
  { path: '/reports/inventory/stock-item', element: <StockItemReport /> },
  { path: '/reports/inventory/stock-group', element: <StockGroupReport /> },
  { path: '/reports/inventory/stock-category', element: <StockCategoryReport /> },
  { path: '/reports/inventory/godown', element: <GodownReport /> },
  { path: '/reports/inventory/batch-vouchers', element: <BatchVouchers /> },
  { path: '/reports/inventory/godown-summary', element: <GodownSummary /> },
  { path: '/reports/inventory/stock-group-summary', element: <StockGroupSummary /> },
  { path: '/reports/inventory/stock-category-summary', element: <StockCategorySummary /> },
  { path: '/reports/inventory/movement-analysis', element: <MovementAnalysis /> },
  { path: '/reports/inventory/stock-group-analysis', element: <StockGroupAnalysis /> },
  {
    path: '/reports/inventory-stock/movement-analysis-stock-group-wise',
    element: <StockGroupAnalysis />,
  },
  { path: '/reports/inventory/stock-category-analysis', element: <StockCategoryAnalysis /> },
  { path: '/reports/inventory/stock-item-analysis', element: <StockItemAnalysis /> },
  { path: '/reports/inventory/group-analysis', element: <GroupAnalysis /> },
  { path: '/reports/inventory/ledger-analysis', element: <LedgerAnalysis /> },
  { path: '/reports/inventory/transfer-analysis', element: <TransferAnalysis /> },
  { path: '/reports/inventory/sales-order-book', element: <SalesOrderBook /> },
  { path: '/reports/inventory/purchase-order-book', element: <PurchaseOrderBook /> },
  { path: '/reports/inventory/ageing-analysis', element: <AgeingAnalysis /> },
  { path: '/reports/inventory/sales-order-outstanding', element: <SalesOrderOutstanding /> },
  { path: '/reports/inventory/purchase-order-outstanding', element: <PurchaseOrderOutstanding /> },
  { path: '/reports/inventory/work-order-outstanding', element: <WorkOrderOutstanding /> },
  { path: '/reports/inventory/stock-query', element: <StockQuery /> },
  { path: '/reports/inventory/reorder-status', element: <ReorderStatus /> },

  // Inventory books
  {
    path: '/reports/inventory-books/sales-orders-book',
    element: (
      <InventoryVoucherRegister
        voucherType="Sales Order"
        title="Sales Orders Book"
        variant="order"
        subtitle="Sales Order"
      />
    ),
  },
  {
    path: '/reports/inventory-books/purchase-orders-book',
    element: (
      <InventoryVoucherRegister
        voucherType="Purchase Order"
        title="Purchase Orders Book"
        variant="order"
        subtitle="Purchase Order"
      />
    ),
  },
  {
    path: '/reports/inventory-books/delivery-note-register',
    element: (
      <InventoryVoucherRegister
        voucherType="Delivery Note"
        title="Delivery Note Register"
        subtitle="Delivery Note"
      />
    ),
  },
  {
    path: '/reports/inventory-books/receipt-note-register',
    element: (
      <InventoryVoucherRegister
        voucherType="Receipt Note"
        title="Receipt Note Register"
        subtitle="Receipt Note"
      />
    ),
  },
  {
    path: '/reports/inventory-books/rejections-in-register',
    element: (
      <InventoryVoucherRegister
        voucherType="Rejection In"
        title="Rejections In Register"
        subtitle="Rejection In"
      />
    ),
  },
  {
    path: '/reports/inventory-books/rejections-out-register',
    element: (
      <InventoryVoucherRegister
        voucherType="Rejection Out"
        title="Rejections Out Register"
        subtitle="Rejection Out"
      />
    ),
  },
  { path: '/reports/inventory-books/stock-transfer-register', element: <StockJournalRegister /> },
  { path: '/reports/inventory-books/physical-stock-register', element: <PhysicalStockRegister /> },

  // Job Work reports
  { path: '/reports/job-work/orders', element: <JobWorkOrderSummary kind="orders" /> },
  { path: '/reports/job-work/components', element: <JobWorkOrderSummary kind="components" /> },
  {
    path: '/reports/job-work/in-orders-book',
    element: (
      <InventoryVoucherRegister
        voucherType="Job Work In Order"
        title="Job Work In Orders Register"
        variant="order"
        subtitle="Job Work In Order"
      />
    ),
  },
  {
    path: '/reports/job-work/out-orders-book',
    element: (
      <InventoryVoucherRegister
        voucherType="Job Work Out Order"
        title="Job Work Out Orders Register"
        variant="order"
        subtitle="Job Work Out Order"
      />
    ),
  },
  {
    path: '/reports/job-work/material-out-register',
    element: (
      <InventoryVoucherRegister
        voucherType="Material Out"
        title="Material Out Register"
        subtitle="Material Out: Job Work Out"
      />
    ),
  },
  {
    path: '/reports/job-work/material-in-register',
    element: (
      <InventoryVoucherRegister
        voucherType="Material In"
        title="Material In Register"
        subtitle="Material In: Job Work Out"
      />
    ),
  },
  { path: '/reports/job-work/annexure-iv', element: <JobWorkAnnexure annexure="IV" /> },
  { path: '/reports/job-work/annexure-v', element: <JobWorkAnnexure annexure="V" /> },
  { path: '/reports/job-work/stock-from-party', element: <JobWorkStock mode="from-party" /> },
  {
    path: '/reports/job-work/stock-with-job-worker',
    element: <JobWorkStock mode="with-job-worker" />,
  },
  { path: '/reports/job-work/ageing-analysis', element: <JobWorkAgeingAnalysis /> },
  { path: '/reports/job-work/issue-variance', element: <JobWorkVariance kind="issue" /> },
  { path: '/reports/job-work/receipt-variance', element: <JobWorkVariance kind="receipt" /> },

  // Exception reports
  { path: '/reports/exception/overdue-receivables', element: <OverdueReceivables /> },
  { path: '/reports/exception/overdue-payables', element: <OverduePayables /> },
  { path: '/reports/exception/pending-documents', element: <PendingDocuments /> },
  { path: '/reports/exception/negative-stock', element: <NegativeStock /> },
  { path: '/reports/exception/negative-ledger', element: <NegativeLedger /> },
  { path: '/reports/exception/edit-log', element: <EditLogSummary /> },

  // Dynamic report runner (catch-all must be last)
  { path: '/reports/:category/:reportSlug', element: <ReportRunner /> },
];
