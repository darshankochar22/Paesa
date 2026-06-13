export interface TaxUnitType {
  tax_unit_id?: number;
  company_id: number;
  name: string;
  alias?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_line3?: string | null;
  address_line4?: string | null;
  state?: string | null;
  pincode?: string | null;
  telephone?: string | null;
  registered_for?: string;
  set_alter_excise_details?: 0 | 1;
  registration_type?: string;
  ecc_number?: string | null;
  set_alter_excise_tariff?: 0 | 1;
  set_alter_rule11_book?: 0 | 1;
  sort_order?: number;
  is_active?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}