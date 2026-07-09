import VoucherView from '../pages/transactions/VoucherView.tsx';
import InvoicePrintView from '../pages/transactions/InvoicePrintView.tsx';
import EWayBillPrintView from '../pages/transactions/EWayBillPrintView.tsx';
import Daybook from '../pages/transactions/Daybook.tsx';
import Vouchers from '../pages/transactions/Vouchers.tsx';
import VoucherList from '../pages/transactions/VoucherList.tsx';
import Banking from '../pages/utilities/Banking';
import Copilot from '../pages/utilities/Copilot';
import GenericDataView from '../pages/GenericDataView.tsx';
import type { RouteConfig } from './types';

export const transactionRoutes: RouteConfig[] = [
  { path: '/transactions/vouchers', element: <Vouchers /> },
  { path: '/transactions/voucher-list', element: <VoucherList /> },
  { path: '/transactions/voucher/:id', element: <VoucherView /> },
  { path: '/transactions/voucher/:id/invoice', element: <InvoicePrintView /> },
  { path: '/transactions/voucher/:id/ewaybill', element: <EWayBillPrintView /> },
  { path: '/transactions/voucher/:id/edit', element: <Vouchers /> },
  { path: '/transactions/daybook', element: <Daybook /> },
  { path: '/utilities/banking', element: <Banking /> },
  { path: '/utilities/copilot', element: <Copilot /> },
  { path: '/data/:controller', element: <GenericDataView /> },
];
