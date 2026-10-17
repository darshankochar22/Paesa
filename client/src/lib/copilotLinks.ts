// Where a link in a Copilot answer should take the user. The system prompt asks for real
// routes, but answers written before that fix, or by a model that ignores it, still use the
// old shapes, which pointed at routes that do not exist (or, for ?id=, silently opened
// ledger 1). Anything that is not an in-app path resolves to null, so an answer can never
// navigate the Electron window away from the app.

export type CopilotLinkTarget = {
  to: string;
  state?: { item_id: number };
};

export function resolveCopilotLink(href?: string | null): CopilotLinkTarget | null {
  // "//host/..." is protocol-relative: external, not an app path.
  if (!href || !href.startsWith('/') || href.startsWith('//')) return null;

  const voucher = href.match(/^\/vouchers\/(\d+)$/);
  if (voucher) return { to: `/transactions/voucher/${voucher[1]}` };

  const ledger = href.match(/^\/reports\/accounts\/ledger\?id=(\d+)$/);
  if (ledger) return { to: `/reports/accounts/ledger?ledger_id=${ledger[1]}` };

  // The stock item report opens an item from router state, not from the URL.
  const item = href.match(/^\/stock\/(\d+)$/);
  if (item) return { to: '/reports/inventory/stock-item', state: { item_id: Number(item[1]) } };

  return { to: href };
}
