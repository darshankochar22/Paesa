CREATE TABLE `attendance_vouchers` (
	`attendance_voucher_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`voucher_number` text,
	`date` text NOT NULL,
	`narration` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `attendance_voucher_entries` (
	`entry_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attendance_voucher_id` integer NOT NULL,
	`employee_id` integer,
	`attendance_type_id` integer,
	`value` real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `attendance_types` (
	`attendance_type_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`type` text DEFAULT 'Attendance / Leave with Pay',
	`unit_id` integer,
	`period` text DEFAULT 'Per Day',
	`carry_forward` integer DEFAULT 0,
	`encashment` integer DEFAULT 0,
	`max_days` real DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `balance_sheet_reports` (
	`report_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`report_name` text DEFAULT 'Balance Sheet',
	`report_date` text,
	`comparison_period_start` text,
	`comparison_period_end` text,
	`format_type` text DEFAULT 'Vertical',
	`method_of_showing` text DEFAULT 'Net Balance',
	`show_vertical_balance_sheet` integer DEFAULT 1,
	`show_working_capital_figures` integer DEFAULT 0,
	`profit_or_loss_as_liability` integer DEFAULT 1,
	`show_detail_view` integer DEFAULT 0,
	`show_condensed_view` integer DEFAULT 0,
	`show_schedule_vi` integer DEFAULT 0,
	`include_closing_stock` integer DEFAULT 1,
	`compare_quarterly` integer DEFAULT 0,
	`basis_of_values` text DEFAULT 'Default',
	`change_view` text,
	`exception_reports_enabled` integer DEFAULT 0,
	`filter_enabled` integer DEFAULT 0,
	`saved_view_name` text,
	`filter_details` text,
	`show_profit` integer DEFAULT 1,
	`show_columnar` integer DEFAULT 0,
	`show_optional` integer DEFAULT 0,
	`show_post_dated` integer DEFAULT 0,
	`show_stat_adjustment` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `balance_sheet_views` (
	`view_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`report_date` text,
	`group_name` text,
	`parent_group_name` text,
	`opening_balance` real DEFAULT 0,
	`side` text DEFAULT 'Assets',
	`current_period_debit` real DEFAULT 0,
	`current_period_credit` real DEFAULT 0,
	`closing_balance` real DEFAULT 0,
	`display_order` integer DEFAULT 0,
	`is_total_row` integer DEFAULT 0,
	`is_drill_down_available` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `reconciliations` (
	`reconciliation_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`voucher_id` integer NOT NULL,
	`ledger_id` integer NOT NULL,
	`reconciled_date` text,
	`bank_date` text,
	`bank_reference` text,
	`reconciled_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`company_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`mailing_name` text,
	`address1` text,
	`address2` text,
	`state` text,
	`country` text,
	`pincode` text,
	`telephone` text,
	`mobile` text,
	`fax` text,
	`email` text,
	`website` text,
	`base_currency_symbol` text,
	`formal_name` text,
	`financial_year_beginning_from` text,
	`books_beginning_from` text,
	`password` text,
	`access_control` text,
	`edit_log` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `company_creation_success` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`created_successfully` integer DEFAULT 1,
	`success_screen_shown` integer DEFAULT 0,
	`show_more_features` integer DEFAULT 0,
	`show_all_features` integer DEFAULT 0,
	`default_features_loaded` integer DEFAULT 1,
	`feature_setup_completed` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `company_feature_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`feature_item_id` integer NOT NULL,
	`value_boolean` integer DEFAULT 0,
	`value_text` text,
	`value_number` real,
	`value_date` text,
	`is_enabled` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `company_gst_details` (
	`company_id` integer PRIMARY KEY NOT NULL,
	`hsn_sac_type` text DEFAULT 'Not Defined',
	`hsn_sac_code` text,
	`description` text,
	`taxability_type` text DEFAULT 'Not Defined',
	`gst_rate` real DEFAULT 0,
	`interstate_threshold_limit` real DEFAULT 50000,
	`intrastate_threshold_limit` real DEFAULT 50000,
	`threshold_limit_includes` text DEFAULT 'Value of Invoice',
	`create_hsn_summary_for` text DEFAULT 'All Sections',
	`minimum_hsn_length` integer DEFAULT 4,
	`show_gst_advances` integer DEFAULT 0,
	`update_gst_status` integer DEFAULT 0,
	`gst_returns_configured` integer DEFAULT 0,
	`effective_date` text DEFAULT '1-Apr-26',
	`download_gst_registration` text,
	`download_return_type` text DEFAULT 'All Returns',
	`set_state_wise_threshold_limit` integer DEFAULT 0,
	`state_wise_limits` text,
	`gst_advances_applicable_from` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `company_pan_cin_details` (
	`company_id` integer PRIMARY KEY NOT NULL,
	`pan` text,
	`cin` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `company_tcs_details` (
	`company_id` integer PRIMARY KEY NOT NULL,
	`tan_reg_number` text,
	`tan` text,
	`collector_type` text DEFAULT 'Company',
	`collector_branch` text,
	`set_alter_person_responsible` integer DEFAULT 0,
	`person_responsible_name` text,
	`person_responsible_son_daughter_of` text,
	`person_responsible_designation` text,
	`person_responsible_pan` text,
	`person_responsible_flat_no` text,
	`person_responsible_premises` text,
	`person_responsible_road` text,
	`person_responsible_area` text,
	`person_responsible_city` text,
	`person_responsible_state` text,
	`person_responsible_pincode` text,
	`person_responsible_phone` text,
	`person_responsible_std_code` text,
	`person_responsible_telephone` text,
	`person_responsible_email` text,
	`ignore_it_exemption` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `company_tds_details` (
	`company_id` integer PRIMARY KEY NOT NULL,
	`tan_reg_number` text,
	`tan` text,
	`deductor_type` text DEFAULT 'Company',
	`deductor_branch` text,
	`set_alter_person_responsible` integer DEFAULT 0,
	`person_responsible_name` text,
	`person_responsible_designation` text,
	`person_responsible_pan` text,
	`person_responsible_phone` text,
	`person_responsible_email` text,
	`ignore_it_exemption` integer DEFAULT 1,
	`activate_tds_for_items` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cost_centres` (
	`cc_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`parent_id` integer,
	`category` text DEFAULT 'Primary',
	`is_active` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `currencies` (
	`currency_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`formal_name` text,
	`iso_code` text NOT NULL,
	`symbol` text,
	`decimal_places` integer DEFAULT 2,
	`decimal_symbol` text DEFAULT '.',
	`decimal_places_in_words` text,
	`suffix_symbol_to_amount` integer DEFAULT 0,
	`show_amount_in_millions` integer DEFAULT 0,
	`word_representing_amount_after_decimal` text,
	`add_space_between_amount_and_symbol` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`is_default` integer DEFAULT 0,
	`is_predefined` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `day_book_reports` (
	`report_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`report_name` text DEFAULT 'Day Book',
	`date_from` text,
	`date_to` text,
	`selected_company_id` integer,
	`basis_of_values` text DEFAULT 'Default',
	`change_view` text,
	`exception_reports_enabled` integer DEFAULT 0,
	`saved_view_name` text,
	`filter_enabled` integer DEFAULT 0,
	`filter_details` text,
	`show_profit` integer DEFAULT 0,
	`show_columnar` integer DEFAULT 0,
	`show_optional` integer DEFAULT 0,
	`show_post_dated` integer DEFAULT 0,
	`show_stat_adjustment` integer DEFAULT 0,
	`show_details` integer DEFAULT 1,
	`show_related_reports` integer DEFAULT 0,
	`created_at` text DEFAULT 'datetime(''now'')',
	`updated_at` text DEFAULT 'datetime(''now'')'
);
--> statement-breakpoint
CREATE TABLE `day_book_entries` (
	`entry_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`voucher_id` integer,
	`voucher_date` text,
	`particulars` text,
	`voucher_type` text,
	`voucher_number` text,
	`debit_amount` real DEFAULT 0,
	`credit_amount` real DEFAULT 0,
	`narration` text,
	`party_ledger_name` text,
	`show_profit` integer DEFAULT 0,
	`is_optional` integer DEFAULT 0,
	`is_post_dated` integer DEFAULT 0,
	`is_stat_adjustment` integer DEFAULT 0,
	`gross_profit` real DEFAULT 0,
	`cost` real DEFAULT 0,
	`display_order` integer DEFAULT 0,
	`is_drillable` integer DEFAULT 1,
	`notes` text,
	`created_at` text DEFAULT 'datetime(''now'')',
	`updated_at` text DEFAULT 'datetime(''now'')'
);
--> statement-breakpoint
CREATE TABLE `day_book_entry_lines` (
	`line_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`ledger_id` integer,
	`particulars` text,
	`debit_amount` real DEFAULT 0,
	`credit_amount` real DEFAULT 0,
	`line_order` integer DEFAULT 0,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `einvoice_credentials` (
	`cred_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`client_id` text NOT NULL,
	`client_secret` text NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`app_key` text NOT NULL,
	`is_sandbox` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `einvoice_records` (
	`irn_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`voucher_id` integer,
	`invoice_number` text NOT NULL,
	`invoice_date` text NOT NULL,
	`buyer_gstin` text,
	`irn` text,
	`ack_no` text,
	`ack_dt` text,
	`signed_invoice` text,
	`signed_qr_code` text,
	`ewb_no` text,
	`ewb_dt` text,
	`status` text DEFAULT 'PENDING',
	`cancel_reason` integer,
	`cancel_remarks` text,
	`cancelled_at` text,
	`raw_response` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`employee_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`employee_category_id` integer,
	`employee_group_id` integer,
	`name` text NOT NULL,
	`alias` text,
	`employee_code` text,
	`designation` text,
	`department` text,
	`function` text,
	`location` text,
	`date_of_joining` text,
	`date_of_leaving` text,
	`date_of_birth` text,
	`gender` text,
	`blood_group` text,
	`father_name` text,
	`mother_name` text,
	`spouse_name` text,
	`address` text,
	`city` text,
	`state` text,
	`pincode` text,
	`mobile` text,
	`phone` text,
	`email` text,
	`define_salary_details` integer DEFAULT 0,
	`bank_account_number` text,
	`bank_name` text,
	`bank_branch` text,
	`ifsc_code` text,
	`applicable_tax_regime` text,
	`pan` text,
	`aadhaar` text,
	`uan` text,
	`pf_account_number` text,
	`eps_account_number` text,
	`date_of_joining_pf` text,
	`pran` text,
	`esi_number` text,
	`esi_dispensary_name` text,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `employee_categories` (
	`employee_category_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`allocate_revenue` integer DEFAULT 0,
	`allocate_non_revenue` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `employee_groups` (
	`employee_group_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`employee_category_id` integer,
	`name` text NOT NULL,
	`alias` text,
	`parent_group_id` integer,
	`is_active` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_category_id`) REFERENCES `employee_categories`(`employee_category_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_group_id`) REFERENCES `employee_groups`(`employee_group_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `feature_groups` (
	`feature_group_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_key` text NOT NULL,
	`group_name` text NOT NULL,
	`online_access` integer DEFAULT 0,
	`display_order` integer DEFAULT 0,
	`is_active` integer DEFAULT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_groups_group_key_unique` ON `feature_groups` (`group_key`);--> statement-breakpoint
CREATE TABLE `feature_items` (
	`feature_item_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`feature_group_id` integer NOT NULL,
	`feature_key` text NOT NULL,
	`feature_name` text NOT NULL,
	`description` text,
	`control_type` text DEFAULT 'boolean',
	`default_value_boolean` integer DEFAULT 0,
	`display_order` integer DEFAULT 0,
	`is_mandatory` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	FOREIGN KEY (`feature_group_id`) REFERENCES `feature_groups`(`feature_group_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_items_feature_key_unique` ON `feature_items` (`feature_key`);--> statement-breakpoint
CREATE TABLE `financial_years` (
	`fy_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_active` integer DEFAULT 0,
	`is_closed` integer DEFAULT 0,
	`closing_date` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `godowns` (
	`godown_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`parent_godown_id` integer,
	`address` text,
	`city` text,
	`state` text,
	`pincode` text,
	`is_primary` integer DEFAULT 0,
	`is_main_location` integer DEFAULT 0,
	`allow_storage_of_materials` integer DEFAULT 1,
	`is_active` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`parent_godown_id`) REFERENCES `godowns`(`godown_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`group_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`parent_group_id` integer,
	`is_primary` integer DEFAULT 0,
	`is_predefined` integer DEFAULT 0,
	`nature` text,
	`set_alter_tds_details` integer DEFAULT 0,
	`set_alter_tcs_details` integer DEFAULT 0,
	`set_alter_other_statutory_details` integer DEFAULT 0,
	`hsn_sac_source` text,
	`hsn_sac_description` text,
	`gst_rate_source` text,
	`taxability_type` text,
	`behaves_like_subledger` integer DEFAULT 0,
	`show_net_debit_credit` integer DEFAULT 0,
	`used_for_calculation` integer DEFAULT 0,
	`allocation_method` text DEFAULT 'Average Cost',
	`gst_rate` real,
	`cgst_rate` real,
	`sgst_rate` real,
	`igst_rate` real,
	`hsn_sac_code` text,
	`statutory_details` text,
	`sort_order` integer DEFAULT 0,
	`group_type` text,
	`display_order` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `gst_hsn_rates` (
	`rate_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`hsn_code` text NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`taxability` text DEFAULT 'Taxable',
	`gst_rate` real DEFAULT 0,
	`cgst_rate` real DEFAULT 0,
	`sgst_rate` real DEFAULT 0,
	`igst_rate` real DEFAULT 0,
	`cess_rate` real DEFAULT 0,
	`type_of_supply` text DEFAULT 'Goods',
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `gst_voucher_tax_lines` (
	`tax_line_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`entry_id` integer,
	`hsn_code` text,
	`description` text,
	`quantity` real DEFAULT 0,
	`unit` text,
	`assessable_value` real DEFAULT 0,
	`tax_type` text,
	`rate` real DEFAULT 0,
	`amount` real DEFAULT 0,
	`is_inter_state` integer DEFAULT 0,
	`party_gstin` text,
	`party_state` text,
	`gst_classification_id` integer,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `gstr1_exports` (
	`export_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`fy_id` integer NOT NULL,
	`return_period` text NOT NULL,
	`filed_date` text,
	`status` text DEFAULT 'Draft',
	`b2b_json` text,
	`b2cl_json` text,
	`b2cs_json` text,
	`cdnr_json` text,
	`hsn_json` text,
	`errors_json` text,
	`full_payload_json` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `gst_classifications` (
	`gc_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`hsn_sac_code` text,
	`is_non_gst_goods` integer DEFAULT 0,
	`nature_of_transaction` text DEFAULT 'Not Applicable',
	`taxability` text DEFAULT 'Unknown',
	`is_reverse_charge` integer DEFAULT 0,
	`is_ineligible_for_itc` integer DEFAULT 0,
	`rate_type` text DEFAULT 'Fixed Rate',
	`igst_rate` real DEFAULT 0,
	`igst_valuation_type` text DEFAULT 'Based on Value',
	`cgst_rate` real DEFAULT 0,
	`cgst_valuation_type` text DEFAULT 'Based on Value',
	`sgst_rate` real DEFAULT 0,
	`sgst_valuation_type` text DEFAULT 'Based on Value',
	`cess_rate` real DEFAULT 0,
	`cess_valuation_type` text DEFAULT 'Based on Value',
	`gst_rate` real DEFAULT 0,
	`gst_rate_details` text,
	`valuation_type` text DEFAULT 'Based on Value',
	`is_predefined` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `gst_registrations` (
	`gst_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`registration_type` text DEFAULT 'Regular',
	`registration_status` text DEFAULT 'Active',
	`assessee_of_other_territory` integer DEFAULT 0,
	`periodicity_of_gstr1` text DEFAULT 'Monthly',
	`gstin` text,
	`gst_username` text,
	`mode_of_filing` text DEFAULT 'Online',
	`e_invoice_details` text,
	`e_invoice_application` integer DEFAULT 0,
	`e_way_bill_applicable` integer DEFAULT 0,
	`e_way_bill_applicable_from` text,
	`applicable_for_intrastat` integer DEFAULT 0,
	`legal_name` text,
	`trade_name` text,
	`state_id` text,
	`registration_date` text,
	`effective_from` text,
	`address_type` text DEFAULT 'Primary',
	`goods_dispatched_from` text DEFAULT 'Primary',
	`e_invoice_applicable_from` text,
	`e_invoice_bill_from_place` text,
	`composition_tax_rate` real,
	`composition_tax_calc_basis` text,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ledgers` (
	`ledger_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`group_id` integer,
	`name` text NOT NULL,
	`alias` text,
	`ledger_type` text DEFAULT 'General',
	`nature` text,
	`opening_balance` real DEFAULT 0,
	`closing_balance` real DEFAULT 0,
	`is_bill_wise` integer DEFAULT 0,
	`maintain_inventory_values` integer DEFAULT 0,
	`mailing_name` text,
	`address1` text,
	`address2` text,
	`city` text,
	`state` text,
	`country` text,
	`pincode` text,
	`phone` text,
	`email` text,
	`gstin` text,
	`pan` text,
	`registration_type` text DEFAULT 'Unregistered',
	`allow_cost_centres` integer DEFAULT 0,
	`default_credit_period` integer DEFAULT 0,
	`check_credit_days` integer DEFAULT 0,
	`invoice_rounding` integer DEFAULT 0,
	`rounding_method` text,
	`rounding_limit` real DEFAULT 0,
	`additional_gst_details` integer DEFAULT 0,
	`service_tax_details` integer DEFAULT 0,
	`include_assessable_value` text DEFAULT 'Not Applicable',
	`method_of_calculation` text DEFAULT 'Based on Value',
	`other_statutory_details` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `ledger_bank_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ledger_id` integer NOT NULL,
	`account_holder_name` text,
	`account_number` text,
	`ifsc_code` text,
	`swift_code` text,
	`bank_name` text,
	`branch_name` text,
	`bank_configuration` text,
	`cheque_book_start_no` text,
	`cheque_book_end_no` text,
	`enable_cheque_printing` integer DEFAULT 0,
	`cheque_printing_configuration` text,
	`od_limit` real DEFAULT 0,
	`transaction_type` text,
	`cross_using` text DEFAULT 'A/c Payee',
	`company_bank` text,
	FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`ledger_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ledger_statutory_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ledger_id` integer NOT NULL,
	`gst_applicability` text DEFAULT 'Not Applicable',
	`hsn_sac_code` text,
	`hsn_sac_description` text,
	`gst_rate` real DEFAULT 0,
	`cgst_rate` real DEFAULT 0,
	`sgst_rate` real DEFAULT 0,
	`igst_rate` real DEFAULT 0,
	`type_of_duty_tax` text,
	`percentage_of_calculation` real DEFAULT 0,
	`statutory_details` text,
	`include_in_assessable_value_calculation` text DEFAULT 'Not Applicable',
	`appropriate_to` text DEFAULT 'Goods',
	`method_of_calculation` text DEFAULT 'Based on Quantity',
	FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`ledger_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pay_heads` (
	`pay_head_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`pay_head_type` text DEFAULT 'Earnings for Employees',
	`income_type` text DEFAULT 'Fixed',
	`under_group` text,
	`affects_net_salary` integer DEFAULT 1,
	`payslip_display_name` text,
	`use_for_gratuity` integer DEFAULT 0,
	`set_alter_income_tax` integer DEFAULT 0,
	`calculation_type` text DEFAULT 'As User Defined Value',
	`calculation_period` text DEFAULT 'Months',
	`rounding_method` text DEFAULT 'Not Applicable',
	`rounding_limit` real DEFAULT 0,
	`statutory_component` text,
	`percentage_or_amount` real DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `pay_head_slab_lines` (
	`slab_line_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pay_head_id` integer NOT NULL,
	`effective_from` text,
	`amount_gt` real DEFAULT 0,
	`amount_up_to` real DEFAULT 0,
	`slab_type` text,
	`value` real DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`pay_head_id`) REFERENCES `pay_heads`(`pay_head_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pay_head_formula_lines` (
	`formula_line_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pay_head_id` integer NOT NULL,
	`sequence` integer DEFAULT 0,
	`function` text,
	`pay_head_id_ref` integer,
	`operator` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`pay_head_id`) REFERENCES `pay_heads`(`pay_head_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pay_head_id_ref`) REFERENCES `pay_heads`(`pay_head_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payroll_units` (
	`payroll_unit_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`symbol` text,
	`formal_name` text,
	`unit_type` text DEFAULT 'Simple',
	`decimal_places` integer DEFAULT 0,
	`first_unit` text,
	`conversion` real,
	`second_unit` text,
	`is_active` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `physical_stock_entries` (
	`physical_stock_entry_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`voucher_no` text,
	`voucher_date` text NOT NULL,
	`reference_no` text,
	`narration` text,
	`is_optional` integer DEFAULT 0,
	`is_post_dated` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `physical_stock_entry_lines` (
	`line_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`physical_stock_entry_id` integer NOT NULL,
	`stock_item_id` integer,
	`godown_id` integer,
	`batch_no` text,
	`lot_no` text,
	`manufacturing_date` text,
	`expiry_date` text,
	`quantity` real DEFAULT 0,
	`rate` real DEFAULT 0,
	`amount` real DEFAULT 0,
	`line_order` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `price_levels` (
	`price_level_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`level_index` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_levels_company_id_level_index_unique` ON `price_levels` (`company_id`,`level_index`);--> statement-breakpoint
CREATE TABLE `price_lists` (
	`price_list_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`stock_group` text DEFAULT 'All Items' NOT NULL,
	`price_level` text NOT NULL,
	`applicable_from` text NOT NULL,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `price_list_lines` (
	`line_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`price_list_id` integer NOT NULL,
	`item_id` integer,
	`particulars` text NOT NULL,
	`qty_from` real DEFAULT 0,
	`qty_less_than` real DEFAULT 0,
	`rate` real DEFAULT 0,
	`disc_percent` real DEFAULT 0,
	`sort_order` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`price_list_id`) REFERENCES `price_lists`(`price_list_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profit_loss_reports` (
	`report_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`report_name` text DEFAULT 'Profit & Loss A/c',
	`report_date` text,
	`period_start` text,
	`period_end` text,
	`format_type` text DEFAULT 'Vertical',
	`compare_with_previous_period` integer DEFAULT 0,
	`comparison_period_start` text,
	`comparison_period_end` text,
	`basis_of_values` text DEFAULT 'Default',
	`change_view` text,
	`exception_report_enabled` integer DEFAULT 0,
	`saved_view_name` text,
	`filter_enabled` integer DEFAULT 0,
	`filter_details` text,
	`show_detail_view` integer DEFAULT 0,
	`show_condensed_view` integer DEFAULT 0,
	`show_percentage_of_sales` integer DEFAULT 0,
	`show_auto_column` integer DEFAULT 0,
	`show_profit` integer DEFAULT 1,
	`show_optional` integer DEFAULT 0,
	`show_post_dated` integer DEFAULT 0,
	`show_stat_adjustment` integer DEFAULT 0,
	`show_schedule_vi` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `profit_loss_views` (
	`view_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`company_id` integer NOT NULL,
	`report_date` text,
	`section` text DEFAULT 'Income',
	`group_name` text,
	`parent_group_name` text,
	`opening_balance` real DEFAULT 0,
	`current_period_amount` real DEFAULT 0,
	`closing_balance` real DEFAULT 0,
	`display_order` integer DEFAULT 0,
	`is_total_row` integer DEFAULT 0,
	`is_gross_profit_row` integer DEFAULT 0,
	`is_drill_down_available` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `salary_structures` (
	`structure_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	`effective_from` text NOT NULL,
	`pay_head_id` integer NOT NULL,
	`amount` real DEFAULT 0,
	`calculation_mode` text DEFAULT 'Flat Rate',
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `stock_categories` (
	`sc_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`description` text,
	`parent_category_id` integer,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`parent_category_id`) REFERENCES `stock_categories`(`sc_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_groups` (
	`sg_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`parent_group_id` integer,
	`should_quantities_be_added` integer DEFAULT 0,
	`hsn_sac_code` text,
	`hsn_sac_description` text,
	`gst_rate` real DEFAULT 0,
	`cgst_rate` real DEFAULT 0,
	`sgst_rate` real DEFAULT 0,
	`taxability_type` text DEFAULT NULL,
	`statutory_details` text,
	`is_primary` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`parent_group_id`) REFERENCES `stock_groups`(`sg_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_items` (
	`item_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`group_id` integer,
	`category_id` integer,
	`unit_id` integer,
	`gst_applicable` text DEFAULT 'Not Applicable',
	`hsn_sac` text,
	`source_of_details` text DEFAULT 'As per Company/Stock Group',
	`hsn_sac_description` text,
	`hsn_code` text,
	`sac_code` text,
	`gst_rate_details` text,
	`source_of_gst_rate` text DEFAULT 'As per Company/Stock Group',
	`taxability_type` text,
	`gst_rate` real DEFAULT 0,
	`cgst_rate` real DEFAULT 0,
	`sgst_rate` real DEFAULT 0,
	`igst_rate` real DEFAULT 0,
	`type_of_supply` text DEFAULT 'Goods',
	`rate_of_duty` real DEFAULT 0,
	`statutory_details` text,
	`opening_quantity` real DEFAULT 0,
	`opening_rate` real DEFAULT 0,
	`opening_value` real DEFAULT 0,
	`reorder_level` real DEFAULT 0,
	`reorder_quantity` real DEFAULT 0,
	`track_batches` integer DEFAULT 0,
	`track_expiry` integer DEFAULT 0,
	`track_date_of_manufacturing` integer DEFAULT 0,
	`enable_cost_tracking` integer DEFAULT 0,
	`has_bom` integer DEFAULT 0,
	`bom_name` text,
	`excise_applicable` text DEFAULT 'Not Applicable',
	`excise_details` text,
	`excise_tariff_name` text,
	`excise_tariff_hsn_code` text,
	`excise_tariff_uom` text DEFAULT 'Undefined',
	`excise_tariff_valuation_type` text DEFAULT 'Undefined',
	`excise_tariff_rate` real DEFAULT 0,
	`excise_tariff_rate_per_unit` real DEFAULT 0,
	`vat_applicable` text DEFAULT 'Applicable',
	`vat_details` text,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `stock_item_opening_allocations` (
	`allocation_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`godown_id` integer,
	`batch_number` text,
	`mfg_date` text,
	`expiry_date` text,
	`quantity` real DEFAULT 0,
	`rate` real DEFAULT 0,
	`amount` real DEFAULT 0,
	FOREIGN KEY (`item_id`) REFERENCES `stock_items`(`item_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tally_features` (
	`tally_feature_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`maintain_accounts` integer DEFAULT 1,
	`enable_bill_wise_entry` integer DEFAULT 0,
	`enable_cost_centres` integer DEFAULT 0,
	`maintain_inventory` integer DEFAULT 1,
	`integrate_accounts_with_inventory` integer DEFAULT 1,
	`enable_multiple_price_levels` integer DEFAULT 0,
	`enable_batches` integer DEFAULT 0,
	`maintain_expiry_date_for_batches` integer DEFAULT 0,
	`use_discount_column_in_invoices` integer DEFAULT 0,
	`use_separate_actual_billed_qty` integer DEFAULT 0,
	`enable_gst` integer DEFAULT 0,
	`set_alter_company_gst_details` integer DEFAULT 0,
	`enable_tds` integer DEFAULT 0,
	`enable_tcs` integer DEFAULT 0,
	`enable_browser_access_for_reports` integer DEFAULT 0,
	`enable_tally_net_services` integer DEFAULT 0,
	`enable_payment_request_qr` integer DEFAULT 0,
	`enable_multiple_addresses` integer DEFAULT 0,
	`mark_modified_vouchers` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tax_units` (
	`tax_unit_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`address_line1` text,
	`address_line2` text,
	`address_line3` text,
	`address_line4` text,
	`state` text,
	`pincode` text,
	`telephone` text,
	`registered_for` text DEFAULT 'Excise',
	`set_alter_excise_details` integer DEFAULT 0,
	`registration_type` text DEFAULT 'Importer',
	`ecc_number` text,
	`set_alter_excise_tariff` integer DEFAULT 0,
	`set_alter_rule11_book` integer DEFAULT 0,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `tcs_nature_of_goods` (
	`tcs_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`section` text,
	`payment_code` text,
	`rate_individual_with_pan` real DEFAULT 0,
	`rate_individual_without_pan` real DEFAULT 0,
	`rate_other_with_pan` real DEFAULT 0,
	`rate_other_without_pan` real DEFAULT 0,
	`is_own_status` integer DEFAULT 0,
	`tax_on_receipt_or_realization` text DEFAULT 'Tax Calculated on Receipt',
	`threshold_level` real DEFAULT 0,
	`is_zero_rated` integer DEFAULT 0,
	`is_predefined` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tds_nature_of_payment` (
	`tds_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`section` text,
	`payment_code` text,
	`remittance_code` text,
	`rate_individual_with_pan` real DEFAULT 0,
	`rate_other_with_pan` real DEFAULT 0,
	`is_zero_rated` integer DEFAULT 0,
	`threshold_limit` real DEFAULT 0,
	`is_predefined` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trial_balance_reports` (
	`report_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`company_name` text,
	`report_date` text,
	`period_start` text,
	`period_end` text,
	`show_closing_balance` integer DEFAULT 1,
	`show_debit_credit` integer DEFAULT 1,
	`show_groups` integer DEFAULT 1,
	`show_grand_total` integer DEFAULT 1,
	`detailed_mode` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `trial_balance_rows` (
	`row_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`parent_row_id` integer,
	`row_type` text DEFAULT 'Ledger',
	`particulars` text,
	`group_id` integer,
	`ledger_id` integer,
	`display_order` integer DEFAULT 0,
	`opening_debit` real DEFAULT 0,
	`opening_credit` real DEFAULT 0,
	`period_debit` real DEFAULT 0,
	`period_credit` real DEFAULT 0,
	`closing_debit` real DEFAULT 0,
	`closing_credit` real DEFAULT 0,
	`is_drillable` integer DEFAULT 1,
	`is_grand_total` integer DEFAULT 0,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `units` (
	`unit_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`formal_name` text,
	`decimal_places` integer DEFAULT 0,
	`unit_quantity_code` text,
	`unit_type` text DEFAULT 'Simple',
	`is_simple` integer DEFAULT 1,
	`is_active` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`first_unit_id` integer,
	`second_unit_id` integer,
	`conversion_factor` real DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`first_unit_id`) REFERENCES `units`(`unit_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`second_unit_id`) REFERENCES `units`(`unit_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vouchers` (
	`voucher_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`fy_id` integer NOT NULL,
	`voucher_type` text NOT NULL,
	`voucher_number` text,
	`date` text NOT NULL,
	`status` text DEFAULT 'Regular',
	`supplier_invoice_no` text,
	`supplier_invoice_date` text,
	`reference_number` text,
	`reference_date` text,
	`narration` text,
	`party_ledger_id` integer,
	`party_name` text,
	`place_of_supply` text,
	`is_invoice` integer DEFAULT 0,
	`is_accounting_voucher` integer DEFAULT 1,
	`is_inventory_voucher` integer DEFAULT 0,
	`is_order_voucher` integer DEFAULT 0,
	`is_cancelled` integer DEFAULT 0,
	`is_optional` integer DEFAULT 0,
	`is_post_dated` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `voucher_entries` (
	`entry_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`ledger_id` integer,
	`ledger_name` text,
	`type` text NOT NULL,
	`amount` real DEFAULT 0,
	`amount_forex` real DEFAULT 0,
	`currency` text DEFAULT 'INR',
	`narration` text,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_stock_entries` (
	`stock_entry_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`stock_item_id` integer,
	`item_name` text,
	`godown_id` integer,
	`unit_id` integer,
	`quantity` real DEFAULT 0,
	`rate` real DEFAULT 0,
	`amount` real DEFAULT 0,
	`additional_amount` real DEFAULT 0,
	`discount_amount` real DEFAULT 0,
	`hsn_code` text,
	`gst_rate` real DEFAULT 0,
	`cgst_amount` real DEFAULT 0,
	`sgst_amount` real DEFAULT 0,
	`igst_amount` real DEFAULT 0,
	`is_source` integer DEFAULT 0,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_batches` (
	`batch_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`stock_entry_id` integer NOT NULL,
	`batch_number` text,
	`expiry_date` text,
	`quantity` real DEFAULT 0,
	`rate` real DEFAULT 0,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stock_entry_id`) REFERENCES `voucher_stock_entries`(`stock_entry_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_bill_references` (
	`bill_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`ledger_id` integer,
	`bill_name` text,
	`bill_type` text,
	`amount` real DEFAULT 0,
	`credit_period` text,
	`due_date` text,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_bank_details` (
	`bank_detail_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`ledger_id` integer,
	`transaction_type` text DEFAULT 'Cheque',
	`cheque_range` text,
	`instrument_number` text,
	`instrument_date` text,
	`bank_name` text,
	`branch` text,
	`amount` real DEFAULT 0,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_cost_centres` (
	`cc_entry_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`entry_id` integer,
	`cost_centre_id` integer,
	`amount` real DEFAULT 0,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entry_id`) REFERENCES `voucher_entries`(`entry_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_cash_denominations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`ledger_id` integer,
	`denomination` text,
	`quantity` integer DEFAULT 0,
	`amount` real DEFAULT 0,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_receipt_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`receipt_note_no` text,
	`receipt_doc_no` text,
	`dispatched_through` text,
	`destination` text,
	`carrier_name` text,
	`bill_of_lading_no` text,
	`bill_of_lading_date` text,
	`motor_vehicle_no` text,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_party_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`supplier_name` text,
	`mailing_name` text,
	`address` text,
	`state` text,
	`country` text,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_dispatch_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`delivery_note_nos` text,
	`dispatch_doc_no` text,
	`dispatched_through` text,
	`destination` text,
	`carrier_name` text,
	`bill_of_lading_no` text,
	`bill_of_lading_date` text,
	`motor_vehicle_no` text,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_credit_note_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`tracking_no` text,
	`dispatch_doc_no` text,
	`dispatched_through` text,
	`destination` text,
	`carrier_name` text,
	`bill_of_lading_no` text,
	`bill_of_lading_date` text,
	`motor_vehicle_no` text,
	`original_invoice_no` text,
	`original_invoice_date` text,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_debit_note_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`tracking_no` text,
	`dispatch_doc_no` text,
	`dispatched_through` text,
	`destination` text,
	`carrier_name` text,
	`bill_of_lading_no` text,
	`bill_of_lading_date` text,
	`motor_vehicle_no` text,
	`original_invoice_no` text,
	`original_invoice_date` text,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_payroll_entries` (
	`payroll_entry_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_id` integer NOT NULL,
	`employee_id` integer,
	`pay_head_id` integer,
	`amount` real DEFAULT 0,
	FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`voucher_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `voucher_entry_actions` (
	`action_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`voucher_id` integer,
	`action_type` text NOT NULL,
	`action_data` text,
	`autofill_ledger_id` integer,
	`autofill_amount` real,
	`autofill_narration` text,
	`previous_mode` text,
	`new_mode` text,
	`additional_details` text,
	`related_report_type` text,
	`related_report_id` integer,
	`is_optional` integer DEFAULT 0,
	`optional_reason` text,
	`performed_by` text,
	`performed_at` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `voucher_types` (
	`vt_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`category` text,
	`default_voucher_class` text,
	`affects_inventory` integer DEFAULT 0,
	`affects_accounting` integer DEFAULT 1,
	`affects_gst` integer DEFAULT 0,
	`numbering_method` text DEFAULT 'Automatic',
	`numbering_prefix` text DEFAULT '',
	`numbering_suffix` text DEFAULT '',
	`starts_with` integer DEFAULT 1,
	`is_predefined` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	`parent_vt_id` integer,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `voucher_type_configs` (
	`config_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_type_id` integer NOT NULL,
	`use_effective_dates` integer DEFAULT 0,
	`allow_zero_value_transactions` integer DEFAULT 0,
	`make_voucher_optional` integer DEFAULT 0,
	`allow_narration` integer DEFAULT 1,
	`allow_narration_per_ledger` integer DEFAULT 0,
	`print_after_save` integer DEFAULT 0,
	`whatsapp_after_save` integer DEFAULT 0,
	`enable_default_accounting_allocation` integer DEFAULT 0,
	`track_additional_cost_for_purchase` integer DEFAULT 0,
	`default_title_to_print` text,
	`use_for_pos_invoicing` integer DEFAULT 0,
	`default_bank_id` integer,
	`declaration` text,
	`set_alter_declaration` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `whatsapp_config` (
	`config_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`phone_number_id` text NOT NULL,
	`waba_id` text NOT NULL,
	`access_token` text NOT NULL,
	`is_active` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `whatsapp_templates` (
	`template_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`name` text NOT NULL,
	`language` text DEFAULT 'en',
	`category` text,
	`status` text DEFAULT 'PENDING',
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `whatsapp_logs` (
	`log_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`voucher_id` integer,
	`to_number` text NOT NULL,
	`message_type` text NOT NULL,
	`template_name` text,
	`status` text DEFAULT 'PENDING',
	`wamid` text,
	`error` text,
	`sent_at` text DEFAULT (datetime('now'))
);
