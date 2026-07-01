// Shared party filter for Statement of Accounts → Outstandings pickers.
//
// In TallyPrime the "List of Ledgers" / "List of Groups" shown when opening a
// Ledger / Group Outstandings report only contains bill-wise parties, i.e.
// ledgers created under Sundry Debtors / Sundry Creditors (and any sub-groups
// created under them). These two groups are predefined for every company with
// exactly these names (see server/group/groupService.js seed).
//
// Both standalone pickers (OutstandingsLedger / OutstandingsGroupSelect) and the
// embedded pickers inside the Outstandings layouts reuse this, so the filter
// lives in one place.

export const PARTY_GROUP_NAMES = ["Sundry Debtors", "Sundry Creditors"] as const;

export interface GroupLike {
  group_id: number;
  name: string;
  parent_group_id?: number | null;
}

export interface LedgerLike {
  group_id?: number | null;
}

// group_ids of the two party groups plus every descendant sub-group, resolved by
// walking the parent_group_id chain of every group up to a party-named ancestor.
export function partyGroupIds(groups: GroupLike[]): Set<number> {
  const byId = new Map<number, GroupLike>();
  groups.forEach((g) => byId.set(g.group_id, g));

  const isParty = (g: GroupLike | undefined, seen: Set<number>): boolean => {
    if (!g || seen.has(g.group_id)) return false;
    if ((PARTY_GROUP_NAMES as readonly string[]).includes(g.name)) return true;
    seen.add(g.group_id);
    return g.parent_group_id != null ? isParty(byId.get(g.parent_group_id), seen) : false;
  };

  const ids = new Set<number>();
  groups.forEach((g) => {
    if (isParty(g, new Set())) ids.add(g.group_id);
  });
  return ids;
}

// Keep only the groups that are Sundry Debtors / Sundry Creditors or a sub-group under them.
export function filterPartyGroups<T extends GroupLike>(groups: T[]): T[] {
  const ids = partyGroupIds(groups);
  return groups.filter((g) => ids.has(g.group_id));
}

// Keep only the ledgers whose group is within the party subtree derived from `groups`.
export function filterPartyLedgers<T extends LedgerLike>(ledgers: T[], groups: GroupLike[]): T[] {
  const ids = partyGroupIds(groups);
  return ledgers.filter((l) => l.group_id != null && ids.has(l.group_id));
}
