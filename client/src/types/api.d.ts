export interface CompanyType {
  id?: number;
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
  password?: string;
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
}

export interface GenericModel {
  id?: number;
  [key: string]: string | number | boolean | undefined | null;
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

export interface VoucherType {
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
  entries?: VoucherEntry[];
}

export interface VoucherEntry {
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

export interface DaybookEntry extends VoucherType {
  particulars?: string;
  debit?: number;
  credit?: number;
}

// Generic API response wrapper
interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
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
        create:   (data: Partial<FYType>) => Promise<{ success: boolean; fy: FYType; error?: string }>
        getAll:   (company_id: number) => Promise<{ success: boolean; financialYears: FYType[]; error?: string }>
        getById:  (id: number) => Promise<{ success: boolean; fy: FYType; error?: string }>
        setActive:(fy_id: number, company_id: number) => Promise<{ success: boolean; error?: string }>
        delete:   (id: number) => Promise<{ success: boolean; error?: string }>
      }

      group: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; group: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; groups: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; group: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; group: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
        getTree: (company_id: number) => Promise<{ success: boolean; tree: GenericModel[]; error?: string }>
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
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; costCentre: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; costCentres: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; costCentre: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; costCentre: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
        getTree: (company_id: number) => Promise<{ success: boolean; tree: GenericModel[]; error?: string }>
      }

      unit: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; unit: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; units: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; unit: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; unit: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      stockGroup: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; group: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; stockGroups: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; group: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; group: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
        getTree: (company_id: number) => Promise<{ success: boolean; tree: GenericModel[]; error?: string }>
      }

      stockCategory: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; category: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; stockCategories: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; category: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; category: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      stockItem: {
        create:       (data: Partial<GenericModel>) => Promise<{ success: boolean; item: GenericModel; error?: string }>
        getAll:       (company_id: number) => Promise<{ success: boolean; stockItems: GenericModel[]; error?: string }>
        getById:      (id: number) => Promise<{ success: boolean; item: GenericModel; error?: string }>
        update:       (data: Partial<GenericModel>) => Promise<{ success: boolean; item: GenericModel; error?: string }>
        delete:       (id: number) => Promise<{ success: boolean; error?: string }>
        getByGroup:   (company_id: number, groupId: number) => Promise<{ success: boolean; stockItems: GenericModel[]; error?: string }>
        getByCategory:(company_id: number, categoryId: number) => Promise<{ success: boolean; stockItems: GenericModel[]; error?: string }>
      }

      godown: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; godown: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; godowns: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; godown: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; godown: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
        getTree: (company_id: number) => Promise<{ success: boolean; tree: GenericModel[]; error?: string }>
      }

      voucher: {
        create:     (data: Partial<VoucherType>) => Promise<{ success: boolean; voucher: VoucherType; error?: string }>
        getAll:     (company_id: number, fy_id: number) => Promise<{ success: boolean; vouchers: VoucherType[]; error?: string }>
        getById:    (id: number) => Promise<{ success: boolean; voucher: VoucherType; error?: string }>
        update:     (data: Partial<VoucherType>) => Promise<{ success: boolean; voucher: VoucherType; error?: string }>
        delete:     (id: number) => Promise<{ success: boolean; error?: string }>
        cancel:     (id: number) => Promise<{ success: boolean; error?: string }>
        getDaybook: (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; vouchers: VoucherType[]; error?: string }>
        getByType:  (company_id: number, fy_id: number, type: string) => Promise<{ success: boolean; vouchers: VoucherType[]; error?: string }>
        getByLedger:(company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; vouchers: VoucherType[]; error?: string }>
      }

      report: {
        trialBalance: (company_id: number, fy_id: number) => Promise<{ success: boolean; rows: GenericModel[]; totalDebit: number; totalCredit: number }>
        balanceSheet: (company_id: number, fy_id: number) => Promise<{ success: boolean; assets: GenericModel[]; liabilities: GenericModel[] }>
        profitLoss:   (company_id: number, fy_id: number) => Promise<{ success: boolean; income: GenericModel[]; expenses: GenericModel[]; netProfit: number }>
        ledgerReport: (company_id: number, fy_id: number, ledger_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; rows: GenericModel[] }>
        cashBook:     (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; rows: GenericModel[] }>
        bankBook:     (company_id: number, fy_id: number, ledger_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; rows: GenericModel[] }>
        daybook:      (company_id: number, fy_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; vouchers: DaybookEntry[] }>
      }

      banking: {
        getUnreconciled: (company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; transactions: GenericModel[] }>
        reconcile:       (data: GenericModel) => Promise<{ success: boolean; error?: string }>
        unreconcile:     (entry_id: number) => Promise<{ success: boolean; error?: string }>
        getStatement:    (company_id: number, fy_id: number, ledger_id: number, from_date?: string, to_date?: string) => Promise<{ success: boolean; rows: GenericModel[] }>
        getSummary:      (company_id: number, fy_id: number, ledgerId: number) => Promise<{ success: boolean; book_balance: number }>
      }

      currency: {
        create:     (data: Partial<GenericModel>) => Promise<{ success: boolean; currency: GenericModel; error?: string }>
        getAll:     (company_id: number) => Promise<{ success: boolean; currencies: GenericModel[]; error?: string }>
        getById:    (id: number) => Promise<{ success: boolean; currency: GenericModel; error?: string }>
        update:     (data: Partial<GenericModel>) => Promise<{ success: boolean; currency: GenericModel; error?: string }>
        delete:     (id: number) => Promise<{ success: boolean; error?: string }>
        setDefault: (company_id: number, id: number) => Promise<{ success: boolean; error?: string }>
      }

      voucherType: {
        create:       (data: Partial<GenericModel>) => Promise<{ success: boolean; voucherType: GenericModel; error?: string }>
        getAll:       (company_id: number) => Promise<{ success: boolean; voucherTypes: GenericModel[]; error?: string }>
        getById:      (id: number) => Promise<{ success: boolean; voucherType: GenericModel; error?: string }>
        update:       (data: Partial<GenericModel>) => Promise<{ success: boolean; voucherType: GenericModel; error?: string }>
        delete:       (id: number) => Promise<{ success: boolean; error?: string }>
        getConfig:    (id: number) => Promise<{ success: boolean; config: GenericModel; error?: string }>
        updateConfig: (data: Partial<GenericModel>) => Promise<{ success: boolean; config: GenericModel; error?: string }>
      }

      gstRegistration: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; gstRegistration: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; gstRegistrations: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; gstRegistration: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; gstRegistration: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      gstClassification: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; classification: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; gstClassifications: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; classification: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; classification: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      master: {
        getMenu: (company_id?: number) => Promise<{ success: boolean; menu: { title: string; items: string[] }[] }>
      }

      tallyFeatures: {
        get:    (company_id: number) => Promise<{ success: boolean; features: GenericModel }>
        update: (data: GenericModel) => Promise<{ success: boolean; features: GenericModel }>
        reset:  (company_id: number) => Promise<{ success: boolean; features: GenericModel }>
      }

      companyCreationSuccess: {
        get:    (company_id: number) => Promise<{ success: boolean; record: GenericModel }>
        update: (data: GenericModel) => Promise<{ success: boolean; record: GenericModel }>
      }

      featureGroup: {
        getAll:  () => Promise<{ success: boolean; featureGroups: GenericModel[] }>
        getById: (id: number) => Promise<{ success: boolean; group: GenericModel }>
      }

      featureItem: {
        getAll:    () => Promise<{ success: boolean; featureItems: GenericModel[] }>
        getById:   (id: number) => Promise<{ success: boolean; item: GenericModel }>
        getByGroup:(group_id: number) => Promise<{ success: boolean; featureItems: GenericModel[] }>
      }

      companyFeatureValues: {
        get:        (company_id: number) => Promise<{ success: boolean; values: GenericModel[] }>
        getByGroup: (company_id: number, group_id: number) => Promise<{ success: boolean; values: GenericModel[] }>
        update:     (data: GenericModel) => Promise<{ success: boolean; value: GenericModel }>
        updateBulk: (company_id: number, values: GenericModel[]) => Promise<{ success: boolean; updated: GenericModel[] }>
      }

      attendanceType: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; attendanceType: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; attendanceTypes: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; attendanceType: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; attendanceType: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      payHead: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; payHead: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; payHeads: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; payHead: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; payHead: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }

      salaryStructure: {
        create:        (data: Partial<GenericModel>) => Promise<{ success: boolean; structure: GenericModel; error?: string }>
        createBulk:    (company_id: number, employee_id: number, effective_from: string, entries: GenericModel[]) => Promise<{ success: boolean; structures: GenericModel[] }>
        getAll:        (company_id: number) => Promise<{ success: boolean; salaryStructures: GenericModel[] }>
        getById:       (id: number) => Promise<{ success: boolean; structure: GenericModel }>
        getByEmployee: (company_id: number, employee_id: number) => Promise<{ success: boolean; salaryStructures: GenericModel[] }>
        update:        (data: Partial<GenericModel>) => Promise<{ success: boolean; structure: GenericModel }>
        delete:        (id: number) => Promise<{ success: boolean; error?: string }>
      }

      employee: {
        create:   (data: Partial<GenericModel>) => Promise<{ success: boolean; employee: GenericModel; error?: string }>
        getAll:   (company_id: number) => Promise<{ success: boolean; employees: GenericModel[]; error?: string }>
        getById:  (id: number) => Promise<{ success: boolean; employee: GenericModel; error?: string }>
        update:   (data: Partial<GenericModel>) => Promise<{ success: boolean; employee: GenericModel; error?: string }>
        delete:   (id: number) => Promise<{ success: boolean; error?: string }>
        getByGroup: (company_id: number, group_id: number) => Promise<{ success: boolean; employees: GenericModel[] }>
      }

      employeeGroup: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; group: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; employeeGroups: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; group: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; group: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
        getTree: (company_id: number) => Promise<{ success: boolean; tree: GenericModel[] }>
      }

      payrollUnit: {
        create:  (data: Partial<GenericModel>) => Promise<{ success: boolean; unit: GenericModel; error?: string }>
        getAll:  (company_id: number) => Promise<{ success: boolean; payrollUnits: GenericModel[]; error?: string }>
        getById: (id: number) => Promise<{ success: boolean; unit: GenericModel; error?: string }>
        update:  (data: Partial<GenericModel>) => Promise<{ success: boolean; unit: GenericModel; error?: string }>
        delete:  (id: number) => Promise<{ success: boolean; error?: string }>
      }
    }
  }
}

export {}