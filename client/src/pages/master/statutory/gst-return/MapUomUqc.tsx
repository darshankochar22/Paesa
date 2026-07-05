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

interface UnitRow {
  unit_id: number;
  symbol: string;
  formal_name: string | null;
  unit_quantity_code: string | null;
  unit_type: string;
  name: string;
  decimal_places: number | null;
  first_unit_id: number | null;
  second_unit_id: number | null;
  conversion_factor: number | null;
}

// The GST portal's fixed Unit Quantity Code list (code-DESCRIPTION).
const UQC_CODES = [
  'BAG-BAGS',
  'BAL-BALE',
  'BDL-BUNDLES',
  'BKL-BUCKLES',
  'BOU-BILLION OF UNITS',
  'BOX-BOX',
  'BTL-BOTTLES',
  'BUN-BUNCHES',
  'CAN-CANS',
  'CBM-CUBIC METERS',
  'CCM-CUBIC CENTIMETERS',
  'CMS-CENTIMETERS',
  'CTN-CARTONS',
  'DOZ-DOZENS',
  'DRM-DRUMS',
  'GGK-GREAT GROSS',
  'GMS-GRAMMES',
  'GRS-GROSS',
  'GYD-GROSS YARDS',
  'KGS-KILOGRAMS',
  'KLR-KILOLITRE',
  'KME-KILOMETRE',
  'LTR-LITRES',
  'MLT-MILILITRE',
  'MTR-METERS',
  'MTS-METRIC TON',
  'NOS-NUMBERS',
  'OTH-OTHERS',
  'PAC-PACKS',
  'PCS-PIECES',
  'PRS-PAIRS',
  'QTL-QUINTAL',
  'ROL-ROLLS',
  'SET-SETS',
  'SQF-SQUARE FEET',
  'SQM-SQUARE METERS',
  'SQY-SQUARE YARDS',
  'TBS-TABLETS',
  'TGM-TEN GROSS',
  'THD-THOUSANDS',
  'TON-TONNES',
  'TUB-TUBES',
  'UGS-US GALLONS',
  'UNT-UNITS',
  'YDS-YARDS',
];

const isMapped = (u: UnitRow) =>
  !!u.unit_quantity_code && u.unit_quantity_code !== 'Not Applicable';

export default function MapUomUqc() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.unit.getSimpleUnits(companyId);
      if (res.success) setUnits((res.units as UnitRow[]) || []);
      else {
        setError(res.error || 'Failed to load units.');
        setUnits([]);
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [companyId]);

  // Persist the chosen UQC on the unit master (pass the whole row so compound/other
  // fields are preserved by the merge-on-update service).
  const setUqc = async (u: UnitRow, value: string) => {
    const uqc = value || null;
    try {
      setSavingId(u.unit_id);
      const res = await window.api.unit.update({
        unit_id: u.unit_id,
        unit_type: u.unit_type,
        name: u.name,
        symbol: u.symbol,
        formal_name: u.formal_name,
        decimal_places: u.decimal_places,
        first_unit_id: u.first_unit_id,
        second_unit_id: u.second_unit_id,
        conversion_factor: u.conversion_factor,
        unit_quantity_code: uqc,
      });
      if (res.success) {
        setUnits((prev) =>
          prev.map((r) => (r.unit_id === u.unit_id ? { ...r, unit_quantity_code: uqc } : r)),
        );
      } else {
        setError(res.error || 'Failed to update UQC.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update UQC.');
    } finally {
      setSavingId(null);
    }
  };

  const rows = showAll ? units : units.filter((u) => !isMapped(u));
  const HEAD = 'h-auto px-2 py-1 align-bottom font-bold text-black text-xs';

  return (
    <TallyReportLayout
      title="Map UOM to UQC"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={
        <div className="font-bold">
          {showAll ? 'All Units of Measure' : 'UOM Not Mapped to UQC'}
        </div>
      }
      footerControls={
        <Button
          onClick={() => setShowAll((s) => !s)}
          variant="ghost"
          size="xs"
          className="h-auto p-0 ml-4 font-bold text-black hover:underline hover:bg-transparent"
        >
          {showAll ? 'F8: Show Unmapped' : 'F8: Show All'}
        </Button>
      }
    >
      <div className="w-full flex flex-col font-sans text-xs pb-4">
        {loading && <EmptyState message="Loading units…" className="italic" />}
        {error && <div className="p-2 text-center text-red-600 font-bold">{error}</div>}

        {!loading && (
          <Table className="text-xs table-fixed">
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                <TableHead className={cn(HEAD, 'w-48')}>Symbol of UOM</TableHead>
                <TableHead className={cn(HEAD, 'w-64')}>Formal Name of UOM</TableHead>
                <TableHead className={HEAD}>Unit Quantity Code (UQC)</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="p-0">
                    <EmptyState
                      message={
                        showAll ? 'No units of measure found.' : 'All units are mapped to a UQC.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => (
                  <TableRow key={u.unit_id} className="border-0 hover:bg-[#e6f2ff]">
                    <TableCell className="px-2 py-0.5">{u.symbol}</TableCell>
                    <TableCell className="px-2 py-0.5">{u.formal_name}</TableCell>
                    <TableCell className="px-2 py-0.5">
                      <select
                        value={isMapped(u) ? (u.unit_quantity_code as string) : ''}
                        disabled={savingId === u.unit_id}
                        onChange={(e) => setUqc(u, e.target.value)}
                        className="w-full max-w-xs border border-gray-300 bg-white px-1 py-0.5 text-xs text-black focus:outline-none focus:border-black"
                      >
                        <option value="">Not Applicable</option>
                        {UQC_CODES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </TableCell>
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
