import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import './index.css';
import { CompanyProvider } from "./context/CompanyContext";
import StartupGuard from "./context/StartupGuard";
import Layout from "./Layout.tsx";
import App from './App.tsx';
import GenericDataView from './pages/GenericDataView.tsx';
import Company from "./pages/Company.tsx";
import Create from "./pages/master/Create.tsx";
import Alter from "./pages/master/Alter.tsx";
import FinancialYears from "./pages/master/FinancialYears.tsx";
import COA from "./pages/master/coa.tsx";
import LedgerCreate from "./pages/master/LedgerCreate.tsx";
import LedgerAlter from "./pages/master/LedgerAlter.tsx";
import LedgerCOA from "./pages/master/LedgerCOA.tsx";
import GroupCreate from "./pages/master/GroupCreate.tsx";
import GroupAlter from "./pages/master/GroupAlter.tsx";
import GroupAlterEdit from "./pages/master/GroupAlterEdit.tsx";
import GroupCOA from "./pages/master/GroupCOA.tsx";
import Vouchers from "./pages/transactions/Vouchers.tsx";
import Daybook from "./pages/transactions/Daybook.tsx";
import Banking from './pages/utilities/Banking';
import UnitCreate from "./pages/master/inventory/UnitCreate.tsx";
import StockGroupCreate from "./pages/master/inventory/StockGroupCreate.tsx";
import StockCategoryCreate from "./pages/master/inventory/StockCategoryCreate.tsx";
import StockItemCreate from "./pages/master/inventory/StockItemCreate.tsx";
import GodownCreate from "./pages/master/inventory/GodownCreate.tsx";

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

            {/* Ledger routes */}
            <Route path="/master/create/ledger" element={<LedgerCreate />}/>
            <Route path="/master/alter/ledger" element={<LedgerAlter />}/>
            <Route path="/master/coa/ledger" element={<LedgerCOA />}/>

            {/* Group routes */}
            <Route path="/master/create/group" element={<GroupCreate />}/>
            <Route path="/master/alter/group" element={<GroupAlter />}/>
            <Route path="/master/alter/group/:id" element={<GroupAlterEdit />}/>
            <Route path="/master/coa/group" element={<GroupCOA />}/>

            {/* Inventory Create */}
            <Route path="/master/create/unit" element={<UnitCreate />}/>
            <Route path="/master/create/stock-group" element={<StockGroupCreate />}/>
            <Route path="/master/create/stock-category" element={<StockCategoryCreate />}/>
            <Route path="/master/create/stock-item" element={<StockItemCreate />}/>
            <Route path="/master/create/godown" element={<GodownCreate />}/>

            <Route path="/transactions/vouchers" element={<Vouchers />}/>
            <Route path="/transactions/daybook" element={<Daybook />}/>
            <Route path="/utilities/banking" element={<Banking/>} />
            <Route path="/data/:controller" element={<GenericDataView />} />
          </Route>
        </Routes>
      </StartupGuard>
    </CompanyProvider>
  </HashRouter>
)