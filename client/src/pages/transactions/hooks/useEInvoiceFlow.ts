import { useCallback, useState } from 'react';

export interface PendingEInvoiceGen {
  voucherId: number;
  savedNumber: string;
}

// Owns the post-save half of the Tally e-Invoice flow (the field itself lives in
// the Sales/Credit Note/Debit Note bodies as EInvoiceRow, stored on the form):
//   1. the "Do you want to generate e-Invoice?" prompt, and
//   2. the "e-Invoice generated successfully" Information popup.
// Kept out of useVoucherForm so the core save path is untouched — the save flow
// only hands a freshly-created voucher to `requestGenerate`.
export function useEInvoiceFlow() {
  const [pendingGen, setPendingGen] = useState<PendingEInvoiceGen | null>(null);
  const [generating, setGenerating] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Queue the "Generate e-Invoice?" prompt (rendered by Vouchers.tsx).
  const requestGenerate = useCallback((info: PendingEInvoiceGen) => setPendingGen(info), []);

  return {
    pendingGen,
    setPendingGen,
    requestGenerate,
    generating,
    setGenerating,
    successInfo,
    setSuccessInfo,
  };
}
