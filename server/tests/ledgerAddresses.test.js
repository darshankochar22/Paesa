// F11 "Enable multiple addresses": a party ledger can carry extra named addresses
// in ledger_addresses. create persists data.addresses[], getById returns them,
// update replaces them (empty array clears). Non-destructive — the flag only gates
// the UI; the table/data exist regardless.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const ledgerService = require('../ledger/ledgerService');

const lid = (r) => r.ledger?.ledger_id ?? r.ledger_id;

describe('ledger multiple addresses', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const c = await createTestCompany('Multi Addr Co');
    companyId = c.company_id;
  });

  it('create persists addresses and getById returns them ordered', async () => {
    const created = await ledgerService.create({
      company_id: companyId,
      name: 'Acme Traders',
      addresses: [
        {
          address_type: 'Head Office',
          mailing_name: 'Acme HO',
          address1: '1 Main St',
          state: 'Maharashtra',
          is_default: 1,
          display_order: 0,
        },
        {
          address_type: 'Warehouse',
          mailing_name: 'Acme WH',
          address1: '9 Dock Rd',
          state: 'Gujarat',
          display_order: 1,
        },
      ],
    });
    expect(created.success).toBe(true);
    const id = lid(created);

    const got = await ledgerService.getById(id);
    expect(got.success).toBe(true);
    expect(got.ledger.addresses).toHaveLength(2);
    expect(got.ledger.addresses[0].address_type).toBe('Head Office');
    expect(got.ledger.addresses[0].is_default).toBe(1);
    expect(got.ledger.addresses[1].address_type).toBe('Warehouse');
  });

  it('update replaces the address list', async () => {
    const created = await ledgerService.create({
      company_id: companyId,
      name: 'Beta Corp',
      addresses: [{ address_type: 'Office', mailing_name: 'Beta', address1: '5 Elm' }],
    });
    const id = lid(created);

    const upd = await ledgerService.update({
      ledger_id: id,
      company_id: companyId,
      name: 'Beta Corp',
      addresses: [
        { address_type: 'Branch A', mailing_name: 'Beta A', address1: '10 Oak' },
        { address_type: 'Branch B', mailing_name: 'Beta B', address1: '20 Pine' },
      ],
    });
    expect(upd.success).toBe(true);

    const got = await ledgerService.getById(id);
    expect(got.ledger.addresses).toHaveLength(2);
    expect(got.ledger.addresses.map((a) => a.address_type)).toEqual(['Branch A', 'Branch B']);
  });

  it('update with empty array clears all addresses', async () => {
    const created = await ledgerService.create({
      company_id: companyId,
      name: 'Gamma Ltd',
      addresses: [{ address_type: 'Office', address1: '1 St' }],
    });
    const id = lid(created);

    await ledgerService.update({
      ledger_id: id,
      company_id: companyId,
      name: 'Gamma Ltd',
      addresses: [],
    });
    const got = await ledgerService.getById(id);
    expect(got.ledger.addresses).toHaveLength(0);
  });

  it('update without addresses key leaves existing rows untouched', async () => {
    const created = await ledgerService.create({
      company_id: companyId,
      name: 'Delta Inc',
      addresses: [{ address_type: 'Office', address1: '1 St' }],
    });
    const id = lid(created);

    await ledgerService.update({ ledger_id: id, company_id: companyId, name: 'Delta Renamed' });
    const got = await ledgerService.getById(id);
    expect(got.ledger.addresses).toHaveLength(1);
  });
});
