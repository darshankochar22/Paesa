export interface CompanyType {
  company_id?: number;
  name: string;
  mailing_name?: string;
  address1?: string;
  address2?: string;
  state?: string;
  country?: string;
  pincode?: string;
  telephone?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  website?: string;
  base_currency_symbol?: string;
  formal_name?: string;
  financial_year_beginning_from?: string;
  books_beginning_from?: string;
  access_control?: string;
  edit_log?: string;
  created_at?: string;
}

export interface FYType {
  fy_id?: number;
  company_id?: number;
  start_date: string;
  end_date: string;
  is_active?: number;
  is_closed?: number;
  closing_date?: string;
}

export interface GroupType {
  group_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  parent_group_id?: number;
  is_primary?: number;
  is_predefined?: number;
  nature?: string;
  affect_gross_profit?: number;
  behaves_like_subledger?: number;
  show_net_debit_credit?: number;
  used_for_calculation?: number;
  allocation_method?: string;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  hsn_sac_code?: string;
  statutory_details?: string;
  sort_order?: number;
  group_type?: string;
  display_order?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LedgerType {
  ledger_id?: number;
  company_id?: number;
  group_id?: number;
  name: string;
  alias?: string;
  ledger_type?: string;
  nature?: string;
  opening_balance?: number;
  closing_balance?: number;
  is_bill_wise?: number;
  maintain_inventory_values?: number;
  mailing_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  registration_type?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CostCentreType {
  cc_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  parent_id?: number;
  category?: string;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UnitType {
  unit_id?: number;
  company_id?: number;
  name: string;
  symbol: string;
  formal_name?: string;
  decimal_places?: number;
  unit_quantity_code?: string;
  unit_type?: string;
  is_simple?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StockGroupType {
  sg_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  parent_group_id?: number;
  should_quantities_be_added?: number;
  hsn_sac_code?: string;
  hsn_sac_description?: string;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  statutory_details?: string;  
  is_primary?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StockCategoryType {
  sc_id?: number;
  company_id?: number;
  name: string;
  alias?: string;     
  description?: string;
  parent_category_id?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StockItemType {
  item_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  group_id?: number;
  category_id?: number;
  unit_id?: number;
  gst_applicable?: string;
  hsn_code?: string;
  sac_code?: string;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  type_of_supply?: string;
  rate_of_duty?: number;
  statutory_details?: string;
  opening_quantity?: number;
  opening_rate?: number;
  opening_value?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  track_batches?: number;
  track_expiry?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GodownType {
  godown_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  parent_godown_id?: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_primary?: number;
  is_main_location?: number;
  allow_storage_of_materials?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CurrencyType {
  currency_id?: number;
  company_id?: number;
  name: string;
  formal_name?: string;
  iso_code: string;
  symbol?: string;
  decimal_places?: number;
  decimal_symbol?: string;
  decimal_places_in_words?: string;
  suffix_symbol_to_amount?: number;
  show_amount_in_millions?: number;
  word_representing_amount_after_decimal?: string;
  add_space_between_amount_and_symbol?: number;
  is_active?: number;
  is_default?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VoucherTypeType {
  vt_id?: number;
  company_id?: number;
  name: string;
  short_name?: string;
  category?: string;
  default_voucher_class?: string;
  affects_inventory?: number;
  affects_accounting?: number;
  affects_gst?: number;
  numbering_method?: string;
  numbering_prefix?: string;
  numbering_suffix?: string;
  starts_with?: number;
  is_predefined?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GSTRegistrationType {
  gst_id?: number;
  company_id?: number;
  registration_type?: string;
  registration_status?: string;
  gstin?: string;
  gst_username?: string;
  legal_name?: string;
  trade_name?: string;
  state_id?: string;
  registration_date?: string;
  effective_from?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GSTClassificationType {
  gc_id?: number;
  company_id?: number;
  name: string;
  nature_of_transaction?: string;
  hsn_sac_code?: string;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cess_rate?: number;
  valuation_type?: string;
  description?: string;
  is_predefined?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VoucherEntryType {
  entry_id?: number;
  voucher_id?: number;
  ledger_id?: number;
  ledger_name?: string;
  type: string;
  amount?: number;
  amount_forex?: number;
  currency?: string;
  narration?: string;
}

export interface VoucherRecordType {
  voucher_id?: number;
  company_id?: number;
  fy_id?: number;
  voucher_type: string;
  voucher_number?: string;
  date: string;
  reference_number?: string;
  reference_date?: string;
  narration?: string;
  party_ledger_id?: number;
  party_name?: string;
  place_of_supply?: string;
  is_invoice?: number;
  is_accounting_voucher?: number;
  is_inventory_voucher?: number;
  is_order_voucher?: number;
  is_cancelled?: number;
  is_optional?: number;
  is_post_dated?: number;
  created_at?: string;
  updated_at?: string;
  entries?: VoucherEntryType[];
}

export interface EmployeeGroupType {
  employee_group_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  parent_group_id?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeType {
  employee_id?: number;
  company_id?: number;
  employee_group_id?: number;
  name: string;
  employee_code?: string;
  designation?: string;
  department?: string;
  date_of_joining?: string;
  date_of_leaving?: string;
  mobile?: string;
  email?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  pan?: string;
  aadhaar?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollUnitType {
  payroll_unit_id?: number;
  company_id?: number;
  name: string;
  symbol?: string;
  unit_type?: string;
  decimal_places?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PayHeadType {
  pay_head_id?: number;
  company_id?: number;
  name: string;
  pay_head_type?: string;
  calculation_type?: string;
  affects_net_salary?: number;
  under_group?: string;
  statutory_component?: string;
  percentage_or_amount?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceTypeType {
  attendance_type_id?: number;
  company_id?: number;
  name: string;
  type?: string;
  unit_id?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SalaryStructureType {
  structure_id?: number;
  company_id?: number;
  employee_id?: number;
  effective_from: string;
  pay_head_id?: number;
  amount?: number;
  calculation_mode?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FeatureGroupType {
  feature_group_id?: number;
  group_key?: string;
  group_name?: string;
  online_access?: number;
  display_order?: number;
  is_active?: number;
}

export interface FeatureItemType {
  feature_item_id?: number;
  feature_group_id?: number;
  feature_key?: string;
  feature_name?: string;
  description?: string;
  control_type?: string;
  default_value_boolean?: number;
  display_order?: number;
  is_mandatory?: number;
  is_active?: number;
}

export interface TallyFeaturesType {
  tally_feature_id?: number;
  company_id?: number;
  maintain_accounts?: number;
  enable_bill_wise_entry?: number;
  enable_cost_centres?: number;
  maintain_inventory?: number;
  integrate_accounts_with_inventory?: number;
  enable_multiple_price_levels?: number;
  enable_batches?: number;
  maintain_expiry_date_for_batches?: number;
  use_discount_column_in_invoices?: number;
  use_separate_actual_billed_qty?: number;
  enable_gst?: number;
  set_alter_company_gst_details?: number;
  enable_tds?: number;
  enable_tcs?: number;
  enable_browser_access_for_reports?: number;
  enable_tally_net_services?: number;
  enable_payment_request_qr?: number;
  enable_multiple_addresses?: number;
  mark_modified_vouchers?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DaybookEntryType extends VoucherRecordType {
  particulars?: string;
  debit?: number;
  credit?: number;
}

export interface StockGroupTreeNode extends StockGroupType {
  children: StockGroupTreeNode[]; 
}


declare global {
  interface Window {
    api: {
      company: {
        create:         (data: Partial<CompanyType>) => Promise<{ success: boolean; company: CompanyType; error?: string }>
        getAll:         () => Promise<{ success: boolean; companies: CompanyType[]; error?: string }>
        getById:        (id: number) => Promise<{ success: boolean; company: CompanyType; error?: string }>
        update:         (data: Partial<CompanyType>) => Promise<{ success: boolean; company: CompanyType; error?: string }>
        delete:         (id: number) => Promise<{ success: boolean; error?: string }>
        verifyPassword: (data: { id: number; password: string }) => Promise<{ success: boolean; error?: string }>
      }

      fy: {
        create:    (data: Partial<FYType>) => Promise<{ success: boolean; fy: FYType; error?: string }>
        getAll:    (company_id: number) => Promise<{ success: boolean; financialYears: FYType[]; error?: string }>
        getById:   (id: number) => Promise<{ success: boolean; fy: FYType; error?: string }>
        setActive: (fy_id: number, company_id: number) => Promise<{ success: boolean; error?: string }>
        delete:    (id: number) => Promise<{ success: boolean; error?: string }>
      }

      group: {
        create:  (data: Partial<GroupType>) => Promise<{ success: boolean; group: GroupType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; groups: GroupType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; group: GroupType; error?: string }>
        update:  (data: Partial<GroupType>) => Promise<{ success: boolean; group: GroupType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
        getTree: (company_id: number) => Promise<{ success: boolean; tree: GroupType[]; error?: string }>
      }

      ledger: {
        create:     (data: Partial<LedgerType>) => Promise<{ success: boolean; ledger: LedgerType; error?: string }>
        getAll:     (company_id: number) => Promise<{ success: boolean; ledgers: LedgerType[]; error?: string }>
        getById:    (id: number) => Promise<{ success: boolean; ledger: LedgerType; error?: string }>
        update:     (data: Partial<LedgerType>) => Promise<{ success: boolean; ledger: LedgerType; error?: string }>
        delete:     (id: number) => Promise<{ success: boolean; error?: string }>
        getByGroup: (company_id: number, groupId: number) => Promise<{ success: boolean; ledgers: LedgerType[]; error?: string }>
      }

      costCentre: {
        create:  (data: Partial<CostCentreType>) => Promise<{ success: boolean; costCentre: CostCentreType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; costCentres: CostCentreType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; costCentre: CostCentreType; error?: string }>
        update:  (data: Partial<CostCentreType>) => Promise<{ success: boolean; costCentre: CostCentreType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
        getTree: (company_id: number) => Promise<{ success: boolean; tree: CostCentreType[]; error?: string }>
      }

      unit: {
        create:  (data: Partial<UnitType>) => Promise<{ success: boolean; unit: UnitType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; units: UnitType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; unit: UnitType; error?: string }>
        update:  (data: Partial<UnitType>) => Promise<{ success: boolean; unit: UnitType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

     stockGroup: {
        create:  (data: Partial<StockGroupType>) => Promise<{ success: boolean; group?: StockGroupType; error?: string }>
        getAll:  (company_id: number)            => Promise<{ success: boolean; stockGroups?: StockGroupType[]; error?: string }>
        getById: (id: number)                    => Promise<{ success: boolean; group?: StockGroupType; error?: string }>
        update:  (data: Partial<StockGroupType>) => Promise<{ success: boolean; group?: StockGroupType; error?: string }>
        delete:  (id: number)                    => Promise<{ success: boolean; error?: string }>
        getTree: (company_id: number)            => Promise<{ success: boolean; tree?: StockGroupTreeNode[]; error?: string }>
    }

      stockCategory: {
        create:  (data: Partial<StockCategoryType>) => Promise<{ success: boolean; category: StockCategoryType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; stockCategories: StockCategoryType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; category: StockCategoryType; error?: string }>
        update:  (data: Partial<StockCategoryType>) => Promise<{ success: boolean; category: StockCategoryType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      stockItem: {
       create:        (data: Partial<StockItemType>) => Promise<{ success: boolean; item?: StockItemType; error?: string }>
       getAll:        (company_id: number)           => Promise<{ success: boolean; stockItems?: StockItemType[]; error?: string }>
       getById:       (id: number)                   => Promise<{ success: boolean; item?: StockItemType; error?: string }>
       update:        (data: Partial<StockItemType>) => Promise<{ success: boolean; item?: StockItemType; error?: string }>
       delete:        (id: number)                   => Promise<{ success: boolean; error?: string }>
       getByGroup:    (args: { company_id: number; group_id: number })    => Promise<{ success: boolean; stockItems?: StockItemType[]; error?: string }>
       getByCategory: (args: { company_id: number; category_id: number }) => Promise<{ success: boolean; stockItems?: StockItemType[]; error?: string }>
     }

      godown: {
        create:  (data: Partial<GodownType>) => Promise<{ success: boolean; godown: GodownType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; godowns: GodownType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; godown: GodownType; error?: string }>
        update:  (data: Partial<GodownType>) => Promise<{ success: boolean; godown: GodownType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
        getTree: (company_id: number) => Promise<{ success: boolean; tree: GodownType[]; error?: string }>
      }

      voucher: {
        create:     (data: Partial<VoucherRecordType>) => Promise<{ success: boolean; voucher: VoucherRecordType; error?: string }>
        getAll:     (company_id: number, fy_id: number) => Promise<{ success: boolean; vouchers: VoucherRecordType[]; error?: string }>
        getById:    (id: number) => Promise<{ success: boolean; voucher: VoucherRecordType; error?: string }>
        update:     (data: Partial<VoucherRecordType>) => Promise<{ success: boolean; voucher: VoucherRecordType; error?: string }>
        delete:     (id: number) => Promise<{ success: boolean; error?: string }>
        cancel:     (id: number) => Promise<{ success: boolean; error?: string }>
        getDaybook: (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; vouchers: VoucherRecordType[]; error?: string }>
        getByType:  (company_id: number, fy_id: number, type: string) => Promise<{ success: boolean; vouchers: VoucherRecordType[]; error?: string }>
        getByLedger:(company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; vouchers: VoucherRecordType[]; error?: string }>
        getNextNumber: (company_id: number, fy_id: number, type: string) => Promise<{ success: boolean; nextNumber?: number; voucher_number?: string; error?: string }>
        getLedgerBalance: (ledger_id: number, company_id: number, fy_id: number) => Promise<{ success: boolean; balance?: string; rawBalance?: number; error?: string }>
        searchLedgers: (company_id: number, searchTerm: string) => Promise<{ success: boolean; ledgers: LedgerType[]; error?: string }>
      }

      report: {
        trialBalance: (company_id: number, fy_id: number) => Promise<{ success: boolean; rows: { ledger_id: number; ledger_name: string; debit: number; credit: number }[]; totalDebit: number; totalCredit: number }>
        balanceSheet: (company_id: number, fy_id: number) => Promise<{ success: boolean; assets: { ledger_id: number; ledger_name: string; balance: number }[]; liabilities: { ledger_id: number; ledger_name: string; balance: number }[]; totalAssets: number; totalLiabilities: number }>
        profitLoss:   (company_id: number, fy_id: number) => Promise<{ success: boolean; income: { ledger_id: number; ledger_name: string; balance: number }[]; expenses: { ledger_id: number; ledger_name: string; balance: number }[]; totalIncome: number; totalExpenses: number; netProfit: number; isProfit: boolean }>
        ledgerReport: (company_id: number, fy_id: number, ledger_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; ledger_name: string; opening_balance: number; rows: { date: string; voucher_type: string; debit: number; credit: number; balance: number; narration: string }[]; closing_balance: number }>
        cashBook:     (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; ledger_name: string; rows: { date: string; voucher_type: string; debit: number; credit: number; balance: number }[] }>
        bankBook:     (company_id: number, fy_id: number, ledger_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; ledger_name: string; rows: { date: string; voucher_type: string; debit: number; credit: number; balance: number }[] }>
        daybook:      (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; vouchers: DaybookEntryType[] }>
      }

      banking: {
        getUnreconciled: (company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; transactions: { entry_id: number; voucher_id: number; date: string; type: string; amount: number }[] }>
        reconcile:       (data: { entry_id: number; voucher_id: number; ledger_id: number; reconciled_date?: string; bank_date?: string; bank_reference?: string }) => Promise<{ success: boolean; error?: string }>
        unreconcile:     (entry_id: number) => Promise<{ success: boolean; error?: string }>
        getStatement:    (company_id: number, fy_id: number, ledger_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; ledger_name: string; rows: { entry_id: number; date: string; type: string; amount: number; is_reconciled: boolean; balance: number }[] }>
        getSummary:      (company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; ledger_name: string; book_balance: number; reconciled_amount: number; unreconciled_amount: number; total_reconciled_count: number }>
      }

      currency: {
        create:     (data: Partial<CurrencyType>) => Promise<{ success: boolean; currency: CurrencyType; error?: string }>
        getAll:     (company_id: number) => Promise<{ success: boolean; currencies: CurrencyType[]; error?: string }>
        getById:    (id: number) => Promise<{ success: boolean; currency: CurrencyType; error?: string }>
        update:     (data: Partial<CurrencyType>) => Promise<{ success: boolean; currency: CurrencyType; error?: string }>
        delete:     (id: number) => Promise<{ success: boolean; error?: string }>
        setDefault: (company_id: number, id: number) => Promise<{ success: boolean; error?: string }>
      }

      voucherType: {
        create:       (data: Partial<VoucherTypeType>) => Promise<{ success: boolean; voucherType: VoucherTypeType; error?: string }>
        getAll:       (company_id: number) => Promise<{ success: boolean; voucherTypes: VoucherTypeType[]; error?: string }>
        getById:      (id: number) => Promise<{ success: boolean; voucherType: VoucherTypeType; error?: string }>
        update:       (data: Partial<VoucherTypeType>) => Promise<{ success: boolean; voucherType: VoucherTypeType; error?: string }>
        delete:       (id: number) => Promise<{ success: boolean; error?: string }>
        getConfig:    (id: number) => Promise<{ success: boolean; config: { config_id: number; voucher_type_id: number; allow_narration: number; print_after_save: number }; error?: string }>
        updateConfig: (data: { voucher_type_id: number; [key: string]: unknown }) => Promise<{ success: boolean; config: { config_id: number }; error?: string }>
      }

      gstRegistration: {
        create:  (data: Partial<GSTRegistrationType>) => Promise<{ success: boolean; gstRegistration: GSTRegistrationType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; gstRegistrations: GSTRegistrationType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; gstRegistration: GSTRegistrationType; error?: string }>
        update:  (data: Partial<GSTRegistrationType>) => Promise<{ success: boolean; gstRegistration: GSTRegistrationType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      gstClassification: {
        create:  (data: Partial<GSTClassificationType>) => Promise<{ success: boolean; classification: GSTClassificationType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; gstClassifications: GSTClassificationType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; classification: GSTClassificationType; error?: string }>
        update:  (data: Partial<GSTClassificationType>) => Promise<{ success: boolean; classification: GSTClassificationType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      master: {
        getMenu: (company_id?: number) => Promise<{ success: boolean; menu: { title: string; items: string[] }[] }>
      }

      tallyFeatures: {
        get:    (company_id: number) => Promise<{ success: boolean; features: TallyFeaturesType }>
        update: (data: Partial<TallyFeaturesType>) => Promise<{ success: boolean; features: TallyFeaturesType }>
        reset:  (company_id: number) => Promise<{ success: boolean; features: TallyFeaturesType }>
      }

      companyCreationSuccess: {
        get:    (company_id: number) => Promise<{ success: boolean; record: { id: number; company_id: number; success_screen_shown: number; feature_setup_completed: number } }>
        update: (data: { company_id: number; [key: string]: unknown }) => Promise<{ success: boolean; record: { id: number } }>
      }

      featureGroup: {
        getAll:  () => Promise<{ success: boolean; featureGroups: FeatureGroupType[] }>
        getById: (id: number) => Promise<{ success: boolean; group: FeatureGroupType }>
      }

      featureItem: {
        getAll:     () => Promise<{ success: boolean; featureItems: FeatureItemType[] }>
        getById:    (id: number) => Promise<{ success: boolean; item: FeatureItemType }>
        getByGroup: (group_id: number) => Promise<{ success: boolean; featureItems: FeatureItemType[] }>
      }

      companyFeatureValues: {
        get:        (company_id: number) => Promise<{ success: boolean; values: { id: number; company_id: number; feature_item_id: number; value_boolean: number; is_enabled: number }[] }>
        getByGroup: (company_id: number, group_id: number) => Promise<{ success: boolean; values: { id: number; feature_item_id: number; value_boolean: number; is_enabled: number }[] }>
        update:     (data: { company_id: number; feature_item_id: number; value_boolean?: number; is_enabled?: number }) => Promise<{ success: boolean; value: { id: number } }>
        updateBulk: (company_id: number, values: { feature_item_id: number; value_boolean?: number; is_enabled?: number }[]) => Promise<{ success: boolean; updated: { id: number }[] }>
      }

      attendanceType: {
        create:  (data: Partial<AttendanceTypeType>) => Promise<{ success: boolean; attendanceType: AttendanceTypeType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; attendanceTypes: AttendanceTypeType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; attendanceType: AttendanceTypeType; error?: string }>
        update:  (data: Partial<AttendanceTypeType>) => Promise<{ success: boolean; attendanceType: AttendanceTypeType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      payHead: {
        create:  (data: Partial<PayHeadType>) => Promise<{ success: boolean; payHead: PayHeadType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; payHeads: PayHeadType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; payHead: PayHeadType; error?: string }>
        update:  (data: Partial<PayHeadType>) => Promise<{ success: boolean; payHead: PayHeadType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      salaryStructure: {
        create:        (data: Partial<SalaryStructureType>) => Promise<{ success: boolean; structure: SalaryStructureType; error?: string }>
        createBulk:    (company_id: number, employee_id: number, effective_from: string, entries: Partial<SalaryStructureType>[]) => Promise<{ success: boolean; structures: SalaryStructureType[] }>
        getAll:        (company_id: number) => Promise<{ success: boolean; salaryStructures: SalaryStructureType[] }>
        getById:       (id: number) => Promise<{ success: boolean; structure: SalaryStructureType }>
        getByEmployee: (company_id: number, employee_id: number) => Promise<{ success: boolean; salaryStructures: { effective_from: string; pay_heads: SalaryStructureType[] }[] }>
        update:        (data: Partial<SalaryStructureType>) => Promise<{ success: boolean; structure: SalaryStructureType }>
        delete:        (id: number) => Promise<{ success: boolean; error?: string }>
      }

      employee: {
        create:     (data: Partial<EmployeeType>) => Promise<{ success: boolean; employee: EmployeeType; error?: string }>
        getAll:     (company_id: number) => Promise<{ success: boolean; employees: EmployeeType[]; error?: string }>
        getById:    (id: number) => Promise<{ success: boolean; employee: EmployeeType; error?: string }>
        update:     (data: Partial<EmployeeType>) => Promise<{ success: boolean; employee: EmployeeType; error?: string }>
        delete:     (id: number) => Promise<{ success: boolean; error?: string }>
        getByGroup: (company_id: number, group_id: number) => Promise<{ success: boolean; employees: EmployeeType[] }>
      }

      employeeGroup: {
        create:  (data: Partial<EmployeeGroupType>) => Promise<{ success: boolean; group: EmployeeGroupType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; employeeGroups: EmployeeGroupType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; group: EmployeeGroupType; error?: string }>
        update:  (data: Partial<EmployeeGroupType>) => Promise<{ success: boolean; group: EmployeeGroupType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
        getTree: (company_id: number) => Promise<{ success: boolean; tree: EmployeeGroupType[] }>
      }

      payrollUnit: {
        create:  (data: Partial<PayrollUnitType>) => Promise<{ success: boolean; unit: PayrollUnitType; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; payrollUnits: PayrollUnitType[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; unit: PayrollUnitType; error?: string }>
        update:  (data: Partial<PayrollUnitType>) => Promise<{ success: boolean; unit: PayrollUnitType; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }
    }
  }
}

export {}