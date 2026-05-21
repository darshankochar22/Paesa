import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import './index.css';
import { CompanyProvider } from "./context/CompanyContext";
import StartupGuard from "./context/StartupGuard";
import Layout from "./Layout.tsx";
import App from './App.tsx';
import GenericDataView from './pages/GenericDataView.tsx';
import Company from "./pages/company/Company.tsx";
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <CompanyProvider>
      <StartupGuard>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<App />} />
            <Route path="/company" element={<Company />} />
            <Route path="/master/create" element={<Create />}/>
            <Route path="/master/alter" element={<Alter />}/>
            <Route path="/master/financial-years" element={<FinancialYears />}/>
            <Route path="/master/coa" element={<COA />}/>

            <Route path="/master/create/ledger" element={<LedgerCreate />}/>
            <Route path="/master/alter/ledger" element={<LedgerAlter />}/>
            <Route path="/master/coa/ledger" element={<LedgerCOA />}/>

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
            <Route path="/transactions/daybook" element={<Daybook />}/>
            <Route path="/utilities/banking" element={<Banking/>} />
            <Route path="/data/:controller" element={<GenericDataView />} />

            <Route path="/master/coa/stock-group" element={<StockGroupCOA />} />
            <Route path="/master/coa/stock-category" element={<StockCategoryCOA />} />
            <Route path="/master/coa/godown" element={<GodownCOA />} />
            <Route path="/master/coa/unit" element={<UnitCOA />} />
          </Route>
        </Routes>
      </StartupGuard>
    </CompanyProvider>
  </HashRouter>
)