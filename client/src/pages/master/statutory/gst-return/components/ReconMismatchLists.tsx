import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/shadcn/table';
import { cn } from '@/lib/utils';

// Per-invoice detail behind the Unreconciled count: value mismatches (in both books
// and portal but amounts differ) and one-sided documents (portal-only = vendor filed
// but not entered in books). Fed by the recon service's `mismatches` + `portal_only`.

export interface MismatchRow {
  gstin: string;
  invoice_no: string;
  book_taxable?: number;
  book_tax?: number;
  book_invoice?: number;
  portal_taxable?: number;
  portal_tax?: number;
  portal_invoice?: number;
}

export interface PortalOnlyRow {
  gstin: string;
  invoice_no: string;
  taxable?: number;
  tax?: number;
}

const NUM = 'px-2 py-0.5 text-right text-xs tabular-nums';
const HEAD =
  'h-auto px-2 py-1 text-right align-bottom font-bold text-black text-xs whitespace-nowrap';

function fmt(n?: number) {
  return n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

export default function ReconMismatchLists({
  mismatches = [],
  portalOnly = [],
}: {
  mismatches?: MismatchRow[];
  portalOnly?: PortalOnlyRow[];
}) {
  if (!mismatches.length && !portalOnly.length) return null;

  return (
    <div className="w-full flex flex-col font-sans text-xs pt-4">
      {mismatches.length > 0 && (
        <div className="mb-4">
          <div className="px-2 pt-2 pb-0.5 font-bold text-black underline">
            Value Mismatches (Books vs Portal) — {mismatches.length}
          </div>
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black w-40">
                  Supplier GSTIN
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black w-28">
                  Invoice No
                </TableHead>
                <TableHead className={cn(HEAD, 'w-28')}>Book Taxable</TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>Book Tax</TableHead>
                <TableHead className={cn(HEAD, 'w-28')}>Portal Taxable</TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>Portal Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mismatches.map((r, i) => (
                <TableRow key={i} className="border-0 hover:bg-[#e6f2ff]">
                  <TableCell className="px-2 py-0.5">{r.gstin || '—'}</TableCell>
                  <TableCell className="px-2 py-0.5">{r.invoice_no || '—'}</TableCell>
                  <TableCell className={NUM}>{fmt(r.book_taxable)}</TableCell>
                  <TableCell className={NUM}>{fmt(r.book_tax)}</TableCell>
                  <TableCell className={NUM}>{fmt(r.portal_taxable)}</TableCell>
                  <TableCell className={NUM}>{fmt(r.portal_tax)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {portalOnly.length > 0 && (
        <div className="mb-4">
          <div className="px-2 pt-2 pb-0.5 font-bold text-black underline">
            Filed by Vendor, Not in Books — {portalOnly.length}
          </div>
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black w-40">
                  Supplier GSTIN
                </TableHead>
                <TableHead className="h-auto px-2 py-1 align-bottom font-bold text-black w-28">
                  Invoice No
                </TableHead>
                <TableHead className={cn(HEAD, 'w-28')}>Taxable</TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portalOnly.map((r, i) => (
                <TableRow key={i} className="border-0 hover:bg-[#e6f2ff]">
                  <TableCell className="px-2 py-0.5">{r.gstin || '—'}</TableCell>
                  <TableCell className="px-2 py-0.5">{r.invoice_no || '—'}</TableCell>
                  <TableCell className={NUM}>{fmt(r.taxable)}</TableCell>
                  <TableCell className={NUM}>{fmt(r.tax)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
