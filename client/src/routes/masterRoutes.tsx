import Create from '../pages/menu/Create.tsx';
import Alter from '../pages/menu/Alter.tsx';
import COA from '../pages/menu/coa.tsx';
import FinancialYears from '../pages/master/FinancialYears.tsx';

// Ledger / Group / Currency
import LedgerCreate from '../pages/master/ledger/LedgerCreate.tsx';
import LedgerAlter from '../pages/master/ledger/LedgerAlter.tsx';
import LedgerCOA from '../pages/master/ledger/LedgerCOA.tsx';
import GroupCreate from '../pages/master/group/GroupCreate.tsx';
import GroupAlter from '../pages/master/group/GroupAlter.tsx';
import GroupAlterEdit from '../pages/master/group/GroupAlterEdit.tsx';
import GroupCOA from '../pages/master/group/GroupCOA.tsx';
import CurrencyCreate from '../pages/master/currency/CurrencyCreate.tsx';
import CurrencyAlter from '../pages/master/currency/CurrencyAlter.tsx';
import CurrencyCOA from '../pages/master/currency/CurrencyCOA.tsx';

// Voucher Type
import VoucherTypeCreate from '../pages/master/voucher-type/VoucherTypeCreate.tsx';
import VoucherTypeAlter from '../pages/master/voucher-type/VoucherTypeAlter.tsx';
import VoucherTypeCOA from '../pages/master/voucher-type/VoucherTypeCOA.tsx';

// Cost Centre / Category / Budget / Scenario
import CostCentreCreate from '../pages/master/cost-centre/cost-centreCreate.tsx';
import CostCentreAlter from '../pages/master/cost-centre/cost-centreAlter.tsx';
import CostCentreCOA from '../pages/master/cost-centre/cost-centreCOA.tsx';
import CostCategoryCreate from '../pages/master/cost-category/CostCategoryCreate.tsx';
import CostCategoryAlter from '../pages/master/cost-category/CostCategoryAlter.tsx';
import CostCategoryCOA from '../pages/master/cost-category/CostCategoryCOA.tsx';
import BudgetCreate from '../pages/master/budget/BudgetCreate.tsx';
import BudgetAlter from '../pages/master/budget/BudgetAlter.tsx';
import BudgetCOA from '../pages/master/budget/BudgetCOA.tsx';
import ScenarioCreate from '../pages/master/scenario/ScenarioCreate.tsx';
import ScenarioAlter from '../pages/master/scenario/ScenarioAlter.tsx';
import ScenarioCOA from '../pages/master/scenario/ScenarioCOA.tsx';

// Merchant / Credit Limits
import MerchantProfileCreate from '../pages/master/merchant-profile/MerchantProfileCreate.tsx';
import MerchantProfileAlter from '../pages/master/merchant-profile/MerchantProfileAlter.tsx';
import CreditLimitsCreate from '../pages/master/credit-limits/CreditLimitsCreate.tsx';
import CreditLimitsAlter from '../pages/master/credit-limits/CreditLimitsAlter.tsx';

// Inventory — Unit / Stock Group / Category / Item / Godown
import UnitCreate from '../pages/master/inventory/unit/UnitCreate.tsx';
import UnitAlter from '../pages/master/inventory/unit/UnitAlter.tsx';
import UnitCOA from '../pages/master/inventory/unit/UnitCOA.tsx';
import StockGroupCreate from '../pages/master/inventory/stock-group/StockGroupCreate.tsx';
import StockGroupAlter from '../pages/master/inventory/stock-group/StockGroupAlter.tsx';
import StockGroupCOA from '../pages/master/inventory/stock-group/StockGroupCOA.tsx';
import StockCategoryCreate from '../pages/master/inventory/stock-category/StockCategoryCreate.tsx';
import StockCategoryAlter from '../pages/master/inventory/stock-category/StockCategoryAlter.tsx';
import StockCategoryCOA from '../pages/master/inventory/stock-category/StockCategoryCOA.tsx';
import StockItemCreate from '../pages/master/inventory/stock-item/StockItemCreate.tsx';
import StockItemAlter from '../pages/master/inventory/stock-item/StockItemAlter.tsx';
import GodownCreate from '../pages/master/inventory/godown/GodownCreate.tsx';
import GodownAlter from '../pages/master/inventory/godown/GodownAlter.tsx';
import GodownCOA from '../pages/master/inventory/godown/GodownCOA.tsx';

// Inventory — Price Levels / Price Lists
import PricelevelsCreate from '../pages/master/inventory/price-levels/pricelevelsCreate.tsx';
import PricelevelsAlter from '../pages/master/inventory/price-levels/pricelevelsAlter.tsx';
import PricelevelsCOA from '../pages/master/inventory/price-levels/pricelevelsCOA.tsx';
import PriceListSGCreate from '../pages/master/inventory/pricelist(stockgroup)/pricelist(sg)Create.tsx';
import PriceListSGAlter from '../pages/master/inventory/pricelist(stockgroup)/pricelist(sg)Alter.tsx';
import PriceListSGCOA from '../pages/master/inventory/pricelist(stockgroup)/pricelist(sg)COA.tsx';
import PricelistscCreate from '../pages/master/inventory/pricelist(stockcategory)/pricelist(sc)Create.tsx';
import PricelistscAlter from '../pages/master/inventory/pricelist(stockcategory)/pricelist(sc)Alter.tsx';
import PricelistscCOA from '../pages/master/inventory/pricelist(stockcategory)/pricelist(sc)COA.tsx';

// Statutory — GST
import GSTRegistrationCreate from '../pages/master/statutory/gst-registration/GSTRegistrationCreate.tsx';
import GSTRegistrationAlter from '../pages/master/statutory/gst-registration/GSTRegistrationAlter.tsx';
import GSTRegistrationCOA from '../pages/master/statutory/gst-registration/GSTRegistrationCOA.tsx';
import GSTClassificationCreate from '../pages/master/statutory/gst-classification/GSTClassificationCreate.tsx';
import GSTClassificationAlter from '../pages/master/statutory/gst-classification/GSTClassificationAlter.tsx';
import GSTClassificationCOA from '../pages/master/statutory/gst-classification/GSTClassificationCOA.tsx';
import TrackGSTReturnActivities from '../pages/master/statutory/gst-return/TrackGSTReturnActivities.tsx';
import GSTR1View from '../pages/master/statutory/gst-return/GSTR1View.tsx';
import GSTReturnStatistics from '../pages/master/statutory/gst-return/GSTReturnStatistics.tsx';
import GSTVoucherRegister from '../pages/master/statutory/gst-return/GSTVoucherRegister.tsx';
import GSTVoucherMonthlyRegister from '../pages/master/statutory/gst-return/GSTVoucherMonthlyRegister.tsx';
import GSTR1SectionDetail from '../pages/master/statutory/gst-return/GSTR1SectionDetail.tsx';
import GSTRNotRelevant from '../pages/master/statutory/gst-return/GSTRNotRelevant.tsx';
import GSTRUncertain from '../pages/master/statutory/gst-return/GSTRUncertain.tsx';
import AnnualSectionSummary from '../pages/master/statutory/gst-return/AnnualSectionSummary.tsx';
import AnnualMonthlySummary from '../pages/master/statutory/gst-return/AnnualMonthlySummary.tsx';
import GSTR1Reconciliation from '../pages/master/statutory/gst-return/GSTR1-Reconcilation.tsx';
import UncertainBreakdown from '../pages/master/statutory/gst-return/UncertainBreakdown.tsx';
import GSTR3BView from '../pages/master/statutory/gst-return/GSTR-3B.tsx';
import AnnualComputation from '../pages/master/statutory/gst-return/AnnualComputation.tsx';
import GSTR2AReconciliation from '../pages/master/statutory/gst-return/GSTR2A-Reconcilation.tsx';
import IMSInwardSupplies from '../pages/master/statutory/gst-return/IMSInwardSupplies.tsx';
import GSTR2BReconciliation from '../pages/master/statutory/gst-return/GSTR2BReconciliation.tsx';
import ChallanReconciliation from '../pages/master/statutory/gst-return/ChallanReconciliation.tsx';

// Statutory — Excise / Tax Units
import ExciseDutyClassificationCreate from '../pages/master/statutory/excise-duty-classification/ExciseDutyClassificationCreate.tsx';
import ExciseDutyClassificationAlter from '../pages/master/statutory/excise-duty-classification/ExciseDutyClassificationAlter.tsx';
import ExciseDutyClassificationCOA from '../pages/master/statutory/excise-duty-classification/ExciseDutyClassificationCOA.tsx';
import ExciseBookCreate from '../pages/master/statutory/excise-book/ExciseBookCreate.tsx';
import ExciseBookAlter from '../pages/master/statutory/excise-book/ExciseBookAlter.tsx';
import ExciseBookCOA from '../pages/master/statutory/excise-book/ExciseBookCOA.tsx';
import TaxCreate from '../pages/master/statutory/Tax-units/taxCreate.tsx';
import TaxCOA from '../pages/master/statutory/Tax-units/taxCOA.tsx';
import TaxAlter from '../pages/master/statutory/Tax-units/taxAlter.tsx';

// Statutory — TCS / TDS / Nature
import TCSNatureOfGoodsCreate from '../pages/master/statutory/tcs-nature-of-goods/TCSNatureOfGoodsCreate.tsx';
import TCSNatureOfGoodsAlter from '../pages/master/statutory/tcs-nature-of-goods/TCSNatureOfGoodsAlter.tsx';
import TCSNatureOfGoodsCOA from '../pages/master/statutory/tcs-nature-of-goods/TCSNatureOfGoodsCOA.tsx';
import TDSNatureOfPaymentCreate from '../pages/master/statutory/tds-nature-of-payment/TDSNatureOfPaymentCreate.tsx';
import TDSNatureOfPaymentAlter from '../pages/master/statutory/tds-nature-of-payment/TDSNatureOfPaymentAlter.tsx';
import TDSNatureOfPaymentCOA from '../pages/master/statutory/tds-nature-of-payment/TDSNatureOfPaymentCOA.tsx';

// Statutory Details
import TDSDetailsCreate from '../pages/master/statutory-details/TDSDetails/TDSDetailsCreate.tsx';
import TDSDetailsAlter from '../pages/master/statutory-details/TDSDetails/TDSDetailsAlter.tsx';
import TDSDetailsCOA from '../pages/master/statutory-details/TDSDetails/TDSDetailsCOA.tsx';
import TCSDetailsCreate from '../pages/master/statutory-details/TCSDetails/TCSDetailsCreate.tsx';
import TCSDetailsAlter from '../pages/master/statutory-details/TCSDetails/TCSDetailsAlter.tsx';
import TCSDetailsCOA from '../pages/master/statutory-details/TCSDetails/TCSDetailsCOA.tsx';
import PANDetailsCreate from '../pages/master/statutory-details/PANDetails/PANDetailsCreate.tsx';
import PANDetailsAlter from '../pages/master/statutory-details/PANDetails/PANDetailsAlter.tsx';
import PANDetailsCOA from '../pages/master/statutory-details/PANDetails/PANDetailsCOA.tsx';
import PayrollStatutoryDetailsCreate from '../pages/master/statutory-details/PayrollStatutoryDetails/PayrollStatutoryDetailsCreate.tsx';
import ServiceTaxDetailsCreate from '../pages/master/statutory-details/ServiceTaxDetails/ServiceTaxDetailsCreate.tsx';
import CenvatOpeningBalanceCreate from '../pages/master/statutory-details/CenvatOpeningBalance/CenvatOpeningBalanceCreate.tsx';
import PlaOpeningBalanceCreate from '../pages/master/statutory-details/PlaOpeningBalance/PlaOpeningBalanceCreate.tsx';
import ExciseOpeningBalanceCreate from '../pages/master/statutory-details/ExciseOpeningBalance/ExciseOpeningBalanceCreate.tsx';
import DealerExciseOpeningStockCreate from '../pages/master/statutory-details/DealerExciseOpeningStock/DealerExciseOpeningStockCreate.tsx';
import VATRDCreate from '../pages/master/statutory-details/VATRegistrationDetails/VATRDCreate.tsx';
import VATRDAlter from '../pages/master/statutory-details/VATRegistrationDetails/VATRDAlter.tsx';
import VATRDCOA from '../pages/master/statutory-details/VATRegistrationDetails/VATRDCOA.tsx';
import ExciseRDCreate from '../pages/master/statutory-details/ExciseRegistrationDetails/ExciseRDCreate.tsx';
import ExciseRDAlter from '../pages/master/statutory-details/ExciseRegistrationDetails/ExciseRDAlter.tsx';
import ExciseRDCOA from '../pages/master/statutory-details/ExciseRegistrationDetails/ExciseRDCOA.tsx';

// Payroll
import EmployeeGroupCreate from '../pages/master/payroll/employee-group/EmployeeGroupCreate.tsx';
import EmployeeGroupCOA from '../pages/master/payroll/employee-group/EmployeeGroupCOA.tsx';
import EmployeeGroupAlter from '../pages/master/payroll/employee-group/EmployeeGroupAlter.tsx';
import EmployeeCreate from '../pages/master/payroll/employee/EmployeeCreate.tsx';
import EmployeeCOA from '../pages/master/payroll/employee/EmployeeCOA.tsx';
import EmployeeAlter from '../pages/master/payroll/employee/EmployeeAlter.tsx';
import PayrollUnitCreate from '../pages/master/payroll/payroll-unit/PayrollUnitCreate.tsx';
import PayrollUnitCOA from '../pages/master/payroll/payroll-unit/PayrollUnitCOA.tsx';
import PayrollUnitAlter from '../pages/master/payroll/payroll-unit/PayrollUnitAlter.tsx';
import AttendanceTypeCreate from '../pages/master/payroll/attendance-type/AttendanceTypeCreate.tsx';
import AttendanceTypeCOA from '../pages/master/payroll/attendance-type/AttendanceTypeCOA.tsx';
import AttendanceTypeAlter from '../pages/master/payroll/attendance-type/AttendanceTypeAlter.tsx';
import PayHeadCreate from '../pages/master/payroll/pay-head/PayHeadCreate.tsx';
import PayHeadCOA from '../pages/master/payroll/pay-head/PayHeadCOA.tsx';
import PayHeadAlter from '../pages/master/payroll/pay-head/PayHeadAlter.tsx';
import SalaryStructureCreate from '../pages/master/payroll/salary-structure/SalaryStructureCreate.tsx';
import SalaryStructureCOA from '../pages/master/payroll/salary-structure/SalaryStructureCOA.tsx';
import SalaryStructureAlter from '../pages/master/payroll/salary-structure/SalaryStructureAlter.tsx';
import EmployeeCategoryCreate from '../pages/master/payroll/employee-category/EmployeeCategoryCreate.tsx';
import EmployeeCategoryCOA from '../pages/master/payroll/employee-category/EmployeeCategoryCOA.tsx';
import EmployeeCategoryAlter from '../pages/master/payroll/employee-category/EmployeeCategoryAlter.tsx';
import PayrollvtCreate from '../pages/master/payroll/payrollvouchertype/payrollvtCreate.tsx';
import PayrollvtAlter from '../pages/master/payroll/payrollvouchertype/payrollvtAlter.tsx';
import PayrollvtCOA from '../pages/master/payroll/payrollvouchertype/payrollvtCOA.tsx';

import type { RouteConfig } from './types';

export const masterRoutes: RouteConfig[] = [
  // Menu hubs
  { path: '/master/create', element: <Create /> },
  { path: '/master/alter', element: <Alter /> },
  { path: '/master/coa', element: <COA /> },
  { path: '/master/financial-years', element: <FinancialYears /> },

  // Ledger
  { path: '/master/create/ledger', element: <LedgerCreate /> },
  { path: '/master/alter/ledger', element: <LedgerAlter /> },
  { path: '/master/coa/ledger', element: <LedgerCOA /> },

  // Group
  { path: '/master/create/group', element: <GroupCreate /> },
  { path: '/master/alter/group', element: <GroupAlter /> },
  { path: '/master/alter/group/:id', element: <GroupAlterEdit /> },
  { path: '/master/coa/group', element: <GroupCOA /> },

  // Currency
  { path: '/master/create/currency', element: <CurrencyCreate /> },
  { path: '/master/alter/currency', element: <CurrencyAlter /> },
  { path: '/master/coa/currency', element: <CurrencyCOA /> },

  // Voucher Type
  { path: '/master/create/voucher-type', element: <VoucherTypeCreate /> },
  { path: '/master/alter/voucher-type', element: <VoucherTypeAlter /> },
  { path: '/master/coa/voucher-type', element: <VoucherTypeCOA /> },

  // Cost Centre
  { path: '/master/create/cost-centre', element: <CostCentreCreate /> },
  { path: '/master/alter/cost-centre', element: <CostCentreAlter /> },
  { path: '/master/coa/cost-centre', element: <CostCentreCOA /> },

  // Cost Category
  { path: '/master/create/cost-category', element: <CostCategoryCreate /> },
  { path: '/master/alter/cost-category', element: <CostCategoryAlter /> },
  { path: '/master/coa/cost-category', element: <CostCategoryCOA /> },

  // Budget
  { path: '/master/create/budget', element: <BudgetCreate /> },
  { path: '/master/alter/budget', element: <BudgetAlter /> },
  { path: '/master/coa/budget', element: <BudgetCOA /> },

  // Scenario
  { path: '/master/create/scenario', element: <ScenarioCreate /> },
  { path: '/master/alter/scenario', element: <ScenarioAlter /> },
  { path: '/master/coa/scenario', element: <ScenarioCOA /> },

  // Merchant Profile / Credit Limits
  { path: '/master/create/merchant-profile', element: <MerchantProfileCreate /> },
  { path: '/master/alter/merchant-profile', element: <MerchantProfileAlter /> },
  { path: '/master/create/credit-limits', element: <CreditLimitsCreate /> },
  { path: '/master/alter/credit-limits', element: <CreditLimitsAlter /> },

  // Inventory — Unit
  { path: '/master/create/unit', element: <UnitCreate /> },
  { path: '/master/alter/unit', element: <UnitAlter /> },
  { path: '/master/coa/unit', element: <UnitCOA /> },

  // Inventory — Stock Group
  { path: '/master/create/stock-group', element: <StockGroupCreate /> },
  { path: '/master/alter/stock-group', element: <StockGroupAlter /> },
  { path: '/master/coa/stock-group', element: <StockGroupCOA /> },

  // Inventory — Stock Category
  { path: '/master/create/stock-category', element: <StockCategoryCreate /> },
  { path: '/master/alter/stock-category', element: <StockCategoryAlter /> },
  { path: '/master/coa/stock-category', element: <StockCategoryCOA /> },

  // Inventory — Stock Item
  { path: '/master/create/stock-item', element: <StockItemCreate /> },
  { path: '/master/alter/stock-item', element: <StockItemAlter /> },

  // Inventory — Godown
  { path: '/master/create/godown', element: <GodownCreate /> },
  { path: '/master/alter/godown', element: <GodownAlter /> },
  { path: '/master/coa/godown', element: <GodownCOA /> },

  // Inventory — Price Levels
  { path: '/master/create/price-levels', element: <PricelevelsCreate /> },
  { path: '/master/alter/price-levels', element: <PricelevelsAlter /> },
  { path: '/master/coa/price-levels', element: <PricelevelsCOA /> },

  // Inventory — Price Lists (Stock Group)
  { path: '/master/create/price-lists-sg', element: <PriceListSGCreate /> },
  { path: '/master/alter/price-lists-sg', element: <PriceListSGAlter /> },
  { path: '/master/coa/price-lists-sg', element: <PriceListSGCOA /> },

  // Inventory — Price Lists (Stock Category)
  { path: '/master/create/price-lists-sc', element: <PricelistscCreate /> },
  { path: '/master/alter/price-lists-sc', element: <PricelistscAlter /> },
  { path: '/master/coa/price-lists-sc', element: <PricelistscCOA /> },

  // Statutory — GST Registration
  { path: '/master/create/gst-registration', element: <GSTRegistrationCreate /> },
  { path: '/master/alter/gst-registration', element: <GSTRegistrationAlter /> },
  { path: '/master/coa/gst-registration', element: <GSTRegistrationCOA /> },

  // Statutory — GST Classification
  { path: '/master/create/gst-classification', element: <GSTClassificationCreate /> },
  { path: '/master/alter/gst-classification', element: <GSTClassificationAlter /> },
  { path: '/master/coa/gst-classification', element: <GSTClassificationCOA /> },

  // Statutory — GST Returns
  { path: '/master/statutory/gst/track-activities', element: <TrackGSTReturnActivities /> },
  { path: '/master/statutory/gst/return-statistics', element: <GSTReturnStatistics /> },
  { path: '/master/statutory/gst/voucher-register', element: <GSTVoucherRegister /> },
  { path: '/master/statutory/gst/voucher-monthly', element: <GSTVoucherMonthlyRegister /> },
  { path: '/master/statutory/gstr1/section', element: <GSTR1SectionDetail /> },
  { path: '/master/statutory/gst/not-relevant', element: <GSTRNotRelevant /> },
  { path: '/master/statutory/gst/uncertain', element: <GSTRUncertain /> },
  { path: '/master/statutory/gst/annual-section', element: <AnnualSectionSummary /> },
  { path: '/master/statutory/gst/annual-monthly', element: <AnnualMonthlySummary /> },
  { path: '/master/statutory/gstr1', element: <GSTR1View /> },
  { path: '/master/statutory/gstr1/reconciliation', element: <GSTR1Reconciliation /> },
  { path: '/master/statutory/gstr1/reconciliation/uncertain', element: <UncertainBreakdown /> },
  { path: '/master/statutory/gstr2a/reconciliation/uncertain', element: <UncertainBreakdown /> },
  { path: '/master/statutory/annual-computation/uncertain', element: <UncertainBreakdown /> },
  { path: '/master/statutory/gstr3b', element: <GSTR3BView /> },
  { path: '/master/statutory/annual-computation', element: <AnnualComputation /> },
  { path: '/master/statutory/gstr2a/reconciliation', element: <GSTR2AReconciliation /> },
  { path: '/master/statutory/gstr2b/reconciliation', element: <GSTR2BReconciliation /> },
  { path: '/master/statutory/challan/reconciliation', element: <ChallanReconciliation /> },
  { path: '/master/statutory/ims', element: <IMSInwardSupplies /> },

  // Statutory — Excise Duty Classification
  {
    path: '/master/create/excise-duty-classification',
    element: <ExciseDutyClassificationCreate />,
  },
  { path: '/master/alter/excise-duty-classification', element: <ExciseDutyClassificationAlter /> },
  { path: '/master/coa/excise-duty-classification', element: <ExciseDutyClassificationCOA /> },

  // Statutory — Excise Book
  { path: '/master/create/excise-book', element: <ExciseBookCreate /> },
  { path: '/master/alter/excise-book', element: <ExciseBookAlter /> },
  { path: '/master/coa/excise-book', element: <ExciseBookCOA /> },

  // Statutory — Tax Units
  { path: '/master/create/tax-units', element: <TaxCreate /> },
  { path: '/master/alter/tax-units', element: <TaxAlter /> },
  { path: '/master/coa/tax-units', element: <TaxCOA /> },

  // Statutory — TCS Nature of Goods
  { path: '/master/create/tcs-nature-of-goods', element: <TCSNatureOfGoodsCreate /> },
  { path: '/master/alter/tcs-nature-of-goods', element: <TCSNatureOfGoodsAlter /> },
  { path: '/master/coa/tcs-nature-of-goods', element: <TCSNatureOfGoodsCOA /> },

  // Statutory — TDS Nature of Payment
  { path: '/master/create/tds-nature-of-payment', element: <TDSNatureOfPaymentCreate /> },
  { path: '/master/alter/tds-nature-of-payment', element: <TDSNatureOfPaymentAlter /> },
  { path: '/master/coa/tds-nature-of-payment', element: <TDSNatureOfPaymentCOA /> },

  // Statutory Details — TDS
  { path: '/master/create/tds-details', element: <TDSDetailsCreate /> },
  { path: '/master/alter/tds-details', element: <TDSDetailsAlter /> },
  { path: '/master/coa/tds-details', element: <TDSDetailsCOA /> },

  // Statutory Details — TCS
  { path: '/master/create/tcs-details', element: <TCSDetailsCreate /> },
  { path: '/master/alter/tcs-details', element: <TCSDetailsAlter /> },
  { path: '/master/coa/tcs-details', element: <TCSDetailsCOA /> },

  // Statutory Details — PAN/CIN
  { path: '/master/create/pan-cin-details', element: <PANDetailsCreate /> },
  { path: '/master/alter/pan-cin-details', element: <PANDetailsAlter /> },
  { path: '/master/coa/pan-cin-details', element: <PANDetailsCOA /> },

  // Statutory Details — Payroll / Service Tax
  { path: '/master/create/payroll-statutory-details', element: <PayrollStatutoryDetailsCreate /> },
  { path: '/master/create/service-tax-details', element: <ServiceTaxDetailsCreate /> },
  { path: '/master/create/cenvat-opening-balance', element: <CenvatOpeningBalanceCreate /> },
  { path: '/master/create/pla-opening-balance', element: <PlaOpeningBalanceCreate /> },
  { path: '/master/create/excise-opening-balance', element: <ExciseOpeningBalanceCreate /> },
  {
    path: '/master/create/dealer-excise-opening-stock',
    element: <DealerExciseOpeningStockCreate />,
  },

  // Statutory Details — VAT Registration
  { path: '/master/create/vat-registration-details', element: <VATRDCreate /> },
  { path: '/master/alter/vat-registration-details', element: <VATRDAlter /> },
  { path: '/master/coa/vat-registration-details', element: <VATRDCOA /> },

  // Statutory Details — Excise Registration
  { path: '/master/create/excise-registration-details', element: <ExciseRDCreate /> },
  { path: '/master/alter/excise-registration-details', element: <ExciseRDAlter /> },
  { path: '/master/coa/excise-registration-details', element: <ExciseRDCOA /> },

  // Payroll — Employee Group
  { path: '/master/create/employee-group', element: <EmployeeGroupCreate /> },
  { path: '/master/alter/employee-group', element: <EmployeeGroupAlter /> },
  { path: '/master/coa/employee-group', element: <EmployeeGroupCOA /> },

  // Payroll — Employee
  { path: '/master/create/employee', element: <EmployeeCreate /> },
  { path: '/master/alter/employee', element: <EmployeeAlter /> },
  { path: '/master/coa/employee', element: <EmployeeCOA /> },

  // Payroll — Payroll Unit
  { path: '/master/create/payroll-unit', element: <PayrollUnitCreate /> },
  { path: '/master/alter/payroll-unit', element: <PayrollUnitAlter /> },
  { path: '/master/coa/payroll-unit', element: <PayrollUnitCOA /> },

  // Payroll — Attendance Type
  { path: '/master/create/attendance-type', element: <AttendanceTypeCreate /> },
  { path: '/master/alter/attendance-type', element: <AttendanceTypeAlter /> },
  { path: '/master/coa/attendance-type', element: <AttendanceTypeCOA /> },

  // Payroll — Pay Head
  { path: '/master/create/pay-head', element: <PayHeadCreate /> },
  { path: '/master/alter/pay-head', element: <PayHeadAlter /> },
  { path: '/master/coa/pay-head', element: <PayHeadCOA /> },

  // Payroll — Salary Structure
  { path: '/master/create/salary-structure', element: <SalaryStructureCreate /> },
  { path: '/master/alter/salary-structure', element: <SalaryStructureAlter /> },
  { path: '/master/coa/salary-structure', element: <SalaryStructureCOA /> },

  // Payroll — Employee Category
  { path: '/master/create/employee-category', element: <EmployeeCategoryCreate /> },
  { path: '/master/alter/employee-category', element: <EmployeeCategoryAlter /> },
  { path: '/master/coa/employee-category', element: <EmployeeCategoryCOA /> },

  // Payroll — Payroll Voucher Type
  { path: '/master/create/payroll-voucher-type', element: <PayrollvtCreate /> },
  { path: '/master/alter/payroll-voucher-type', element: <PayrollvtAlter /> },
  { path: '/master/coa/payroll-voucher-type', element: <PayrollvtCOA /> },
];
