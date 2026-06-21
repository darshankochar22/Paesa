import { describe, it, expect } from "vitest";
import { getConfig, DEFAULT_CONFIG, PRIMARY_GROUP_STATUTORY_CONFIG } from "../config/statutoryConfig";
import { calculateGstDetails } from "../pages/master/inventory/stock-item/utils";
import type { FormData } from "../pages/master/inventory/stock-item/types";

describe("calculateGstDetails", () => {
  describe("When GST is Not Applicable", () => {
    it("should force gst_rate_details to as_per_company and type_of_supply to Goods", () => {
      const form = {
        gst_applicable: "Not Applicable",
        gst_rate_details: "specify_here",
        type_of_supply: "Services",
        gst_rate: "18",
        hsn_sac: "1234",
        hsn_sac_description: "Desc",
        hsn_classification_id: "1",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);

      expect(result.gst_rate_details).toBe("as_per_company");
      expect(result.type_of_supply).toBe("Goods");
      expect(result.gst_rate).toBe(0);
      expect(result.cgst_rate).toBe(0);
      expect(result.sgst_rate).toBe(0);
      expect(result.igst_rate).toBe(0);
      expect(result.hsn_sac).toBeNull();
      expect(result.hsn_sac_description).toBeNull();
      expect(result.hsn_classification_id).toBeNull();
    });
  });

  describe("When GST is Applicable — HSN/SAC details", () => {
    it("specify_here: uses form values and sets source to Specified Here", () => {
      const form = {
        gst_applicable: "Applicable",
        hsn_sac_details: "specify_here",
        hsn_sac: " 1234 ",
        hsn_sac_description: " Desc ",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.hsn_sac).toBe("1234");
      expect(result.hsn_sac_description).toBe("Desc");
      expect(result.source_of_details).toBe("Specified Here");
    });

    it("specify_here with whitespace-only strings returns null", () => {
      const form = {
        gst_applicable: "Applicable",
        hsn_sac_details: "specify_here",
        hsn_sac: "   ",
        hsn_sac_description: " \t ",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.hsn_sac).toBeNull();
      expect(result.hsn_sac_description).toBeNull();
    });

    it("use_classification with matching classification", () => {
      const form = {
        gst_applicable: "Applicable",
        hsn_sac_details: "use_classification",
        hsn_classification_id: "42",
      } as unknown as FormData;

      const result = calculateGstDetails(form, [{ gc_id: 42, hsn_sac_code: "9999", description: "Classy" }]);
      expect(result.hsn_classification_id).toBe(42);
      expect(result.hsn_sac).toBe("9999");
      expect(result.hsn_sac_description).toBe("Classy");
    });

    it("use_classification with no matching classification", () => {
      const form = {
        gst_applicable: "Applicable",
        hsn_sac_details: "use_classification",
        hsn_classification_id: "42",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.hsn_sac).toBeNull();
      expect(result.hsn_sac_description).toBeNull();
    });

    it("use_classification with non-numeric gc_id edge case falls back to null", () => {
      const form = {
        gst_applicable: "Applicable",
        hsn_sac_details: "use_classification",
        hsn_classification_id: "abc",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.hsn_classification_id).toBeNull();
    });

    it("specify_in_voucher sets source and keeps others null", () => {
      const form = {
        gst_applicable: "Applicable",
        hsn_sac_details: "specify_in_voucher",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.source_of_details).toBe("Specify in Voucher");
      expect(result.hsn_sac).toBeNull();
      expect(result.hsn_classification_id).toBeNull();
    });

    it("default/unset leaves source as As per Company/Stock Group", () => {
      const form = {
        gst_applicable: "Applicable",
        hsn_sac_details: "as_per_company",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.source_of_details).toBe("As per Company/Stock Group");
    });
  });

  describe("When GST is Applicable — Rate details", () => {
    it("use_classification with matching rate classification", () => {
      const form = {
        gst_applicable: "Applicable",
        gst_rate_details: "use_classification",
        rate_classification_id: "10",
      } as unknown as FormData;

      const result = calculateGstDetails(form, [{ gc_id: 10, taxability: "Taxable", igst_rate: 18, cgst_rate: 9, sgst_rate: 9 }]);
      expect(result.rate_classification_id).toBe(10);
      expect(result.taxability_type).toBe("Taxable");
      expect(result.igst_rate).toBe(18);
      expect(result.cgst_rate).toBe(9);
      expect(result.sgst_rate).toBe(9);
      expect(result.gst_rate).toBe(18);
    });

    it("use_classification with no match stays 0/null", () => {
      const form = {
        gst_applicable: "Applicable",
        gst_rate_details: "use_classification",
        rate_classification_id: "10",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.taxability_type).toBeNull();
      expect(result.gst_rate).toBe(0);
      expect(result.igst_rate).toBe(0);
    });

    it("specify_here with taxability Taxable calculates half rates", () => {
      const form = {
        gst_applicable: "Applicable",
        gst_rate_details: "specify_here",
        taxability_type: "Taxable",
        gst_rate: "12",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.igst_rate).toBe(12);
      expect(result.cgst_rate).toBe(6);
      expect(result.sgst_rate).toBe(6);
      expect(result.gst_rate).toBe(12);
    });

    it("specify_here with taxability non-Taxable (Exempt) stays 0", () => {
      const form = {
        gst_applicable: "Applicable",
        gst_rate_details: "specify_here",
        taxability_type: "Exempt",
        gst_rate: "12", // should be ignored
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.taxability_type).toBe("Exempt");
      expect(result.igst_rate).toBe(0);
      expect(result.cgst_rate).toBe(0);
      expect(result.sgst_rate).toBe(0);
      expect(result.gst_rate).toBe(0);
    });

    it("specify_in_voucher sets source and rates stay 0", () => {
      const form = {
        gst_applicable: "Applicable",
        gst_rate_details: "specify_in_voucher",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.source_of_gst_rate).toBe("Specify in Voucher");
      expect(result.gst_rate).toBe(0);
    });
  });

  describe("Rate calculation correctness", () => {
    it("odd gst_rate (5) splits precisely into 2.5", () => {
      const form = {
        gst_applicable: "Applicable",
        gst_rate_details: "specify_here",
        taxability_type: "Taxable",
        gst_rate: "5",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.cgst_rate).toBe(2.5);
      expect(result.sgst_rate).toBe(2.5);
    });

    it("gst_rate = 0 on a Taxable item stays 0 with no division issues", () => {
      const form = {
        gst_applicable: "Applicable",
        gst_rate_details: "specify_here",
        taxability_type: "Taxable",
        gst_rate: "0",
      } as unknown as FormData;

      const result = calculateGstDetails(form, []);
      expect(result.igst_rate).toBe(0);
      expect(result.cgst_rate).toBe(0);
      expect(result.sgst_rate).toBe(0);
    });
  });

  describe("Cross-cutting / integration", () => {
    it("empty classifications array with use_classification does not throw", () => {
      const form = {
        gst_applicable: "Applicable",
        hsn_sac_details: "use_classification",
        hsn_classification_id: "1",
        gst_rate_details: "use_classification",
        rate_classification_id: "1",
      } as unknown as FormData;

      expect(() => calculateGstDetails(form, [])).not.toThrow();
      const result = calculateGstDetails(form, []);
      expect(result.hsn_sac).toBeNull();
      expect(result.gst_rate).toBe(0);
    });

    it("rate_classification_id as '0' or '' produces null", () => {
      let form = { gst_applicable: "Applicable", gst_rate_details: "use_classification", rate_classification_id: "0" } as unknown as FormData;
      let result = calculateGstDetails(form, [{ gc_id: 0, taxability: "Taxable" }]);
      expect(result.rate_classification_id).toBeNull(); // Because Number("0") || null resolves to null

      form = { gst_applicable: "Applicable", gst_rate_details: "use_classification", rate_classification_id: "" } as unknown as FormData;
      result = calculateGstDetails(form, []);
      expect(result.rate_classification_id).toBeNull();
    });
  });
});

describe("getConfig", () => {
  describe("Parent group override takes priority", () => {
    it("returns parent override even if primary group matches", () => {
      // Both match, but Bank Accounts override should win
      const result = getConfig("Current Assets", "Bank Accounts");
      expect(result.showStatutorySections).toBe(false);
      expect(result.featureToggles).toContain("tds");
      expect(result.statutoryModalToggles.length).toBe(0);
    });
  });

  describe("Primary group config", () => {
    it("returns correct config for Sales Accounts", () => {
      const result = getConfig("Sales Accounts");
      expect(result.showStatutorySections).toBe(true);
      expect(result.statutoryModalToggles).toEqual(["serviceTax", "tcs", "vat", "excise"]);
    });

    it("returns correct config for Capital Account (non-statutory)", () => {
      const result = getConfig("Capital Account");
      expect(result.showStatutorySections).toBe(false);
      expect(result.featureToggles).toEqual(["tds"]);
    });

    it("returns tds and tcs for Branch/Divisions", () => {
      const result = getConfig("Branch/Divisions");
      expect(result.featureToggles).toEqual(["tds", "tcs"]);
    });
  });

  describe("Default config fallback", () => {
    it("returns DEFAULT_CONFIG when primaryGroupName is null", () => {
      expect(getConfig(null)).toEqual(DEFAULT_CONFIG);
    });

    it("returns DEFAULT_CONFIG when primaryGroupName is unknown", () => {
      expect(getConfig("Unknown Group")).toEqual(DEFAULT_CONFIG);
    });

    it("uses primary config when parentGroupName is provided but unknown", () => {
      const result = getConfig("Fixed Assets", "Unknown Parent");
      expect(result.showStatutorySections).toBe(true);
      expect(result.statutoryModalToggles).toContain("excise");
    });

    it("does not crash and falls through to primary when parentGroupName is null/undefined", () => {
      const result1 = getConfig("Fixed Assets", null);
      const result2 = getConfig("Fixed Assets", undefined);
      expect(result1.showStatutorySections).toBe(true);
      expect(result2.showStatutorySections).toBe(true);
    });
  });

  describe("Config shape integrity", () => {
    it("featureToggles and statutoryModalToggles are always arrays", () => {
      Object.values(PRIMARY_GROUP_STATUTORY_CONFIG).forEach(config => {
        expect(Array.isArray(config.featureToggles)).toBe(true);
        expect(Array.isArray(config.statutoryModalToggles)).toBe(true);
      });
      expect(Array.isArray(DEFAULT_CONFIG.featureToggles)).toBe(true);
      expect(Array.isArray(DEFAULT_CONFIG.statutoryModalToggles)).toBe(true);
    });

    it("Groups with showStatutorySections: true have empty featureToggles and vice versa", () => {
      Object.values(PRIMARY_GROUP_STATUTORY_CONFIG).forEach(config => {
        if (config.showStatutorySections) {
          expect(config.featureToggles.length).toBe(0);
        } else {
          expect(config.statutoryModalToggles.length).toBe(0);
        }
      });
    });
  });
});
