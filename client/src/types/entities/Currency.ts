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
