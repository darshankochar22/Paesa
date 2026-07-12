import { useCallback } from 'react';
import type { VoucherRecordType } from '@/types/entities/Voucher';

/**
 * TallyPrime voucher quick actions that need data access — Alt+X cancel,
 * Ctrl+R / Alt+R narration retrieval, and Page Up / Page Down prev/next saved
 * voucher. Kept out of Vouchers.tsx so the entry screen only wires the keys.
 *
 * These reuse the existing voucher IPC (getByType / getByLedger / cancel); there
 * is no dedicated prev/next-by-id endpoint, so ordering is done client-side by
 * (date, voucher_id).
 */
export interface VoucherQuickActionParams {
  companyId?: number;
  fyId?: number;
  voucherType: string;
  editVoucherId: number | null;
  partyLedgerId?: number;
  setNarration: (v: string) => void;
  resetForm: () => void;
  navigate: (path: string) => void;
}

// Chronological order: older first. voucher_id breaks ties within a date.
function byDateAsc(a: VoucherRecordType, b: VoucherRecordType): number {
  const d = (a.date ?? '').localeCompare(b.date ?? '');
  if (d !== 0) return d;
  return (a.voucher_id ?? 0) - (b.voucher_id ?? 0);
}

export function useVoucherQuickActions({
  companyId,
  fyId,
  voucherType,
  editVoucherId,
  partyLedgerId,
  setNarration,
  resetForm,
  navigate,
}: VoucherQuickActionParams) {
  // Most recent voucher's narration from a candidate list, skipping the one
  // being edited and blank narrations. Shared by Ctrl+R and Alt+R.
  const applyLatestNarration = useCallback(
    (vouchers: VoucherRecordType[]) => {
      const latest = [...vouchers]
        .sort(byDateAsc)
        .reverse()
        .find((v) => v.voucher_id !== editVoucherId && v.narration && v.narration.trim());
      if (latest?.narration) setNarration(latest.narration);
    },
    [editVoucherId, setNarration],
  );

  // Ctrl+R — copy narration from the previous voucher of the SAME TYPE.
  const copyNarrationSameType = useCallback(async () => {
    if (!companyId || !fyId) return;
    const res = await window.api.voucher.getByType(companyId, fyId, voucherType);
    if (res.success && res.vouchers) applyLatestNarration(res.vouchers);
  }, [companyId, fyId, voucherType, applyLatestNarration]);

  // Alt+R — retrieve narration from the previous voucher for the SAME PARTY.
  const retrieveNarrationSameParty = useCallback(async () => {
    if (!companyId || !fyId || !partyLedgerId) return;
    const res = await window.api.voucher.getByLedger(companyId, fyId, partyLedgerId);
    if (res.success && res.vouchers) applyLatestNarration(res.vouchers);
  }, [companyId, fyId, partyLedgerId, applyLatestNarration]);

  // Page Up (dir -1 = previous/older) / Page Down (dir +1 = next/newer) — open
  // the neighbouring saved voucher of the same type in edit mode.
  const openAdjacentVoucher = useCallback(
    async (dir: 1 | -1) => {
      if (!companyId || !fyId) return;
      const res = await window.api.voucher.getByType(companyId, fyId, voucherType);
      if (!res.success || !res.vouchers?.length) return;
      const sorted = [...res.vouchers].sort(byDateAsc);

      if (editVoucherId == null) {
        // New voucher: Page Up opens the latest saved one; Page Down does nothing.
        if (dir === -1) {
          const last = sorted[sorted.length - 1];
          if (last?.voucher_id) navigate(`/transactions/voucher/${last.voucher_id}/edit`);
        }
        return;
      }
      const idx = sorted.findIndex((v) => v.voucher_id === editVoucherId);
      if (idx === -1) return;
      const target = sorted[idx + dir];
      if (target?.voucher_id) navigate(`/transactions/voucher/${target.voucher_id}/edit`);
    },
    [companyId, fyId, voucherType, editVoucherId, navigate],
  );

  // Alt+X — cancel the saved voucher (marks it cancelled). On a new, unsaved
  // voucher there is nothing to cancel, so clear the form instead. The Yes/No
  // confirmation is handled by the caller's TallyConfirm dialog.
  const cancelVoucher = useCallback(async () => {
    if (editVoucherId == null) {
      resetForm();
      return;
    }
    const res = await window.api.voucher.cancel(editVoucherId);
    if (res.success) navigate('/transactions/voucher-list');
    else window.alert(res.error || 'Failed to cancel voucher.');
  }, [editVoucherId, resetForm, navigate]);

  return {
    copyNarrationSameType,
    retrieveNarrationSameParty,
    openAdjacentVoucher,
    cancelVoucher,
  };
}
