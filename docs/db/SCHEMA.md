# Database Schema Reference

> **Generated — do not hand-edit.** Run `npm run docs:db` to regenerate.
>
> This reference is derived directly from the Drizzle schema, the single
> source of truth, under `server/db/schema/pg` and `server/db/schema/sqlite`.
> Column **names** are identical across both dialects (enforced by
> `npm run db:parity`); the **types** differ by design (SQLite storage
> classes vs. the Postgres accounting-grade types).

**Shape:** 79 tables, 1174 columns, 57 declared foreign keys.

## Tables

- [`attendance_types`](#attendance-types)
- [`attendance_voucher_entries`](#attendance-voucher-entries)
- [`attendance_vouchers`](#attendance-vouchers)
- [`balance_sheet_reports`](#balance-sheet-reports)
- [`balance_sheet_views`](#balance-sheet-views)
- [`companies`](#companies)
- [`company_creation_success`](#company-creation-success)
- [`company_feature_values`](#company-feature-values)
- [`company_gst_details`](#company-gst-details)
- [`company_pan_cin_details`](#company-pan-cin-details)
- [`company_tcs_details`](#company-tcs-details)
- [`company_tds_details`](#company-tds-details)
- [`cost_centres`](#cost-centres)
- [`currencies`](#currencies)
- [`day_book_entries`](#day-book-entries)
- [`day_book_entry_lines`](#day-book-entry-lines)
- [`day_book_reports`](#day-book-reports)
- [`einvoice_credentials`](#einvoice-credentials)
- [`einvoice_records`](#einvoice-records)
- [`employee_categories`](#employee-categories)
- [`employee_groups`](#employee-groups)
- [`employees`](#employees)
- [`feature_groups`](#feature-groups)
- [`feature_items`](#feature-items)
- [`financial_years`](#financial-years)
- [`godowns`](#godowns)
- [`groups`](#groups)
- [`gst_classifications`](#gst-classifications)
- [`gst_hsn_rates`](#gst-hsn-rates)
- [`gst_registrations`](#gst-registrations)
- [`gst_voucher_tax_lines`](#gst-voucher-tax-lines)
- [`gstr1_exports`](#gstr1-exports)
- [`ledger_bank_details`](#ledger-bank-details)
- [`ledger_statutory_details`](#ledger-statutory-details)
- [`ledgers`](#ledgers)
- [`pay_head_formula_lines`](#pay-head-formula-lines)
- [`pay_head_slab_lines`](#pay-head-slab-lines)
- [`pay_heads`](#pay-heads)
- [`payroll_units`](#payroll-units)
- [`physical_stock_entries`](#physical-stock-entries)
- [`physical_stock_entry_lines`](#physical-stock-entry-lines)
- [`price_levels`](#price-levels)
- [`price_list_lines`](#price-list-lines)
- [`price_lists`](#price-lists)
- [`profit_loss_reports`](#profit-loss-reports)
- [`profit_loss_views`](#profit-loss-views)
- [`reconciliations`](#reconciliations)
- [`salary_structures`](#salary-structures)
- [`stock_categories`](#stock-categories)
- [`stock_groups`](#stock-groups)
- [`stock_item_opening_allocations`](#stock-item-opening-allocations)
- [`stock_items`](#stock-items)
- [`tally_features`](#tally-features)
- [`tax_units`](#tax-units)
- [`tcs_nature_of_goods`](#tcs-nature-of-goods)
- [`tds_nature_of_payment`](#tds-nature-of-payment)
- [`trial_balance_reports`](#trial-balance-reports)
- [`trial_balance_rows`](#trial-balance-rows)
- [`units`](#units)
- [`voucher_bank_details`](#voucher-bank-details)
- [`voucher_batches`](#voucher-batches)
- [`voucher_bill_references`](#voucher-bill-references)
- [`voucher_cash_denominations`](#voucher-cash-denominations)
- [`voucher_cost_centres`](#voucher-cost-centres)
- [`voucher_credit_note_details`](#voucher-credit-note-details)
- [`voucher_debit_note_details`](#voucher-debit-note-details)
- [`voucher_dispatch_details`](#voucher-dispatch-details)
- [`voucher_entries`](#voucher-entries)
- [`voucher_entry_actions`](#voucher-entry-actions)
- [`voucher_party_details`](#voucher-party-details)
- [`voucher_payroll_entries`](#voucher-payroll-entries)
- [`voucher_receipt_details`](#voucher-receipt-details)
- [`voucher_stock_entries`](#voucher-stock-entries)
- [`voucher_type_configs`](#voucher-type-configs)
- [`voucher_types`](#voucher-types)
- [`vouchers`](#vouchers)
- [`whatsapp_config`](#whatsapp-config)
- [`whatsapp_logs`](#whatsapp-logs)
- [`whatsapp_templates`](#whatsapp-templates)

---

### attendance_types

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `attendance_type_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `type` | TEXT | TEXT | no |  | `'Attendance / Leave with Pay'` |  |
| `unit_id` | INTEGER | BIGINT | yes |  |  |  |
| `period` | TEXT | TEXT | no |  | `'Per Day'` |  |
| `carry_forward` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `encashment` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `max_days` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### attendance_voucher_entries

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `entry_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `attendance_voucher_id` | INTEGER | BIGINT | no | FK |  | attendance_vouchers(attendance_voucher_id) ON DELETE CASCADE |
| `employee_id` | INTEGER | BIGINT | yes |  |  |  |
| `attendance_type_id` | INTEGER | BIGINT | yes |  |  |  |
| `value` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |

### attendance_vouchers

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `attendance_voucher_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `voucher_number` | TEXT | TEXT | yes |  |  |  |
| `date` | TEXT | DATE | no |  |  |  |
| `narration` | TEXT | TEXT | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |

### balance_sheet_reports

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `report_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `report_name` | TEXT | TEXT | yes |  | `'Balance Sheet'` |  |
| `report_date` | TEXT | DATE | yes |  |  |  |
| `comparison_period_start` | TEXT | DATE | yes |  |  |  |
| `comparison_period_end` | TEXT | DATE | yes |  |  |  |
| `format_type` | TEXT | TEXT | yes |  | `'Vertical'` |  |
| `method_of_showing` | TEXT | TEXT | yes |  | `'Net Balance'` |  |
| `show_vertical_balance_sheet` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `show_working_capital_figures` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `profit_or_loss_as_liability` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `show_detail_view` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_condensed_view` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_schedule_vi` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `include_closing_stock` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `compare_quarterly` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `basis_of_values` | TEXT | TEXT | yes |  | `'Default'` |  |
| `change_view` | TEXT | TEXT | yes |  |  |  |
| `exception_reports_enabled` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `filter_enabled` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `saved_view_name` | TEXT | TEXT | yes |  |  |  |
| `filter_details` | TEXT | TEXT | yes |  |  |  |
| `show_profit` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `show_columnar` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_optional` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_post_dated` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_stat_adjustment` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### balance_sheet_views

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `view_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `report_id` | INTEGER | BIGINT | no | FK |  | balance_sheet_reports(report_id) ON DELETE CASCADE |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `report_date` | TEXT | DATE | yes |  |  |  |
| `group_name` | TEXT | TEXT | yes |  |  |  |
| `parent_group_name` | TEXT | TEXT | yes |  |  |  |
| `opening_balance` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `side` | TEXT | TEXT | no |  | `'Assets'` |  |
| `current_period_debit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `current_period_credit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `closing_balance` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `display_order` | INTEGER | INTEGER | no |  | `0` |  |
| `is_total_row` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_drill_down_available` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### companies

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `company_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `mailing_name` | TEXT | TEXT | yes |  |  |  |
| `address1` | TEXT | TEXT | yes |  |  |  |
| `address2` | TEXT | TEXT | yes |  |  |  |
| `state` | TEXT | TEXT | yes |  |  |  |
| `country` | TEXT | TEXT | yes |  |  |  |
| `pincode` | TEXT | TEXT | yes |  |  |  |
| `telephone` | TEXT | TEXT | yes |  |  |  |
| `mobile` | TEXT | TEXT | yes |  |  |  |
| `fax` | TEXT | TEXT | yes |  |  |  |
| `email` | TEXT | TEXT | yes |  |  |  |
| `website` | TEXT | TEXT | yes |  |  |  |
| `base_currency_symbol` | TEXT | TEXT | yes |  |  |  |
| `formal_name` | TEXT | TEXT | yes |  |  |  |
| `financial_year_beginning_from` | TEXT | TEXT | yes |  |  |  |
| `books_beginning_from` | TEXT | TEXT | yes |  |  |  |
| `password` | TEXT | TEXT | yes |  |  |  |
| `access_control` | TEXT | TEXT | yes |  |  |  |
| `edit_log` | TEXT | TEXT | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### company_creation_success

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `created_successfully` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `success_screen_shown` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_more_features` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_all_features` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `default_features_loaded` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `feature_setup_completed` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### company_feature_values

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `feature_item_id` | INTEGER | BIGINT | no |  |  |  |
| `value_boolean` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `value_text` | TEXT | TEXT | yes |  |  |  |
| `value_number` | REAL | DOUBLE PRECISION | yes |  |  |  |
| `value_date` | TEXT | DATE | yes |  |  |  |
| `is_enabled` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### company_gst_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `company_id` | INTEGER | BIGINT | no | PK |  | companies(company_id) ON DELETE CASCADE |
| `hsn_sac_type` | TEXT | TEXT | yes |  | `'Not Defined'` |  |
| `hsn_sac_code` | TEXT | TEXT | yes |  |  |  |
| `description` | TEXT | TEXT | yes |  |  |  |
| `taxability_type` | TEXT | TEXT | yes |  | `'Not Defined'` |  |
| `gst_rate` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `interstate_threshold_limit` | REAL | NUMERIC(18,2) | yes |  | `'50000'` |  |
| `intrastate_threshold_limit` | REAL | NUMERIC(18,2) | yes |  | `'50000'` |  |
| `threshold_limit_includes` | TEXT | TEXT | yes |  | `'Value of Invoice'` |  |
| `create_hsn_summary_for` | TEXT | TEXT | yes |  | `'All Sections'` |  |
| `minimum_hsn_length` | INTEGER | INTEGER | yes |  | `4` |  |
| `show_gst_advances` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `update_gst_status` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `gst_returns_configured` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `effective_date` | TEXT | TEXT | yes |  | `'1-Apr-26'` |  |
| `download_gst_registration` | TEXT | TEXT | yes |  |  |  |
| `download_return_type` | TEXT | TEXT | yes |  | `'All Returns'` |  |
| `set_state_wise_threshold_limit` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `state_wise_limits` | TEXT | JSONB | yes |  |  |  |
| `gst_advances_applicable_from` | TEXT | TEXT | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### company_pan_cin_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `company_id` | INTEGER | BIGINT | no | PK |  | companies(company_id) ON DELETE CASCADE |
| `pan` | TEXT | TEXT | yes |  |  |  |
| `cin` | TEXT | TEXT | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### company_tcs_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `company_id` | INTEGER | BIGINT | no | PK |  | companies(company_id) ON DELETE CASCADE |
| `tan_reg_number` | TEXT | TEXT | yes |  |  |  |
| `tan` | TEXT | TEXT | yes |  |  |  |
| `collector_type` | TEXT | TEXT | yes |  | `'Company'` |  |
| `collector_branch` | TEXT | TEXT | yes |  |  |  |
| `set_alter_person_responsible` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `person_responsible_name` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_son_daughter_of` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_designation` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_pan` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_flat_no` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_premises` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_road` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_area` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_city` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_state` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_pincode` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_phone` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_std_code` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_telephone` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_email` | TEXT | TEXT | yes |  |  |  |
| `ignore_it_exemption` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### company_tds_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `company_id` | INTEGER | BIGINT | no | PK |  | companies(company_id) ON DELETE CASCADE |
| `tan_reg_number` | TEXT | TEXT | yes |  |  |  |
| `tan` | TEXT | TEXT | yes |  |  |  |
| `deductor_type` | TEXT | TEXT | no |  | `'Company'` |  |
| `deductor_branch` | TEXT | TEXT | yes |  |  |  |
| `set_alter_person_responsible` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `person_responsible_name` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_designation` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_pan` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_phone` | TEXT | TEXT | yes |  |  |  |
| `person_responsible_email` | TEXT | TEXT | yes |  |  |  |
| `ignore_it_exemption` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `activate_tds_for_items` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### cost_centres

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `cc_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `parent_id` | INTEGER | BIGINT | yes | FK |  | cost_centres(cc_id) |
| `category` | TEXT | TEXT | no |  | `'Primary'` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### currencies

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `currency_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `formal_name` | TEXT | TEXT | yes |  |  |  |
| `iso_code` | TEXT | TEXT | no |  |  |  |
| `symbol` | TEXT | TEXT | yes |  |  |  |
| `decimal_places` | INTEGER | INTEGER | no |  | `2` |  |
| `decimal_symbol` | TEXT | TEXT | no |  | `'.'` |  |
| `decimal_places_in_words` | TEXT | TEXT | yes |  |  |  |
| `suffix_symbol_to_amount` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_amount_in_millions` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `word_representing_amount_after_decimal` | TEXT | TEXT | yes |  |  |  |
| `add_space_between_amount_and_symbol` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_default` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### day_book_entries

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `entry_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `report_id` | INTEGER | BIGINT | no | FK |  | day_book_reports(report_id) ON DELETE CASCADE |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `voucher_id` | INTEGER | BIGINT | yes |  |  |  |
| `voucher_date` | TEXT | DATE | yes |  |  |  |
| `particulars` | TEXT | TEXT | yes |  |  |  |
| `voucher_type` | TEXT | TEXT | yes |  |  |  |
| `voucher_number` | TEXT | TEXT | yes |  |  |  |
| `debit_amount` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `credit_amount` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `narration` | TEXT | TEXT | yes |  |  |  |
| `party_ledger_name` | TEXT | TEXT | yes |  |  |  |
| `show_profit` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_optional` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_post_dated` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_stat_adjustment` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `gross_profit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `cost` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `display_order` | INTEGER | INTEGER | no |  | `0` |  |
| `is_drillable` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `notes` | TEXT | TEXT | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### day_book_entry_lines

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `line_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `entry_id` | INTEGER | BIGINT | no | FK |  | day_book_entries(entry_id) ON DELETE CASCADE |
| `ledger_id` | INTEGER | BIGINT | yes |  |  |  |
| `particulars` | TEXT | TEXT | yes |  |  |  |
| `debit_amount` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `credit_amount` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `line_order` | INTEGER | INTEGER | no |  | `0` |  |
| `notes` | TEXT | TEXT | yes |  |  |  |

### day_book_reports

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `report_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `report_name` | TEXT | TEXT | yes |  | `'Day Book'` |  |
| `date_from` | TEXT | DATE | yes |  |  |  |
| `date_to` | TEXT | DATE | yes |  |  |  |
| `selected_company_id` | INTEGER | BIGINT | yes |  |  |  |
| `basis_of_values` | TEXT | TEXT | yes |  | `'Default'` |  |
| `change_view` | TEXT | TEXT | yes |  |  |  |
| `exception_reports_enabled` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `saved_view_name` | TEXT | TEXT | yes |  |  |  |
| `filter_enabled` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `filter_details` | TEXT | TEXT | yes |  |  |  |
| `show_profit` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_columnar` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_optional` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_post_dated` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_stat_adjustment` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_details` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `show_related_reports` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### einvoice_credentials

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `cred_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `client_id` | TEXT | TEXT | no |  |  |  |
| `client_secret` | TEXT | TEXT | no |  |  |  |
| `username` | TEXT | TEXT | no |  |  |  |
| `password` | TEXT | TEXT | no |  |  |  |
| `app_key` | TEXT | TEXT | no |  |  |  |
| `is_sandbox` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### einvoice_records

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `irn_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `voucher_id` | INTEGER | BIGINT | yes |  |  |  |
| `invoice_number` | TEXT | TEXT | no |  |  |  |
| `invoice_date` | TEXT | TEXT | no |  |  |  |
| `buyer_gstin` | TEXT | TEXT | yes |  |  |  |
| `irn` | TEXT | TEXT | yes |  |  |  |
| `ack_no` | TEXT | TEXT | yes |  |  |  |
| `ack_dt` | TEXT | TEXT | yes |  |  |  |
| `signed_invoice` | TEXT | TEXT | yes |  |  |  |
| `signed_qr_code` | TEXT | TEXT | yes |  |  |  |
| `ewb_no` | TEXT | TEXT | yes |  |  |  |
| `ewb_dt` | TEXT | TEXT | yes |  |  |  |
| `status` | TEXT | TEXT | no |  | `'PENDING'` |  |
| `cancel_reason` | INTEGER | INTEGER | yes |  |  |  |
| `cancel_remarks` | TEXT | TEXT | yes |  |  |  |
| `cancelled_at` | TEXT | TIMESTAMPTZ | yes |  |  |  |
| `raw_response` | TEXT | TEXT | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### employee_categories

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `employee_category_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `allocate_revenue` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `allocate_non_revenue` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### employee_groups

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `employee_group_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `employee_category_id` | INTEGER | BIGINT | yes | FK |  | employee_categories(employee_category_id) |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `parent_group_id` | INTEGER | BIGINT | yes | FK |  | employee_groups(employee_group_id) |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### employees

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `employee_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `employee_category_id` | INTEGER | BIGINT | yes |  |  |  |
| `employee_group_id` | INTEGER | BIGINT | yes |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `employee_code` | TEXT | TEXT | yes |  |  |  |
| `designation` | TEXT | TEXT | yes |  |  |  |
| `department` | TEXT | TEXT | yes |  |  |  |
| `function` | TEXT | TEXT | yes |  |  |  |
| `location` | TEXT | TEXT | yes |  |  |  |
| `date_of_joining` | TEXT | DATE | yes |  |  |  |
| `date_of_leaving` | TEXT | DATE | yes |  |  |  |
| `date_of_birth` | TEXT | DATE | yes |  |  |  |
| `gender` | TEXT | TEXT | yes |  |  |  |
| `blood_group` | TEXT | TEXT | yes |  |  |  |
| `father_name` | TEXT | TEXT | yes |  |  |  |
| `mother_name` | TEXT | TEXT | yes |  |  |  |
| `spouse_name` | TEXT | TEXT | yes |  |  |  |
| `address` | TEXT | TEXT | yes |  |  |  |
| `city` | TEXT | TEXT | yes |  |  |  |
| `state` | TEXT | TEXT | yes |  |  |  |
| `pincode` | TEXT | TEXT | yes |  |  |  |
| `mobile` | TEXT | TEXT | yes |  |  |  |
| `phone` | TEXT | TEXT | yes |  |  |  |
| `email` | TEXT | TEXT | yes |  |  |  |
| `define_salary_details` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `bank_account_number` | TEXT | TEXT | yes |  |  |  |
| `bank_name` | TEXT | TEXT | yes |  |  |  |
| `bank_branch` | TEXT | TEXT | yes |  |  |  |
| `ifsc_code` | TEXT | TEXT | yes |  |  |  |
| `applicable_tax_regime` | TEXT | TEXT | yes |  |  |  |
| `pan` | TEXT | TEXT | yes |  |  |  |
| `aadhaar` | TEXT | TEXT | yes |  |  |  |
| `uan` | TEXT | TEXT | yes |  |  |  |
| `pf_account_number` | TEXT | TEXT | yes |  |  |  |
| `eps_account_number` | TEXT | TEXT | yes |  |  |  |
| `date_of_joining_pf` | TEXT | DATE | yes |  |  |  |
| `pran` | TEXT | TEXT | yes |  |  |  |
| `esi_number` | TEXT | TEXT | yes |  |  |  |
| `esi_dispensary_name` | TEXT | TEXT | yes |  |  |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### feature_groups

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `feature_group_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `group_key` | TEXT | TEXT | no |  |  |  |
| `group_name` | TEXT | TEXT | no |  |  |  |
| `online_access` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `display_order` | INTEGER | INTEGER | no |  | `0` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |

### feature_items

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `feature_item_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `feature_group_id` | INTEGER | BIGINT | no | FK |  | feature_groups(feature_group_id) ON DELETE CASCADE |
| `feature_key` | TEXT | TEXT | no |  |  |  |
| `feature_name` | TEXT | TEXT | no |  |  |  |
| `description` | TEXT | TEXT | yes |  |  |  |
| `control_type` | TEXT | TEXT | no |  | `'boolean'` |  |
| `default_value_boolean` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `display_order` | INTEGER | INTEGER | no |  | `0` |  |
| `is_mandatory` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |

### financial_years

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `fy_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `start_date` | TEXT | DATE | no |  |  |  |
| `end_date` | TEXT | DATE | no |  |  |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_closed` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `closing_date` | TEXT | DATE | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### godowns

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `godown_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `parent_godown_id` | INTEGER | BIGINT | yes | FK |  | godowns(godown_id) |
| `address` | TEXT | TEXT | yes |  |  |  |
| `city` | TEXT | TEXT | yes |  |  |  |
| `state` | TEXT | TEXT | yes |  |  |  |
| `pincode` | TEXT | TEXT | yes |  |  |  |
| `is_primary` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_main_location` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `allow_storage_of_materials` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### groups

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `group_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `parent_group_id` | INTEGER | BIGINT | yes | FK |  | groups(group_id) |
| `is_primary` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `nature` | TEXT | TEXT | yes |  |  |  |
| `set_alter_tds_details` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `set_alter_tcs_details` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `set_alter_other_statutory_details` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `hsn_sac_source` | TEXT | TEXT | yes |  |  |  |
| `hsn_sac_description` | TEXT | TEXT | yes |  |  |  |
| `gst_rate_source` | TEXT | TEXT | yes |  |  |  |
| `taxability_type` | TEXT | TEXT | yes |  |  |  |
| `behaves_like_subledger` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_net_debit_credit` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `used_for_calculation` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `allocation_method` | TEXT | TEXT | no |  | `'Average Cost'` |  |
| `gst_rate` | REAL | NUMERIC(18,4) | yes |  |  |  |
| `cgst_rate` | REAL | NUMERIC(18,4) | yes |  |  |  |
| `sgst_rate` | REAL | NUMERIC(18,4) | yes |  |  |  |
| `igst_rate` | REAL | NUMERIC(18,4) | yes |  |  |  |
| `hsn_sac_code` | TEXT | TEXT | yes |  |  |  |
| `statutory_details` | TEXT | TEXT | yes |  |  |  |
| `sort_order` | INTEGER | INTEGER | no |  | `0` |  |
| `group_type` | TEXT | TEXT | yes |  |  |  |
| `display_order` | INTEGER | INTEGER | no |  | `0` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### gst_classifications

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `gc_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `name` | TEXT | TEXT | no |  |  |  |
| `description` | TEXT | TEXT | yes |  |  |  |
| `hsn_sac_code` | TEXT | TEXT | yes |  |  |  |
| `is_non_gst_goods` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `nature_of_transaction` | TEXT | TEXT | no |  | `'Not Applicable'` |  |
| `taxability` | TEXT | TEXT | no |  | `'Unknown'` |  |
| `is_reverse_charge` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_ineligible_for_itc` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `rate_type` | TEXT | TEXT | no |  | `'Fixed Rate'` |  |
| `igst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `igst_valuation_type` | TEXT | TEXT | no |  | `'Based on Value'` |  |
| `cgst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `cgst_valuation_type` | TEXT | TEXT | no |  | `'Based on Value'` |  |
| `sgst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `sgst_valuation_type` | TEXT | TEXT | no |  | `'Based on Value'` |  |
| `cess_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `cess_valuation_type` | TEXT | TEXT | no |  | `'Based on Value'` |  |
| `gst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `gst_rate_details` | TEXT | TEXT | yes |  |  |  |
| `valuation_type` | TEXT | TEXT | no |  | `'Based on Value'` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### gst_hsn_rates

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `rate_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `hsn_code` | TEXT | TEXT | no |  |  |  |
| `effective_from` | TEXT | DATE | no |  |  |  |
| `effective_to` | TEXT | DATE | yes |  |  |  |
| `taxability` | TEXT | TEXT | no |  | `'Taxable'` |  |
| `gst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `cgst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `sgst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `igst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `cess_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `type_of_supply` | TEXT | TEXT | no |  | `'Goods'` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### gst_registrations

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `gst_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `registration_type` | TEXT | TEXT | yes |  | `'Regular'` |  |
| `registration_status` | TEXT | TEXT | yes |  | `'Active'` |  |
| `assessee_of_other_territory` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `periodicity_of_gstr1` | TEXT | TEXT | yes |  | `'Monthly'` |  |
| `gstin` | TEXT | TEXT | yes |  |  |  |
| `gst_username` | TEXT | TEXT | yes |  |  |  |
| `mode_of_filing` | TEXT | TEXT | yes |  | `'Online'` |  |
| `e_invoice_details` | TEXT | TEXT | yes |  |  |  |
| `e_invoice_application` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `e_way_bill_applicable` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `e_way_bill_applicable_from` | TEXT | DATE | yes |  |  |  |
| `applicable_for_intrastat` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `legal_name` | TEXT | TEXT | yes |  |  |  |
| `trade_name` | TEXT | TEXT | yes |  |  |  |
| `state_id` | TEXT | TEXT | yes |  |  |  |
| `registration_date` | TEXT | DATE | yes |  |  |  |
| `effective_from` | TEXT | DATE | yes |  |  |  |
| `address_type` | TEXT | TEXT | yes |  | `'Primary'` |  |
| `goods_dispatched_from` | TEXT | TEXT | yes |  | `'Primary'` |  |
| `e_invoice_applicable_from` | TEXT | DATE | yes |  |  |  |
| `e_invoice_bill_from_place` | TEXT | TEXT | yes |  |  |  |
| `composition_tax_rate` | REAL | NUMERIC(18,4) | yes |  |  |  |
| `composition_tax_calc_basis` | TEXT | TEXT | yes |  |  |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### gst_voucher_tax_lines

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `tax_line_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no |  |  |  |
| `entry_id` | INTEGER | BIGINT | yes |  |  |  |
| `hsn_code` | TEXT | TEXT | yes |  |  |  |
| `description` | TEXT | TEXT | yes |  |  |  |
| `quantity` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `unit` | TEXT | TEXT | yes |  |  |  |
| `assessable_value` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `tax_type` | TEXT | TEXT | yes |  |  |  |
| `rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `amount` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `is_inter_state` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `party_gstin` | TEXT | TEXT | yes |  |  |  |
| `party_state` | TEXT | TEXT | yes |  |  |  |
| `gst_classification_id` | INTEGER | BIGINT | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### gstr1_exports

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `export_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `fy_id` | INTEGER | BIGINT | no |  |  |  |
| `return_period` | TEXT | TEXT | no |  |  |  |
| `filed_date` | TEXT | DATE | yes |  |  |  |
| `status` | TEXT | TEXT | no |  | `'Draft'` |  |
| `b2b_json` | TEXT | TEXT | yes |  |  |  |
| `b2cl_json` | TEXT | TEXT | yes |  |  |  |
| `b2cs_json` | TEXT | TEXT | yes |  |  |  |
| `cdnr_json` | TEXT | TEXT | yes |  |  |  |
| `hsn_json` | TEXT | TEXT | yes |  |  |  |
| `errors_json` | TEXT | TEXT | yes |  |  |  |
| `full_payload_json` | TEXT | TEXT | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### ledger_bank_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `ledger_id` | INTEGER | BIGINT | no | FK |  | ledgers(ledger_id) ON DELETE CASCADE |
| `account_holder_name` | TEXT | TEXT | yes |  |  |  |
| `account_number` | TEXT | TEXT | yes |  |  |  |
| `ifsc_code` | TEXT | TEXT | yes |  |  |  |
| `swift_code` | TEXT | TEXT | yes |  |  |  |
| `bank_name` | TEXT | TEXT | yes |  |  |  |
| `branch_name` | TEXT | TEXT | yes |  |  |  |
| `bank_configuration` | TEXT | TEXT | yes |  |  |  |
| `cheque_book_start_no` | TEXT | TEXT | yes |  |  |  |
| `cheque_book_end_no` | TEXT | TEXT | yes |  |  |  |
| `enable_cheque_printing` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `cheque_printing_configuration` | TEXT | TEXT | yes |  |  |  |
| `od_limit` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `transaction_type` | TEXT | TEXT | yes |  |  |  |
| `cross_using` | TEXT | TEXT | yes |  | `'A/c Payee'` |  |
| `company_bank` | TEXT | TEXT | yes |  |  |  |

### ledger_statutory_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `ledger_id` | INTEGER | BIGINT | no | FK |  | ledgers(ledger_id) ON DELETE CASCADE |
| `gst_applicability` | TEXT | TEXT | yes |  | `'Not Applicable'` |  |
| `hsn_sac_code` | TEXT | TEXT | yes |  |  |  |
| `hsn_sac_description` | TEXT | TEXT | yes |  |  |  |
| `gst_rate` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `cgst_rate` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `sgst_rate` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `igst_rate` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `type_of_duty_tax` | TEXT | TEXT | yes |  |  |  |
| `percentage_of_calculation` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `statutory_details` | TEXT | TEXT | yes |  |  |  |
| `include_in_assessable_value_calculation` | TEXT | TEXT | yes |  | `'Not Applicable'` |  |
| `appropriate_to` | TEXT | TEXT | yes |  | `'Goods'` |  |
| `method_of_calculation` | TEXT | TEXT | yes |  | `'Based on Quantity'` |  |

### ledgers

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `ledger_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `group_id` | INTEGER | BIGINT | yes |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `ledger_type` | TEXT | TEXT | yes |  | `'General'` |  |
| `nature` | TEXT | TEXT | yes |  |  |  |
| `opening_balance` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `closing_balance` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `is_bill_wise` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `maintain_inventory_values` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `mailing_name` | TEXT | TEXT | yes |  |  |  |
| `address1` | TEXT | TEXT | yes |  |  |  |
| `address2` | TEXT | TEXT | yes |  |  |  |
| `city` | TEXT | TEXT | yes |  |  |  |
| `state` | TEXT | TEXT | yes |  |  |  |
| `country` | TEXT | TEXT | yes |  |  |  |
| `pincode` | TEXT | TEXT | yes |  |  |  |
| `phone` | TEXT | TEXT | yes |  |  |  |
| `email` | TEXT | TEXT | yes |  |  |  |
| `gstin` | TEXT | TEXT | yes |  |  |  |
| `pan` | TEXT | TEXT | yes |  |  |  |
| `registration_type` | TEXT | TEXT | yes |  | `'Unregistered'` |  |
| `allow_cost_centres` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `default_credit_period` | INTEGER | INTEGER | yes |  | `0` |  |
| `check_credit_days` | INTEGER | INTEGER | yes |  | `0` |  |
| `invoice_rounding` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `rounding_method` | TEXT | TEXT | yes |  |  |  |
| `rounding_limit` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `additional_gst_details` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `service_tax_details` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `include_assessable_value` | TEXT | TEXT | yes |  | `'Not Applicable'` |  |
| `method_of_calculation` | TEXT | TEXT | yes |  | `'Based on Value'` |  |
| `other_statutory_details` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `is_active` | INTEGER | BOOLEAN | yes |  | `TRUE` |  |
| `is_predefined` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |

### pay_head_formula_lines

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `formula_line_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `pay_head_id` | INTEGER | BIGINT | no | FK |  | pay_heads(pay_head_id) ON DELETE CASCADE |
| `sequence` | INTEGER | INTEGER | yes |  | `0` |  |
| `function` | TEXT | TEXT | yes |  |  |  |
| `pay_head_id_ref` | INTEGER | BIGINT | yes | FK |  | pay_heads(pay_head_id) ON DELETE SET NULL |
| `operator` | TEXT | TEXT | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |

### pay_head_slab_lines

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `slab_line_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `pay_head_id` | INTEGER | BIGINT | no | FK |  | pay_heads(pay_head_id) ON DELETE CASCADE |
| `effective_from` | TEXT | DATE | yes |  |  |  |
| `amount_gt` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `amount_up_to` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `slab_type` | TEXT | TEXT | yes |  |  |  |
| `value` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `created_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |

### pay_heads

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `pay_head_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `pay_head_type` | TEXT | TEXT | yes |  | `'Earnings for Employees'` |  |
| `income_type` | TEXT | TEXT | yes |  | `'Fixed'` |  |
| `under_group` | TEXT | TEXT | yes |  |  |  |
| `affects_net_salary` | INTEGER | BOOLEAN | yes |  | `TRUE` |  |
| `payslip_display_name` | TEXT | TEXT | yes |  |  |  |
| `use_for_gratuity` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `set_alter_income_tax` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `calculation_type` | TEXT | TEXT | yes |  | `'As User Defined Value'` |  |
| `calculation_period` | TEXT | TEXT | yes |  | `'Months'` |  |
| `rounding_method` | TEXT | TEXT | yes |  | `'Not Applicable'` |  |
| `rounding_limit` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `statutory_component` | TEXT | TEXT | yes |  |  |  |
| `percentage_or_amount` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `is_active` | INTEGER | BOOLEAN | yes |  | `TRUE` |  |
| `is_predefined` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |

### payroll_units

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `payroll_unit_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `symbol` | TEXT | TEXT | yes |  |  |  |
| `formal_name` | TEXT | TEXT | yes |  |  |  |
| `unit_type` | TEXT | TEXT | no |  | `'Simple'` |  |
| `decimal_places` | INTEGER | INTEGER | no |  | `0` |  |
| `first_unit` | TEXT | TEXT | yes |  |  |  |
| `conversion` | REAL | NUMERIC(18,4) | yes |  |  |  |
| `second_unit` | TEXT | TEXT | yes |  |  |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### physical_stock_entries

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `physical_stock_entry_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `voucher_no` | TEXT | TEXT | yes |  |  |  |
| `voucher_date` | TEXT | DATE | no |  |  |  |
| `reference_no` | TEXT | TEXT | yes |  |  |  |
| `narration` | TEXT | TEXT | yes |  |  |  |
| `is_optional` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_post_dated` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### physical_stock_entry_lines

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `line_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `physical_stock_entry_id` | INTEGER | BIGINT | no | FK |  | physical_stock_entries(physical_stock_entry_id) ON DELETE CASCADE |
| `stock_item_id` | INTEGER | BIGINT | yes |  |  |  |
| `godown_id` | INTEGER | BIGINT | yes |  |  |  |
| `batch_no` | TEXT | TEXT | yes |  |  |  |
| `lot_no` | TEXT | TEXT | yes |  |  |  |
| `manufacturing_date` | TEXT | DATE | yes |  |  |  |
| `expiry_date` | TEXT | DATE | yes |  |  |  |
| `quantity` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `amount` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `line_order` | INTEGER | INTEGER | no |  | `0` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### price_levels

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `price_level_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `level_index` | INTEGER | INTEGER | no |  |  |  |
| `name` | TEXT | TEXT | no |  | `''` |  |
| `is_active` | INTEGER | BOOLEAN | yes |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |

### price_list_lines

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `line_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `price_list_id` | INTEGER | BIGINT | no | FK |  | price_lists(price_list_id) ON DELETE CASCADE |
| `item_id` | INTEGER | BIGINT | yes |  |  |  |
| `particulars` | TEXT | TEXT | no |  |  |  |
| `qty_from` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `qty_less_than` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `disc_percent` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `sort_order` | INTEGER | INTEGER | no |  | `0` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### price_lists

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `price_list_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `stock_group` | TEXT | TEXT | no |  | `'All Items'` |  |
| `price_level` | TEXT | TEXT | no |  |  |  |
| `applicable_from` | TEXT | DATE | no |  |  |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### profit_loss_reports

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `report_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `report_name` | TEXT | TEXT | yes |  | `'Profit & Loss A/c'` |  |
| `report_date` | TEXT | DATE | yes |  |  |  |
| `period_start` | TEXT | DATE | yes |  |  |  |
| `period_end` | TEXT | DATE | yes |  |  |  |
| `format_type` | TEXT | TEXT | yes |  | `'Vertical'` |  |
| `compare_with_previous_period` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `comparison_period_start` | TEXT | DATE | yes |  |  |  |
| `comparison_period_end` | TEXT | DATE | yes |  |  |  |
| `basis_of_values` | TEXT | TEXT | yes |  | `'Default'` |  |
| `change_view` | TEXT | TEXT | yes |  |  |  |
| `exception_report_enabled` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `saved_view_name` | TEXT | TEXT | yes |  |  |  |
| `filter_enabled` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `filter_details` | TEXT | TEXT | yes |  |  |  |
| `show_detail_view` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_condensed_view` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_percentage_of_sales` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_auto_column` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_profit` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `show_optional` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_post_dated` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_stat_adjustment` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `show_schedule_vi` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### profit_loss_views

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `view_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `report_id` | INTEGER | BIGINT | no | FK |  | profit_loss_reports(report_id) ON DELETE CASCADE |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `report_date` | TEXT | DATE | yes |  |  |  |
| `section` | TEXT | TEXT | yes |  | `'Income'` |  |
| `group_name` | TEXT | TEXT | yes |  |  |  |
| `parent_group_name` | TEXT | TEXT | yes |  |  |  |
| `opening_balance` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `current_period_amount` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `closing_balance` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `display_order` | INTEGER | INTEGER | no |  | `0` |  |
| `is_total_row` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_gross_profit_row` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_drill_down_available` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### reconciliations

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `reconciliation_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `entry_id` | INTEGER | BIGINT | no |  |  |  |
| `voucher_id` | INTEGER | BIGINT | no |  |  |  |
| `ledger_id` | INTEGER | BIGINT | no |  |  |  |
| `reconciled_date` | TEXT | DATE | yes |  |  |  |
| `bank_date` | TEXT | DATE | yes |  |  |  |
| `bank_reference` | TEXT | TEXT | yes |  |  |  |
| `reconciled_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### salary_structures

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `structure_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `employee_id` | INTEGER | BIGINT | no |  |  |  |
| `effective_from` | TEXT | DATE | no |  |  |  |
| `pay_head_id` | INTEGER | BIGINT | no |  |  |  |
| `amount` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `calculation_mode` | TEXT | TEXT | no |  | `'Flat Rate'` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### stock_categories

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `sc_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `description` | TEXT | TEXT | yes |  |  |  |
| `parent_category_id` | INTEGER | BIGINT | yes | FK |  | stock_categories(sc_id) |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### stock_groups

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `sg_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `parent_group_id` | INTEGER | BIGINT | yes | FK |  | stock_groups(sg_id) |
| `should_quantities_be_added` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `hsn_sac_code` | TEXT | TEXT | yes |  |  |  |
| `hsn_sac_description` | TEXT | TEXT | yes |  |  |  |
| `gst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `cgst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `sgst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `taxability_type` | TEXT | TEXT | yes |  |  |  |
| `statutory_details` | TEXT | TEXT | yes |  |  |  |
| `is_primary` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### stock_item_opening_allocations

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `allocation_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `item_id` | INTEGER | BIGINT | no | FK |  | stock_items(item_id) ON DELETE CASCADE |
| `godown_id` | INTEGER | BIGINT | yes |  |  |  |
| `batch_number` | TEXT | TEXT | yes |  |  |  |
| `mfg_date` | TEXT | DATE | yes |  |  |  |
| `expiry_date` | TEXT | DATE | yes |  |  |  |
| `quantity` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `rate` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `amount` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |

### stock_items

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `item_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `group_id` | INTEGER | BIGINT | yes |  |  |  |
| `category_id` | INTEGER | BIGINT | yes |  |  |  |
| `unit_id` | INTEGER | BIGINT | yes |  |  |  |
| `gst_applicable` | TEXT | TEXT | no |  | `'Not Applicable'` |  |
| `hsn_sac` | TEXT | TEXT | yes |  |  |  |
| `source_of_details` | TEXT | TEXT | no |  | `'As per Company/Stock Group'` |  |
| `hsn_sac_description` | TEXT | TEXT | yes |  |  |  |
| `hsn_code` | TEXT | TEXT | yes |  |  |  |
| `sac_code` | TEXT | TEXT | yes |  |  |  |
| `gst_rate_details` | TEXT | TEXT | yes |  |  |  |
| `source_of_gst_rate` | TEXT | TEXT | no |  | `'As per Company/Stock Group'` |  |
| `taxability_type` | TEXT | TEXT | yes |  |  |  |
| `gst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `cgst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `sgst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `igst_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `type_of_supply` | TEXT | TEXT | no |  | `'Goods'` |  |
| `rate_of_duty` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `statutory_details` | TEXT | TEXT | yes |  |  |  |
| `opening_quantity` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `opening_rate` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `opening_value` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `reorder_level` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `reorder_quantity` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `track_batches` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `track_expiry` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `track_date_of_manufacturing` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_cost_tracking` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `has_bom` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `bom_name` | TEXT | TEXT | yes |  |  |  |
| `excise_applicable` | TEXT | TEXT | no |  | `'Not Applicable'` |  |
| `excise_details` | TEXT | TEXT | yes |  |  |  |
| `excise_tariff_name` | TEXT | TEXT | yes |  |  |  |
| `excise_tariff_hsn_code` | TEXT | TEXT | yes |  |  |  |
| `excise_tariff_uom` | TEXT | TEXT | no |  | `'Undefined'` |  |
| `excise_tariff_valuation_type` | TEXT | TEXT | no |  | `'Undefined'` |  |
| `excise_tariff_rate` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `excise_tariff_rate_per_unit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `vat_applicable` | TEXT | TEXT | no |  | `'Applicable'` |  |
| `vat_details` | TEXT | TEXT | yes |  |  |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### tally_features

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `tally_feature_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `maintain_accounts` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `enable_bill_wise_entry` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_cost_centres` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `maintain_inventory` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `integrate_accounts_with_inventory` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `enable_multiple_price_levels` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_batches` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `maintain_expiry_date_for_batches` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `use_discount_column_in_invoices` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `use_separate_actual_billed_qty` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_gst` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `set_alter_company_gst_details` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_tds` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_tcs` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_browser_access_for_reports` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_tally_net_services` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_payment_request_qr` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_multiple_addresses` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `mark_modified_vouchers` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### tax_units

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `tax_unit_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `name` | TEXT | TEXT | no |  |  |  |
| `alias` | TEXT | TEXT | yes |  |  |  |
| `address_line1` | TEXT | TEXT | yes |  |  |  |
| `address_line2` | TEXT | TEXT | yes |  |  |  |
| `address_line3` | TEXT | TEXT | yes |  |  |  |
| `address_line4` | TEXT | TEXT | yes |  |  |  |
| `state` | TEXT | TEXT | yes |  |  |  |
| `pincode` | TEXT | TEXT | yes |  |  |  |
| `telephone` | TEXT | TEXT | yes |  |  |  |
| `registered_for` | TEXT | TEXT | no |  | `'Excise'` |  |
| `set_alter_excise_details` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `registration_type` | TEXT | TEXT | no |  | `'Importer'` |  |
| `ecc_number` | TEXT | TEXT | yes |  |  |  |
| `set_alter_excise_tariff` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `set_alter_rule11_book` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `sort_order` | INTEGER | INTEGER | no |  | `0` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### tcs_nature_of_goods

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `tcs_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `name` | TEXT | TEXT | no |  |  |  |
| `section` | TEXT | TEXT | yes |  |  |  |
| `payment_code` | TEXT | TEXT | yes |  |  |  |
| `rate_individual_with_pan` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `rate_individual_without_pan` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `rate_other_with_pan` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `rate_other_without_pan` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `is_own_status` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `tax_on_receipt_or_realization` | TEXT | TEXT | no |  | `'Tax Calculated on Receipt'` |  |
| `threshold_level` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `is_zero_rated` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### tds_nature_of_payment

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `tds_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `name` | TEXT | TEXT | no |  |  |  |
| `section` | TEXT | TEXT | yes |  |  |  |
| `payment_code` | TEXT | TEXT | yes |  |  |  |
| `remittance_code` | TEXT | TEXT | yes |  |  |  |
| `rate_individual_with_pan` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `rate_other_with_pan` | REAL | NUMERIC(18,4) | no |  | `'0'` |  |
| `is_zero_rated` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `threshold_limit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### trial_balance_reports

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `report_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `company_name` | TEXT | TEXT | yes |  |  |  |
| `report_date` | TEXT | DATE | yes |  |  |  |
| `period_start` | TEXT | DATE | yes |  |  |  |
| `period_end` | TEXT | DATE | yes |  |  |  |
| `show_closing_balance` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `show_debit_credit` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `show_groups` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `show_grand_total` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `detailed_mode` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### trial_balance_rows

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `row_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `report_id` | INTEGER | BIGINT | no | FK |  | trial_balance_reports(report_id) ON DELETE CASCADE |
| `parent_row_id` | INTEGER | BIGINT | yes |  |  |  |
| `row_type` | TEXT | TEXT | no |  | `'Ledger'` |  |
| `particulars` | TEXT | TEXT | yes |  |  |  |
| `group_id` | INTEGER | BIGINT | yes |  |  |  |
| `ledger_id` | INTEGER | BIGINT | yes |  |  |  |
| `display_order` | INTEGER | INTEGER | no |  | `0` |  |
| `opening_debit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `opening_credit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `period_debit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `period_credit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `closing_debit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `closing_credit` | REAL | NUMERIC(18,2) | no |  | `'0'` |  |
| `is_drillable` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_grand_total` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `notes` | TEXT | TEXT | yes |  |  |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### units

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `unit_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `symbol` | TEXT | TEXT | no |  |  |  |
| `formal_name` | TEXT | TEXT | yes |  |  |  |
| `decimal_places` | INTEGER | INTEGER | no |  | `0` |  |
| `unit_quantity_code` | TEXT | TEXT | yes |  |  |  |
| `unit_type` | TEXT | TEXT | no |  | `'Simple'` |  |
| `is_simple` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `first_unit_id` | INTEGER | BIGINT | yes | FK |  | units(unit_id) |
| `second_unit_id` | INTEGER | BIGINT | yes | FK |  | units(unit_id) |
| `conversion_factor` | REAL | NUMERIC(18,4) | yes |  | `'1'` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### voucher_bank_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `bank_detail_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `ledger_id` | INTEGER | BIGINT | yes |  |  |  |
| `transaction_type` | TEXT | TEXT | yes |  | `'Cheque'` |  |
| `cheque_range` | TEXT | TEXT | yes |  |  |  |
| `instrument_number` | TEXT | TEXT | yes |  |  |  |
| `instrument_date` | TEXT | DATE | yes |  |  |  |
| `bank_name` | TEXT | TEXT | yes |  |  |  |
| `branch` | TEXT | TEXT | yes |  |  |  |
| `amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |

### voucher_batches

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `batch_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `stock_entry_id` | INTEGER | BIGINT | no | FK |  | voucher_stock_entries(stock_entry_id) ON DELETE CASCADE |
| `batch_number` | TEXT | TEXT | yes |  |  |  |
| `expiry_date` | TEXT | DATE | yes |  |  |  |
| `quantity` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `rate` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |

### voucher_bill_references

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `bill_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `ledger_id` | INTEGER | BIGINT | yes |  |  |  |
| `bill_name` | TEXT | TEXT | yes |  |  |  |
| `bill_type` | TEXT | TEXT | yes |  |  |  |
| `amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `credit_period` | TEXT | TEXT | yes |  |  |  |
| `due_date` | TEXT | DATE | yes |  |  |  |

### voucher_cash_denominations

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `ledger_id` | INTEGER | BIGINT | yes |  |  |  |
| `denomination` | TEXT | TEXT | yes |  |  |  |
| `quantity` | INTEGER | INTEGER | yes |  | `0` |  |
| `amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |

### voucher_cost_centres

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `cc_entry_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `entry_id` | INTEGER | BIGINT | yes | FK |  | voucher_entries(entry_id) |
| `cost_centre_id` | INTEGER | BIGINT | yes |  |  |  |
| `amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |

### voucher_credit_note_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `tracking_no` | TEXT | TEXT | yes |  |  |  |
| `dispatch_doc_no` | TEXT | TEXT | yes |  |  |  |
| `dispatched_through` | TEXT | TEXT | yes |  |  |  |
| `destination` | TEXT | TEXT | yes |  |  |  |
| `carrier_name` | TEXT | TEXT | yes |  |  |  |
| `bill_of_lading_no` | TEXT | TEXT | yes |  |  |  |
| `bill_of_lading_date` | TEXT | DATE | yes |  |  |  |
| `motor_vehicle_no` | TEXT | TEXT | yes |  |  |  |
| `original_invoice_no` | TEXT | TEXT | yes |  |  |  |
| `original_invoice_date` | TEXT | DATE | yes |  |  |  |

### voucher_debit_note_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `tracking_no` | TEXT | TEXT | yes |  |  |  |
| `dispatch_doc_no` | TEXT | TEXT | yes |  |  |  |
| `dispatched_through` | TEXT | TEXT | yes |  |  |  |
| `destination` | TEXT | TEXT | yes |  |  |  |
| `carrier_name` | TEXT | TEXT | yes |  |  |  |
| `bill_of_lading_no` | TEXT | TEXT | yes |  |  |  |
| `bill_of_lading_date` | TEXT | DATE | yes |  |  |  |
| `motor_vehicle_no` | TEXT | TEXT | yes |  |  |  |
| `original_invoice_no` | TEXT | TEXT | yes |  |  |  |
| `original_invoice_date` | TEXT | DATE | yes |  |  |  |

### voucher_dispatch_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `delivery_note_nos` | TEXT | TEXT | yes |  |  |  |
| `dispatch_doc_no` | TEXT | TEXT | yes |  |  |  |
| `dispatched_through` | TEXT | TEXT | yes |  |  |  |
| `destination` | TEXT | TEXT | yes |  |  |  |
| `carrier_name` | TEXT | TEXT | yes |  |  |  |
| `bill_of_lading_no` | TEXT | TEXT | yes |  |  |  |
| `bill_of_lading_date` | TEXT | DATE | yes |  |  |  |
| `motor_vehicle_no` | TEXT | TEXT | yes |  |  |  |

### voucher_entries

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `entry_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `ledger_id` | INTEGER | BIGINT | yes |  |  |  |
| `ledger_name` | TEXT | TEXT | yes |  |  |  |
| `type` | TEXT | TEXT | no |  |  |  |
| `amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `amount_forex` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `currency` | TEXT | TEXT | yes |  | `'INR'` |  |
| `narration` | TEXT | TEXT | yes |  |  |  |

### voucher_entry_actions

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `action_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `voucher_id` | INTEGER | BIGINT | yes |  |  |  |
| `action_type` | TEXT | TEXT | no |  |  |  |
| `action_data` | TEXT | JSONB | yes |  |  |  |
| `autofill_ledger_id` | INTEGER | BIGINT | yes |  |  |  |
| `autofill_amount` | REAL | NUMERIC(18,2) | yes |  |  |  |
| `autofill_narration` | TEXT | TEXT | yes |  |  |  |
| `previous_mode` | TEXT | TEXT | yes |  |  |  |
| `new_mode` | TEXT | TEXT | yes |  |  |  |
| `additional_details` | TEXT | JSONB | yes |  |  |  |
| `related_report_type` | TEXT | TEXT | yes |  |  |  |
| `related_report_id` | INTEGER | BIGINT | yes |  |  |  |
| `is_optional` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `optional_reason` | TEXT | TEXT | yes |  |  |  |
| `performed_by` | TEXT | TEXT | yes |  |  |  |
| `performed_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### voucher_party_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `supplier_name` | TEXT | TEXT | yes |  |  |  |
| `mailing_name` | TEXT | TEXT | yes |  |  |  |
| `address` | TEXT | TEXT | yes |  |  |  |
| `state` | TEXT | TEXT | yes |  |  |  |
| `country` | TEXT | TEXT | yes |  |  |  |

### voucher_payroll_entries

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `payroll_entry_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `employee_id` | INTEGER | BIGINT | yes |  |  |  |
| `pay_head_id` | INTEGER | BIGINT | yes |  |  |  |
| `amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |

### voucher_receipt_details

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `receipt_note_no` | TEXT | TEXT | yes |  |  |  |
| `receipt_doc_no` | TEXT | TEXT | yes |  |  |  |
| `dispatched_through` | TEXT | TEXT | yes |  |  |  |
| `destination` | TEXT | TEXT | yes |  |  |  |
| `carrier_name` | TEXT | TEXT | yes |  |  |  |
| `bill_of_lading_no` | TEXT | TEXT | yes |  |  |  |
| `bill_of_lading_date` | TEXT | DATE | yes |  |  |  |
| `motor_vehicle_no` | TEXT | TEXT | yes |  |  |  |

### voucher_stock_entries

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `stock_entry_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_id` | INTEGER | BIGINT | no | FK |  | vouchers(voucher_id) ON DELETE CASCADE |
| `stock_item_id` | INTEGER | BIGINT | yes |  |  |  |
| `item_name` | TEXT | TEXT | yes |  |  |  |
| `godown_id` | INTEGER | BIGINT | yes |  |  |  |
| `unit_id` | INTEGER | BIGINT | yes |  |  |  |
| `quantity` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `rate` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `additional_amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `discount_amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `hsn_code` | TEXT | TEXT | yes |  |  |  |
| `gst_rate` | REAL | NUMERIC(18,4) | yes |  | `'0'` |  |
| `cgst_amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `sgst_amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `igst_amount` | REAL | NUMERIC(18,2) | yes |  | `'0'` |  |
| `is_source` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |

### voucher_type_configs

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `config_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `voucher_type_id` | INTEGER | BIGINT | no | FK |  | voucher_types(vt_id) |
| `use_effective_dates` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `allow_zero_value_transactions` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `make_voucher_optional` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `allow_narration` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `allow_narration_per_ledger` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `print_after_save` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `whatsapp_after_save` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `enable_default_accounting_allocation` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `track_additional_cost_for_purchase` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `default_title_to_print` | TEXT | TEXT | yes |  |  |  |
| `use_for_pos_invoicing` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `default_bank_id` | INTEGER | BIGINT | yes |  |  |  |
| `declaration` | TEXT | TEXT | yes |  |  |  |
| `set_alter_declaration` | INTEGER | BOOLEAN | no |  | `FALSE` |  |

### voucher_types

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `vt_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `name` | TEXT | TEXT | no |  |  |  |
| `short_name` | TEXT | TEXT | yes |  |  |  |
| `category` | TEXT | TEXT | yes |  |  |  |
| `default_voucher_class` | TEXT | TEXT | yes |  |  |  |
| `affects_inventory` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `affects_accounting` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `affects_gst` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `numbering_method` | TEXT | TEXT | no |  | `'Automatic'` |  |
| `numbering_prefix` | TEXT | TEXT | no |  | `''` |  |
| `numbering_suffix` | TEXT | TEXT | no |  | `''` |  |
| `starts_with` | INTEGER | INTEGER | no |  | `1` |  |
| `is_predefined` | INTEGER | BOOLEAN | no |  | `FALSE` |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `parent_vt_id` | INTEGER | BIGINT | yes | FK |  | voucher_types(vt_id) |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### vouchers

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `voucher_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no |  |  |  |
| `fy_id` | INTEGER | BIGINT | no |  |  |  |
| `voucher_type` | TEXT | TEXT | no |  |  |  |
| `voucher_number` | TEXT | TEXT | yes |  |  |  |
| `date` | TEXT | DATE | no |  |  |  |
| `status` | TEXT | TEXT | yes |  | `'Regular'` |  |
| `supplier_invoice_no` | TEXT | TEXT | yes |  |  |  |
| `supplier_invoice_date` | TEXT | DATE | yes |  |  |  |
| `reference_number` | TEXT | TEXT | yes |  |  |  |
| `reference_date` | TEXT | DATE | yes |  |  |  |
| `narration` | TEXT | TEXT | yes |  |  |  |
| `party_ledger_id` | INTEGER | BIGINT | yes |  |  |  |
| `party_name` | TEXT | TEXT | yes |  |  |  |
| `place_of_supply` | TEXT | TEXT | yes |  |  |  |
| `is_invoice` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `is_accounting_voucher` | INTEGER | BOOLEAN | yes |  | `TRUE` |  |
| `is_inventory_voucher` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `is_order_voucher` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `is_cancelled` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `is_optional` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `is_post_dated` | INTEGER | BOOLEAN | yes |  | `FALSE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | yes |  | `now()` |  |

### whatsapp_config

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `config_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `phone_number_id` | TEXT | TEXT | no |  |  |  |
| `waba_id` | TEXT | TEXT | no |  |  |  |
| `access_token` | TEXT | TEXT | no |  |  |  |
| `is_active` | INTEGER | BOOLEAN | no |  | `TRUE` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |
| `updated_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### whatsapp_logs

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `log_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `voucher_id` | INTEGER | BIGINT | yes |  |  |  |
| `to_number` | TEXT | TEXT | no |  |  |  |
| `message_type` | TEXT | TEXT | no |  |  |  |
| `template_name` | TEXT | TEXT | yes |  |  |  |
| `status` | TEXT | TEXT | no |  | `'PENDING'` |  |
| `wamid` | TEXT | TEXT | yes |  |  |  |
| `error` | TEXT | TEXT | yes |  |  |  |
| `sent_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

### whatsapp_templates

| Column | SQLite type | Postgres type | Nullable | Key | Default | References |
| --- | --- | --- | --- | --- | --- | --- |
| `template_id` | INTEGER (PK, AI) | BIGINT IDENTITY | no | PK | `identity` |  |
| `company_id` | INTEGER | BIGINT | no | FK |  | companies(company_id) ON DELETE CASCADE |
| `name` | TEXT | TEXT | no |  |  |  |
| `language` | TEXT | TEXT | no |  | `'en'` |  |
| `category` | TEXT | TEXT | yes |  |  |  |
| `status` | TEXT | TEXT | no |  | `'PENDING'` |  |
| `created_at` | TEXT | TIMESTAMPTZ | no |  | `now()` |  |

