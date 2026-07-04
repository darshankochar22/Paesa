import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CompanyTaxRegistrationPopup from "../pages/transactions/components/popups/CompanyTaxRegistrationPopup";

// Regression: the "Change Company/Tax Registration" popup must LIST every GST registration
// it is given (bug: it showed only "Not Applicable" when the list arrived empty because a
// sibling master-fetch had rejected and blanked it).
describe("CompanyTaxRegistrationPopup", () => {
  const registrations = [
    { gst_id: 1, state_id: "Arunachal Pradesh", gstin: "12ABCDE1234F1Z5", is_active: 1 },
    { gst_id: 2, state_id: "Chhattisgarh", gstin: "22AAMCS8857L1ZM", is_active: 1 },
    { gst_id: 3, state_id: "Rajasthan", gstin: "08AAACI1681G2ZO", is_active: 1 },
  ];

  it("renders a row per GST registration (company-wise list), plus Not Applicable", () => {
    render(
      <CompanyTaxRegistrationPopup
        gstRegistrations={registrations}
        taxUnits={[]}
        onClose={() => {}}
        onSelect={() => {}}
      />
    );

    expect(screen.getByText("♦ Not Applicable")).toBeTruthy();
    expect(screen.getByText("Arunachal Pradesh Registration")).toBeTruthy();
    expect(screen.getByText("Chhattisgarh Registration")).toBeTruthy();
    expect(screen.getByText("Rajasthan Registration")).toBeTruthy();
    // Their GSTINs appear too.
    expect(screen.getByText("22AAMCS8857L1ZM")).toBeTruthy();
  });

  it("selecting a registration returns that registration's raw row", () => {
    const onSelect = vi.fn();
    render(
      <CompanyTaxRegistrationPopup
        gstRegistrations={registrations}
        taxUnits={[]}
        onClose={() => {}}
        onSelect={onSelect}
      />
    );
    screen.getByText("Chhattisgarh Registration").click();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].raw.gst_id).toBe(2);
  });
});
