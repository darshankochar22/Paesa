import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { Button } from '@/components/shadcn/button';

interface CreateResult {
  gstin: string;
  success: boolean;
  ledger_id?: number | null;
  state?: string;
  error?: string;
}

export default function CreatePartyUsingGstin() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [groups, setGroups] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('Sundry Debtors');
  const [gstins, setGstins] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CreateResult[] | null>(null);

  useEffect(() => {
    async function loadGroups() {
      if (!companyId) return;
      try {
        const res = await window.api.group.getAll(companyId);
        if (res.success) {
          setGroups(
            (res.groups || [])
              .map((g: any) => g.name)
              .filter(Boolean)
              .sort(),
          );
        }
      } catch {
        /* group list is optional */
      }
    }
    loadGroups();
  }, [companyId]);

  // Keep exactly one trailing empty row, like Tally's "Specify GSTINs/UINs" list.
  const setRow = (i: number, value: string) => {
    setGstins((prev) => {
      const next = [...prev];
      next[i] = value.toUpperCase();
      const nonEmpty = next.filter((g) => g.trim());
      return [...nonEmpty, ''];
    });
  };

  const create = async () => {
    if (!companyId) return;
    const list = gstins.map((g) => g.trim()).filter(Boolean);
    if (list.length === 0) {
      setError('Enter at least one GSTIN/UIN.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setResults(null);
      const res = await window.api.gst.createPartiesFromGstin({
        company_id: companyId,
        group_name: groupName,
        gstins: list,
      });
      if (res.success) {
        setResults(res.results as CreateResult[]);
        setGstins(['']);
      } else {
        setError(res.error || 'Failed to create parties.');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const created = results?.filter((r) => r.success).length ?? 0;
  const failed = results?.filter((r) => !r.success) ?? [];

  return (
    <TallyReportLayout
      title="Create Party Using GSTIN/UIN"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="flex items-center gap-2">
          <span>Create under Group:</span>
          <select
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="border border-gray-300 bg-white px-1 py-0.5 text-xs text-black focus:outline-none focus:border-black"
          >
            {(groups.length ? groups : ['Sundry Debtors', 'Sundry Creditors']).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="w-full flex flex-col items-center font-sans text-xs pt-6 pb-4">
        <div className="w-[420px] border border-black bg-white">
          <div className="text-center font-bold px-2 py-1 border-b border-gray-300">
            Specify GSTINs/UINs
          </div>
          <div className="flex flex-col p-2 gap-0.5 max-h-[60vh] overflow-y-auto">
            {gstins.map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-right text-gray-500">{i + 1}.</span>
                <input
                  value={g}
                  disabled={saving}
                  onChange={(e) => setRow(i, e.target.value)}
                  maxLength={15}
                  placeholder="15-digit GSTIN/UIN"
                  className="flex-1 border border-gray-300 px-1 py-0.5 text-xs tabular-nums text-black focus:outline-none focus:border-black"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 px-2 py-2 border-t border-gray-300">
            <Button
              onClick={create}
              disabled={saving}
              size="xs"
              className="bg-black text-white hover:bg-gray-800"
            >
              {saving ? 'Creating…' : 'Create Parties'}
            </Button>
          </div>
        </div>

        {error && <div className="mt-3 text-center text-red-600 font-bold">{error}</div>}

        {results && (
          <div className="w-[420px] mt-4 text-xs">
            <div className="font-bold">
              {created} party ledger{created === 1 ? '' : 's'} created.
            </div>
            {failed.length > 0 && (
              <div className="mt-1 flex flex-col gap-0.5">
                {failed.map((r, i) => (
                  <div key={i} className="text-gray-600">
                    <span className="tabular-nums">{r.gstin}</span> — {r.error || 'not created'}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 text-[11px] italic text-gray-500">
              Ledgers are named by GSTIN with State/PAN derived from it — rename and complete
              details in Ledger Alteration.
            </div>
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}
