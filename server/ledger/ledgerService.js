
const { db } = require("../db/index");
const { sql, eq, and } = require("drizzle-orm");
const {
  ledgers,
  ledgerBankDetails,
  ledgerStatutoryDetails,
  groups,
} = require("../db/schema");

// Fetch a single ledger row in the legacy snake_case shape (or undefined).
const findLedgerRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${ledgers} WHERE ${whereSql}`);
  return rows[0];
};

const seedDefaultLedgers = async (company_id, groups_arg) => {
  const cashGroup = groups_arg.find(
    (g) => g.name === "Cash-in-hand" && g.company_id === company_id,
  );

  const plGroup = groups_arg.find(
    (g) => g.name === "Capital Account" && g.company_id === company_id,
  );

  const defaults = [
    {
      group_id: cashGroup ? cashGroup.group_id : null,
      name: "Cash",
      ledger_type: "Cash",
      nature: "Assets",
    },
    {
      group_id: plGroup ? plGroup.group_id : null,
      name: "Profit & Loss A/c",
      ledger_type: "General",
      nature: "Liabilities",
    },
  ];

  for (const l of defaults) {
    await db.insert(ledgers).values({
      companyId: company_id,
      groupId: l.group_id,
      name: l.name,
      alias: null,
      ledgerType: l.ledger_type,
      nature: l.nature,
      openingBalance: 0,
      closingBalance: 0,
      isBillWise: 0,
      maintainInventoryValues: 0,
      mailingName: null,
      address1: null,
      address2: null,
      city: null,
      state: null,
      country: null,
      pincode: null,
      phone: null,
      email: null,
      gstin: null,
      pan: null,
      registrationType: "Unregistered",
      defaultCreditPeriod: 0,
      checkCreditDays: 0,
      allowCostCentres: 0,
      invoiceRounding: 0,
      roundingMethod: null,
      roundingLimit: 0,
      isActive: 1,
      isPredefined: 1,
      additionalGstDetails: 0,
      serviceTaxDetails: 0,
      includeAssessableValue: "Not Applicable",
      methodOfCalculation: "Based on Value",
      otherStatutoryDetails: 0,
      activateInterest: 0,
      interestIncludeAdded: 0,
      interestIncludeDeducted: 0,
      interestRate: 0,
      interestStyle: "30-Day Month",
      interestBalances: "All Balances",
    });
  }
};

module.exports = {
  seedDefaultLedgers,

  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${ledgers}
            WHERE ${ledgers.companyId} = ${data.company_id}
              AND LOWER(${ledgers.name}) = LOWER(${data.name})
              AND ${ledgers.isActive} = 1`,
      );

      if (exists.length > 0) {
        return {
          success: false,
          error: "Ledger already exists",
        };
      }

      const inserted = await db
        .insert(ledgers)
        .values({
          companyId: data.company_id,
          groupId: data.group_id || null,
          name: data.name,
          alias: data.alias || null,
          ledgerType: data.ledger_type || "General",
          nature: data.nature || null,
          openingBalance: data.opening_balance || 0,
          closingBalance: data.closing_balance || 0,
          isBillWise: data.is_bill_wise ? 1 : 0,
          maintainInventoryValues: data.maintain_inventory_values ? 1 : 0,
          mailingName: data.mailing_name || null,
          address1: data.address1 || null,
          address2: data.address2 || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          pincode: data.pincode || null,
          phone: data.phone || null,
          email: data.email || null,
          gstin: data.gstin || null,
          pan: data.pan || null,
          registrationType: data.registration_type || "Unregistered",
          defaultCreditPeriod: data.default_credit_period || 0,
          checkCreditDays: data.check_credit_days ? 1 : 0,
          allowCostCentres: data.allow_cost_centres ? 1 : 0,
          invoiceRounding: data.invoice_rounding ? 1 : 0,
          roundingMethod: data.rounding_method || null,
          roundingLimit: data.rounding_limit || 0,
          isActive: 1,
          isPredefined: 0,
          additionalGstDetails: data.additional_gst_details ? 1 : 0,
          serviceTaxDetails: data.service_tax_details ? 1 : 0,
          behaveAsPaymentGateway: data.behave_as_payment_gateway ? 1 : 0,
          paymentGatewayName: data.payment_gateway_name || null,
          placeOfSupply: data.place_of_supply || null,
          isPartyATransporter: data.is_party_a_transporter || "No",
          transporterId: data.transporter_id || null,
          serviceTaxRegistrationNumber: data.service_tax_registration_number || null,
          typeOfService: data.type_of_service || "Undefined",
          notificationNumber: data.notification_number || null,
          notificationSerialNumber: data.notification_serial_number || null,
          isPartyAnAssociatedEnterprise: data.is_party_an_associated_enterprise || "No",
          doesPartyBelongToNonTaxableTerritory: data.does_party_belong_to_non_taxable_territory || "No",
          vatTypeOfDealer: data.vat_type_of_dealer || "Unknown",
          vatTinNo: data.vat_tin_no || null,
          cstNo: data.cst_no || null,
          salesPurchasesAgainstFormC: data.sales_purchases_against_form_c || "No",
      includeAssessableValue: data.include_assessable_value || "Not Applicable",
      methodOfCalculation: data.method_of_calculation || "Based on Value",
      otherStatutoryDetails: data.other_statutory_details ? 1 : 0,
      setAlterTdsDetails: data.set_alter_tds_details ? 1 : 0,
      setAlterTcsDetails: data.set_alter_tcs_details ? 1 : 0,
      setAlterServiceTaxDetails: data.set_alter_service_tax_details ? 1 : 0,
      setAlterExciseDetails: data.set_alter_excise_details ? 1 : 0,
      setAlterVatDetails: data.set_alter_vat_details ? 1 : 0,
      isTdsDeductable: data.is_tds_deductable ? 1 : 0,
      treatAsTdsExpenses: data.treat_as_tds_expenses ? 1 : 0,
      deducteeType: data.deductee_type || null,
      deductTdsInSameVoucher: data.deduct_tds_in_same_voucher ? 1 : 0,
      natureOfPayment: data.nature_of_payment || null,
      tdsPanItNo: data.tds_pan_it_no || null,
      tdsPanStatus: data.tds_pan_status || null,
      tdsPanEffectiveDate: data.tds_pan_effective_date || null,
      tdsNameOnPan: data.tds_name_on_pan || null,
      tdsDeducteeRef: data.tds_deductee_ref || null,
      tdsTaxUniqueIdNo: data.tds_tax_unique_id_no || null,
      isTcsApplicable: data.is_tcs_applicable ? 1 : 0,
      tcsBuyerLesseeType: data.tcs_buyer_lessee_type || null,
      tcsPanItNo: data.tcs_pan_it_no || null,
      tcsPanStatus: data.tcs_pan_status || null,
      tcsNameOnPan: data.tcs_name_on_pan || null,
      isServiceTaxApplicable: data.is_service_tax_applicable || null,
      isTdsApplicable: data.is_tds_applicable || null,
      isExciseApplicable: data.is_excise_applicable || null,
      isVatCstApplicable: data.is_vat_cst_applicable || null,
      deducteeRef: data.deductee_ref || null,
      taxUniqueIdNo: data.tax_unique_id_no || null,
      activateInterest: data.activate_interest ? 1 : 0,
          interestIncludeAdded: data.interest_include_added ? 1 : 0,
          interestIncludeDeducted: data.interest_include_deducted ? 1 : 0,
          interestRate: Number(data.interest_rate) || 0,
          interestStyle: data.interest_style || "30-Day Month",
          interestBalances: data.interest_balances || "All Balances",
        })
        .returning({ id: ledgers.ledgerId });

      const ledger_id = Number(inserted[0].id);

      if (data.bank_details) {
        await db.insert(ledgerBankDetails).values({
          ledgerId: ledger_id,
          accountHolderName: data.bank_details.account_holder_name || null,
          accountNumber: data.bank_details.account_number || null,
          ifscCode: data.bank_details.ifsc_code || null,
          swiftCode: data.bank_details.swift_code || null,
          bankName: data.bank_details.bank_name || null,
          branchName: data.bank_details.branch_name || null,
          bankConfiguration: data.bank_details.bank_configuration || null,
          chequeBookStartNo: data.bank_details.cheque_book_start_no || null,
          chequeBookEndNo: data.bank_details.cheque_book_end_no || null,
          enableChequePrinting: data.bank_details.enable_cheque_printing ? 1 : 0,
          chequePrintingConfiguration:
            data.bank_details.cheque_printing_configuration || null,
          odLimit: data.bank_details.od_limit || 0,
          transactionType: data.bank_details.transaction_type || null,
          crossUsing: data.bank_details.cross_using || null,
          companyBank: data.bank_details.company_bank || null,
        });
      }

      if (data.statutory_details) {
        await db.insert(ledgerStatutoryDetails).values({
          ledgerId: ledger_id,
          gstApplicability: data.statutory_details.gst_applicability || "Not Applicable",
          hsnSacCode: data.statutory_details.hsn_sac_code || null,
          hsnSacDescription: data.statutory_details.hsn_sac_description || null,
          hsnSacSource: data.statutory_details.hsn_sac_source || "As per Company/Group",
          gstRate: data.statutory_details.gst_rate || 0,
          gstRateSource: data.statutory_details.gst_rate_source || "As per Company/Group",
          taxabilityType: data.statutory_details.taxability_type || null,
          typeOfSupply: data.statutory_details.type_of_supply || "Services",
          cgstRate: data.statutory_details.cgst_rate || 0,
          sgstRate: data.statutory_details.sgst_rate || 0,
          igstRate: data.statutory_details.igst_rate || 0,
          typeOfDutyTax: data.statutory_details.type_of_duty_tax || null,
          percentageOfCalculation:
            data.statutory_details.percentage_of_calculation || 0,
          statutoryDetails: data.statutory_details.statutory_details || null,
          includeInAssessableValueCalculation:
            data.statutory_details.include_in_assessable_value_calculation ||
            "Not Applicable",
          appropriateTo: data.statutory_details.appropriate_to || "Goods",
          methodOfCalculation:
            data.statutory_details.method_of_calculation || "Based on Quantity",
        });
      }

      const ledger = await findLedgerRow(sql`${ledgers.ledgerId} = ${ledger_id}`);

      return {
        success: true,
        ledger,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT ${ledgers}.*, ${groups.name} as group_name
            FROM ${ledgers}
            LEFT JOIN ${groups} ON ${groups.groupId} = ${ledgers.groupId}
            WHERE ${ledgers.companyId} = ${company_id}
              AND ${ledgers.isActive} = 1`,
      );

      return {
        success: true,
        ledgers: rows,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  },

  getById: async (id) => {
    try {
      const ledger = await findLedgerRow(sql`${ledgers.ledgerId} = ${id}`);

      if (!ledger) {
        return {
          success: false,
          error: "Ledger not found",
        };
      }

      const bank = await db.all(
        sql`SELECT * FROM ${ledgerBankDetails} WHERE ${ledgerBankDetails.ledgerId} = ${id}`,
      );

      const statutory = await db.all(
        sql`SELECT * FROM ${ledgerStatutoryDetails} WHERE ${ledgerStatutoryDetails.ledgerId} = ${id}`,
      );

      return {
        success: true,
        ledger: {
          ...ledger,
          bank_details: bank[0] || null,
          statutory_details: statutory[0] || null,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  },

  getByGroup: async (company_id, group_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${ledgers}
            WHERE ${ledgers.companyId} = ${company_id}
              AND ${ledgers.groupId} = ${group_id}
              AND ${ledgers.isActive} = 1`,
      );

      return {
        success: true,
        ledgers: rows,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  },

  update: async (data) => {
    try {
      const ledger = await findLedgerRow(sql`${ledgers.ledgerId} = ${data.ledger_id}`);

      if (!ledger) {
        return {
          success: false,
          error: "Ledger not found",
        };
      }

      if (ledger.is_predefined) {
        return {
          success: false,
          error: "Cannot edit predefined ledgers",
        };
      }

      await db
        .update(ledgers)
        .set({
          groupId: data.group_id ?? ledger.group_id,
          name: data.name ?? ledger.name,
          alias: data.alias ?? ledger.alias,
          ledgerType: data.ledger_type ?? ledger.ledger_type,
          nature: data.nature ?? ledger.nature,
          openingBalance: data.opening_balance ?? ledger.opening_balance,
          closingBalance: data.closing_balance ?? ledger.closing_balance,
          isBillWise: data.is_bill_wise ? 1 : 0,
          maintainInventoryValues: data.maintain_inventory_values ? 1 : 0,
          mailingName: data.mailing_name ?? ledger.mailing_name,
          address1: data.address1 ?? ledger.address1,
          address2: data.address2 ?? ledger.address2,
          city: data.city ?? ledger.city,
          state: data.state ?? ledger.state,
          country: data.country ?? ledger.country,
          pincode: data.pincode ?? ledger.pincode,
          phone: data.phone ?? ledger.phone,
          email: data.email ?? ledger.email,
          gstin: data.gstin ?? ledger.gstin,
          pan: data.pan ?? ledger.pan,
          registrationType: data.registration_type ?? ledger.registration_type,
          defaultCreditPeriod:
            data.default_credit_period ?? ledger.default_credit_period ?? 0,
          checkCreditDays: data.check_credit_days ? 1 : 0,
          allowCostCentres: data.allow_cost_centres ? 1 : 0,
          invoiceRounding: data.invoice_rounding ? 1 : 0,
          roundingMethod: data.rounding_method ?? ledger.rounding_method,
          roundingLimit: data.rounding_limit ?? ledger.rounding_limit ?? 0,
          additionalGstDetails:
            data.additional_gst_details ?? ledger.additional_gst_details ?? 0,
          serviceTaxDetails:
            data.service_tax_details ?? ledger.service_tax_details ?? 0,
          behaveAsPaymentGateway:
            data.behave_as_payment_gateway !== undefined
              ? (data.behave_as_payment_gateway ? 1 : 0)
              : (ledger.behave_as_payment_gateway ?? 0),
          paymentGatewayName: data.payment_gateway_name ?? ledger.payment_gateway_name ?? null,
          placeOfSupply: data.place_of_supply ?? ledger.place_of_supply ?? null,
          isPartyATransporter: data.is_party_a_transporter ?? ledger.is_party_a_transporter ?? "No",
          transporterId: data.transporter_id ?? ledger.transporter_id ?? null,
          serviceTaxRegistrationNumber:
            data.service_tax_registration_number ?? ledger.service_tax_registration_number ?? null,
          typeOfService: data.type_of_service ?? ledger.type_of_service ?? "Undefined",
          notificationNumber: data.notification_number ?? ledger.notification_number ?? null,
          notificationSerialNumber:
            data.notification_serial_number ?? ledger.notification_serial_number ?? null,
          isPartyAnAssociatedEnterprise:
            data.is_party_an_associated_enterprise ?? ledger.is_party_an_associated_enterprise ?? "No",
          doesPartyBelongToNonTaxableTerritory:
            data.does_party_belong_to_non_taxable_territory ??
            ledger.does_party_belong_to_non_taxable_territory ??
            "No",
          vatTypeOfDealer: data.vat_type_of_dealer ?? ledger.vat_type_of_dealer ?? "Unknown",
          vatTinNo: data.vat_tin_no ?? ledger.vat_tin_no ?? null,
          cstNo: data.cst_no ?? ledger.cst_no ?? null,
          salesPurchasesAgainstFormC:
            data.sales_purchases_against_form_c ?? ledger.sales_purchases_against_form_c ?? "No",
          includeAssessableValue:
            data.include_assessable_value ??
            ledger.include_assessable_value ??
            "Not Applicable",
          methodOfCalculation:
            data.method_of_calculation ??
            ledger.method_of_calculation ??
            "Based on Value",
          otherStatutoryDetails:
            data.other_statutory_details ?? ledger.other_statutory_details ?? 0,
          setAlterTdsDetails:
            data.set_alter_tds_details !== undefined
              ? (data.set_alter_tds_details ? 1 : 0)
              : (ledger.set_alter_tds_details ?? 0),
          setAlterTcsDetails:
            data.set_alter_tcs_details !== undefined
              ? (data.set_alter_tcs_details ? 1 : 0)
              : (ledger.set_alter_tcs_details ?? 0),
          setAlterServiceTaxDetails:
            data.set_alter_service_tax_details !== undefined
              ? (data.set_alter_service_tax_details ? 1 : 0)
              : (ledger.set_alter_service_tax_details ?? 0),
          setAlterExciseDetails:
            data.set_alter_excise_details !== undefined
              ? (data.set_alter_excise_details ? 1 : 0)
              : (ledger.set_alter_excise_details ?? 0),
          setAlterVatDetails:
            data.set_alter_vat_details !== undefined
              ? (data.set_alter_vat_details ? 1 : 0)
              : (ledger.set_alter_vat_details ?? 0),
          isTdsDeductable:
            data.is_tds_deductable !== undefined
              ? (data.is_tds_deductable ? 1 : 0)
              : (ledger.is_tds_deductable ?? 0),
          treatAsTdsExpenses:
            data.treat_as_tds_expenses !== undefined
              ? (data.treat_as_tds_expenses ? 1 : 0)
              : (ledger.treat_as_tds_expenses ?? 0),
          deducteeType: data.deductee_type ?? ledger.deductee_type ?? null,
          deductTdsInSameVoucher:
            data.deduct_tds_in_same_voucher !== undefined
              ? (data.deduct_tds_in_same_voucher ? 1 : 0)
              : (ledger.deduct_tds_in_same_voucher ?? 0),
          natureOfPayment: data.nature_of_payment ?? ledger.nature_of_payment ?? null,
          tdsPanItNo: data.tds_pan_it_no ?? ledger.tds_pan_it_no ?? null,
          tdsPanStatus: data.tds_pan_status ?? ledger.tds_pan_status ?? null,
          tdsPanEffectiveDate:
            data.tds_pan_effective_date ?? ledger.tds_pan_effective_date ?? null,
          tdsNameOnPan: data.tds_name_on_pan ?? ledger.tds_name_on_pan ?? null,
          tdsDeducteeRef: data.tds_deductee_ref ?? ledger.tds_deductee_ref ?? null,
          tdsTaxUniqueIdNo: data.tds_tax_unique_id_no ?? ledger.tds_tax_unique_id_no ?? null,
          isTcsApplicable:
            data.is_tcs_applicable !== undefined
              ? (data.is_tcs_applicable ? 1 : 0)
              : (ledger.is_tcs_applicable ?? 0),
          tcsBuyerLesseeType:
            data.tcs_buyer_lessee_type ?? ledger.tcs_buyer_lessee_type ?? null,
          tcsPanItNo: data.tcs_pan_it_no ?? ledger.tcs_pan_it_no ?? null,
          tcsPanStatus: data.tcs_pan_status ?? ledger.tcs_pan_status ?? null,
          tcsNameOnPan: data.tcs_name_on_pan ?? ledger.tcs_name_on_pan ?? null,
          isServiceTaxApplicable:
            data.is_service_tax_applicable ?? ledger.is_service_tax_applicable ?? null,
          isTdsApplicable: data.is_tds_applicable ?? ledger.is_tds_applicable ?? null,
          isExciseApplicable: data.is_excise_applicable ?? ledger.is_excise_applicable ?? null,
          isVatCstApplicable: data.is_vat_cst_applicable ?? ledger.is_vat_cst_applicable ?? null,
          deducteeRef: data.deductee_ref ?? ledger.deductee_ref ?? null,
          taxUniqueIdNo: data.tax_unique_id_no ?? ledger.tax_unique_id_no ?? null,
          activateInterest:
            data.activate_interest !== undefined
              ? data.activate_interest
                ? 1
                : 0
              : (ledger.activate_interest ?? 0),
          interestIncludeAdded:
            data.interest_include_added !== undefined
              ? data.interest_include_added
                ? 1
                : 0
              : (ledger.interest_include_added ?? 0),
          interestIncludeDeducted:
            data.interest_include_deducted !== undefined
              ? data.interest_include_deducted
                ? 1
                : 0
              : (ledger.interest_include_deducted ?? 0),
          interestRate:
            data.interest_rate !== undefined
              ? Number(data.interest_rate) || 0
              : (ledger.interest_rate ?? 0),
          interestStyle: data.interest_style ?? ledger.interest_style ?? "30-Day Month",
          interestBalances:
            data.interest_balances ?? ledger.interest_balances ?? "All Balances",
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(ledgers.ledgerId, data.ledger_id));

      if (data.bank_details) {
        await db
          .delete(ledgerBankDetails)
          .where(eq(ledgerBankDetails.ledgerId, data.ledger_id));

        await db.insert(ledgerBankDetails).values({
          ledgerId: data.ledger_id,
          accountHolderName: data.bank_details.account_holder_name || null,
          accountNumber: data.bank_details.account_number || null,
          ifscCode: data.bank_details.ifsc_code || null,
          swiftCode: data.bank_details.swift_code || null,
          bankName: data.bank_details.bank_name || null,
          branchName: data.bank_details.branch_name || null,
          bankConfiguration: data.bank_details.bank_configuration || null,
          chequeBookStartNo: data.bank_details.cheque_book_start_no || null,
          chequeBookEndNo: data.bank_details.cheque_book_end_no || null,
          enableChequePrinting: data.bank_details.enable_cheque_printing ? 1 : 0,
          chequePrintingConfiguration:
            data.bank_details.cheque_printing_configuration || null,
          odLimit: data.bank_details.od_limit || 0,
          transactionType: data.bank_details.transaction_type || null,
          crossUsing: data.bank_details.cross_using || null,
          companyBank: data.bank_details.company_bank || null,
        });
      }

      if (data.statutory_details) {
        await db
          .delete(ledgerStatutoryDetails)
          .where(eq(ledgerStatutoryDetails.ledgerId, data.ledger_id));

        await db.insert(ledgerStatutoryDetails).values({
          ledgerId: data.ledger_id,
          gstApplicability: data.statutory_details.gst_applicability || "Not Applicable",
          hsnSacCode: data.statutory_details.hsn_sac_code || null,
          hsnSacDescription: data.statutory_details.hsn_sac_description || null,
          hsnSacSource: data.statutory_details.hsn_sac_source || "As per Company/Group",
          gstRate: data.statutory_details.gst_rate || 0,
          gstRateSource: data.statutory_details.gst_rate_source || "As per Company/Group",
          taxabilityType: data.statutory_details.taxability_type || null,
          typeOfSupply: data.statutory_details.type_of_supply || "Services",
          cgstRate: data.statutory_details.cgst_rate || 0,
          sgstRate: data.statutory_details.sgst_rate || 0,
          igstRate: data.statutory_details.igst_rate || 0,
          typeOfDutyTax: data.statutory_details.type_of_duty_tax || null,
          percentageOfCalculation:
            data.statutory_details.percentage_of_calculation || 0,
          statutoryDetails: data.statutory_details.statutory_details || null,
          includeInAssessableValueCalculation:
            data.statutory_details.include_in_assessable_value_calculation ||
            "Not Applicable",
          appropriateTo: data.statutory_details.appropriate_to || "Goods",
          methodOfCalculation:
            data.statutory_details.method_of_calculation || "Based on Quantity",
        });
      }

      const updated = await findLedgerRow(sql`${ledgers.ledgerId} = ${data.ledger_id}`);

      return {
        success: true,
        ledger: updated,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findLedgerRow(sql`${ledgers.ledgerId} = ${id}`);

      if (!existing) {
        return {
          success: false,
          error: "Ledger not found",
        };
      }

      if (existing.is_predefined) {
        return {
          success: false,
          error: "Cannot delete predefined ledgers",
        };
      }

      await db
        .update(ledgers)
        .set({ isActive: 0 })
        .where(eq(ledgers.ledgerId, id));

      return {
        success: true,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  },
};