import { useState, useMemo, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { Button } from '@/components/shadcn/button';
import Select from '@/components/ui/Select';
import { fyPeriods, defaultPeriod } from '@/lib/gstPeriods';
import { downloadPortalJson, downloadWorkbook, downloadSectionCsvs } from '@/lib/gstr1Export';

type Format = 'json' | 'excel' | 'csv';

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: 'json', label: 'Portal JSON', hint: 'Upload to the GST portal / offline tool' },
  { id: 'excel', label: 'Excel workbook', hint: 'Portal-format .xlsx, one sheet per section' },
  { id: 'csv', label: 'Section CSVs', hint: 'Offline-tool importable, one file per section' },
];

// Tally-style "Export GSTR-1" chooser, launched from the Navbar → Export menu. Lets the user
// pick the return period (months of the active FY) and one or more output formats, then fetches
// the return payload and hands it to the shared gstr1Export helpers.
export default function Gstr1ExportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const periods = useMemo(() => fyPeriods(activeFY), [activeFY]);
  const [period, setPeriod] = useState('');
  const [picked, setPicked] = useState<Record<Format, boolean>>({
    json: true,
    excel: true,
    csv: false,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Default to a period inside the active FY (today's month, else the FY's last month).
  useEffect(() => {
    if (!open || !periods.length) return;
    const d = defaultPeriod(new Date(), periods);
    setPeriod(`${d.month}${d.year}`);
    setMsg(null);
    setErr(null);
  }, [open, periods]);

  if (!open) return null;

  const toggle = (id: Format) => setPicked((p) => ({ ...p, [id]: !p[id] }));
  const anyPicked = FORMATS.some((f) => picked[f.id]);

  const runExport = async () => {
    if (!companyId || !fyId) {
      setErr('Select a company first.');
      return;
    }
    if (!period) {
      setErr('Pick a return period.');
      return;
    }
    if (!anyPicked) {
      setErr('Choose at least one format.');
      return;
    }
    try {
      setBusy(true);
      setErr(null);
      setMsg('Compiling GSTR-1…');
      const res = await window.api.gst.getGSTR1({
        company_id: companyId,
        fy_id: fyId,
        return_period: period,
        gst_registration_id: null,
      });
      if (!res.success) {
        setErr(res.error || 'Failed to compile GSTR-1.');
        return;
      }
      const payload = res.payload;
      const sectionCount =
        (payload?.b2b?.length || 0) +
        (payload?.b2cl?.length || 0) +
        (payload?.b2cs?.length || 0) +
        (payload?.cdnr?.length || 0) +
        (payload?.cdnur?.length || 0) +
        (payload?.exp?.length || 0) +
        (payload?.nil?.inv?.length || 0) +
        (payload?.hsn?.data?.length || 0);
      if (sectionCount === 0) {
        setErr(
          'No GSTR-1 sections have data for this period. Vouchers with a missing/invalid HSN or company GSTIN are parked under "Uncertain" and excluded — fix those and retry.',
        );
        return;
      }

      let csvFiles = 0;
      if (picked.json) downloadPortalJson(payload);
      if (picked.excel) downloadWorkbook(payload, { legalName: selectedCompany?.name || '' });
      if (picked.csv) csvFiles = downloadSectionCsvs(payload);

      const parts = [
        picked.json && 'JSON',
        picked.excel && 'Excel',
        picked.csv && `${csvFiles} CSV file(s)`,
      ].filter(Boolean);
      setMsg(`Exported ${parts.join(', ')}.`);
    } catch (e: any) {
      setErr(e.message || 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Export GSTR-1"
      className="fixed inset-0 z-[9999] bg-black/10 flex items-start justify-center"
    >
      <div className="mt-24 w-[480px] bg-white border border-black shadow-2xl">
        <div className="flex items-center justify-between bg-black text-white font-bold px-3 py-1.5 text-xs">
          <span>Export GSTR-1</span>
          <button onClick={onClose} className="hover:opacity-70" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="px-3 py-3 flex flex-col gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-28 font-medium">Return Period</span>
            {periods.length > 0 ? (
              <div className="w-40">
                <Select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  options={periods.map((p) => ({ value: p.value, label: p.label }))}
                />
              </div>
            ) : (
              <span className="italic">Select a company / financial year first.</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-medium">Formats</span>
            {FORMATS.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-2 px-1 py-0.5 cursor-pointer hover:bg-black/[0.03]"
              >
                <input
                  type="checkbox"
                  checked={picked[f.id]}
                  onChange={() => toggle(f.id)}
                  className="accent-black"
                />
                <span className="font-medium w-28">{f.label}</span>
                <span>{f.hint}</span>
              </label>
            ))}
          </div>

          <p className="italic">
            Company-wide return for {selectedCompany?.name || 'the selected company'}. JSON matches
            the GST portal / offline-tool envelope; CSVs use the offline-tool section templates.
          </p>
          {msg && <div className="font-medium">{msg}</div>}
          {err && <div className="font-bold border-l-2 border-black pl-2">{err}</div>}
        </div>

        <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-300 bg-white">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={runExport}
            disabled={busy || !anyPicked || !period}
          >
            {busy ? 'Exporting…' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  );
}
