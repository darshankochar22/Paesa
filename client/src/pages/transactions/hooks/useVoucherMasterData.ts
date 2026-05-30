import { useState, useCallback } from "react";
import type { LedgerType, GroupType, StockItemType, GodownType, UnitType } from "../../../types/api";

export function useVoucherMasterData(
  companyId: number | null,
  fyId: number | null,
) {
  const [allLedgers, setAllLedgers] = useState<LedgerType[]>([]);
  const [allGroups, setAllGroups] = useState<GroupType[]>([]);
  const [allStockItems, setAllStockItems] = useState<StockItemType[]>([]);
  const [allGodowns, setAllGodowns] = useState<GodownType[]>([]);
  const [allUnits, setAllUnits] = useState<UnitType[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);

  const fetchContextData = useCallback(async () => {
    if (!companyId) return;
    setLedgersLoading(true);
    try {
      const [ledRes, grpRes, itemRes, godRes, unitRes] = await Promise.all([
        window.api.ledger.getAll(companyId),
        window.api.group.getAll(companyId),
        window.api.stockItem.getAll(companyId),
        window.api.godown.getAll(companyId),
        window.api.unit.getAll(companyId),
      ]);
      if (ledRes.success)  setAllLedgers((ledRes as any).ledgers ?? []);
      if (grpRes.success)  setAllGroups((grpRes as any).groups ?? []);
      if (itemRes.success) setAllStockItems((itemRes as any).stockItems ?? []);
      if (godRes.success)  setAllGodowns((godRes as any).godowns ?? []);
      if (unitRes.success) setAllUnits((unitRes as any).units ?? []);
    } catch {
      // silently ignore
    } finally {
      setLedgersLoading(false);
    }
  }, [companyId]);

  const fetchLedgerBalance = useCallback(
    async (ledgerId: number): Promise<string> => {
      if (!companyId || !fyId) return "";
      try {
        const res = await window.api.voucher.getLedgerBalance(ledgerId, companyId, fyId);
        if (res.success && res.balance != null) return String(res.balance);
      } catch {
        // ignore
      }
      return "";
    },
    [companyId, fyId]
  );

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
      ]),
    [checkLedgerGroup]
  );

  return {
    allLedgers,
    allGroups,
    allStockItems,
    allGodowns,
    allUnits,
    ledgersLoading,
    fetchContextData,
    fetchLedgerBalance,
    checkLedgerGroup,
    checkIsCashOrBank,
    checkIsCash,
    checkIsBank,
  };
}
