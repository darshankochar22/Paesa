import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './index.css';
import App from './App.tsx';
import Company from "./pages/Company.tsx";
import Create from "./pages/master/Create.tsx";
import Alter from "./pages/master/Alter.tsx";
import COA from "./pages/master/coa.tsx";
import Vouchers from "./pages/transactions/Vouchers.tsx";
import Daybook from "./pages/transactions/Daybook.tsx";
import Banking from './pages/utilities/Banking';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/company" element={<Company />} />
      <Route path="/master/create" element={<Create />}/>
      <Route path="/master/alter" element={<Alter />}/>
      <Route path="/master/coa" element={<COA />}/> 
      <Route path="/transactions/vouchers" element={<Vouchers />}/>
      <Route path="/transactions/daybook" element={<Daybook />}/>
      <Route path="/utilities/banking" element={<Banking/>} />
    </Routes>
  </BrowserRouter>
)
