import type { Op } from './OpsPanel';

// e-Invoice utility operations (WhiteBooks-only). Reconciliation + B2C dynamic-QR helpers that
// sit alongside the IRN register. Shared with OpsPanel — no per-op JSX.
const einv = () => window.api.eInvoice as typeof window.api.eInvoice & Record<string, any>;

export const EINVOICE_OPS: Op[] = [
  {
    value: 'syncGSTINFromCP',
    label: 'Sync GSTIN from Common Portal',
    submitLabel: 'Sync',
    fields: [{ key: 'gstin', label: 'GSTIN', width: 'w-52' }],
    run: (v) => einv().syncGSTINFromCP(v.gstin.trim()),
    note: 'Pulls the latest party GSTIN details from the GST Common Portal (bypasses the IRP cache).',
  },
  {
    value: 'getRejectedIRNs',
    label: 'Rejected IRNs by date',
    submitLabel: 'Fetch',
    fields: [{ key: 'date', label: 'Date (dd/mm/yyyy)' }],
    run: (v) => einv().getRejectedIRNs(v.date.trim()),
    note: 'Lists invoices the IRP rejected on the given date — for reconciling failed pushes.',
  },
  {
    value: 'getB2CQRCode',
    label: 'B2C dynamic QR code',
    submitLabel: 'Generate QR',
    fields: [
      { key: 'sgstin', label: 'Supplier GSTIN', width: 'w-52' },
      { key: 'docno', label: 'Document no.' },
      { key: 'docdate', label: 'Doc date (dd/mm/yyyy)' },
      { key: 'totinvval', label: 'Total invoice value', type: 'number' },
      { key: 'bankaccno', label: 'Bank a/c no.', optional: true },
      { key: 'bankifsccode', label: 'Bank IFSC', optional: true },
      { key: 'accountholdername', label: 'A/c holder name', optional: true, width: 'w-52' },
      { key: 'igstamount', label: 'IGST amount', type: 'number', optional: true },
      { key: 'cgstamount', label: 'CGST amount', type: 'number', optional: true },
      { key: 'sgstamount', label: 'SGST amount', type: 'number', optional: true },
      { key: 'cessamount', label: 'Cess amount', type: 'number', optional: true },
    ],
    run: (v) =>
      einv().getB2CQRCode({
        sgstin: v.sgstin.trim(),
        docno: v.docno.trim(),
        docdate: v.docdate.trim(),
        totinvval: v.totinvval,
        bankaccno: v.bankaccno || '',
        bankifsccode: v.bankifsccode || '',
        accountholdername: v.accountholdername || '',
        igstamount: v.igstamount || '',
        cgstamount: v.cgstamount || '',
        sgstamount: v.sgstamount || '',
        cessamount: v.cessamount || '',
      }),
    note: 'Generates the dynamic-QR payload for a B2C invoice (turnover ≥ ₹500 Cr).',
  },
];
