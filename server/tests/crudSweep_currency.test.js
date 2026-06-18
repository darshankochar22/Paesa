// CRUD sweep for the "currency" module — exercises the controller exactly the
// way the real UI (CurrencyCreate.tsx / CurrencyAlter.tsx) drives it through IPC.
//
// The frontend create payload (CurrencyCreate.tsx handleSubmit) sends:
//   company_id, name, formal_name, iso_code, symbol, decimal_places,
//   decimal_symbol, decimal_places_in_words, suffix_symbol_to_amount,
//   show_amount_in_millions, add_space_between_amount_and_symbol
// with the three flags coerced to 0/1 and optional text fields possibly
// `undefined`. We replay that shape verbatim and assert every submitted field
// actually persists (catches "ignored field" / "dropped flag" bugs).

const { setupTestDB, createTestCompany } = require("./helpers");
const currencyController = require("../currency/currencyController");

describe("Currency CRUD sweep (UI-faithful)", () => {
  let companyId;
  let baseCurrencyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Currency CRUD Sweep Co");
    companyId = company.company_id;

    // createTestCompany seeds the predefined INR base currency.
    const res = await currencyController.getAll(null, companyId);
    expect(res.success).toBe(true);
    const inr = res.currencies.find((c) => c.iso_code === "INR");
    expect(inr).toBeDefined();
    expect(inr.is_predefined).toBe(1);
    expect(inr.is_default).toBe(1);
    baseCurrencyId = inr.currency_id;
  });

  it("create persists EVERY field the CurrencyCreate form submits", async () => {
    // Exact shape produced by CurrencyCreate.tsx handleSubmit (flags as 1).
    const payload = {
      company_id: companyId,
      name: "US Dollar",
      formal_name: "United States Dollar",
      iso_code: "USD", // form .toUpperCase()
      symbol: "$",
      decimal_places: 4,
      decimal_symbol: ",",
      decimal_places_in_words: "Cents",
      suffix_symbol_to_amount: 1,
      show_amount_in_millions: 1,
      add_space_between_amount_and_symbol: 1,
    };

    const res = await currencyController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.currency).toBeDefined();
    const id = res.currency.currency_id;
    expect(id).toBeDefined();

    // Read back through getById (what the oracle / UI relies on).
    const got = await currencyController.getById(null, id);
    expect(got.success).toBe(true);
    const c = got.currency;

    expect(c.company_id).toBe(companyId);
    expect(c.name).toBe("US Dollar");
    expect(c.formal_name).toBe("United States Dollar");
    expect(c.iso_code).toBe("USD");
    expect(c.symbol).toBe("$");
    expect(c.decimal_places).toBe(4);
    expect(c.decimal_symbol).toBe(",");
    expect(c.decimal_places_in_words).toBe("Cents");
    // The three boolean flags MUST persist as the submitted 1 (not dropped/0).
    expect(c.suffix_symbol_to_amount).toBe(1);
    expect(c.show_amount_in_millions).toBe(1);
    expect(c.add_space_between_amount_and_symbol).toBe(1);
    // New custom currency is active, non-default, non-predefined.
    expect(c.is_active).toBe(1);
    expect(c.is_default).toBe(0);
    expect(c.is_predefined).toBe(0);
  });

  it("create with the form's empty/undefined optional fields (flags = 0)", async () => {
    // CurrencyCreate.tsx sends formal_name/symbol/decimal_places_in_words as
    // `undefined` when the input is blank, and flags as 0 when "No".
    const payload = {
      company_id: companyId,
      name: "Euro",
      formal_name: undefined,
      iso_code: "EUR",
      symbol: undefined,
      decimal_places: 2,
      decimal_symbol: ".",
      decimal_places_in_words: undefined,
      suffix_symbol_to_amount: 0,
      show_amount_in_millions: 0,
      add_space_between_amount_and_symbol: 0,
    };

    const res = await currencyController.create(null, payload);
    expect(res.success).toBe(true);
    const got = await currencyController.getById(null, res.currency.currency_id);
    expect(got.success).toBe(true);
    const c = got.currency;
    expect(c.name).toBe("Euro");
    // formal_name falls back to name when blank (service behavior the UI tolerates).
    expect(c.formal_name).toBe("Euro");
    expect(c.iso_code).toBe("EUR");
    expect(c.decimal_places).toBe(2);
    expect(c.suffix_symbol_to_amount).toBe(0);
    expect(c.show_amount_in_millions).toBe(0);
    expect(c.add_space_between_amount_and_symbol).toBe(0);
  });

  it("rejects duplicate iso_code for the same company", async () => {
    const res = await currencyController.create(null, {
      company_id: companyId,
      name: "Dollar dup",
      iso_code: "USD",
    });
    expect(res.success).toBe(false);
  });

  it("update persists the changed fields the CurrencyAlter form submits", async () => {
    // Find the USD currency we created.
    const list = await currencyController.getAll(null, companyId);
    const usd = list.currencies.find((c) => c.iso_code === "USD");
    expect(usd).toBeDefined();

    // Replay CurrencyAlter.tsx handleSubmit: full field set, changed values.
    const update = {
      currency_id: usd.currency_id,
      company_id: companyId,
      name: "US Dollar (Alt)",
      formal_name: "USD Formal Alt",
      iso_code: "USD",
      symbol: "US$",
      decimal_places: 3,
      decimal_symbol: ".",
      decimal_places_in_words: "Pennies",
      // Flip every flag relative to creation to catch a broken/no-op update.
      suffix_symbol_to_amount: 0,
      show_amount_in_millions: 0,
      add_space_between_amount_and_symbol: 0,
    };

    const res = await currencyController.update(null, update);
    expect(res.success).toBe(true);

    const got = await currencyController.getById(null, usd.currency_id);
    expect(got.success).toBe(true);
    const c = got.currency;
    expect(c.name).toBe("US Dollar (Alt)");
    expect(c.formal_name).toBe("USD Formal Alt");
    expect(c.symbol).toBe("US$");
    expect(c.decimal_places).toBe(3);
    expect(c.decimal_places_in_words).toBe("Pennies");
    expect(c.suffix_symbol_to_amount).toBe(0);
    expect(c.show_amount_in_millions).toBe(0);
    expect(c.add_space_between_amount_and_symbol).toBe(0);
    // Still the same (not duplicated / not deleted).
    expect(c.currency_id).toBe(usd.currency_id);
    expect(c.is_active).toBe(1);
  });

  it("refuses to edit the predefined base currency", async () => {
    const res = await currencyController.update(null, {
      currency_id: baseCurrencyId,
      name: "Hacked INR",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/base currency/i);
  });

  it("setDefault moves the default flag (preload passes {company_id,id})", async () => {
    const list = await currencyController.getAll(null, companyId);
    const usd = list.currencies.find((c) => c.iso_code === "USD");

    // Controller signature: setDefault(event, { company_id, id }) — same object
    // preload.js builds from the UI's (company_id, id) positional call.
    const res = await currencyController.setDefault(null, {
      company_id: companyId,
      id: usd.currency_id,
    });
    expect(res.success).toBe(true);

    const newDefault = await currencyController.getById(null, usd.currency_id);
    expect(newDefault.currency.is_default).toBe(1);
    const oldDefault = await currencyController.getById(null, baseCurrencyId);
    expect(oldDefault.currency.is_default).toBe(0);

    // Revert so the delete test (default cannot be deleted) is meaningful.
    await currencyController.setDefault(null, {
      company_id: companyId,
      id: baseCurrencyId,
    });
  });

  it("blocks deleting the default/base currency", async () => {
    const res = await currencyController.delete(null, baseCurrencyId);
    expect(res.success).toBe(false);
  });

  it("delete soft-removes a custom currency (is_active=0, gone from getAll)", async () => {
    const list = await currencyController.getAll(null, companyId);
    const usd = list.currencies.find((c) => c.iso_code === "USD");
    expect(usd).toBeDefined();

    const res = await currencyController.delete(null, usd.currency_id);
    expect(res.success).toBe(true);

    const after = await currencyController.getAll(null, companyId);
    const ids = after.currencies.map((c) => c.currency_id);
    expect(ids).not.toContain(usd.currency_id);

    // Soft delete: row still exists with is_active = 0.
    const gone = await currencyController.getById(null, usd.currency_id);
    expect(gone.success).toBe(true);
    expect(gone.currency.is_active).toBe(0);
  });
});
