// Downloadable templates for Banking → Import Bank Statement.
//
// The server-side parser (server/banking/statementParser.js) matches columns by
// role, so this template's headers — Date / Narration / Ref No / Withdrawal /
// Deposit / Balance — are the canonical layout, and the "Account Number" row
// above the header lets the import auto-select the bank ledger whose bank
// details carry the same number. Real bank CSV exports (Debit/Credit,
// Particulars, single Amount + Dr/Cr) are also recognised by the same parser.

import { buildCsv, downloadCsv, type CsvColumn } from './exportCsv';
import { buildXlsxBlob, STYLE, type XlsxCell, type XlsxSheet } from './xlsxWriter';

const HEADERS = ['Date', 'Narration', 'Ref No', 'Withdrawal', 'Deposit', 'Balance'];

interface SampleRow {
  date: string;
  narration: string;
  ref: string;
  withdrawal: string;
  deposit: string;
  balance: string;
}

const SAMPLE_ROWS: SampleRow[] = [
  {
    date: '05-04-2026',
    narration: 'NEFT-ACME TRADERS PVT LTD-INV 101',
    ref: 'UTR8801122',
    withdrawal: '',
    deposit: '15000.00',
    balance: '115000.00',
  },
  {
    date: '07-04-2026',
    narration: 'CHQ PAID-OFFICE RENT APRIL',
    ref: '000451',
    withdrawal: '40000.00',
    deposit: '',
    balance: '75000.00',
  },
  {
    date: '10-04-2026',
    narration: 'ATM CASH WITHDRAWAL',
    ref: '',
    withdrawal: '10000.00',
    deposit: '',
    balance: '65000.00',
  },
];

const INSTRUCTIONS = [
  'How to fill this template',
  '1. Put your bank account number in the Account Number row — it must match the',
  '   account number saved in the bank ledger’s Bank Details, so the import can',
  '   pick the right ledger automatically.',
  '2. One row per bank transaction, below the header row. Delete the sample rows.',
  '3. Date: DD-MM-YYYY (05-04-2026). DD/MM/YYYY, YYYY-MM-DD and 5-Apr-2026 also work.',
  '4. Withdrawal = money OUT of the bank; Deposit = money INTO the bank.',
  '   Fill exactly one of the two per row. No commas needed; plain 15000.00 is fine.',
  '5. Ref No is optional (cheque number / UTR / transaction id).',
  '6. Balance is optional and ignored for posting.',
  '7. The import reads CSV. If you filled the Excel template, use',
  '   File → Save As → CSV (Comma delimited) before importing.',
  '8. Import from Gateway → Banking → Import Bank Statement. Each row becomes a',
  '   Receipt (deposit), Payment (withdrawal) or Contra (own bank/cash transfer)',
  '   voucher after you review the suggested ledgers.',
];

const csvColumns: CsvColumn<SampleRow>[] = [
  { header: 'Date', value: (r) => r.date },
  { header: 'Narration', value: (r) => r.narration },
  { header: 'Ref No', value: (r) => r.ref },
  { header: 'Withdrawal', value: (r) => r.withdrawal },
  { header: 'Deposit', value: (r) => r.deposit },
  { header: 'Balance', value: (r) => r.balance },
];

export function downloadBankStatementCsvTemplate(): void {
  const metadata = [
    // Keep amount/date words out of these rows so the parser never mistakes one
    // for the header row.
    '"Bank Statement Import Template — one row per transaction, sample rows below"',
    '"Account Number","<your bank account number>"',
    '""',
  ];
  downloadCsv('bank-statement-template.csv', buildCsv(csvColumns, SAMPLE_ROWS, metadata));
}

function textCell(v: string, s: number = STYLE.DEFAULT): XlsxCell {
  return { v, t: 's', s };
}

export function downloadBankStatementXlsxTemplate(): void {
  const statementRows: XlsxCell[][] = [
    [textCell('Bank Statement Import', STYLE.TITLE)],
    [
      textCell('Account Number', STYLE.META_LABEL),
      textCell('<your bank account number>', STYLE.META_VALUE),
    ],
    [],
    HEADERS.map((h) => textCell(h, STYLE.HEADER)),
    ...SAMPLE_ROWS.map((r) => [
      textCell(r.date),
      textCell(r.narration),
      textCell(r.ref),
      r.withdrawal ? ({ v: Number(r.withdrawal), t: 'n', s: STYLE.NUM } as XlsxCell) : textCell(''),
      r.deposit ? ({ v: Number(r.deposit), t: 'n', s: STYLE.NUM } as XlsxCell) : textCell(''),
      r.balance ? ({ v: Number(r.balance), t: 'n', s: STYLE.NUM } as XlsxCell) : textCell(''),
    ]),
  ];

  const sheets: XlsxSheet[] = [
    {
      name: 'Statement',
      rows: statementRows,
      merges: ['A1:F1'],
      cols: [
        { min: 1, max: 1, width: 14 },
        { min: 2, max: 2, width: 44 },
        { min: 3, max: 3, width: 16 },
        { min: 4, max: 6, width: 15 },
      ],
    },
    {
      name: 'Instructions',
      rows: INSTRUCTIONS.map((line, i) => [
        textCell(line, i === 0 ? STYLE.SECTION : STYLE.DEFAULT),
      ]),
      cols: [{ min: 1, max: 1, width: 90 }],
    },
  ];

  const blob = buildXlsxBlob(sheets);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'bank-statement-template.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
