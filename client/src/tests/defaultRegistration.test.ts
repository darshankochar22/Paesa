import { describe, it, expect } from "vitest";
import { pickDefaultRegistrationFrom } from "../pages/transactions/utils/defaultRegistration";

// Bug 5 regression: a NEW voucher must prefill the company's PERSISTED default GST
// registration — never "the first record in the table".
describe("pickDefaultRegistrationFrom (new-voucher default)", () => {
  // Arunachal is deliberately FIRST so a "first record" fallback would wrongly pick it.
  const registrations = [
    { gst_id: 1, state_id: "Arunachal Pradesh", is_active: 1 },
    { gst_id: 2, state_id: "Chhattisgarh", is_active: 1 },
    { gst_id: 3, state_id: "Maharashtra", is_active: 1 },
  ];

  it("returns the persisted default (Chhattisgarh), not the first record (Arunachal)", () => {
    const chosen = pickDefaultRegistrationFrom(2, registrations);
    expect(chosen).toBeTruthy();
    expect(chosen.state_id).toBe("Chhattisgarh");
    expect(chosen.gst_id).toBe(2);
  });

  it("returns null when no default is persisted — NO fallback to the first record", () => {
    expect(pickDefaultRegistrationFrom(null, registrations)).toBeNull();
    expect(pickDefaultRegistrationFrom(undefined, registrations)).toBeNull();
  });

  it("returns null when the persisted id no longer exists (deleted registration)", () => {
    expect(pickDefaultRegistrationFrom(99, registrations)).toBeNull();
  });

  it("tolerates string vs number id types", () => {
    const chosen = pickDefaultRegistrationFrom("2" as any, registrations);
    expect(chosen?.state_id).toBe("Chhattisgarh");
  });
});
