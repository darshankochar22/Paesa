import { useState, useEffect } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { Button } from '@/components/shadcn/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/shadcn/table';
import { EmptyState } from '@/components/blocks/EmptyState';
import { cn } from '@/lib/utils';

interface PartyRow {
  id: number;
  name: string;
  address: string;
  state: string;
  country: string;
  registration_type: string;
  gstin: string;
  pan: string;
  valid: boolean;
  status: string;
}

export default function ValidatePartyGstin() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [groups, setGroups] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('All Items');
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exceptionsOnly, setExceptionsOnly] = useState(false);

  // Populate the group filter once.
  useEffect(() => {
    async function loadGroups() {
      if (!companyId) return;
      try {
        const res = await window.api.group.getAll(companyId);
        if (res.success) {
          const names = (res.groups || res.data || [])
            .map((g: any) => g.name)
            .filter(Boolean)
            .sort((a: string, b: string) => a.localeCompare(b));
          setGroups(names);
        }
      } catch {
        /* group filter is optional */
      }
    }
    loadGroups();
  }, [companyId]);

  const load = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.gst.validatePartyGstin({
        company_id: companyId,
        group_name: groupName,
      });
      if (res.success) setParties((res.parties as PartyRow[]) || []);
      else {
        setError(res.error || 'Failed to validate party GSTINs.');
        setParties([]);
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
      setParties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [companyId, groupName]);

  const rows = exceptionsOnly ? parties.filter((p) => !p.valid) : parties;
  const exceptionCount = parties.filter((p) => !p.valid).length;
  const HEAD = 'h-auto px-2 py-1 align-bottom font-bold text-black text-xs whitespace-nowrap';

  return (
    <TallyReportLayout
      title="Validate Party GSTIN/UIN"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="flex items-center gap-2">
          <span>Name of Group:</span>
          <select
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="border border-gray-300 bg-white px-1 py-0.5 text-xs text-black focus:outline-none focus:border-black"
          >
            <option value="All Items">All Items</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      }
      rightSubtitle={
        <div>
          {exceptionCount} exception{exceptionCount === 1 ? '' : 's'}
        </div>
      }
      footerControls={
        <Button
          onClick={() => setExceptionsOnly((s) => !s)}
          variant="ghost"
          size="xs"
          className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
        >
          {exceptionsOnly ? 'F8: Show All' : 'F8: Exceptions Only'}
        </Button>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Validating party GSTINs…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && !error && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className={cn(HEAD, 'w-12 text-right')}>Sl No.</TableHead>
                <TableHead className={HEAD}>Particulars</TableHead>
                <TableHead className={cn(HEAD, 'w-40')}>Address</TableHead>
                <TableHead className={cn(HEAD, 'w-28')}>State</TableHead>
                <TableHead className={cn(HEAD, 'w-24')}>Country</TableHead>
                <TableHead className={cn(HEAD, 'w-28')}>Registration Type</TableHead>
                <TableHead className={cn(HEAD, 'w-36')}>GSTIN/UIN</TableHead>
                <TableHead className={cn(HEAD, 'w-32')}>PAN/IT No.</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      message={
                        exceptionsOnly
                          ? 'No exceptions — all party GSTINs are valid.'
                          : 'No party ledgers found for this selection.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p, idx) => (
                  <TableRow key={p.id} className="border-0 hover:bg-[#e6f2ff]">
                    <TableCell className="px-2 py-0.5 text-right tabular-nums">{idx + 1}</TableCell>
                    <TableCell className={cn('px-2 py-0.5', !p.valid && 'font-bold')}>
                      {p.name}
                      {!p.valid && (
                        <span className="ml-2 text-[10px] italic text-gray-500">{p.status}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 truncate">{p.address}</TableCell>
                    <TableCell className="px-2 py-0.5">{p.state}</TableCell>
                    <TableCell className="px-2 py-0.5">{p.country}</TableCell>
                    <TableCell className="px-2 py-0.5">{p.registration_type}</TableCell>
                    <TableCell className={cn('px-2 py-0.5 tabular-nums', !p.valid && 'font-bold')}>
                      {p.gstin}
                    </TableCell>
                    <TableCell className="px-2 py-0.5 tabular-nums">{p.pan}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </TallyReportLayout>
  );
}
