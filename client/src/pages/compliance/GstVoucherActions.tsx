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
}: {
  companyId: number;
  voucher: any;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [ewayOpen, setEwayOpen] = useState(false);
  const [transport, setTransport] = useState({ distance: '', trans_mode: '1', veh_no: '' });

  const btn =
    'h-auto rounded-none text-sm px-3 py-0.5 border-zinc-400 text-zinc-800 hover:bg-zinc-100';

  const genInvoice = async () => {
    if (!window.confirm(`Generate e-Invoice (IRN) for ${voucher.voucher_number}?`)) return;
    setBusy('einv');
    const r = await window.api.eInvoice.generateFromVoucher({
      company_id: companyId,
      voucher_id: voucher.voucher_id,
    });
    setBusy(null);
    window.alert(
      r.success
        ? `IRN generated:\n${(r.data as any)?.Irn || '(see e-Invoice tab)'}`
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
    window.alert(
      r.success
        ? `e-Way Bill: ${(r.data as any)?.EwbNo || 'generated'}`
        : `e-Way Bill failed: ${r.error}`,
    );
  };

  return (
    <>
      <RowButton onClick={genInvoice} disabled={!!busy} variant="outline" size="xs" className={btn}>
        <span className="underline">I</span>: {busy === 'einv' ? '…' : 'e-Invoice'}
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
            Requires an e-Invoice (IRN) on this voucher first.
          </div>
          <label className="block">
            <span className="text-[10px] text-zinc-500">Distance (km)</span>
            <Input
              value={transport.distance}
              onChange={(e) => setTransport({ ...transport, distance: e.target.value })}
              placeholder="0"
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
        </div>
      </Modal>
    </>
  );
}
