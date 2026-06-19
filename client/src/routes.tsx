import { useNavigate } from "react-router-dom";
import App from './App.tsx';
import CostCentreCreate from "./pages/master/cost-centre/cost-centreCreate.tsx";
import PricelevelsCreate from "./pages/master/inventory/price-levels/pricelevelsCreate.tsx";
import PricelevelsAlter from "./pages/master/inventory/price-levels/pricelevelsAlter.tsx";
import PricelevelsCOA from "./pages/master/inventory/price-levels/pricelevelsCOA.tsx";
import PriceListSGCreate from "./pages/master/inventory/pricelist(stockgroup)/pricelist(sg)Create.tsx";
import PriceListSGAlter from "./pages/master/inventory/pricelist(stockgroup)/pricelist(sg)Alter.tsx";
import PriceListSGCOA from "./pages/master/inventory/pricelist(stockgroup)/pricelist(sg)COA.tsx";
import PricelistscCreate from "./pages/master/inventory/pricelist(stockcategory)/pricelist(sc)Create.tsx";
import PricelistscAlter from "./pages/master/inventory/pricelist(stockcategory)/pricelist(sc)Alter.tsx";
import PricelistscCOA from "./pages/master/inventory/pricelist(stockcategory)/pricelist(sc)COA.tsx";
import TDSDetailsCreate from "./pages/master/statutory-details/TDSDetails/TDSDetailsCreate.tsx";
import TDSDetailsAlter from "./pages/master/statutory-details/TDSDetails/TDSDetailsAlter.tsx";
import TDSDetailsCOA from "./pages/master/statutory-details/TDSDetails/TDSDetailsCOA.tsx";
import TCSDetailsCreate from "./pages/master/statutory-details/TCSDetails/TCSDetailsCreate.tsx";
import TCSDetailsAlter from "./pages/master/statutory-details/TCSDetails/TCSDetailsAlter.tsx";
import TCSDetailsCOA from "./pages/master/statutory-details/TCSDetails/TCSDetailsCOA.tsx";
import PANDetailsCreate from "./pages/master/statutory-details/PANDetails/PANDetailsCreate.tsx";
import PANDetailsAlter from "./pages/master/statutory-details/PANDetails/PANDetailsAlter.tsx";
import PANDetailsCOA from "./pages/master/statutory-details/PANDetails/PANDetailsCOA.tsx";
import VATRDCreate from "./pages/master/statutory-details/VATRegistrationDetails/VATRDCreate.tsx";
import VATRDAlter from "./pages/master/statutory-details/VATRegistrationDetails/VATRDAlter.tsx";
import VATRDCOA from "./pages/master/statutory-details/VATRegistrationDetails/VATRDCOA.tsx";
import ExciseRDCreate from "./pages/master/statutory-details/ExciseRegistrationDetails/ExciseRDCreate.tsx";
import ExciseRDAlter from "./pages/master/statutory-details/ExciseRegistrationDetails/ExciseRDAlter.tsx";
import ExciseRDCOA from "./pages/master/statutory-details/ExciseRegistrationDetails/ExciseRDCOA.tsx";
import CostCentreAlter from "./pages/master/cost-centre/cost-centreAlter.tsx";
import CostCentreCOA from "./pages/master/cost-centre/cost-centreCOA.tsx";
import GenericDataView from './pages/GenericDataView.tsx';
import Company from "./pages/company/Company.tsx";
import CompanyCreate from "./pages/company/CompanyCreate.tsx";
import CompanyAlter from "./pages/company/AlterCompany.tsx";
import Create from "./pages/menu/Create.tsx";
import Alter from "./pages/menu/Alter.tsx";
import FinancialYears from "./pages/master/FinancialYears.tsx";
import COA from "./pages/menu/coa.tsx";
import DisplayMoreReports from "./pages/menu/reports/DisplayMoreReports.tsx";
import StatutoryReports from "./pages/menu/reports/StatutoryReports.tsx";
import GSTReports from "./pages/menu/reports/GSTReports.tsx";
import AccountBooks from "./pages/menu/reports/AccountBooks.tsx";
import StatementsOfAccounts from "./pages/menu/reports/StatementsOfAccounts.tsx";
import InventoryBooks from "./pages/menu/reports/InventoryBooks.tsx";
import StatementsOfInventory from "./pages/menu/reports/StatementsOfInventory.tsx";
import ExceptionReports from "./pages/menu/reports/ExceptionReports.tsx";
import PayrollReports from "./pages/menu/reports/PayrollReports.tsx";
// Account report pages
import CashBookReport from "./pages/reports/accounts/CashBookReport.tsx";
import BankBookReport from "./pages/reports/accounts/BankBookReport.tsx";
import LedgerReport from "./pages/reports/accounts/LedgerReport.tsx";
import GroupSummary from "./pages/reports/accounts/GroupSummary.tsx";
import SalesRegister from "./pages/reports/accounts/SalesRegister.tsx";
import PurchaseRegister from "./pages/reports/accounts/PurchaseRegister.tsx";
import JournalRegister from "./pages/reports/accounts/JournalRegister.tsx";
import DebitNoteRegister from "./pages/reports/accounts/DebitNoteRegister.tsx";
import CreditNoteRegister from "./pages/reports/accounts/CreditNoteRegister.tsx";
import TrialBalance from "./pages/reports/accounts/TrialBalance.tsx";
import ProfitLoss from "./pages/reports/accounts/ProfitLoss.tsx";
import BalanceSheet from "./pages/reports/accounts/BalanceSheet.tsx";
import CashFlowStatement from "./pages/reports/accounts/CashFlowStatement.tsx";
import FundsFlowStatement from "./pages/reports/accounts/FundsFlowStatement.tsx";
import RatioAnalysis from "./pages/reports/accounts/RatioAnalysis.tsx";
import OutstandingsReceivable from "./pages/reports/accounts/OutstandingsReceivable.tsx";
import OutstandingsPayable from "./pages/reports/accounts/OutstandingsPayable.tsx";
import InterestCalculations from "./pages/reports/accounts/InterestCalculations.tsx";
import CostCentreSummary from "./pages/reports/accounts/CostCentreSummary.tsx";
import CostCategorySummary from "./pages/reports/accounts/CostCategorySummary.tsx";
import Statistics from "./pages/reports/accounts/Statistics.tsx";
// Inventory report pages
import StockSummary from "./pages/reports/inventory/StockSummary.tsx";
import StockItemReport from "./pages/reports/inventory/StockItemReport.tsx";
import StockGroupReport from "./pages/reports/inventory/StockGroupReport.tsx";
import StockCategoryReport from "./pages/reports/inventory/StockCategoryReport.tsx";
import GodownReport from "./pages/reports/inventory/GodownReport.tsx";
import BatchVouchers from "./pages/reports/inventory/BatchVouchers.tsx";
import MovementAnalysis from "./pages/reports/inventory/MovementAnalysis.tsx";
import SalesOrderBook from "./pages/reports/inventory/SalesOrderBook.tsx";
import PurchaseOrderBook from "./pages/reports/inventory/PurchaseOrderBook.tsx";
import AgeingAnalysis from "./pages/reports/inventory/AgeingAnalysis.tsx";
import SalesOrderOutstanding from "./pages/reports/inventory/SalesOrderOutstanding.tsx";
import PurchaseOrderOutstanding from "./pages/reports/inventory/PurchaseOrderOutstanding.tsx";
import WorkOrderOutstanding from "./pages/reports/inventory/WorkOrderOutstanding.tsx";
import StockQuery from "./pages/reports/inventory/StockQuery.tsx";
import ReorderStatus from "./pages/reports/inventory/ReorderStatus.tsx";
import JobWorkReports from "./pages/reports/inventory/JobWorkReports.tsx";
// Exception report pages
import OverdueReceivables from "./pages/reports/exception/OverdueReceivables.tsx";
import OverduePayables from "./pages/reports/exception/OverduePayables.tsx";
import PendingDocuments from "./pages/reports/exception/PendingDocuments.tsx";
import NegativeStock from "./pages/reports/exception/NegativeStock.tsx";
import NegativeLedger from "./pages/reports/exception/NegativeLedger.tsx";
import AnalysisVerification from "./pages/reports/exception/AnalysisVerification.tsx";
import EditLogSummary from "./pages/reports/exception/EditLogSummary.tsx";
// Payroll report pages
import PayslipReport from "./pages/reports/payroll/PayslipReport.tsx";
import SalaryStatement from "./pages/reports/payroll/SalaryStatement.tsx";
import SalaryRegister from "./pages/reports/payroll/SalaryRegister.tsx";
import AttendanceReport from "./pages/reports/payroll/AttendanceReport.tsx";
import PayHeadBreakup from "./pages/reports/payroll/PayHeadBreakup.tsx";
import PFReports from "./pages/reports/payroll/PFReports.tsx";
import ESIReports from "./pages/reports/payroll/ESIReports.tsx";
import ProfessionalTax from "./pages/reports/payroll/ProfessionalTax.tsx";
import Gratuity from "./pages/reports/payroll/Gratuity.tsx";
import LedgerCreate from "./pages/master/ledger/LedgerCreate.tsx";
import LedgerAlter from "./pages/master/ledger/LedgerAlter.tsx";
import LedgerCOA from "./pages/master/ledger/LedgerCOA.tsx";
import GroupCreate from "./pages/master/group/GroupCreate.tsx";
import GroupAlter from "./pages/master/group/GroupAlter.tsx";
import GroupAlterEdit from "./pages/master/group/GroupAlterEdit.tsx";
import GroupCOA from "./pages/master/group/GroupCOA.tsx";
import Vouchers from "./pages/transactions/Vouchers.tsx";
import VoucherList from "./pages/transactions/VoucherList.tsx";
import VoucherView from "./pages/transactions/VoucherView.tsx";
import Daybook from "./pages/transactions/Daybook.tsx";
import Banking from './pages/utilities/Banking';
import Copilot from './pages/utilities/Copilot';
import UnitCreate from "./pages/master/inventory/unit/UnitCreate.tsx";
import UnitAlter from "./pages/master/inventory/unit/UnitAlter.tsx";
import StockGroupCreate from "./pages/master/inventory/stock-group/StockGroupCreate.tsx";
import StockCategoryCreate from "./pages/master/inventory/stock-category/StockCategoryCreate.tsx";
import StockItemCreate from "./pages/master/inventory/stock-item/StockItemCreate.tsx";
import GodownCreate from "./pages/master/inventory/godown/GodownCreate.tsx";
import StockGroupAlter from "./pages/master/inventory/stock-group/StockGroupAlter.tsx";
import StockCategoryAlter from "./pages/master/inventory/stock-category/StockCategoryAlter.tsx";
import StockItemAlter from "./pages/master/inventory/stock-item/StockItemAlter.tsx";
import GodownAlter from "./pages/master/inventory/godown/GodownAlter.tsx";
import StockGroupCOA from "./pages/master/inventory/stock-group/StockGroupCOA.tsx";
import StockCategoryCOA from "./pages/master/inventory/stock-category/StockCategoryCOA.tsx";
import GodownCOA from "./pages/master/inventory/godown/GodownCOA.tsx";
import UnitCOA from "./pages/master/inventory/unit/UnitCOA.tsx";
import CurrencyCreate from "./pages/master/currency/CurrencyCreate.tsx";
import CurrencyAlter from "./pages/master/currency/CurrencyAlter.tsx";
import CurrencyCOA from "./pages/master/currency/CurrencyCOA.tsx";
import VoucherTypeCreate from "./pages/master/voucher-type/VoucherTypeCreate.tsx";
import VoucherTypeAlter from "./pages/master/voucher-type/VoucherTypeAlter.tsx";
import VoucherTypeCOA from "./pages/master/voucher-type/VoucherTypeCOA.tsx";
import GSTRegistrationCreate from "./pages/master/statutory/gst-registration/GSTRegistrationCreate.tsx";
import GSTRegistrationAlter from "./pages/master/statutory/gst-registration/GSTRegistrationAlter.tsx";
import GSTRegistrationCOA from "./pages/master/statutory/gst-registration/GSTRegistrationCOA.tsx";
import GSTClassificationCreate from "./pages/master/statutory/gst-classification/GSTClassificationCreate.tsx";
import GSTClassificationAlter from "./pages/master/statutory/gst-classification/GSTClassificationAlter.tsx";
import GSTClassificationCOA from "./pages/master/statutory/gst-classification/GSTClassificationCOA.tsx";
import TCSNatureOfGoodsCreate from "./pages/master/statutory/tcs-nature-of-goods/TCSNatureOfGoodsCreate.tsx";
import TCSNatureOfGoodsAlter from "./pages/master/statutory/tcs-nature-of-goods/TCSNatureOfGoodsAlter.tsx";
import TCSNatureOfGoodsCOA from "./pages/master/statutory/tcs-nature-of-goods/TCSNatureOfGoodsCOA.tsx";
import TDSNatureOfPaymentCreate from "./pages/master/statutory/tds-nature-of-payment/TDSNatureOfPaymentCreate.tsx";
import TDSNatureOfPaymentAlter from "./pages/master/statutory/tds-nature-of-payment/TDSNatureOfPaymentAlter.tsx";
import TDSNatureOfPaymentCOA from "./pages/master/statutory/tds-nature-of-payment/TDSNatureOfPaymentCOA.tsx";
import TrackGSTReturnActivities from "./pages/master/statutory/gst-return/TrackGSTReturnActivities.tsx";
import GSTR1View from "./pages/master/statutory/gst-return/GSTR1View.tsx";
import GSTR1Reconciliation from "./pages/master/statutory/gst-return/GSTR1-Reconcilation.tsx";
import GSTR3BView from "./pages/master/statutory/gst-return/GSTR-3B.tsx";
import AnnualComputation from "./pages/master/statutory/gst-return/AnnualComputation.tsx";
import EmployeeGroupCreate from "./pages/master/payroll/employee-group/EmployeeGroupCreate.tsx";
import EmployeeCreate from "./pages/master/payroll/employee/EmployeeCreate.tsx";
import PayrollUnitCreate from "./pages/master/payroll/payroll-unit/PayrollUnitCreate.tsx";
import AttendanceTypeCreate from "./pages/master/payroll/attendance-type/AttendanceTypeCreate.tsx";
import PayHeadCreate from "./pages/master/payroll/pay-head/PayHeadCreate.tsx";
import PayrollvtCreate from "./pages/master/payroll/payrollvouchertype/payrollvtCreate.tsx";
import PayrollvtAlter from "./pages/master/payroll/payrollvouchertype/payrollvtAlter.tsx";
import PayrollvtCOA from "./pages/master/payroll/payrollvouchertype/payrollvtCOA.tsx";
import SalaryStructureCreate from "./pages/master/payroll/salary-structure/SalaryStructureCreate.tsx";
import EmployeeCategoryCreate from "./pages/master/payroll/employee-category/EmployeeCategoryCreate.tsx";
import EmployeeGroupCOA from "./pages/master/payroll/employee-group/EmployeeGroupCOA.tsx";
import EmployeeCOA from "./pages/master/payroll/employee/EmployeeCOA.tsx";
import PayrollUnitCOA from "./pages/master/payroll/payroll-unit/PayrollUnitCOA.tsx";
import AttendanceTypeCOA from "./pages/master/payroll/attendance-type/AttendanceTypeCOA.tsx";
import PayHeadCOA from "./pages/master/payroll/pay-head/PayHeadCOA.tsx";
import SalaryStructureCOA from "./pages/master/payroll/salary-structure/SalaryStructureCOA.tsx";
import EmployeeCategoryCOA from "./pages/master/payroll/employee-category/EmployeeCategoryCOA.tsx";
import EmployeeGroupAlter from "./pages/master/payroll/employee-group/EmployeeGroupAlter.tsx";
import EmployeeAlter from "./pages/master/payroll/employee/EmployeeAlter.tsx";
import PayrollUnitAlter from "./pages/master/payroll/payroll-unit/PayrollUnitAlter.tsx";
import AttendanceTypeAlter from "./pages/master/payroll/attendance-type/AttendanceTypeAlter.tsx";
import PayHeadAlter from "./pages/master/payroll/pay-head/PayHeadAlter.tsx";
import SalaryStructureAlter from "./pages/master/payroll/salary-structure/SalaryStructureAlter.tsx";
import EmployeeCategoryAlter from "./pages/master/payroll/employee-category/EmployeeCategoryAlter.tsx";
import TaxCreate from "./pages/master/statutory/Tax-units/taxCreate.tsx";
import TaxCOA from "./pages/master/statutory/Tax-units/taxCOA.tsx";
import TaxAlter from "./pages/master/statutory/Tax-units/taxAlter.tsx";
import GSTR2AReconciliation from "./pages/master/statutory/gst-return/GSTR2A-Reconcilation.tsx";
import IMSInwardSupplies from "./pages/master/statutory/gst-return/IMSInwardSupplies.tsx";
import GSTR2BReconciliation from "./pages/master/statutory/gst-return/GSTR2BReconciliation.tsx";
import ChallanReconciliation from "./pages/master/statutory/gst-return/ChallanReconciliation.tsx";

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
}

export const APP_ROUTES: RouteConfig[] = [
  { path: "/", element: <App /> },
  { path: "/company", element: <Company /> },
  { path: "/company/alter", element: <CompanyAlter /> },
  { path: "/master/create", element: <Create /> },
  { path: "/master/alter", element: <Alter /> },
  { path: "/master/financial-years", element: <FinancialYears /> },
  { path: "/master/coa", element: <COA /> },
  { path: "/reports/display-more",           element: <DisplayMoreReports /> },
  { path: "/reports/statutory",               element: <StatutoryReports /> },
  { path: "/reports/statutory/gst",           element: <GSTReports /> },
  // Sub-menu pages
  { path: "/reports/account-books",           element: <AccountBooks /> },
  { path: "/reports/statements-of-accounts",  element: <StatementsOfAccounts /> },
  { path: "/reports/inventory-books",         element: <InventoryBooks /> },
  { path: "/reports/statements-of-inventory", element: <StatementsOfInventory /> },
  { path: "/reports/exception",               element: <ExceptionReports /> },
  { path: "/reports/payroll",                 element: <PayrollReports /> },
  // Account reports
  { path: "/reports/accounts/cash-book",              element: <CashBookReport /> },
  { path: "/reports/accounts/bank-book",              element: <BankBookReport /> },
  { path: "/reports/accounts/ledger",                 element: <LedgerReport /> },
  { path: "/reports/accounts/group-summary",          element: <GroupSummary /> },
  { path: "/reports/accounts/sales-register",         element: <SalesRegister /> },
  { path: "/reports/accounts/purchase-register",      element: <PurchaseRegister /> },
  { path: "/reports/accounts/journal-register",       element: <JournalRegister /> },
  { path: "/reports/accounts/debit-note-register",    element: <DebitNoteRegister /> },
  { path: "/reports/accounts/credit-note-register",   element: <CreditNoteRegister /> },
  { path: "/reports/accounts/trial-balance",          element: <TrialBalance /> },
  { path: "/reports/accounts/profit-loss",            element: <ProfitLoss /> },
  { path: "/reports/accounts/balance-sheet",          element: <BalanceSheet /> },
  { path: "/reports/accounts/cash-flow",              element: <CashFlowStatement /> },
  { path: "/reports/accounts/funds-flow",             element: <FundsFlowStatement /> },
  { path: "/reports/accounts/ratio-analysis",          element: <RatioAnalysis /> },
  { path: "/reports/accounts/outstandings-receivable",element: <OutstandingsReceivable /> },
  { path: "/reports/accounts/outstandings-payable",   element: <OutstandingsPayable /> },
  { path: "/reports/accounts/interest-calculations",  element: <InterestCalculations /> },
  { path: "/reports/accounts/cost-centre-summary",    element: <CostCentreSummary /> },
  { path: "/reports/accounts/cost-category-summary",  element: <CostCategorySummary /> },
  { path: "/reports/accounts/statistics",             element: <Statistics /> },
  // Inventory reports
  { path: "/reports/inventory/stock-summary",           element: <StockSummary /> },
  { path: "/reports/inventory/stock-item",               element: <StockItemReport /> },
  { path: "/reports/inventory/stock-group",              element: <StockGroupReport /> },
  { path: "/reports/inventory/stock-category",           element: <StockCategoryReport /> },
  { path: "/reports/inventory/godown",                   element: <GodownReport /> },
  { path: "/reports/inventory/batch-vouchers",           element: <BatchVouchers /> },
  { path: "/reports/inventory/movement-analysis",        element: <MovementAnalysis /> },
  { path: "/reports/inventory/sales-order-book",         element: <SalesOrderBook /> },
  { path: "/reports/inventory/purchase-order-book",      element: <PurchaseOrderBook /> },
  { path: "/reports/inventory/ageing-analysis",          element: <AgeingAnalysis /> },
  { path: "/reports/inventory/sales-order-outstanding",  element: <SalesOrderOutstanding /> },
  { path: "/reports/inventory/purchase-order-outstanding",element: <PurchaseOrderOutstanding /> },
  { path: "/reports/inventory/work-order-outstanding",   element: <WorkOrderOutstanding /> },
  { path: "/reports/inventory/stock-query",              element: <StockQuery /> },
  { path: "/reports/inventory/reorder-status",           element: <ReorderStatus /> },
  { path: "/reports/inventory/job-work",                 element: <JobWorkReports /> },
  // Exception reports
  { path: "/reports/exception/overdue-receivables",      element: <OverdueReceivables /> },
  { path: "/reports/exception/overdue-payables",         element: <OverduePayables /> },
  { path: "/reports/exception/pending-documents",        element: <PendingDocuments /> },
  { path: "/reports/exception/negative-stock",           element: <NegativeStock /> },
  { path: "/reports/exception/negative-ledger",          element: <NegativeLedger /> },
  { path: "/reports/exception/analysis-verification",    element: <AnalysisVerification /> },
  { path: "/reports/exception/edit-log",                 element: <EditLogSummary /> },
  // Payroll reports
  { path: "/reports/payroll/payslip",           element: <PayslipReport /> },
  { path: "/reports/payroll/salary-statement",  element: <SalaryStatement /> },
  { path: "/reports/payroll/salary-register",   element: <SalaryRegister /> },
  { path: "/reports/payroll/attendance-register",element: <AttendanceReport /> },
  { path: "/reports/payroll/pay-head-breakup",  element: <PayHeadBreakup /> },
  { path: "/reports/payroll/pf",                element: <PFReports /> },
  { path: "/reports/payroll/esi",               element: <ESIReports /> },
  { path: "/reports/payroll/professional-tax",  element: <ProfessionalTax /> },
  { path: "/reports/payroll/gratuity",          element: <Gratuity /> },

  { path: "/master/create/tds-details", element: <TDSDetailsCreate /> },
  { path: "/master/alter/tds-details", element: <TDSDetailsAlter /> },
  { path: "/master/coa/tds-details", element: <TDSDetailsCOA /> },

  { path: "/master/create/tcs-details", element: <TCSDetailsCreate /> },
  { path: "/master/alter/tcs-details", element: <TCSDetailsAlter /> },
  { path: "/master/coa/tcs-details", element: <TCSDetailsCOA /> },

  { path: "/master/create/pan-cin-details", element: <PANDetailsCreate /> },
  { path: "/master/alter/pan-cin-details", element: <PANDetailsAlter /> },
  { path: "/master/coa/pan-cin-details", element: <PANDetailsCOA /> },

  { path: "/master/create/vat-registration-details", element: <VATRDCreate /> },
  { path: "/master/alter/vat-registration-details", element: <VATRDAlter /> },
  { path: "/master/coa/vat-registration-details", element: <VATRDCOA /> },

  { path: "/master/create/excise-registration-details", element: <ExciseRDCreate /> },
  { path: "/master/alter/excise-registration-details", element: <ExciseRDAlter /> },
  { path: "/master/coa/excise-registration-details", element: <ExciseRDCOA /> },

  { path: "/master/create/price-levels", element: <PricelevelsCreate /> },
  { path: "/master/alter/price-levels", element: <PricelevelsAlter /> },
  { path: "/master/coa/price-levels", element: <PricelevelsCOA /> },

  { path: "/master/create/price-lists-sg", element: <PriceListSGCreate /> },
  { path: "/master/alter/price-lists-sg", element: <PriceListSGAlter /> },
  { path: "/master/coa/price-lists-sg", element: <PriceListSGCOA /> },

  { path: "/master/create/price-lists-sc", element: <PricelistscCreate /> },
  { path: "/master/alter/price-lists-sc", element: <PricelistscAlter /> },
  { path: "/master/coa/price-lists-sc", element: <PricelistscCOA /> },

  { path: "/master/create/payroll-voucher-type", element: <PayrollvtCreate /> },
  { path: "/master/alter/payroll-voucher-type", element: <PayrollvtAlter /> },
  { path: "/master/coa/payroll-voucher-type", element: <PayrollvtCOA /> },

  { path: "/master/create/cost-centre", element: <CostCentreCreate /> },
  { path: "/master/alter/cost-centre", element: <CostCentreAlter /> },
  { path: "/master/coa/cost-centre", element: <CostCentreCOA /> },

  { path: "/master/create/ledger", element: <LedgerCreate /> },
  { path: "/master/alter/ledger", element: <LedgerAlter /> },
  { path: "/master/coa/ledger", element: <LedgerCOA /> },

  { path: "/master/create/currency", element: <CurrencyCreate /> },
  { path: "/master/alter/currency", element: <CurrencyAlter /> },
  { path: "/master/coa/currency", element: <CurrencyCOA /> },

  { path: "/master/create/voucher-type", element: <VoucherTypeCreate /> },
  { path: "/master/alter/voucher-type", element: <VoucherTypeAlter /> },
  { path: "/master/coa/voucher-type", element: <VoucherTypeCOA /> },

  { path: "/master/create/gst-registration", element: <GSTRegistrationCreate /> },
  { path: "/master/alter/gst-registration", element: <GSTRegistrationAlter /> },
  { path: "/master/coa/gst-registration", element: <GSTRegistrationCOA /> },

  { path: "/master/create/gst-classification", element: <GSTClassificationCreate /> },
  { path: "/master/alter/gst-classification", element: <GSTClassificationAlter /> },
  { path: "/master/coa/gst-classification", element: <GSTClassificationCOA /> },

  { path: "/master/create/tcs-nature-of-goods", element: <TCSNatureOfGoodsCreate /> },
  { path: "/master/alter/tcs-nature-of-goods", element: <TCSNatureOfGoodsAlter /> },
  { path: "/master/coa/tcs-nature-of-goods", element: <TCSNatureOfGoodsCOA /> },

  { path: "/master/create/tds-nature-of-payment", element: <TDSNatureOfPaymentCreate /> },
  { path: "/master/alter/tds-nature-of-payment", element: <TDSNatureOfPaymentAlter /> },
  { path: "/master/coa/tds-nature-of-payment", element: <TDSNatureOfPaymentCOA /> },

  { path: "/master/statutory/gst/track-activities", element: <TrackGSTReturnActivities /> },
  { path: "/master/statutory/gstr1", element: <GSTR1View /> },
  { path: "/master/statutory/gstr1/reconciliation", element: <GSTR1Reconciliation /> },
  { path: "/master/statutory/gstr3b", element: <GSTR3BView /> },
  { path: "/master/statutory/annual-computation", element: <AnnualComputation /> },
  { path: "/master/statutory/gstr2a/reconciliation", element: <GSTR2AReconciliation />},
  { path: "/master/statutory/gstr2b/reconciliation", element: <GSTR2BReconciliation /> },
  { path: "/master/statutory/challan/reconciliation", element: <ChallanReconciliation /> },
  { path: "/master/statutory/ims", element: <IMSInwardSupplies /> },

  { path: "/master/create/tax-units", element: <TaxCreate /> },
  { path: "/master/alter/tax-units", element: <TaxAlter /> },
  { path: "/master/coa/tax-units", element: <TaxCOA /> },

  { path: "/master/create/group", element: <GroupCreate /> },
  { path: "/master/alter/group", element: <GroupAlter /> },
  { path: "/master/alter/group/:id", element: <GroupAlterEdit /> },
  { path: "/master/coa/group", element: <GroupCOA /> },

  { path: "/master/create/unit", element: <UnitCreate /> },
  { path: "/master/create/stock-group", element: <StockGroupCreate /> },
  { path: "/master/create/stock-category", element: <StockCategoryCreate /> },
  { path: "/master/create/stock-item", element: <StockItemCreate /> },
  { path: "/master/create/godown", element: <GodownCreate /> },
  { path: "/master/alter/unit", element: <UnitAlter /> },
  { path: "/master/alter/stock-group", element: <StockGroupAlter /> },
  { path: "/master/alter/stock-category", element: <StockCategoryAlter /> },
  { path: "/master/alter/stock-item", element: <StockItemAlter /> },
  { path: "/master/alter/godown", element: <GodownAlter /> },

  { path: "/transactions/vouchers", element: <Vouchers /> },
  { path: "/transactions/voucher-list", element: <VoucherList /> },
  { path: "/transactions/voucher/:id", element: <VoucherView /> },
  { path: "/transactions/daybook", element: <Daybook /> },
  { path: "/utilities/banking", element: <Banking /> },
  { path: "/utilities/copilot", element: <Copilot /> },
  { path: "/data/:controller", element: <GenericDataView /> },

  { path: "/master/coa/stock-group", element: <StockGroupCOA /> },
  { path: "/master/coa/stock-category", element: <StockCategoryCOA /> },
  { path: "/master/coa/godown", element: <GodownCOA /> },
  { path: "/master/coa/unit", element: <UnitCOA /> },
  { path: "/master/coa/employee-group", element: <EmployeeGroupCOA /> },
  { path: "/master/coa/employee", element: <EmployeeCOA /> },
  { path: "/master/coa/payroll-unit", element: <PayrollUnitCOA /> },
  { path: "/master/coa/attendance-type", element: <AttendanceTypeCOA /> },
  { path: "/master/coa/pay-head", element: <PayHeadCOA /> },
  { path: "/master/coa/salary-structure", element: <SalaryStructureCOA /> },
  { path: "/master/coa/employee-category", element: <EmployeeCategoryCOA /> },

  { path: "/master/create/employee-group", element: <EmployeeGroupCreate /> },
  { path: "/master/create/employee", element: <EmployeeCreate /> },
  { path: "/master/create/payroll-unit", element: <PayrollUnitCreate /> },
  { path: "/master/create/attendance-type", element: <AttendanceTypeCreate /> },
  { path: "/master/create/pay-head", element: <PayHeadCreate /> },
  { path: "/master/create/salary-structure", element: <SalaryStructureCreate /> },
  { path: "/master/create/employee-category", element: <EmployeeCategoryCreate /> },

  { path: "/master/alter/employee-group", element: <EmployeeGroupAlter /> },
  { path: "/master/alter/employee", element: <EmployeeAlter /> },
  { path: "/master/alter/payroll-unit", element: <PayrollUnitAlter /> },
  { path: "/master/alter/attendance-type", element: <AttendanceTypeAlter /> },
  { path: "/master/alter/pay-head", element: <PayHeadAlter /> },
  { path: "/master/alter/salary-structure", element: <SalaryStructureAlter /> },
  { path: "/master/alter/employee-category", element: <EmployeeCategoryAlter /> },
  { path: "/company/create", element: <CompanyCreatePage /> },
];

function CompanyCreatePage() {
  const navigate = useNavigate();
  return (
    <CompanyCreate
      onSuccess={() => navigate("/company")}
      onCancel={() => navigate(-1)}
    />
  );
}

export { CompanyCreate };
