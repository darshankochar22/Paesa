// Shared row-side resolver for the Sales / Purchase / Credit Note / Debit Note
// voucher registers.
//
// TallyPrime shows each voucher's amount in EITHER the Debit OR the Credit
// column — never both — placed on the side the PARTY ledger was actually posted
// to for that voucher. The party is the ledger whose name matches the voucher's
// party_name (the debtor/creditor); its posting side and amount drive the row.
// So two Credit Notes can land in different columns: one whose party was debited
// shows under Debit, one whose party was credited shows under Credit.
//
// When the party can't be identified from the entries (no party_name, or no
// matching ledger line), fall back to `defaultSide` — the normal side for that
// register's voucher type — using the voucher's balanced total.
//
// `v` is the voucher row (needs party_name), `entries` its voucher_entries rows
// (need ledger_name, type, amount). Returns { debit, credit, particulars }.
function resolveRegisterRow(v, entries, defaultSide) {
  const creditTotal = entries
    .filter((e) => e.type === 'Cr')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const debitTotal = entries
    .filter((e) => e.type === 'Dr')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const partyEntries = v.party_name ? entries.filter((e) => e.ledger_name === v.party_name) : [];
  const partyDr = partyEntries
    .filter((e) => e.type === 'Dr')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const partyCr = partyEntries
    .filter((e) => e.type === 'Cr')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const particulars =
    v.party_name ||
    entries.find((e) => e.type === 'Cr')?.ledger_name ||
    entries.find((e) => e.type === 'Dr')?.ledger_name ||
    '—';

  let side;
  let amount;
  if (partyEntries.length) {
    // Party sits on one side; use whichever side carries its posting.
    side = partyDr >= partyCr ? 'Dr' : 'Cr';
    amount = side === 'Dr' ? partyDr : partyCr;
  } else {
    side = defaultSide;
    amount = side === 'Dr' ? debitTotal : creditTotal;
  }

  return side === 'Dr'
    ? { debit: amount, credit: 0, particulars }
    : { debit: 0, credit: amount, particulars };
}

module.exports = { resolveRegisterRow };
