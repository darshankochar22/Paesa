import { useState, useEffect, useRef } from 'react';
import { NotificationBanner } from '@/components/ui';
import type { GroupType } from '@/types/api';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';

interface Props {
  companyId: number;
  initialType?: 'ledger' | 'stockItem' | 'godown';
  onClose: () => void;
  onSuccess: (type: 'ledger' | 'stockItem' | 'godown', created: any) => void;
}

export default function InlineMasterPopup({
  companyId,
  initialType = 'ledger',
  onClose,
  onSuccess,
}: Props) {
  const [type, setType] = useState<'ledger' | 'stockItem' | 'godown'>(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Master data for dropdowns
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [stockGroups, setStockGroups] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const nameInputRef = useRef<HTMLInputElement>(null);
  // Re-entry guard: Alt+A / double-Enter can fire handleSubmit twice before the
  // `loading` state re-renders — a ref blocks the second call synchronously.
  const inFlightRef = useRef(false);

  // ── Form states ────────────────────────────────────────────────────────────

  const [ledgerForm, setLedgerForm] = useState({
    name: '',
    alias: '',
    group_id: '',
    opening_balance: 0,
    is_bill_wise: 0,
    allow_cost_centres: 0,
  });

  const [stockItemForm, setStockItemForm] = useState({
    name: '',
    alias: '',
    // FIX — use sg_id (not group_id) for stock groups
    sg_id: '',
    unit_id: '',
    opening_qty: 0,
    opening_rate: 0,
    opening_value: 0,
    hsn_code: '',
    gst_rate: 0,
  });

  const [godownForm, setGodownForm] = useState({
    name: '',
    alias: '',
    address: '',
  });

  // ── Load dropdown data ─────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [gRes, sgRes, uRes] = await Promise.all([
          window.api.group.getAll(companyId),
          window.api.stockGroup.getAll(companyId),
          window.api.unit.getAll(companyId),
        ]);
        if (!active) return;

        if (gRes.success) {
          // Sundry Debtors / Sundry Creditors first — inline ledger creation from
          // a voucher is almost always a party ledger. Stable sort keeps the rest
          // in the server's order.
          const priority = (g: GroupType) => {
            const n = (g.name || '').toLowerCase().trim();
            return n === 'sundry debtors' ? 0 : n === 'sundry creditors' ? 1 : 2;
          };
          const grps: GroupType[] = [...(gRes.groups ?? [])].sort(
            (a, b) => priority(a) - priority(b),
          );
          setGroups(grps);
          if (grps[0]) {
            setLedgerForm((prev) => ({
              ...prev,
              group_id: String(grps[0].group_id),
            }));
          }
        }

        if (sgRes.success) {
          const sgs: any[] = sgRes.stockGroups ?? [];
          setStockGroups(sgs);
          // FIX — set sg_id, not group_id
          if (sgs[0]) {
            setStockItemForm((prev) => ({ ...prev, sg_id: String(sgs[0].sg_id) }));
          }
        }

        if (uRes.success) {
          const us: any[] = uRes.units ?? [];
          setUnits(us);
          if (us[0]) {
            setStockItemForm((prev) => ({
              ...prev,
              unit_id: String(us[0].unit_id),
            }));
          }
        }
      } catch (err) {
        console.error('InlineMasterPopup: failed to load options', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  // Autofocus name input whenever type changes
  useEffect(() => {
    nameInputRef.current?.focus();
  }, [type]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  // Same group-lineage rules as the full Ledger create screen (useLedgerForm's
  // groupLineage): walk the parent chain and classify by the primary-ish group
  // names the reports actually consume (Bank Book: 'Bank'; exception registers:
  // 'Cash' / 'Bank' / 'Bank OD'). Everything else stays 'General'.
  const deriveLedgerType = (groupId: string): string => {
    const byId = new Map(groups.map((g) => [g.group_id, g]));
    let cur = groupId ? byId.get(Number(groupId)) : undefined;
    let hops = 0;
    while (cur && hops < 25) {
      const name = (cur.name || '').toLowerCase().trim();
      if (
        name === 'bank od a/c' ||
        name === 'bank od accounts' ||
        name === 'bank od account' ||
        name === 'bank occ a/c'
      )
        return 'Bank OD';
      if (name === 'bank accounts') return 'Bank';
      if (name === 'cash-in-hand' || name === 'cash in hand') return 'Cash';
      if (!cur.parent_group_id) break;
      cur = byId.get(cur.parent_group_id);
      hops++;
    }
    return 'General';
  };

  const handleSubmit = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setError(null);
    setLoading(true);
    try {
      if (type === 'ledger') {
        if (!ledgerForm.name.trim()) {
          setError('Name is required.');
          setLoading(false);
          return;
        }
        const res = await window.api.ledger.create({
          company_id: companyId,
          name: ledgerForm.name.trim(),
          alias: ledgerForm.alias.trim() || undefined,
          group_id: ledgerForm.group_id ? Number(ledgerForm.group_id) : undefined,
          opening_balance: Number(ledgerForm.opening_balance) || 0,
          is_bill_wise: ledgerForm.is_bill_wise,
          allow_cost_centres: ledgerForm.allow_cost_centres,
          ledger_type: deriveLedgerType(ledgerForm.group_id),
          registration_type: 'Unregistered',
        });
        if (res.success && res.ledger) onSuccess('ledger', res.ledger);
        else setError(res.error || 'Failed to create ledger.');
      } else if (type === 'stockItem') {
        if (!stockItemForm.name.trim()) {
          setError('Name is required.');
          setLoading(false);
          return;
        }
        // HSN / GST — mirror the full StockItem create screen's "Specified Here"
        // payload (calculateGstDetails in pages/master/inventory/stock-item/utils.ts):
        // hsn_sac + legacy hsn_code, gst_rate with the CGST/SGST split.
        const hsn = stockItemForm.hsn_code.trim();
        const gstRate = Number(stockItemForm.gst_rate) || 0;
        const res = await window.api.stockItem.create({
          company_id: companyId,
          name: stockItemForm.name.trim(),
          alias: stockItemForm.alias.trim() || undefined,
          // FIX — pass sg_id as group_id (API field name) using the corrected state key
          group_id: stockItemForm.sg_id ? Number(stockItemForm.sg_id) : undefined,
          unit_id: stockItemForm.unit_id ? Number(stockItemForm.unit_id) : undefined,
          opening_quantity: Number(stockItemForm.opening_qty) || 0,
          opening_rate: Number(stockItemForm.opening_rate) || 0,
          opening_value: Number(stockItemForm.opening_value) || 0,
          ...(hsn || gstRate > 0 ? { gst_applicable: 'Applicable' } : {}),
          ...(hsn ? { hsn_sac: hsn, hsn_code: hsn, source_of_details: 'Specified Here' } : {}),
          ...(gstRate > 0
            ? {
                gst_rate_details: 'specify_here',
                source_of_gst_rate: 'Specified Here',
                taxability_type: 'Taxable',
                gst_rate: gstRate,
                igst_rate: gstRate,
                cgst_rate: gstRate / 2,
                sgst_rate: gstRate / 2,
              }
            : {}),
        });
        if (res.success && res.item) onSuccess('stockItem', res.item);
        else setError(res.error || 'Failed to create stock item.');
      } else if (type === 'godown') {
        if (!godownForm.name.trim()) {
          setError('Name is required.');
          setLoading(false);
          return;
        }
        const res = await window.api.godown.create({
          company_id: companyId,
          name: godownForm.name.trim(),
          alias: godownForm.alias.trim() || undefined,
          address: godownForm.address.trim() || undefined,
        });
        if (res.success && res.godown) onSuccess('godown', res.godown);
        else setError(res.error || 'Failed to create godown.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <VoucherPopupShell
      size="compact"
      title="Inline Master Creation"
      onClose={onClose}
      onAccept={() => {
        if (!loading) handleSubmit();
      }}
      acceptLabel={loading ? 'Creating…' : 'Accept'}
    >
      <div className="w-[440px] space-y-3">
        {/* Type selector */}
        <div className="flex gap-4 border-b border-gray-300 pb-2 select-none">
          {(['ledger', 'stockItem', 'godown'] as const).map((t) => (
            <label
              key={t}
              className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-gray-700"
            >
              <input
                type="radio"
                checked={type === t}
                onChange={() => {
                  setType(t);
                  setError(null);
                }}
                className="accent-black"
              />
              {t === 'ledger' ? 'Ledger' : t === 'stockItem' ? 'Stock Item' : 'Godown'}
            </label>
          ))}
        </div>

        {error && (
          <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
        )}

        {/* ── LEDGER ── */}
        {type === 'ledger' && (
          <div className="space-y-3">
            <Field label="Name">
              <input
                ref={nameInputRef}
                type="text"
                value={ledgerForm.name}
                onChange={(e) => setLedgerForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sales Account"
                className={inputCls}
              />
            </Field>
            <Field label="Alias">
              <input
                type="text"
                value={ledgerForm.alias}
                onChange={(e) => setLedgerForm((p) => ({ ...p, alias: e.target.value }))}
                placeholder="Optional alias"
                className={inputCls}
              />
            </Field>
            <Field label="Under Group">
              <select
                value={ledgerForm.group_id}
                onChange={(e) => setLedgerForm((p) => ({ ...p, group_id: e.target.value }))}
                className={inputCls}
              >
                {groups.map((g) => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Opening Balance">
              <input
                type="number"
                step="0.01"
                value={ledgerForm.opening_balance}
                onChange={(e) =>
                  setLedgerForm((p) => ({ ...p, opening_balance: Number(e.target.value) || 0 }))
                }
                className={inputCls + ' text-right'}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <ToggleField
                label="Bill-wise Details?"
                value={ledgerForm.is_bill_wise}
                onChange={(v) => setLedgerForm((p) => ({ ...p, is_bill_wise: v }))}
              />
              <ToggleField
                label="Cost Centres?"
                value={ledgerForm.allow_cost_centres}
                onChange={(v) => setLedgerForm((p) => ({ ...p, allow_cost_centres: v }))}
              />
            </div>
          </div>
        )}

        {/* ── STOCK ITEM ── */}
        {type === 'stockItem' && (
          <div className="space-y-3">
            <Field label="Item Name">
              <input
                ref={nameInputRef}
                type="text"
                value={stockItemForm.name}
                onChange={(e) => setStockItemForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Dell Monitor 24"
                className={inputCls}
              />
            </Field>
            <Field label="Alias">
              <input
                type="text"
                value={stockItemForm.alias}
                onChange={(e) => setStockItemForm((p) => ({ ...p, alias: e.target.value }))}
                placeholder="Optional alias"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock Group">
                {/* FIX — key and value use sg_id */}
                <select
                  value={stockItemForm.sg_id}
                  onChange={(e) => setStockItemForm((p) => ({ ...p, sg_id: e.target.value }))}
                  className={inputCls}
                >
                  {stockGroups.map((sg) => (
                    <option key={sg.sg_id} value={sg.sg_id}>
                      {sg.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Unit">
                <select
                  value={stockItemForm.unit_id}
                  onChange={(e) => setStockItemForm((p) => ({ ...p, unit_id: e.target.value }))}
                  className={inputCls}
                >
                  {units.map((u) => (
                    <option key={u.unit_id} value={u.unit_id}>
                      {u.symbol} ({u.formal_name})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="text-[10px] font-bold text-black uppercase tracking-wider border-b border-gray-300 pb-1 pt-2">
              Opening Balance
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Qty">
                <input
                  type="number"
                  value={stockItemForm.opening_qty}
                  onChange={(e) => {
                    const qty = Number(e.target.value) || 0;
                    setStockItemForm((p) => ({
                      ...p,
                      opening_qty: qty,
                      opening_value: qty * p.opening_rate,
                    }));
                  }}
                  className={inputCls + ' text-right'}
                />
              </Field>
              <Field label="Rate">
                <input
                  type="number"
                  value={stockItemForm.opening_rate}
                  onChange={(e) => {
                    const rate = Number(e.target.value) || 0;
                    setStockItemForm((p) => ({
                      ...p,
                      opening_rate: rate,
                      opening_value: p.opening_qty * rate,
                    }));
                  }}
                  className={inputCls + ' text-right'}
                />
              </Field>
              <Field label="Value">
                <input
                  type="number"
                  value={stockItemForm.opening_value}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0;
                    setStockItemForm((p) => ({
                      ...p,
                      opening_value: value,
                      // Back-compute rate from an edited value (Tally behaviour).
                      opening_rate:
                        p.opening_qty > 0
                          ? Math.round((value / p.opening_qty) * 100) / 100
                          : p.opening_rate,
                    }));
                  }}
                  className={inputCls + ' text-right'}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="HSN Code">
                <input
                  type="text"
                  value={stockItemForm.hsn_code}
                  onChange={(e) => setStockItemForm((p) => ({ ...p, hsn_code: e.target.value }))}
                  placeholder="Optional"
                  className={inputCls}
                />
              </Field>
              <Field label="GST Rate (%)">
                <input
                  type="number"
                  step="0.01"
                  value={stockItemForm.gst_rate}
                  onChange={(e) =>
                    setStockItemForm((p) => ({ ...p, gst_rate: Number(e.target.value) || 0 }))
                  }
                  className={inputCls + ' text-right'}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── GODOWN ── */}
        {type === 'godown' && (
          <div className="space-y-3">
            <Field label="Godown Name">
              <input
                ref={nameInputRef}
                type="text"
                value={godownForm.name}
                onChange={(e) => setGodownForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Warehouse A"
                className={inputCls}
              />
            </Field>
            <Field label="Alias">
              <input
                type="text"
                value={godownForm.alias}
                onChange={(e) => setGodownForm((p) => ({ ...p, alias: e.target.value }))}
                placeholder="Optional alias"
                className={inputCls}
              />
            </Field>
            <Field label="Address">
              <textarea
                value={godownForm.address}
                onChange={(e) => setGodownForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street, city, etc."
                rows={3}
                className={inputCls + ' resize-none'}
              />
            </Field>
          </div>
        )}
      </div>
    </VoucherPopupShell>
  );
}

// ── Small sub-components ───────────────────────────────────────────────────

const inputCls =
  'text-xs px-2.5 py-1.5 border border-gray-400 outline-none focus:border-black w-full font-medium bg-white transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border border-gray-300 p-2 bg-white">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-xs outline-none bg-white font-bold text-black cursor-pointer"
      >
        <option value={0}>No</option>
        <option value={1}>Yes</option>
      </select>
    </div>
  );
}
