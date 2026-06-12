import { useNavigate } from "react-router-dom";
import App from './App.tsx';
import CostCentreCreate from "./pages/master/cost-centre/cost-centreCreate.tsx";
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
import GSTR1View from "./pages/master/statutory/gst-return/GSTR1View.tsx";
import EmployeeGroupCreate from "./pages/master/payroll/employee-group/EmployeeGroupCreate.tsx";
import EmployeeCreate from "./pages/master/payroll/employee/EmployeeCreate.tsx";
import PayrollUnitCreate from "./pages/master/payroll/payroll-unit/PayrollUnitCreate.tsx";
import AttendanceTypeCreate from "./pages/master/payroll/attendance-type/AttendanceTypeCreate.tsx";
import PayHeadCreate from "./pages/master/payroll/pay-head/PayHeadCreate.tsx";
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

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
}

export const APP_ROUTES: RouteConfig[] = [
  { path: "/", element: <App /> },
  { path: "/company", element: <Company /> },
  { path: "/company/alter", element: <CompanyAlter /> },
  { path: "/master/create", element: <Create />},
  { path: "/master/alter", element: <Alter />},
  { path: "/master/financial-years", element: <FinancialYears />},
  { path: "/master/coa", element: <COA />},

  { path: "/master/create/cost-centre", element: <CostCentreCreate/>},
  { path: "/master/alter/cost-centre", element: <CostCentreAlter/>},
  { path: "/master/coa/cost-centre", element: <CostCentreCOA/>},

  { path: "/master/create/ledger", element: <LedgerCreate />},
  { path: "/master/alter/ledger", element: <LedgerAlter />},
  { path: "/master/coa/ledger", element: <LedgerCOA />},

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
  { path: "/master/statutory/gstr1", element: <GSTR1View /> },

  { path: "/master/create/group", element: <GroupCreate />},
  { path: "/master/alter/group", element: <GroupAlter />},
  { path: "/master/alter/group/:id", element: <GroupAlterEdit />},
  { path: "/master/coa/group", element: <GroupCOA />},

  { path: "/master/create/unit", element: <UnitCreate />},
  { path: "/master/create/stock-group", element: <StockGroupCreate />},
  { path: "/master/create/stock-category", element: <StockCategoryCreate />},
  { path: "/master/create/stock-item", element: <StockItemCreate />},
  { path: "/master/create/godown", element: <GodownCreate />},
  { path: "/master/alter/unit", element: <UnitAlter />},
  { path: "/master/alter/stock-group", element: <StockGroupAlter/>},
  { path: "/master/alter/stock-category", element: <StockCategoryAlter />},
  { path: "/master/alter/stock-item", element: <StockItemAlter />},
  { path: "/master/alter/godown", element: <GodownAlter />},

  { path: "/transactions/vouchers", element: <Vouchers />},
  { path: "/transactions/voucher-list", element: <VoucherList />},
  { path: "/transactions/voucher/:id", element: <VoucherView />},
  { path: "/transactions/daybook", element: <Daybook />},
  { path: "/utilities/banking", element: <Banking />},
  { path: "/data/:controller", element: <GenericDataView />},

  { path: "/master/coa/stock-group", element: <StockGroupCOA />},
  { path: "/master/coa/stock-category", element: <StockCategoryCOA />},
  { path: "/master/coa/godown", element: <GodownCOA />},
  { path: "/master/coa/unit", element: <UnitCOA />},
  { path: "/master/coa/employee-group", element: <EmployeeGroupCOA />},
  { path: "/master/coa/employee", element: <EmployeeCOA />},
  { path: "/master/coa/payroll-unit", element: <PayrollUnitCOA />},
  { path: "/master/coa/attendance-type", element: <AttendanceTypeCOA />},
  { path: "/master/coa/pay-head", element: <PayHeadCOA />},
  { path: "/master/coa/salary-structure", element: <SalaryStructureCOA />},
  { path: "/master/coa/employee-category", element: <EmployeeCategoryCOA />},

  { path: "/master/create/employee-group", element: <EmployeeGroupCreate />},
  { path: "/master/create/employee", element: <EmployeeCreate />},
  { path: "/master/create/payroll-unit", element: <PayrollUnitCreate />},
  { path: "/master/create/attendance-type", element: <AttendanceTypeCreate />},
  { path: "/master/create/pay-head", element: <PayHeadCreate />},
  { path: "/master/create/salary-structure", element: <SalaryStructureCreate />},
  { path: "/master/create/employee-category", element: <EmployeeCategoryCreate />},

  { path: "/master/alter/employee-group", element: <EmployeeGroupAlter />},
  { path: "/master/alter/employee", element: <EmployeeAlter />},
  { path: "/master/alter/payroll-unit", element: <PayrollUnitAlter />},
  { path: "/master/alter/attendance-type", element: <AttendanceTypeAlter />},
  { path: "/master/alter/pay-head", element: <PayHeadAlter />},
  { path: "/master/alter/salary-structure", element: <SalaryStructureAlter />},
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
