import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import './index.css';
import { CompanyProvider } from "./context/CompanyContext";
import StartupGuard from "./context/StartupGuard";
import Layout from "./Layout.tsx";
import App from './App.tsx';
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

function CompanyCreatePage() {
  const navigate = useNavigate();
  return (
    <CompanyCreate
      onSuccess={() => navigate("/company")}
      onCancel={() => navigate(-1)}
    />
  );
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <CompanyProvider>
      <StartupGuard>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<App />} />
            <Route path="/company" element={<Company />} />
            <Route path="/company/create" element={<CompanyCreatePage />} />
            <Route path="/company/alter" element={<CompanyAlter />} />
            <Route path="/master/create" element={<Create />}/>
            <Route path="/master/alter" element={<Alter />}/>
            <Route path="/master/financial-years" element={<FinancialYears />}/>
            <Route path="/master/coa" element={<COA />}/>

            <Route path="/master/create/ledger" element={<LedgerCreate />}/>
            <Route path="/master/alter/ledger" element={<LedgerAlter />}/>
            <Route path="/master/coa/ledger" element={<LedgerCOA />}/>

            <Route path="/master/create/currency" element={<CurrencyCreate />} />
            <Route path="/master/alter/currency" element={<CurrencyAlter />} />
            <Route path="/master/coa/currency" element={<CurrencyCOA />} />

            <Route path="/master/create/voucher-type" element={<VoucherTypeCreate />} />
            <Route path="/master/alter/voucher-type" element={<VoucherTypeAlter />} />
            <Route path="/master/coa/voucher-type" element={<VoucherTypeCOA />} />

            <Route path="/master/create/gst-registration" element={<GSTRegistrationCreate />} />
            <Route path="/master/alter/gst-registration" element={<GSTRegistrationAlter />} />
            <Route path="/master/coa/gst-registration" element={<GSTRegistrationCOA />} />

            <Route path="/master/create/gst-classification" element={<GSTClassificationCreate />} />
            <Route path="/master/alter/gst-classification" element={<GSTClassificationAlter />} />
            <Route path="/master/coa/gst-classification" element={<GSTClassificationCOA />} />
            <Route path="/master/statutory/gstr1" element={<GSTR1View />} />

            <Route path="/master/create/group" element={<GroupCreate />}/>
            <Route path="/master/alter/group" element={<GroupAlter />}/>
            <Route path="/master/alter/group/:id" element={<GroupAlterEdit />}/>
            <Route path="/master/coa/group" element={<GroupCOA />}/>

            <Route path="/master/create/unit" element={<UnitCreate />}/>
            <Route path="/master/create/stock-group" element={<StockGroupCreate />}/>
            <Route path="/master/create/stock-category" element={<StockCategoryCreate />}/>
            <Route path="/master/create/stock-item" element={<StockItemCreate />}/>
            <Route path="/master/create/godown" element={<GodownCreate />}/>
            <Route path="/master/alter/unit" element={<UnitAlter />}/>
            <Route path="/master/alter/stock-group" element={<StockGroupAlter/>}/>
            <Route path="/master/alter/stock-category" element={<StockCategoryAlter />}/>
            <Route path="/master/alter/stock-item" element={<StockItemAlter />}/>
            <Route path="/master/alter/godown" element={<GodownAlter />}/>

            <Route path="/transactions/vouchers" element={<Vouchers />}/>
            <Route path="/transactions/voucher-list" element={<VoucherList />}/>
            <Route path="/transactions/voucher/:id" element={<VoucherView />}/>
            <Route path="/transactions/daybook" element={<Daybook />}/>
            <Route path="/utilities/banking" element={<Banking/>} />
            <Route path="/data/:controller" element={<GenericDataView />} />

            <Route path="/master/coa/stock-group" element={<StockGroupCOA />} />
            <Route path="/master/coa/stock-category" element={<StockCategoryCOA />} />
            <Route path="/master/coa/godown" element={<GodownCOA />} />
            <Route path="/master/coa/unit" element={<UnitCOA />} />
            <Route path="/master/coa/employee-group" element={<EmployeeGroupCOA />} />
            <Route path="/master/coa/employee" element={<EmployeeCOA />} />
            <Route path="/master/coa/payroll-unit" element={<PayrollUnitCOA />} />
            <Route path="/master/coa/attendance-type" element={<AttendanceTypeCOA />} />
            <Route path="/master/coa/pay-head" element={<PayHeadCOA />} />
            <Route path="/master/coa/salary-structure" element={<SalaryStructureCOA />} />
            <Route path="/master/coa/employee-category" element={<EmployeeCategoryCOA />} />

            <Route path="/master/create/employee-group" element={<EmployeeGroupCreate />} />
            <Route path="/master/create/employee" element={<EmployeeCreate />} />
            <Route path="/master/create/payroll-unit" element={<PayrollUnitCreate />} />
            <Route path="/master/create/attendance-type" element={<AttendanceTypeCreate />} />
            <Route path="/master/create/pay-head" element={<PayHeadCreate />} />
            <Route path="/master/create/salary-structure" element={<SalaryStructureCreate />} />
            <Route path="/master/create/employee-category" element={<EmployeeCategoryCreate />} />

            <Route path="/master/alter/employee-group" element={<EmployeeGroupAlter />} />
            <Route path="/master/alter/employee" element={<EmployeeAlter />} />
            <Route path="/master/alter/payroll-unit" element={<PayrollUnitAlter />} />
            <Route path="/master/alter/attendance-type" element={<AttendanceTypeAlter />} />
            <Route path="/master/alter/pay-head" element={<PayHeadAlter />} />
            <Route path="/master/alter/salary-structure" element={<SalaryStructureAlter />} />
            <Route path="/master/alter/employee-category" element={<EmployeeCategoryAlter />} />
          </Route>
        </Routes>
      </StartupGuard>
    </CompanyProvider>
  </HashRouter>
)