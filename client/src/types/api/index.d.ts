import type { CompanyAPI } from './Company';
import type { FinancialYearAPI } from './FinancialYear';
import type { GroupAPI } from './Group';
import type { LedgerAPI } from './Ledger';
import type { CostCentreAPI } from './CostCentre';
import type { CostCategoryAPI } from './CostCategory';
import type { UnitAPI } from './Unit';
import type { InventoryAPI } from './Inventory';
import type { GodownAPI } from './Godown';
import type { VoucherAPI } from './Transactions';
import type { MasterDataAPI } from './MasterData';
import type { PayrollAPI } from './Payroll';
import type { FeatureManagementAPI } from './FeatureManagement';
import type { VoucherTypeAPI } from './VoucherType';
import type { PhysicalStockAPI } from './PhysicalStock';
import type { AttendanceAPI } from './Attendance';
import type { TaxUnitAPI } from './TaxUnits';
import type { AiAPI } from './Ai';
import type { TallyAPI } from './Tally';
import type { AuditTrailAPI } from './AuditTrail';
import type { TDSNatureOfPaymentAPI } from './TDSNatureOfPayment';

export type {
  CompanyType,
  FYType,
  GroupType,
  SlabBasedRate,
  LedgerType,
  CostCentreType,
  CostCategoryType,
  UnitType,
  StockGroupType,
  StockGroupTreeNode,
  StockCategoryType,
  StockItemType,
  GodownType,
  CurrencyType,
  VoucherTypeType,
  VoucherEntryType,
  VoucherRecordType,
  DaybookEntryType,
  GSTRegistrationType,
  GSTClassificationType,
  TCSNatureOfGoodsType,
  TDSNatureOfPaymentType,
  EmployeeGroupType,
  EmployeeType,
  PayrollUnitType,
  PayHeadType,
  SalaryStructureType,
  AttendanceTypeType,
  FeatureGroupType,
  FeatureItemType,
  TallyFeaturesType,
  TaxUnitType,
} from '../entities';

export type WindowAPI = 
  & CompanyAPI
  & FinancialYearAPI
  & GroupAPI
  & LedgerAPI
  & CostCentreAPI
  & CostCategoryAPI
  & UnitAPI
  & InventoryAPI
  & GodownAPI
  & VoucherAPI
  & VoucherTypeAPI 
  & MasterDataAPI
  & PayrollAPI
  & FeatureManagementAPI
  & PhysicalStockAPI
  & AttendanceAPI
  & TaxUnitAPI
  & AiAPI
  & TallyAPI
  & AuditTrailAPI
  & TDSNatureOfPaymentAPI
  & { app: { getDataPath: () => Promise<string> } };

declare global {
  interface Window {
    api: WindowAPI;
  }
}

export {};
