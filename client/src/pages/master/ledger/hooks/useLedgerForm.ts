import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import type { LedgerType, LedgerAddress, GroupType } from '@/types/api';
import { EMPTY_BANK_DETAILS } from '../components/BankDetailsPopup';
import type { BankDetails } from '../components/BankDetailsPopup';
import type { GSTDetails } from '../components/AdditionalGSTDetails';
import { EMPTY_GST_DETAILS } from '../components/AdditionalGSTDetails';
import { EMPTY_SERVICE_TAX_DETAILS } from '../components/ServiceTaxModal';
import type { ServiceTaxDetails as ServiceTaxRegnDetails } from '../components/ServiceTaxModal';
import { EMPTY_VAT_DETAILS } from '../components/VATDetailsModal';
import type { VATDetails } from '../components/VATDetailsModal';
import type { ExciseTariffFormData } from '@/pages/master/inventory/stock-item/components/ExciseTariffDetails';
import type { VATTaxRateFormData } from '../components/statutory/VATTaxRateDetailsModal';
import { gstin as validateGstin } from '@/lib/validators';
import {
  parseRateSlabs,
  EMPTY_EXCISE_TARIFF_DETAILS,
  EMPTY_VAT_TAX_RATE_DETAILS,
  EMPTY_INTEREST,
  EMPTY_TDS,
  EMPTY_TCS,
  EMPTY_SERVICE_TAX,
  EMPTY_EXCISE,
  EMPTY_VAT,
  EMPTY_STATUTORY,
  INITIAL_FORM,
} from './ledgerFormTypes';
import type { StatutoryDetails, InterestDetails, OtherStatutoryForm } from './ledgerFormTypes';

// Types + EMPTY_* constants live in ledgerFormTypes.ts; re-export the full
// surface so existing consumers (LedgerCreate/LedgerAlter/LedgerTaxPanel)
// keep importing from this hook unchanged.
export * from './ledgerFormTypes';

interface UseLedgerFormOptions {
  mode: 'create' | 'alter';
}

export function useLedgerForm({ mode }: UseLedgerFormOptions) {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [flatGroups, setFlatGroups] = useState<GroupType[]>([]);
  const [groupTree, setGroupTree] = useState<any[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(null);
  const [loadedGroupId, setLoadedGroupId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showLedgerPanel, setShowLedgerPanel] = useState(false);
  const [showBankPopup, setShowBankPopup] = useState(false);
  const [showInterestPopup, setShowInterestPopup] = useState(false);
  const [showOtherStatutoryModal, setShowOtherStatutoryModal] = useState(false);
  const [showGSTDetailsModal, setShowGSTDetailsModal] = useState(false);
  const [serviceTaxDetails, setServiceTaxDetails] =
    useState<ServiceTaxRegnDetails>(EMPTY_SERVICE_TAX_DETAILS);
  const [showServiceTaxModal, setShowServiceTaxModal] = useState(false);
  // ── VAT Details ─────────────────────────────────────────────────────────────
  const [vatDetails, setVatDetails] = useState<VATDetails>({ ...EMPTY_VAT_DETAILS });
  const [showVATDetailsModal, setShowVATDetailsModal] = useState(false);
  const [exciseDetails, setExciseDetails] = useState<ExciseTariffFormData>({
    ...EMPTY_EXCISE_TARIFF_DETAILS,
  });
  const [vatTaxRateDetails, setVatTaxRateDetails] = useState<VATTaxRateFormData>({
    ...EMPTY_VAT_TAX_RATE_DETAILS,
  });
  const [provideBank, setProvideBank] = useState<'No' | 'Yes'>('No');

  const [form, setForm] = useState<Partial<LedgerType>>(INITIAL_FORM);
  // F11 "Enable multiple addresses": extra named addresses + the Yes/No sub-screen.
  const [addresses, setAddresses] = useState<LedgerAddress[]>([]);
  const [showMultiAddress, setShowMultiAddress] = useState(false);
  const [bankForm, setBankForm] = useState<BankDetails>(EMPTY_BANK_DETAILS);
  const [statutoryForm, setStatutoryForm] = useState<StatutoryDetails>(EMPTY_STATUTORY);
  const [interestForm, setInterestForm] = useState<InterestDetails>({ ...EMPTY_INTEREST });
  const [gstDetails, setGstDetails] = useState<GSTDetails>({ ...EMPTY_GST_DETAILS });
  const [otherStatutory, setOtherStatutory] = useState<OtherStatutoryForm>(() => ({
    tds: { ...EMPTY_TDS },
    tcs: { ...EMPTY_TCS },
    serviceTax: { ...EMPTY_SERVICE_TAX },
    excise: { ...EMPTY_EXCISE },
    vat: { ...EMPTY_VAT },
  }));

  const selectedGroup = useMemo(() => {
    return flatGroups.find((g) => g.group_id === form.group_id) || null;
  }, [form.group_id, flatGroups]);

  const groupLineage = useMemo(() => {
    const lineage = {
      isBank: false,
      isOD: false,
      isTax: false,
      isDebtorCreditor: false,
      isInventory: false,
      isIncomeExpense: false,
      isMiscExpense: false,
      primaryGroupName: null as string | null,
      hideMailingExtras: false,
    };
    if (!selectedGroup || flatGroups.length === 0) return lineage;

    const findGroup = (id?: number): GroupType | undefined =>
      flatGroups.find((g) => g.group_id === id);

    const checkLineage = (current: GroupType) => {
      const name = current.name.toLowerCase().trim();
      if (name === 'bank accounts') lineage.isBank = true;
      if (
        name === 'bank od a/c' ||
        name === 'bank od accounts' ||
        name === 'bank od account' ||
        name === 'bank occ a/c'
      ) {
        lineage.isBank = true;
        lineage.isOD = true;
      }
      // ── FIX: only "duties & taxes" sets isTax, not "current assets" ──
      if (name === 'duties & taxes') lineage.isTax = true;
      if (name === 'sundry debtors' || name === 'sundry creditors') lineage.isDebtorCreditor = true;
      if (
        [
          'sales accounts',
          'purchase accounts',
          'direct expenses',
          'indirect expenses',
          'direct incomes',
          'indirect incomes',
        ].includes(name)
      ) {
        lineage.isInventory = true;
      }
      if (
        ['direct expenses', 'indirect expenses', 'direct incomes', 'indirect incomes'].includes(
          name,
        )
      ) {
        lineage.isIncomeExpense = true;
      }
      if (
        name === 'misc. expenses(asset)' ||
        name === 'misc.expenses(asset)' ||
        name === 'misc. expenses (asset)'
      ) {
        lineage.isMiscExpense = true;
      }
      if (
        [
          'cash-in-hand',
          'duties & taxes',
          'misc. expenses(asset)',
          'misc.expenses(asset)',
          'provisions',
          'purchase accounts',
          'sales accounts',
          'reserves & surplus',
          'reserve & surplus',
          'retained earnings',
          'stock-in-hand',
          'stock in hand',
          'suspense a/c',
        ].includes(name)
      ) {
        lineage.hideMailingExtras = true;
      }
      if (!current.parent_group_id) {
        lineage.primaryGroupName = current.name;
        return;
      }
      const parent = findGroup(current.parent_group_id);
      if (parent) checkLineage(parent);
    };

    checkLineage(selectedGroup);
    return lineage;
  }, [selectedGroup, flatGroups]);

  useEffect(() => {
    if (!selectedGroup) return;
    if (mode === 'create' || form.group_id !== loadedGroupId) {
      if (!groupLineage.isBank) {
        setProvideBank('No');
      } else {
        setProvideBank('Yes');
      }
      if (!groupLineage.isInventory) {
        setForm((f) => ({ ...f, invoice_rounding: 0, rounding_method: '', rounding_limit: 0 }));
      }
      setForm((f) => ({
        ...f,
        activate_interest: 0,
        additional_gst_details: 0,
        service_tax_details: 0,
        behave_as_payment_gateway: 0,
        payment_gateway_name: '',
      }));
      setInterestForm(EMPTY_INTEREST);
      // GST-relevant groups default to "Applicable" (rate then inherited "As per Company/Group"
      // → shows as "GST Rate Details Not Provided" until a rate is specified), like Tally; all
      // other groups default to "Not Applicable".
      setStatutoryForm((s) => ({
        ...s,
        gst_applicability: groupLineage.isInventory ? 'Applicable' : 'Not Applicable',
      }));
      setGstDetails({ ...EMPTY_GST_DETAILS });
      setServiceTaxDetails({ ...EMPTY_SERVICE_TAX_DETAILS });
      setVatDetails({ ...EMPTY_VAT_DETAILS });
      setExciseDetails({ ...EMPTY_EXCISE_TARIFF_DETAILS });
      setVatTaxRateDetails({ ...EMPTY_VAT_TAX_RATE_DETAILS });
      setOtherStatutory({
        tds: { ...EMPTY_TDS },
        tcs: { ...EMPTY_TCS },
        serviceTax: { ...EMPTY_SERVICE_TAX },
        excise: { ...EMPTY_EXCISE },
        vat: { ...EMPTY_VAT },
      });
    } else {
      if (groupLineage.isBank) setProvideBank('Yes');
    }
  }, [
    selectedGroup,
    groupLineage.isBank,
    groupLineage.isInventory,
    form.group_id,
    loadedGroupId,
    mode,
  ]);

  const loadInitial = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      if (mode === 'alter') {
        const [ledgerRes, groupRes, treeRes] = await Promise.all([
          window.api.ledger.getAll(companyId),
          window.api.group.getAll(companyId),
          window.api.group.getTree(companyId),
        ]);
        if (ledgerRes.success) setLedgers(ledgerRes.ledgers || []);
        if (groupRes.success) setFlatGroups(groupRes.groups || []);
        if (treeRes.success) setGroupTree(treeRes.tree || []);
      } else {
        const groupRes = await window.api.group.getAll(companyId);
        if (groupRes.success && groupRes.groups) {
          const groups = groupRes.groups || [];
          setFlatGroups(groups);
          const capital = groups.find((g: GroupType) => g.name === 'Capital Account');
          if (capital && !form.group_id) {
            setForm((f) => ({ ...f, group_id: capital.group_id }));
          }
        }
      }
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [companyId, mode]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadLedger = async (ledgerId: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await window.api.ledger.getById(ledgerId);
      if (!res.success || !res.ledger) {
        setError('Ledger not found.');
        return;
      }
      const l = res.ledger;
      setSelectedLedgerId(ledgerId);
      setLoadedGroupId(l.group_id || null);

      const hasBankDetails = !!l.bank_details;
      setProvideBank(hasBankDetails ? 'Yes' : 'No');
      if (hasBankDetails) {
        const bd: any = l.bank_details;
        const parseJSON = (v: any) => {
          if (!v) return undefined;
          try {
            return typeof v === 'string' ? JSON.parse(v) : v;
          } catch {
            return undefined;
          }
        };
        const ranges = parseJSON(bd.cheque_ranges) ?? [];
        const printingCfg = parseJSON(bd.cheque_printing_configuration);
        setBankForm({
          ...EMPTY_BANK_DETAILS,
          ...bd,
          cheque_ranges: ranges,
          cheque_printing_config: printingCfg,
          enable_cheque_printing: bd.enable_cheque_printing ? 'Yes' : 'No',
          set_alter_cheque_books: ranges.length > 0 ? 'Yes' : 'No',
          set_alter_cheque_printing: printingCfg ? 'Yes' : 'No',
        });
      } else {
        setBankForm(EMPTY_BANK_DETAILS);
      }

      const hasStatutory = !!l.statutory_details;
      setStatutoryForm(
        hasStatutory ? { ...EMPTY_STATUTORY, ...l.statutory_details } : EMPTY_STATUTORY,
      );

      setAddresses(Array.isArray((l as any).addresses) ? (l as any).addresses : []);

      setInterestForm({
        activate_interest: l.activate_interest ? 1 : 0,
        interest_include_added: l.interest_include_added ? 1 : 0,
        interest_include_deducted: l.interest_include_deducted ? 1 : 0,
        interest_rate: l.interest_rate ?? 0,
        interest_style: l.interest_style || '30-Day Month',
        interest_balances: l.interest_balances || 'All Balances',
        interest_calculate_on: (l as any).interest_calculate_on || 'Bill-by-Bill',
        interest_applicable_from: (l as any).interest_applicable_from || 'Due Date',
        interest_rounding_method: (l as any).interest_rounding_method || 'No Rounding',
        interest_rounding_limit: (l as any).interest_rounding_limit ?? 1,
        interest_rate_slabs: parseRateSlabs((l as any).interest_rate_slabs),
      });

      setGstDetails({
        place_of_supply: (l as any).place_of_supply || '',
        is_party_a_transporter: (l as any).is_party_a_transporter === 'Yes' ? 'Yes' : 'No',
        transporter_id: (l as any).transporter_id || '',
      });

      setServiceTaxDetails({
        service_tax_registration_number: (l as any).service_tax_registration_number || '',
        type_of_service: (l as any).type_of_service || 'Undefined',
        notification_number: (l as any).notification_number || '',
        notification_serial_number: (l as any).notification_serial_number || '',
        is_party_an_associated_enterprise:
          (l as any).is_party_an_associated_enterprise === 'Yes' ? 'Yes' : 'No',
        does_party_belong_to_non_taxable_territory:
          (l as any).does_party_belong_to_non_taxable_territory === 'Yes' ? 'Yes' : 'No',
      });

      // Load VAT details
      setVatDetails({
        type_of_dealer: (l as any).vat_type_of_dealer || 'Unknown',
        vat_tin_no: (l as any).vat_tin_no || '',
        cst_no: (l as any).cst_no || '',
        sales_purchases_against_form_c:
          (l as any).sales_purchases_against_form_c === 'Yes' ? 'Yes' : 'No',
      });

      setExciseDetails({
        tariff_name: (l as any).excise_tariff_name || '',
        hsn_code: (l as any).excise_hsn_code || '',
        reporting_uom: (l as any).excise_reporting_uom || 'Undefined',
        valuation_type: (l as any).excise_valuation_type || 'Undefined',
        rate: String((l as any).excise_rate ?? '0'),
        rate_per_unit: String((l as any).excise_rate_per_unit ?? '0'),
      });

      setVatTaxRateDetails({
        nature_of_transaction: (l as any).vat_nature_of_transaction || 'Undefined',
        tax_rate: String((l as any).vat_tax_rate ?? '0'),
        tax_type: (l as any).vat_tax_type || 'Unknown',
      });

      setOtherStatutory({
        tds: {
          is_tds_deductable: l.is_tds_deductable ? 1 : 0,
          is_tds_applicable: l.is_tds_applicable || 'Undefined',
          treat_as_tds_expenses: l.treat_as_tds_expenses ? 1 : 0,
          deductee_type: l.deductee_type || 'Unknown',
          deduct_tds_in_same_voucher: l.deduct_tds_in_same_voucher ? 1 : 0,
          nature_of_payment: l.nature_of_payment || 'Undefined',
          tds_pan_it_no: l.tds_pan_it_no || '',
          tds_pan_status: l.tds_pan_status || 'Unknown',
          tds_pan_effective_date: l.tds_pan_effective_date || '',
          tds_name_on_pan: l.tds_name_on_pan || '',
          deductee_ref: (l as any).tds_deductee_ref || '',
          tax_unique_id_no: (l as any).tds_tax_unique_id_no || '',
        },
        tcs: {
          is_tcs_applicable: l.is_tcs_applicable ? 1 : 0,
          tcs_buyer_lessee_type: l.tcs_buyer_lessee_type || 'Unknown',
          tcs_pan_it_no: l.tcs_pan_it_no || '',
          tcs_pan_status: l.tcs_pan_status || 'Unknown',
          tcs_name_on_pan: l.tcs_name_on_pan || '',
          tcs_nature_of_goods: l.tcs_nature_of_goods || '',
          deductee_ref: l.deductee_ref || '',
          tax_unique_id_no: l.tax_unique_id_no || '',
        },
        serviceTax: {
          is_service_tax_applicable: l.is_service_tax_applicable || 'Undefined',
          set_alter_service_tax_details: l.set_alter_service_tax_details ? 1 : 0,
        },
        excise: {
          is_excise_applicable: l.is_excise_applicable || 'Not Applicable',
          set_alter_excise_details: l.set_alter_excise_details ? 1 : 0,
        },
        vat: {
          is_vat_cst_applicable: l.is_vat_cst_applicable || 'Applicable',
          set_alter_vat_details: l.set_alter_vat_details ? 1 : 0,
        },
      });

      setShowGroupPanel(false);
      setForm({
        ledger_id: l.ledger_id,
        name: l.name || '',
        alias: l.alias || '',
        group_id: l.group_id || null,
        ledger_type: l.ledger_type || 'General',
        opening_balance: l.opening_balance || 0,
        opening_balance_type: (l as any).opening_balance_type || 'Dr',
        closing_balance: l.closing_balance || 0,
        mailing_name: l.mailing_name || '',
        address1: l.address1 || '',
        address2: l.address2 || '',
        city: l.city || '',
        state: l.state || 'Select',
        country: l.country || 'India',
        pincode: l.pincode || '',
        phone: l.phone || '',
        email: l.email || '',
        pan: l.pan || '',
        gstin: l.gstin || '',
        registration_type: l.registration_type || 'Unregistered',
        additional_gst_details: (l as any).additional_gst_details ?? 0,
        service_tax_details: (l as any).service_tax_details ?? 0,
        behave_as_payment_gateway: (l as any).behave_as_payment_gateway ? 1 : 0,
        payment_gateway_name: (l as any).payment_gateway_name || '',
        is_bill_wise: l.is_bill_wise || 0,
        maintain_inventory_values: l.maintain_inventory_values || 0,
        default_credit_period: l.default_credit_period || 0,
        check_credit_days: l.check_credit_days || 0,
        allow_cost_centres: l.allow_cost_centres || 0,
        invoice_rounding: l.invoice_rounding || 0,
        rounding_method: l.rounding_method || '',
        rounding_limit: l.rounding_limit || 0,
      });
    } catch {
      setError('Failed to load ledger.');
    } finally {
      setLoading(false);
    }
  };

  const fyLabel = useMemo(() => {
    if (activeFY?.start_date) {
      const d = new Date(activeFY.start_date);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
    }
    return '1-Apr-24';
  }, [activeFY]);

  // ── Field setters ──────────────────────────────────────────────────────────

  const setField =
    (key: keyof LedgerType) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const setNumber = (key: keyof LedgerType) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value === '' ? 0 : Number(e.target.value) }));

  const setBankField =
    (key: keyof BankDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.value }));

  const setBankNumber = (key: keyof BankDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBankForm((f) => ({
      ...f,
      [key]: e.target.value === '' ? undefined : Number(e.target.value),
    }));

  const setStatutoryField =
    (key: keyof StatutoryDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setStatutoryForm((f) => ({ ...f, [key]: e.target.value }));

  const setStatutoryNumber =
    (key: keyof StatutoryDetails) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setStatutoryForm((f) => ({
        ...f,
        [key]: e.target.value === '' ? undefined : Number(e.target.value),
      }));

  const setInterestField = <K extends keyof InterestDetails>(key: K, value: InterestDetails[K]) =>
    setInterestForm((f) => ({ ...f, [key]: value }));

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleActivateInterestChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'No' | 'Yes';
    setForm((f) => ({ ...f, activate_interest: val === 'Yes' ? 1 : 0 }));
    if (val === 'Yes') setShowInterestPopup(true);
    else setInterestForm({ ...EMPTY_INTEREST });
  };

  const handleInterestClose = () => {
    setShowInterestPopup(false);
  };

  const handleProvideBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'No' | 'Yes';
    setProvideBank(val);
    if (val === 'Yes') setShowBankPopup(true);
  };

  const handleBankClose = () => {
    setShowBankPopup(false);
    setProvideBank('No');
    setBankForm(EMPTY_BANK_DETAILS);
  };

  const handleBankAccept = () => {
    setShowBankPopup(false);
  };

  // ── Payment Gateway handler ─────────────────────────────────────────────────

  const handlePaymentGatewayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'No' | 'Yes';
    setForm((f) => ({
      ...f,
      behave_as_payment_gateway: val === 'Yes' ? 1 : 0,
      payment_gateway_name: val === 'Yes' ? f.payment_gateway_name : '',
    }));
  };

  const handleGSTDetailsOpen = () => {
    setForm((f) => ({ ...f, additional_gst_details: 1 }));
    setShowGSTDetailsModal(true);
  };

  const handleGSTDetailsClose = () => {
    setForm((f) => ({ ...f, additional_gst_details: 0 }));
    setGstDetails({ ...EMPTY_GST_DETAILS });
    setShowGSTDetailsModal(false);
  };

  const handleGSTDetailsAccept = (state: GSTDetails) => {
    setGstDetails(state);
    setShowGSTDetailsModal(false);
  };

  const handleServiceTaxOpen = () => {
    setForm((f) => ({ ...f, service_tax_details: 1 }));
    setShowServiceTaxModal(true);
  };

  const handleServiceTaxClose = () => {
    setForm((f) => ({ ...f, service_tax_details: 0 }));
    setServiceTaxDetails({ ...EMPTY_SERVICE_TAX_DETAILS });
    setShowServiceTaxModal(false);
  };

  const handleServiceTaxAccept = (state: ServiceTaxRegnDetails) => {
    setServiceTaxDetails(state);
    setShowServiceTaxModal(false);
  };

  // ── VAT Details handlers ───────────────────────────────────────────────────

  const handleVATDetailsOpen = () => {
    setOtherStatutory((prev) => ({
      ...prev,
      vat: { ...prev.vat, set_alter_vat_details: 1 },
    }));
    setShowVATDetailsModal(true);
  };

  const handleVATDetailsClose = () => {
    setOtherStatutory((prev) => ({
      ...prev,
      vat: { ...prev.vat, set_alter_vat_details: 0 },
    }));
    setVatDetails({ ...EMPTY_VAT_DETAILS });
    setShowVATDetailsModal(false);
  };

  const handleVATDetailsAccept = (state: VATDetails) => {
    setVatDetails(state);
    setShowVATDetailsModal(false);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const validate = useCallback((): string | null => {
    if (!form.name?.trim()) return 'Name is required.';
    if (!companyId) return 'No company selected.';
    if (form.gstin?.trim() && validateGstin(form.gstin))
      return 'The Party GSTIN/UIN provided is invalid/incomplete.';
    return null;
  }, [form.name, form.gstin, companyId]);

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        group_id: form.group_id || undefined,
        ledger_type: form.ledger_type || 'General',
        opening_balance: Number(form.opening_balance) || 0,
        opening_balance_type: (form as any).opening_balance_type || 'Dr',
        closing_balance: mode === 'create' ? 0 : Number(form.closing_balance) || 0,
        is_bill_wise: form.is_bill_wise || 0,
        maintain_inventory_values: form.maintain_inventory_values || 0,
        mailing_name: form.mailing_name?.trim() || undefined,
        address1: form.address1?.trim() || undefined,
        address2: form.address2?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state || undefined,
        country: form.country?.trim() || undefined,
        pincode: form.pincode?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        gstin: form.gstin?.trim() || undefined,
        pan: form.pan?.trim() || undefined,
        // F11 multiple addresses: always sent (empty array clears them server-side).
        // Drop fully-blank rows so an opened-but-unused sub-screen saves nothing.
        addresses: addresses
          .filter((a) => (a.address_type || a.mailing_name || a.address1 || a.address2)?.trim())
          .map((a, i) => ({ ...a, display_order: i })),
        registration_type: form.registration_type || 'Unregistered',
        default_credit_period: form.default_credit_period || 0,
        check_credit_days: form.check_credit_days || 0,
        allow_cost_centres: form.allow_cost_centres || 0,
        invoice_rounding: form.invoice_rounding || 0,
        rounding_method: form.rounding_method || undefined,
        rounding_limit: form.rounding_limit || 0,
        additional_gst_details: form.additional_gst_details ?? 0,
        service_tax_details: form.service_tax_details ?? 0,
        behave_as_payment_gateway: form.behave_as_payment_gateway ?? 0,
        payment_gateway_name: form.payment_gateway_name?.trim() || undefined,
        // GST details
        place_of_supply: gstDetails.place_of_supply || undefined,
        is_party_a_transporter: gstDetails.is_party_a_transporter || 'No',
        transporter_id: gstDetails.transporter_id?.trim() || undefined,
        // Service tax registration details
        service_tax_registration_number:
          serviceTaxDetails.service_tax_registration_number?.trim() || undefined,
        type_of_service: serviceTaxDetails.type_of_service || 'Undefined',
        notification_number: serviceTaxDetails.notification_number?.trim() || undefined,
        notification_serial_number:
          serviceTaxDetails.notification_serial_number?.trim() || undefined,
        is_party_an_associated_enterprise:
          serviceTaxDetails.is_party_an_associated_enterprise || 'No',
        does_party_belong_to_non_taxable_territory:
          serviceTaxDetails.does_party_belong_to_non_taxable_territory || 'No',
        // VAT details
        vat_type_of_dealer: vatDetails.type_of_dealer || 'Unknown',
        vat_tin_no: vatDetails.vat_tin_no?.trim() || undefined,
        cst_no: vatDetails.cst_no?.trim() || undefined,
        sales_purchases_against_form_c: vatDetails.sales_purchases_against_form_c || 'No',
        // Interest
        activate_interest: form.activate_interest ?? 0,
        interest_include_added: interestForm.interest_include_added ?? 0,
        interest_include_deducted: interestForm.interest_include_deducted ?? 0,
        interest_rate: Number(interestForm.interest_rate) || 0,
        interest_style: interestForm.interest_style || '30-Day Month',
        interest_balances: interestForm.interest_balances || 'All Balances',
        interest_calculate_on: interestForm.interest_calculate_on || 'Bill-by-Bill',
        interest_applicable_from: interestForm.interest_applicable_from || 'Due Date',
        interest_rounding_method: interestForm.interest_rounding_method || 'No Rounding',
        interest_rounding_limit: Number(interestForm.interest_rounding_limit) || 1,
        interest_rate_slabs: (() => {
          const slabs = (interestForm.interest_rate_slabs || [])
            .filter((s) => s.from_date)
            .map((s) => ({
              from_date: s.from_date,
              to_date: s.to_date || null,
              rate: Number(s.rate) || 0,
            }));
          return slabs.length > 0 ? JSON.stringify(slabs) : undefined;
        })(),
        // Other statutory
        set_alter_tds_details: otherStatutory.tds.is_tds_deductable ? 1 : 0,
        set_alter_tcs_details: otherStatutory.tcs.is_tcs_applicable ? 1 : 0,
        set_alter_service_tax_details: otherStatutory.serviceTax.set_alter_service_tax_details,
        set_alter_excise_details: otherStatutory.excise.set_alter_excise_details,
        set_alter_vat_details: otherStatutory.vat.set_alter_vat_details,
        is_tds_deductable: otherStatutory.tds.is_tds_deductable,
        treat_as_tds_expenses: otherStatutory.tds.treat_as_tds_expenses,
        deductee_type: otherStatutory.tds.deductee_type,
        deduct_tds_in_same_voucher: otherStatutory.tds.deduct_tds_in_same_voucher,
        nature_of_payment: otherStatutory.tds.nature_of_payment,
        tds_pan_it_no: otherStatutory.tds.tds_pan_it_no,
        tds_pan_status: otherStatutory.tds.tds_pan_status,
        tds_pan_effective_date: otherStatutory.tds.tds_pan_effective_date,
        tds_name_on_pan: otherStatutory.tds.tds_name_on_pan,
        tds_deductee_ref: otherStatutory.tds.deductee_ref,
        tds_tax_unique_id_no: otherStatutory.tds.tax_unique_id_no,
        is_tds_applicable: otherStatutory.tds.is_tds_applicable,
        is_tcs_applicable: otherStatutory.tcs.is_tcs_applicable,
        tcs_buyer_lessee_type: otherStatutory.tcs.tcs_buyer_lessee_type,
        tcs_pan_it_no: otherStatutory.tcs.tcs_pan_it_no,
        tcs_pan_status: otherStatutory.tcs.tcs_pan_status,
        tcs_name_on_pan: otherStatutory.tcs.tcs_name_on_pan,
        tcs_nature_of_goods: otherStatutory.tcs.tcs_nature_of_goods,
        is_service_tax_applicable: otherStatutory.serviceTax.is_service_tax_applicable,
        is_excise_applicable: otherStatutory.excise.is_excise_applicable,
        is_vat_cst_applicable: otherStatutory.vat.is_vat_cst_applicable,
        deductee_ref: otherStatutory.tcs.deductee_ref,
        tax_unique_id_no: otherStatutory.tcs.tax_unique_id_no,

        // Excise tariff details
        excise_tariff_name: exciseDetails.tariff_name || undefined,
        excise_hsn_code: exciseDetails.hsn_code || undefined,
        excise_reporting_uom: exciseDetails.reporting_uom || 'Undefined',
        excise_valuation_type: exciseDetails.valuation_type || 'Undefined',
        excise_rate: Number(exciseDetails.rate) || 0,
        excise_rate_per_unit: Number(exciseDetails.rate_per_unit) || 0,

        // VAT Tax rate details
        vat_nature_of_transaction: vatTaxRateDetails.nature_of_transaction || 'Undefined',
        vat_tax_rate: Number(vatTaxRateDetails.tax_rate) || 0,
        vat_tax_type: vatTaxRateDetails.tax_type || 'Unknown',
      };

      if (mode === 'alter') {
        payload.ledger_id = form.ledger_id;
      }

      const hasBankData = provideBank === 'Yes' || groupLineage.isBank;
      if (hasBankData) {
        payload.bank_details = {
          account_holder_name: bankForm.account_holder_name?.trim() || undefined,
          account_number: bankForm.account_number?.trim() || undefined,
          ifsc_code: bankForm.ifsc_code?.trim() || undefined,
          swift_code: bankForm.swift_code?.trim() || undefined,
          bank_name: bankForm.bank_name?.trim() || undefined,
          branch: bankForm.branch?.trim() || undefined,
          bsr_code: bankForm.bsr_code?.trim() || undefined,
          set_alter_cheque_books: bankForm.set_alter_cheque_books || undefined,
          cheque_ranges:
            bankForm.cheque_ranges && bankForm.cheque_ranges.length > 0
              ? JSON.stringify(bankForm.cheque_ranges)
              : undefined,
          enable_cheque_printing: bankForm.enable_cheque_printing === 'Yes' ? 'Yes' : undefined,
          set_alter_cheque_printing: bankForm.set_alter_cheque_printing || undefined,
          cheque_printing_configuration: bankForm.cheque_printing_config
            ? JSON.stringify(bankForm.cheque_printing_config)
            : undefined,
          transaction_type: bankForm.transaction_type?.trim() || undefined,
          cross_using: bankForm.cross_using?.trim() || undefined,
          company_bank: bankForm.company_bank?.trim() || undefined,
          beneficiary_code: bankForm.beneficiary_code?.trim() || undefined,
        };
      } else if (mode === 'alter') {
        payload.bank_details = null;
      }

      if (
        groupLineage.isTax ||
        // GST-relevant groups (Sales/Purchase/Direct+Indirect Inc/Exp) always persist their
        // GST state — including an explicit "Not Applicable" — so GST Rate Setup can tell a
        // deliberately not-applicable ledger apart from one that was never configured.
        groupLineage.isInventory ||
        (statutoryForm.gst_applicability && statutoryForm.gst_applicability !== 'Not Applicable') ||
        (statutoryForm.include_in_assessable_value_calculation &&
          statutoryForm.include_in_assessable_value_calculation !== 'Not Applicable')
      ) {
        payload.statutory_details = {
          gst_applicability: statutoryForm.gst_applicability || 'Not Applicable',
          hsn_sac_code: statutoryForm.hsn_sac_code?.trim() || undefined,
          hsn_sac_description: statutoryForm.hsn_sac_description?.trim() || undefined,
          hsn_sac_source: statutoryForm.hsn_sac_source || 'As per Company/Group',
          gst_rate: Number(statutoryForm.gst_rate) || 0,
          gst_rate_source: statutoryForm.gst_rate_source || 'As per Company/Group',
          taxability_type: statutoryForm.taxability_type || undefined,
          type_of_supply: statutoryForm.type_of_supply || 'Services',
          cgst_rate: Number(statutoryForm.cgst_rate) || 0,
          sgst_rate: Number(statutoryForm.sgst_rate) || 0,
          igst_rate: Number(statutoryForm.igst_rate) || 0,
          type_of_duty_tax: statutoryForm.type_of_duty_tax || undefined,
          duty_head: statutoryForm.duty_head?.trim() || undefined,
          gst_tax_type: statutoryForm.gst_tax_type || undefined,
          service_tax_head: statutoryForm.service_tax_head || undefined,
          nature_of_goods: statutoryForm.nature_of_goods?.trim() || undefined,
          valuation_type: statutoryForm.valuation_type || undefined,
          rate_per_unit: Number(statutoryForm.rate_per_unit) || 0,
          rounding_limit: Number(statutoryForm.rounding_limit) || 0,
          percentage_of_calculation: Number(statutoryForm.percentage_of_calculation) || 0,
          statutory_details: statutoryForm.statutory_details || undefined,
          include_in_assessable_value_calculation:
            statutoryForm.include_in_assessable_value_calculation || 'Not Applicable',
          appropriate_to: statutoryForm.appropriate_to || 'Goods',
          method_of_calculation: statutoryForm.method_of_calculation || 'Based on Quantity',
        };
      } else if (mode === 'alter') {
        payload.statutory_details = null;
      }

      const res = await (mode === 'create'
        ? window.api.ledger.create(payload)
        : window.api.ledger.update(payload));

      if (res.success) {
        setSuccess(
          `Ledger "${form.name}" ${mode === 'create' ? 'created' : 'updated'} successfully.`,
        );
        if (mode === 'create') {
          setForm(INITIAL_FORM);
          setAddresses([]);
          setProvideBank('No');
          setBankForm(EMPTY_BANK_DETAILS);
          setStatutoryForm(EMPTY_STATUTORY);
          setInterestForm(EMPTY_INTEREST);
          setGstDetails({ ...EMPTY_GST_DETAILS });
          setServiceTaxDetails({ ...EMPTY_SERVICE_TAX_DETAILS });
          setVatDetails({ ...EMPTY_VAT_DETAILS });
          setOtherStatutory({
            tds: { ...EMPTY_TDS },
            tcs: { ...EMPTY_TCS },
            serviceTax: { ...EMPTY_SERVICE_TAX },
            excise: { ...EMPTY_EXCISE },
            vat: { ...EMPTY_VAT },
          });
        } else {
          setLoadedGroupId(form.group_id || null);
          await loadInitial();
        }
      } else {
        setError(res.error || `Failed to ${mode} ledger.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setSaving(false);
    }
  }, [
    companyId,
    form,
    provideBank,
    groupLineage,
    bankForm,
    statutoryForm,
    interestForm,
    gstDetails,
    serviceTaxDetails,
    vatDetails,
    otherStatutory,
    validate,
    mode,
    loadInitial,
    exciseDetails,
    vatTaxRateDetails,
  ]);

  return {
    form,
    setForm,
    bankForm,
    setBankForm,
    statutoryForm,
    setStatutoryForm,
    interestForm,
    setInterestForm,
    gstDetails,
    setGstDetails,
    serviceTaxDetails,
    setServiceTaxDetails,
    vatDetails,
    setVatDetails,
    otherStatutory,
    setOtherStatutory,
    exciseDetails,
    setExciseDetails,
    vatTaxRateDetails,
    setVatTaxRateDetails,
    addresses,
    setAddresses,
    showMultiAddress,
    setShowMultiAddress,
    provideBank,
    setProvideBank,
    showBankPopup,
    setShowBankPopup,
    showInterestPopup,
    setShowInterestPopup,
    showOtherStatutoryModal,
    setShowOtherStatutoryModal,
    showGSTDetailsModal,
    setShowGSTDetailsModal,
    showServiceTaxModal,
    setShowServiceTaxModal,
    showVATDetailsModal,
    setShowVATDetailsModal,
    showGroupPanel,
    setShowGroupPanel,
    showLedgerPanel,
    setShowLedgerPanel,
    flatGroups,
    groupTree,
    ledgers,
    loading,
    saving,
    error,
    setError,
    success,
    setSuccess,
    selectedLedgerId,
    setSelectedLedgerId,
    selectedGroup,
    groupLineage,
    fyLabel,
    setField,
    setNumber,
    setBankField,
    setBankNumber,
    setStatutoryField,
    setStatutoryNumber,
    setInterestField,
    handleActivateInterestChange,
    handleInterestClose,
    handleProvideBankChange,
    handleBankClose,
    handleBankAccept,
    handlePaymentGatewayChange,
    handleGSTDetailsOpen,
    handleGSTDetailsClose,
    handleGSTDetailsAccept,
    handleServiceTaxOpen,
    handleServiceTaxClose,
    handleServiceTaxAccept,
    handleVATDetailsOpen,
    handleVATDetailsClose,
    handleVATDetailsAccept,
    handleSubmit,
    loadLedger,
  };
}
