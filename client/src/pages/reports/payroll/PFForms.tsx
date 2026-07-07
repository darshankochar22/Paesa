import { useState, useEffect, type ReactNode } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { EmptyState } from '@/components/blocks/EmptyState';

// PF Form 5 (#207) & Form 10 (#208) — EPF statutory print documents rendered as a
// white sheet (Tally's print preview look). Rows come from the employee master:
// Form 5 = joiners of the fund in the period, Form 10 = leavers.

const CELL = 'border border-black px-2 py-1 align-top';
const HEADCELL = 'border border-black px-2 py-1 text-center font-bold align-top';

const monthLabel = (activeFY?: { end_date?: string } | null) => {
  const d = activeFY?.end_date ? new Date(activeFY.end_date) : new Date(2000, 0, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const fmtAmt = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

type PFKind = 'form5' | 'form10' | 'form12a' | 'monthly' | 'ecr' | 'form6a' | 'form3a';

function useFormData(kind: PFKind) {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const params = {
        company_id: companyId,
        from: activeFY?.start_date,
        to: activeFY?.end_date,
      };
      const api = window.api.payrollStatutory;
      const fetchers: Record<PFKind, (p: typeof params) => Promise<any>> = {
        form5: api.getPFForm5,
        form10: api.getPFForm10,
        form12a: api.getPFForm12A,
        monthly: api.getPFMonthlyStatement,
        ecr: api.getPFECR,
        form6a: api.getPFForm6A,
        form3a: api.getPFForm3A,
      };
      const res = await fetchers[kind](params);
      if (res.success) setPayload(res.payload);
      setLoading(false);
    })();
  }, [companyId, activeFY?.start_date, activeFY?.end_date, kind]);

  return { payload, loading, selectedCompany, activeFY };
}

// Shared column-driven register table for the employee-wise PF documents
// (Monthly Statement / ECR / Form 6A). `num` columns are right-aligned + money-formatted.
type SheetCol = { key: string; label: string; num?: boolean };
function SheetTable({
  columns,
  rows,
  totals,
}: {
  columns: SheetCol[];
  rows: any[];
  totals?: Record<string, number>;
}) {
  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={HEADCELL}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            {columns.map((c) => (
              <td key={c.key} className={`${CELL} h-24`} />
            ))}
          </tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={`${CELL} ${c.num ? 'text-right tabular-nums' : ''}`}>
                  {c.num ? fmtAmt(r[c.key]) || '0.00' : r[c.key]}
                </td>
              ))}
            </tr>
          ))
        )}
        {totals && rows.length > 0 && (
          <tr>
            {columns.map((c, ci) => (
              <td
                key={c.key}
                className={`${CELL} font-bold ${c.num ? 'text-right tabular-nums' : ''}`}
              >
                {ci === 0 ? 'Total' : c.num && totals[c.key] != null ? fmtAmt(totals[c.key]) : ''}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );
}

// Common white-sheet chrome shared by every PF document screen.
function PFSheet({
  title,
  loading,
  children,
  selectedCompany,
  activeFY,
  loadingMsg,
}: {
  title: string;
  loading: boolean;
  children: ReactNode;
  selectedCompany: any;
  activeFY: any;
  loadingMsg: string;
}) {
  return (
    <TallyReportLayout
      title={title}
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message={loadingMsg} className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[980px] text-[11px] text-black">
            {children}
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}

function Establishment({ est }: { est: any }) {
  return (
    <div className="flex flex-col gap-1 mb-4 text-[11px]">
      <div className="flex">
        <div className="w-80">Name and Address of the Factory / Establishment</div>
        <div className="w-4">:</div>
        <div className="font-bold whitespace-pre-line">
          {est?.name}
          {est?.address ? `\n${est.address}` : ''}
        </div>
      </div>
      <div className="flex">
        <div className="w-80">Code No. of the Factory / Establishment</div>
        <div className="w-4">:</div>
        <div className="font-bold">{est?.pf_code || ''}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex">
      <div className="w-96">{label}</div>
      <div className="w-4">:</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function SignatureFooter({ note }: { note?: string }) {
  const today = new Date().toLocaleDateString('en-IN');
  return (
    <>
      <div className="flex justify-between mt-10 text-[11px]">
        <div>
          Date :&nbsp;<span className="font-bold">{today}</span>
        </div>
        <div className="text-center w-80">
          Signature of the employer or other authorised Officer of the Factory/Establishment & Stamp
          of the Factory /Establishment
        </div>
      </div>
      {note && <div className="mt-6 text-[10px] whitespace-pre-line">{note}</div>}
    </>
  );
}

export default function PFForm5() {
  const { payload, loading, selectedCompany, activeFY } = useFormData('form5');
  const rows: any[] = payload?.employees ?? [];

  return (
    <TallyReportLayout
      title="Form 5"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Form 5…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[900px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-3">FORM 5</div>
            <div className="text-center font-bold mb-1">
              THE EMPLOYEES' PROVIDENT FUNDS SCHEME, 1952
            </div>
            <div className="text-center font-bold mb-4">
              [Paragraph 36(2)(a) & THE EMPLOYEES PENSION SCHEME, 1995 Paragraph 20(2)]
            </div>
            <p className="mb-4">
              Return of Employees' qualifying for membership of the Employees' Provident Fund,
              Employees' Pension Fund & Employees' Deposit Linked Insurance Fund for the first time
              during the month of <b>{monthLabel(activeFY)}</b> (To be sent to the Commisioner with
              Form2 (EPF & EPS))
            </p>
            <Establishment est={payload?.establishment} />

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>Account No.</th>
                  <th className={HEADCELL}>Name of Employee (in block letters)</th>
                  <th className={HEADCELL}>
                    Father's Name or Husband's Name (in case of married women)
                  </th>
                  <th className={HEADCELL}>Date of Birth</th>
                  <th className={HEADCELL}>Sex</th>
                  <th className={HEADCELL}>Date of Joining the Fund</th>
                  <th className={HEADCELL}>
                    Total period of previous service as on the date of joining the Fund (Enclose
                    Scheme Certificate if applicable)
                  </th>
                  <th className={HEADCELL}>Rem- arks</th>
                </tr>
                <tr>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <th key={n} className={HEADCELL}>
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <td key={i} className={`${CELL} h-96`} />
                    ))}
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{i + 1}</td>
                      <td className={CELL}>{r.account_no}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={CELL}>{r.father_or_husband}</td>
                      <td className={CELL}>{r.date_of_birth}</td>
                      <td className={CELL}>{r.sex}</td>
                      <td className={CELL}>{r.date_of_joining_fund}</td>
                      <td className={CELL}>{r.previous_service}</td>
                      <td className={CELL}>{r.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <SignatureFooter />
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}

const FORM10_NOTE = `Please state whether the member is (a)retiring according to para(69), (i) (a) or (b) of the scheme (b) leaving India for permanent settlement abroad (c) retrenchment (d) Pt. & total disablement due to employment injury (e) discharged (f) resigning from or leaving service (g) taking up employment elsewhere (The name and address of the Employers should be stated) (h) death; (i) attained the age of 58 years.

Certified that the member mentioned at serial No.______________ Shri____________was paid/not paid retrenchment compensation of Rs____________under the Industrial Dispute Act, 1947.`;

export function PFForm10() {
  const { payload, loading, selectedCompany, activeFY } = useFormData('form10');
  const rows: any[] = payload?.employees ?? [];

  return (
    <TallyReportLayout
      title="Form 10"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Form 10…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[900px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-3">FORM 10</div>
            <div className="text-center font-bold mb-1">
              THE EMPLOYEES' PROVIDENT FUNDS SCHEME, 1952
            </div>
            <div className="text-center font-bold mb-4">
              [Paragraph 36(2) (a) & (b) EMPLOYEES' PENSION SCHEME, 1995 (Paragraph 20(2))]
            </div>
            <div className="flex mb-4">
              <div className="w-80">Return of the members leaving service during the month of</div>
              <div className="w-4">:</div>
              <div className="font-bold">{monthLabel(activeFY)}</div>
            </div>
            <Establishment est={payload?.establishment} />

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={HEADCELL}>Sl No.</th>
                  <th className={HEADCELL}>Account No.</th>
                  <th className={HEADCELL}>Name of the Member (in block letters)</th>
                  <th className={HEADCELL}>
                    Father's Name or husband's Name (in case of married women)
                  </th>
                  <th className={HEADCELL}>Date of leaving service</th>
                  <th className={HEADCELL}>Reason for leaving service</th>
                  <th className={HEADCELL}>Remarks</th>
                </tr>
                <tr>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <th key={n} className={HEADCELL}>
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <td key={i} className={`${CELL} h-96`} />
                    ))}
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i}>
                      <td className={CELL}>{i + 1}</td>
                      <td className={CELL}>{r.account_no}</td>
                      <td className={`${CELL} uppercase`}>{r.name}</td>
                      <td className={CELL}>{r.father_or_husband}</td>
                      <td className={CELL}>{r.date_of_leaving}</td>
                      <td className={CELL}>{r.reason}</td>
                      <td className={CELL}>{r.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <SignatureFooter note={FORM10_NOTE} />
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}

// PF Form 12A (#209) — the EPF monthly Statement of Contribution. PF figures reuse
// the same buckets as the Statutory Summary (#206); member movement ties to the
// Form 5 joiners / Form 10 leavers. Remittance/challan details aren't tracked — blank.
export function PFForm12A() {
  const { payload, loading, selectedCompany, activeFY } = useFormData('form12a');
  const accounts: any[] = payload?.accounts ?? [];
  const members = payload?.members ?? { opening: 0, added: 0, left: 0, closing: 0 };

  return (
    <TallyReportLayout
      title="Form 12A"
      companyName={selectedCompany?.name || 'Company'}
      rightSubtitle={<div>{activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : ''}</div>}
    >
      <div className="w-full flex justify-center bg-gray-200 py-6 font-sans">
        {loading && <EmptyState message="Preparing Form 12A…" className="italic" />}
        {!loading && (
          <div className="bg-white shadow px-10 py-8 w-[900px] text-[11px] text-black">
            <div className="text-center font-bold text-sm mb-3">FORM 12A (Revised)</div>
            <div className="text-center font-bold mb-1">
              THE EMPLOYEES' PROVIDENT FUND SCHEME, 1952 (Paragraph 38(2))
            </div>
            <div className="text-center font-bold mb-1">
              &amp; THE EMPLOYEES' PENSION SCHEME, 1995 (Paragraph 20(4))
            </div>
            <div className="text-center font-bold mb-4">
              &amp; THE EMPLOYEES' DEPOSIT LINKED INSURANCE SCHEME, 1976 (Paragraph 10)
            </div>
            <div className="text-center font-bold mb-4">
              Statement of Contribution for the month of <span>{monthLabel(activeFY)}</span>
            </div>

            <Establishment est={payload?.establishment} />

            <div className="flex flex-col gap-1 mb-4 text-[11px]">
              <InfoRow
                label="Statutory rate of contribution"
                value={payload?.statutory_rate || '12%'}
              />
              <InfoRow
                label="No. of members at the beginning of the month"
                value={members.opening}
              />
              <InfoRow
                label="No. of members joined during the month (Form 5)"
                value={members.added}
              />
              <InfoRow
                label="No. of members left service during the month (Form 10)"
                value={members.left}
              />
              <InfoRow label="No. of members at the close of the month" value={members.closing} />
              <InfoRow
                label="Total wages on which contributions are payable"
                value={fmtAmt(payload?.wages ?? 0) || '—'}
              />
            </div>

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className={`${HEADCELL} w-40`}>Account No.</th>
                  <th className={HEADCELL}>Particulars of Contribution / Charges</th>
                  <th className={`${HEADCELL} w-40`}>Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, i) => (
                  <tr key={i}>
                    <td className={CELL}>{a.account}</td>
                    <td className={CELL}>{a.label}</td>
                    <td className={`${CELL} text-right tabular-nums`}>
                      {fmtAmt(a.amount) || '0.00'}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className={`${CELL} font-bold`} />
                  <td className={`${CELL} font-bold text-right`}>Total</td>
                  <td className={`${CELL} font-bold text-right tabular-nums`}>
                    {fmtAmt(payload?.total ?? 0) || '0.00'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 flex text-[11px]">
              <div className="w-96">Details of remittance (Bank / Challan No. / Date)</div>
              <div className="w-4">:</div>
              <div className="font-bold" />
            </div>

            <SignatureFooter />
          </div>
        )}
      </div>
    </TallyReportLayout>
  );
}

// #210 PF Monthly Statement — employee-wise PF contribution register for the month.
export function PFMonthlyStatement() {
  const { payload, loading, selectedCompany, activeFY } = useFormData('monthly');
  const columns: SheetCol[] = [
    { key: 'sl', label: 'Sl No.' },
    { key: 'account_no', label: 'PF A/c No. / UAN' },
    { key: 'name', label: 'Name of Employee' },
    { key: 'wages', label: 'EPF Wages', num: true },
    { key: 'ee_share', label: "Employee's Share (EPF)", num: true },
    { key: 'epf_er', label: "Employer's Share (EPF)", num: true },
    { key: 'eps', label: 'Pension (EPS)', num: true },
    { key: 'total', label: 'Total', num: true },
  ];
  return (
    <PFSheet
      title="Monthly Statement"
      loading={loading}
      loadingMsg="Preparing Monthly Statement…"
      selectedCompany={selectedCompany}
      activeFY={activeFY}
    >
      <div className="text-center font-bold text-sm mb-1">PROVIDENT FUND — MONTHLY STATEMENT</div>
      <div className="text-center mb-4">
        for the month of <span className="font-bold">{monthLabel(activeFY)}</span>
      </div>
      <Establishment est={payload?.establishment} />
      <SheetTable columns={columns} rows={payload?.rows ?? []} totals={payload?.totals} />
      <SignatureFooter />
    </PFSheet>
  );
}

// #211 PF ECR — Electronic Challan cum Return, UAN-wise wages + contributions.
export function PFECR() {
  const { payload, loading, selectedCompany, activeFY } = useFormData('ecr');
  const columns: SheetCol[] = [
    { key: 'uan', label: 'UAN' },
    { key: 'name', label: 'Member Name' },
    { key: 'gross_wages', label: 'Gross Wages', num: true },
    { key: 'epf_wages', label: 'EPF Wages', num: true },
    { key: 'eps_wages', label: 'EPS Wages', num: true },
    { key: 'edli_wages', label: 'EDLI Wages', num: true },
    { key: 'ee', label: 'EPF Contri (EE)', num: true },
    { key: 'eps', label: 'EPS Contri', num: true },
    { key: 'epf_er', label: 'Diff EPF (ER)', num: true },
    { key: 'ncp', label: 'NCP Days' },
    { key: 'refund', label: 'Refunds', num: true },
  ];
  return (
    <PFSheet
      title="E-Challan Cum Return (ECR)"
      loading={loading}
      loadingMsg="Preparing ECR…"
      selectedCompany={selectedCompany}
      activeFY={activeFY}
    >
      <div className="text-center font-bold text-sm mb-1">ELECTRONIC CHALLAN CUM RETURN (ECR)</div>
      <div className="text-center mb-4">
        Wage month <span className="font-bold">{monthLabel(activeFY)}</span>
      </div>
      <Establishment est={payload?.establishment} />
      <SheetTable columns={columns} rows={payload?.rows ?? []} totals={payload?.totals} />
      <SignatureFooter />
    </PFSheet>
  );
}

// #213 PF Form 6A — annual consolidated statement of contributions (all members).
export function PFForm6A() {
  const { payload, loading, selectedCompany, activeFY } = useFormData('form6a');
  const columns: SheetCol[] = [
    { key: 'sl', label: 'Sl No.' },
    { key: 'account_no', label: 'Account No.' },
    { key: 'name', label: 'Name of Member' },
    { key: 'wages', label: 'Wages on which contributions payable', num: true },
    { key: 'ee', label: "Workers' Contribution", num: true },
    { key: 'er', label: "Employer's Share (EPF + EPS)", num: true },
    { key: 'eps', label: 'of which EPS', num: true },
    { key: 'refund', label: 'Refund of Advances', num: true },
    { key: 'remarks', label: 'Remarks' },
  ];
  return (
    <PFSheet
      title="Form 6A"
      loading={loading}
      loadingMsg="Preparing Form 6A…"
      selectedCompany={selectedCompany}
      activeFY={activeFY}
    >
      <div className="text-center font-bold text-sm mb-1">FORM 6A</div>
      <div className="text-center font-bold mb-1">THE EMPLOYEES' PROVIDENT FUNDS SCHEME, 1952</div>
      <div className="text-center mb-4">
        Annual Consolidated Statement of Contributions for the year ending{' '}
        <span className="font-bold">{monthLabel(activeFY)}</span>
      </div>
      <Establishment est={payload?.establishment} />
      <SheetTable columns={columns} rows={payload?.rows ?? []} totals={payload?.totals} />
      <SignatureFooter />
    </PFSheet>
  );
}

// #212 PF Form 3A — per-member annual contribution card. Month-wise history isn't
// stored, so the current-period figure lands on the last month; others stay blank.
const FY_MONTHS = [
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
];
export function PFForm3A() {
  const { payload, loading, selectedCompany, activeFY } = useFormData('form3a');
  const members: any[] = payload?.members ?? [];
  const est = payload?.establishment;

  return (
    <PFSheet
      title="Form 3A"
      loading={loading}
      loadingMsg="Preparing Form 3A…"
      selectedCompany={selectedCompany}
      activeFY={activeFY}
    >
      <div className="text-center font-bold text-sm mb-1">FORM 3A (Revised)</div>
      <div className="text-center font-bold mb-4">
        THE EMPLOYEES' PROVIDENT FUNDS SCHEME, 1952 &amp; EMPLOYEES' PENSION SCHEME, 1995 — Member's
        Annual Contribution Card
      </div>
      {members.length === 0 && (
        <div className="px-4 py-6 italic text-gray-500 text-center">
          No PF members found for this company.
        </div>
      )}
      {members.map((m, mi) => (
        <div key={mi} className={mi > 0 ? 'mt-8 pt-6 border-t-2 border-black' : ''}>
          <div className="flex flex-col gap-1 mb-3">
            <InfoRow label="Account No." value={m.account_no} />
            <InfoRow label="Name of the Member" value={m.name} />
            <InfoRow label="Father's / Husband's Name" value={m.father_or_husband || ''} />
            <InfoRow label="Name & Address of the Establishment" value={est?.name || ''} />
            <InfoRow label="Statutory rate of contribution" value="12%" />
          </div>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th className={HEADCELL}>Month</th>
                <th className={HEADCELL}>Amount of Wages</th>
                <th className={HEADCELL}>Workers' Contribution (EPF)</th>
                <th className={HEADCELL}>Employer's Contribution (EPF)</th>
                <th className={HEADCELL}>Pension Fund (EPS)</th>
                <th className={HEADCELL}>Refund of Advances</th>
              </tr>
            </thead>
            <tbody>
              {FY_MONTHS.map((mon, idx) => {
                const isLast = idx === FY_MONTHS.length - 1; // current period lands on the last month
                return (
                  <tr key={mon}>
                    <td className={CELL}>{mon}</td>
                    <td className={`${CELL} text-right tabular-nums`}>
                      {isLast ? fmtAmt(m.wages) : ''}
                    </td>
                    <td className={`${CELL} text-right tabular-nums`}>
                      {isLast ? fmtAmt(m.ee) : ''}
                    </td>
                    <td className={`${CELL} text-right tabular-nums`}>
                      {isLast ? fmtAmt(m.epf_er) : ''}
                    </td>
                    <td className={`${CELL} text-right tabular-nums`}>
                      {isLast ? fmtAmt(m.eps) : ''}
                    </td>
                    <td className={`${CELL} text-right tabular-nums`} />
                  </tr>
                );
              })}
              <tr>
                <td className={`${CELL} font-bold`}>Total</td>
                <td className={`${CELL} font-bold text-right tabular-nums`}>{fmtAmt(m.wages)}</td>
                <td className={`${CELL} font-bold text-right tabular-nums`}>{fmtAmt(m.ee)}</td>
                <td className={`${CELL} font-bold text-right tabular-nums`}>{fmtAmt(m.epf_er)}</td>
                <td className={`${CELL} font-bold text-right tabular-nums`}>{fmtAmt(m.eps)}</td>
                <td className={`${CELL} font-bold text-right tabular-nums`} />
              </tr>
            </tbody>
          </table>
        </div>
      ))}
      <SignatureFooter />
    </PFSheet>
  );
}
