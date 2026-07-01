// hooks/useVoucherLedgers.ts
// ─── Master data fetching + ledger/cash/bank classification helpers ───────────

import { useState, useCallback } from "react";
import type { LedgerType, GroupType, StockItemType, GodownType, UnitType } from "../../../types/api";

interface UseVoucherLedgersOptions {
  companyId: number | undefined;
  fyId: number | undefined;
}

export function useVoucherLedgers({ companyId, fyId }: UseVoucherLedgersOptions) {
  const [allLedgers, setAllLedgers] = useState<LedgerType[]>([]);
  const [allGroups, setAllGroups] = useState<GroupType[]>([]);
  const [allStockItems, setAllStockItems] = useState<StockItemType[]>([]);
  const [stockBalances, setStockBalances] = useState<Record<number, number>>({});
  const [allGodowns, setAllGodowns] = useState<GodownType[]>([]);
  const [allUnits, setAllUnits] = useState<UnitType[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allAttendanceTypes, setAllAttendanceTypes] = useState<any[]>([]);
  const [allPayHeads, setAllPayHeads] = useState<any[]>([]);
  const [allCostCategories, setAllCostCategories] = useState<any[]>([]);
  const [allEmployeeCategories, setAllEmployeeCategories] = useState<any[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);

  // ─── Data fetching ────────────────────────────────────────────────────────────

  const fetchContextData = useCallback(async () => {
    if (!companyId) return;
    setLedgersLoading(true);
    try {
      const [ledRes, grpRes, itemRes, godRes, unitRes, empRes, attRes, phRes, catRes, empCatRes] = await Promise.all([
        window.api.ledger.getAll(companyId),
        window.api.group.getAll(companyId),
        window.api.stockItem.getAll(companyId),
        window.api.godown.getAll(companyId),
        window.api.unit.getAll(companyId),
        window.api.employee.getAll(companyId),
        window.api.attendanceType.getAll(companyId),
        window.api.payHead.getAll(companyId),
        window.api.costCategory.getAll(companyId),
        window.api.employeeCategory.getAll(companyId),
      ]);
      if (ledRes.success) setAllLedgers((ledRes as any).ledgers ?? []);
      if (grpRes.success) setAllGroups((grpRes as any).groups ?? []);
      if (itemRes.success) setAllStockItems((itemRes as any).stockItems ?? []);
      if (godRes.success) setAllGodowns((godRes as any).godowns ?? []);
      if (unitRes.success) setAllUnits((unitRes as any).units ?? []);
      if (empRes.success) setAllEmployees((empRes as any).employees ?? []);
      if (attRes.success) setAllAttendanceTypes((attRes as any).attendanceTypes ?? []);
      if (phRes.success) setAllPayHeads((phRes as any).payHeads ?? []);
      if (catRes.success) setAllCostCategories((catRes as any).categories ?? (catRes as any).costCategories ?? []);
      if (empCatRes.success) setAllEmployeeCategories((empCatRes as any).employeeCategories ?? []);

      // Fetch stock balances
      try {
        const balRes = await window.api.stockItem.getStockBalances(companyId);
        if (balRes.success && balRes.balances) setStockBalances(balRes.balances);
      } catch { /* ignore */ }
    } catch {
      // silently ignore — user can retry
    } finally {
      setLedgersLoading(false);
    }
  }, [companyId]);

  const fetchNextVoucherNumber = useCallback(
    async (voucherType: string, setVoucherNumber: (n: string) => void, setLoading: (l: boolean) => void) => {
      if (!companyId || !fyId) return;
      setLoading(true);
      try {
        let res: any;
        if (voucherType === "Physical Stock") {
          res = await window.api.physicalStock.getNextNumber(companyId);
        } else if (voucherType === "Attendance") {
          res = await window.api.attendance.getNextNumber(companyId);
        } else {
          res = await window.api.voucher.getNextNumber(companyId, fyId, voucherType);
        }
        if (res.success && res.voucher_number) {
          setVoucherNumber(String(res.voucher_number));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [companyId, fyId]
  );

  const fetchLedgerBalance = useCallback(
    async (ledgerId: number): Promise<string> => {
      if (!companyId || !fyId) return "";
      try {
        const res = await window.api.voucher.getLedgerBalance(ledgerId, companyId, fyId);
        if (res.success && res.rawBalance != null) return String(res.rawBalance);
      } catch {
        // ignore
      }
      return "";
    },
    [companyId, fyId]
  );

  // ─── Group / ledger classification helpers ────────────────────────────────────

  /** Walk the group hierarchy to check if a ledger belongs to any of the named groups. */
  const checkLedgerGroup = useCallback(
    (ledger: LedgerType | null, targetGroupNames: string[]): boolean => {
      if (!ledger) return false;
      const ledgerGroupId = ledger.group_id;
      if (!ledgerGroupId) return false;
      if (allGroups.length === 0) return false;

      const targets = targetGroupNames.map((n) => n.toLowerCase().trim());

      const findGroup = (id: number | null | undefined): GroupType | undefined => {
        if (!id) return undefined;
        return allGroups.find((g) => Number(g.group_id) === Number(id));
      };

      const check = (grp: GroupType): boolean => {
        if (!grp.name) return false;
        if (targets.includes(grp.name.toLowerCase().trim())) return true;
        if (grp.parent_group_id) {
          const parent = findGroup(grp.parent_group_id);
          if (parent) return check(parent);
        }
        return false;
      };

      const group = findGroup(ledgerGroupId);
      return group ? check(group) : false;
    },
    [allGroups]
  );

  const checkIsCashOrBank = useCallback(
    (ledger: LedgerType | null): boolean =>
      checkLedgerGroup(ledger, [
        "bank accounts",
        "bank od accounts",
        "bank od a/c",
        "bank od account",
        "bank occ a/c",
        "cash-in-hand",
      ]),
    [checkLedgerGroup]
  );

  const checkIsCash = useCallback(
    (ledger: LedgerType | null): boolean =>
      checkLedgerGroup(ledger, ["cash-in-hand"]),
    [checkLedgerGroup]
  );

  const checkIsBank = useCallback(
    (ledger: LedgerType | null): boolean =>
      checkLedgerGroup(ledger, [
        "bank accounts",
        "bank od accounts",
        "bank od a/c",
        "bank od account",
        "bank occ a/c",
      ]),
    [checkLedgerGroup]
  );

  /** Party ledger — Sundry Debtors / Sundry Creditors. Drives bill-wise allocation. */
  const checkIsParty = useCallback(
    (ledger: LedgerType | null): boolean =>
      checkLedgerGroup(ledger, ["sundry debtors", "sundry creditors"]),
    [checkLedgerGroup]
  );

  return {
    allLedgers,
    allGroups,
    allStockItems,
    stockBalances,
    allGodowns,
    allUnits,
    allEmployees,
    allAttendanceTypes,
    allPayHeads,
    allCostCategories,
    allEmployeeCategories,
    ledgersLoading,
    fetchContextData,
    fetchNextVoucherNumber,
    fetchLedgerBalance,
    checkLedgerGroup,
    checkIsCashOrBank,
    checkIsCash,
    checkIsBank,
    checkIsParty,
  };
}
