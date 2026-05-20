# API Type Definitions Refactoring

## Summary

The monolithic `api.d.ts` file has been successfully broken down into multiple modular files for better maintainability and organization.

## File Structure

### Entity Type Definitions (`client/src/types/entities/`)

- `Company.ts` - CompanyType
- `FinancialYear.ts` - FYType
- `Group.ts` - GroupType
- `Ledger.ts` - LedgerType
- `CostCentre.ts` - CostCentreType
- `Unit.ts` - UnitType
- `StockGroup.ts` - StockGroupType, StockGroupTreeNode
- `StockCategory.ts` - StockCategoryType
- `StockItem.ts` - StockItemType
- `Godown.ts` - GodownType
- `Currency.ts` - CurrencyType
- `VoucherType.ts` - VoucherTypeType
- `Voucher.ts` - VoucherEntryType, VoucherRecordType
- `Daybook.ts` - DaybookEntryType
- `GSTRegistration.ts` - GSTRegistrationType
- `GSTClassification.ts` - GSTClassificationType
- `Employee.ts` - EmployeeGroupType, EmployeeType
- `Payroll.ts` - PayrollUnitType, PayHeadType, SalaryStructureType, AttendanceTypeType
- `Feature.ts` - FeatureGroupType, FeatureItemType
- `TallyFeatures.ts` - TallyFeaturesType
- `index.ts` - Re-exports all entity types

### API Interface Definitions (`client/src/types/api/`)

- `Company.ts` - CompanyAPI interface
- `FinancialYear.ts` - FinancialYearAPI interface
- `Group.ts` - GroupAPI interface
- `Ledger.ts` - LedgerAPI interface
- `CostCentre.ts` - CostCentreAPI interface
- `Unit.ts` - UnitAPI interface
- `Inventory.ts` - InventoryAPI interface (combines stockGroup, stockCategory, stockItem)
- `Godown.ts` - GodownAPI interface
- `Transactions.ts` - VoucherAPI interface (includes voucher, report, banking)
- `MasterData.ts` - MasterDataAPI interface (includes currency, voucherType, gstRegistration, gstClassification, master)
- `Payroll.ts` - PayrollAPI interface
- `FeatureManagement.ts` - FeatureManagementAPI interface
- `index.d.ts` - Main entry point that combines all APIs and exports entity types

## Import Changes

All files use TypeScript `type` imports to comply with `verbatimModuleSyntax`:

```typescript
import type { EntityType } from "../entities/Entity";
```

## Benefits

1. **Better Organization**: Each file focuses on a specific domain
2. **Improved Maintainability**: Easier to locate and update specific types
3. **Easier Testing**: Can import specific API types independently
4. **Better Documentation**: File names clearly indicate content
5. **Reduced File Size**: No more 738-line monolithic file
6. **Type Safety**: Proper `type-only` imports for better tree-shaking

## How to Use

### Importing individual types:

```typescript
import type { CompanyType } from "../types/entities/Company";
import type { GroupType } from "../types/entities/Group";
```

### Importing from entities index:

```typescript
import type { CompanyType, GroupType, LedgerType } from "../types/entities";
```

### Importing from api index:

```typescript
import type { CompanyType } from "../types/api";
// All entity types are re-exported from api/index.d.ts
```

### Using window.api:

```typescript
const companies = await window.api.company.getAll();
const groups = await window.api.group.getAll(companyId);
```
