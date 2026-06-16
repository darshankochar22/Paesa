const { setupTestDB, createTestCompany, db } = require("./helpers");
const { TOOL_DEFS, callTool } = require("../ai/tools");
const { providerFor, modelFor } = require("../ai/agent");

describe("AI copilot tool layer (consolidated, anti-loop)", () => {
  let ctx;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("AI Tools Co");
    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [company.company_id]
    );
    ctx = { company_id: company.company_id, fy_id: fy.rows[0].fy_id };
  });

  it("exposes exactly 3 tools (not one per channel)", () => {
    expect(TOOL_DEFS.map((t) => t.name).sort()).toEqual(["lookup", "propose", "query"]);
  });

  it("auto-detects the provider from the key", () => {
    expect(providerFor("sk-ant-abc123")).toBe("anthropic");
    expect(providerFor("AQ.Ab8RN6abc")).toBe("gemini");
    expect(providerFor("AIzaSyABC")).toBe("gemini");
    expect(modelFor("anthropic")).toMatch(/claude/);
    expect(modelFor("gemini")).toMatch(/gemini/);
  });

  it("query routes to reports by resource enum", async () => {
    const tb = await callTool("query", { resource: "trial_balance" }, ctx);
    expect(tb.success).toBe(true);
    expect(Array.isArray(tb.rows)).toBe(true);

    const ledgers = await callTool("query", { resource: "ledgers" }, ctx);
    expect(ledgers.success).toBe(true);
    expect(Array.isArray(ledgers.ledgers)).toBe(true);
    expect(ledgers.ledgers.length).toBeGreaterThan(0); // seeded masters
  });

  it("query refuses unknown resources and missing company", async () => {
    await expect(callTool("query", { resource: "nope" }, ctx)).rejects.toThrow(/Unknown resource/);
    await expect(callTool("query", { resource: "trial_balance" }, {})).rejects.toThrow(/No active company/);
  });

  it("lookup resolves a seeded ledger name to an id", async () => {
    const res = await callTool("lookup", { kind: "ledger", query: "Cash" }, ctx);
    expect(Array.isArray(res.matches)).toBe(true);
    const cash = res.matches.find((m) => m.name === "Cash");
    expect(cash && typeof cash.id).toBe("number");
  });

  it("propose drafts a reviewable action and never executes", async () => {
    const res = await callTool(
      "propose",
      {
        action: "create_voucher",
        summary: "Receipt ₹1000",
        payload: { voucher_type: "Receipt", date: "2026-04-10", entries: [{ ledger_id: 1, type: "Dr", amount: 1000 }] },
      },
      ctx
    );
    expect(res.ok).toBe(true);
    expect(res.proposal.requiresApproval).toBe(true);
    expect(res.proposal.channel).toBe("voucher:create");
    expect(res.proposal.args.company_id).toBe(ctx.company_id); // context injected
  });

  it("propose reports missing required fields instead of guessing", async () => {
    const res = await callTool("propose", { action: "reconcile", payload: { entry_id: 5 } }, ctx);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/voucher_id|ledger_id/);
  });
});
