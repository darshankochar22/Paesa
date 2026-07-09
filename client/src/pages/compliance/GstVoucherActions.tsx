import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Button as RowButton } from '@/components/shadcn/button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

// e-Invoice (IRN) + e-Way Bill actions for a sales voucher, shown in the Voucher View footer.
export default function GstVoucherActions({
  companyId,
  voucher,
  existingIrn,
  onGenerated,
}: {
  companyId: number;
  voucher: any;
  /** IRN already on this voucher (from einvoice_records). When set, we never re-generate. */
  existingIrn?: string | null;
  /** Called after any generate attempt so the parent can refresh the IRN block. */
  onGenerated?: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [ewayOpen, setEwayOpen] = useState(false);
  const [transport, setTransport] = useState({
    distance: '',
    trans_mode: '1',
    veh_no: '',
    veh_type: 'R',
  });

  const btn =
    'h-auto rounded-none text-sm px-3 py-0.5 border-zinc-400 text-zinc-800 hover:bg-zinc-100';

  const genInvoice = async () => {
    // Idempotent: if an IRN already exists, show it instead of hitting NIC again (which would
    // just return "duplicate"). The IRN + QR are shown in the e-Invoice Details block above.
    if (existingIrn) {
      window.alert(`This voucher already has an IRN:\n${existingIrn}`);
      return;
    }
    if (!window.confirm(`Generate e-Invoice (IRN) for ${voucher.voucher_number}?`)) return;
    setBusy('einv');
    const r = await window.api.eInvoice.generateFromVoucher({
      company_id: companyId,
      voucher_id: voucher.voucher_id,
    });
    setBusy(null);
    // Refresh regardless of outcome — if NIC had it and we recovered+saved it, the block appears.
    onGenerated?.();
    window.alert(
      r.success
        ? `IRN generated:\n${(r.data as any)?.Irn || '(see e-Invoice Details)'}`
        : `e-Invoice failed: ${r.error}`,
    );
  };

  const genEway = async () => {
    setBusy('eway');
    const r = await window.api.ewayBill.generateFromVoucher({
      company_id: companyId,
      voucher_id: voucher.voucher_id,
      transport: { ...transport, distance: Number(transport.distance) || 0 },
    });
    setBusy(null);
    setEwayOpen(false);
    onGenerated?.();
    window.alert(
      r.success
        ? `e-Way Bill: ${(r.data as any)?.EwbNo || 'generated'}`
        : `e-Way Bill failed: ${r.error}`,
    );
  };

  return (
    <>
      <RowButton onClick={genInvoice} disabled={!!busy} variant="outline" size="xs" className={btn}>
        <span className="underline">I</span>:{' '}
        {busy === 'einv' ? '…' : existingIrn ? 'IRN ✓' : 'e-Invoice'}
      </RowButton>
      <RowButton
        onClick={() => setEwayOpen(true)}
        disabled={!!busy}
        variant="outline"
        size="xs"
        className={btn}
      >
        <span className="underline">W</span>: e-Way
      </RowButton>

      <Modal
        open={ewayOpen}
        onClose={() => setEwayOpen(false)}
        title="Generate e-Way Bill"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEwayOpen(false)}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={genEway} disabled={busy === 'eway'}>
              {busy === 'eway' ? 'Generating…' : 'Generate'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <div className="text-[11px] text-zinc-500">
            Requires an e-Invoice (IRN) on this voucher first. Transporter ID, vehicle type and doc
            details are taken from the voucher's "Provide GST/e-Way Bill details"; the fields below
            override them.
          </div>
          <label className="block">
            <span className="text-[10px] text-zinc-500">Distance (km) — 0 = auto-calculate</span>
            <Input
              value={transport.distance}
              onChange={(e) => setTransport({ ...transport, distance: e.target.value })}
              placeholder="0 (auto)"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-zinc-500">Transport mode</span>
            <Select
              value={transport.trans_mode}
              onChange={(e) => setTransport({ ...transport, trans_mode: e.target.value })}
              options={[
                { value: '1', label: 'Road' },
                { value: '2', label: 'Rail' },
                { value: '3', label: 'Air' },
                { value: '4', label: 'Ship' },
              ]}
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-zinc-500">Vehicle no.</span>
            <Input
              value={transport.veh_no}
              onChange={(e) => setTransport({ ...transport, veh_no: e.target.value })}
              placeholder="MH01AB1234"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-zinc-500">Vehicle type</span>
            <Select
              value={transport.veh_type}
              onChange={(e) => setTransport({ ...transport, veh_type: e.target.value })}
              options={[
                { value: 'R', label: 'Regular' },
                { value: 'O', label: 'Over Dimensional Cargo (ODC)' },
              ]}
            />
          </label>
        </div>
      </Modal>
    </>
  );
}
