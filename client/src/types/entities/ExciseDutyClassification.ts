export interface ExciseDutyClassificationType {
  excise_duty_classification_id?: number;
  company_id?: number;
  name: string;
  duty_code?: string | null;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
  // Multi-row "Calculation method" list (On Assessable Value / Basic Excise Duty,
  // added until "End of List"). Populated by getAll/getById and returned by
  // create/update.
  calculation_methods?: string[];
}
