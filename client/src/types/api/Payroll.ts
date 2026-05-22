import type { EmployeeCategoryType, EmployeeGroupType, EmployeeType } from '../entities/Employee';
import type { PayrollUnitType, PayHeadType, PayHeadSlabLineType, PayHeadFormulaLineType, SalaryStructureType, AttendanceTypeType } from '../entities/Payroll';

export interface PayrollAPI {
  attendanceType: {
    create: (data: Partial<AttendanceTypeType>) => Promise<{ success: boolean; attendanceType: AttendanceTypeType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; attendanceTypes: AttendanceTypeType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; attendanceType: AttendanceTypeType; error?: string }>;
    update: (data: Partial<AttendanceTypeType>) => Promise<{ success: boolean; attendanceType: AttendanceTypeType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  payHead: {
    create: (data: Partial<PayHeadType>) => Promise<{ success: boolean; payHead: PayHeadType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; payHeads: PayHeadType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; payHead: PayHeadType; error?: string }>;
    update: (data: Partial<PayHeadType>) => Promise<{ success: boolean; payHead: PayHeadType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getSlabs: (pay_head_id: number) => Promise<{ success: boolean; slabs: PayHeadSlabLineType[]; error?: string }>;
    createSlab: (data: Partial<PayHeadSlabLineType>) => Promise<{ success: boolean; slab: PayHeadSlabLineType; error?: string }>;
    deleteSlab: (id: number) => Promise<{ success: boolean; error?: string }>;
    getFormulas: (pay_head_id: number) => Promise<{ success: boolean; formulas: PayHeadFormulaLineType[]; error?: string }>;
    createFormula: (data: Partial<PayHeadFormulaLineType>) => Promise<{ success: boolean; formula: PayHeadFormulaLineType; error?: string }>;
    deleteFormula: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  salaryStructure: {
    create: (data: Partial<SalaryStructureType>) => Promise<{ success: boolean; structure: SalaryStructureType; error?: string }>;
    createBulk: (company_id: number, employee_id: number, effective_from: string, entries: Partial<SalaryStructureType>[]) => Promise<{ success: boolean; structures: SalaryStructureType[] }>;
    getAll: (company_id: number) => Promise<{ success: boolean; salaryStructures: SalaryStructureType[] }>;
    getById: (id: number) => Promise<{ success: boolean; structure: SalaryStructureType }>;
    getByEmployee: (company_id: number, employee_id: number) => Promise<{ success: boolean; salaryStructures: { effective_from: string; pay_heads: SalaryStructureType[] }[] }>;
    update: (data: Partial<SalaryStructureType>) => Promise<{ success: boolean; structure: SalaryStructureType }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  employeeCategory: {
    create: (data: Partial<EmployeeCategoryType>) => Promise<{ success: boolean; category: EmployeeCategoryType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; employeeCategories: EmployeeCategoryType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; category: EmployeeCategoryType; error?: string }>;
    update: (data: Partial<EmployeeCategoryType>) => Promise<{ success: boolean; category: EmployeeCategoryType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  employee: {
    create: (data: Partial<EmployeeType>) => Promise<{ success: boolean; employee: EmployeeType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; employees: EmployeeType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; employee: EmployeeType; error?: string }>;
    update: (data: Partial<EmployeeType>) => Promise<{ success: boolean; employee: EmployeeType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getByGroup: (company_id: number, group_id: number) => Promise<{ success: boolean; employees: EmployeeType[] }>;
  };

  employeeGroup: {
    create: (data: Partial<EmployeeGroupType>) => Promise<{ success: boolean; group: EmployeeGroupType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; employeeGroups: EmployeeGroupType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; group: EmployeeGroupType; error?: string }>;
    update: (data: Partial<EmployeeGroupType>) => Promise<{ success: boolean; group: EmployeeGroupType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getTree: (company_id: number) => Promise<{ success: boolean; tree: EmployeeGroupType[] }>;
  };

  payrollUnit: {
    create: (data: Partial<PayrollUnitType>) => Promise<{ success: boolean; unit: PayrollUnitType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; payrollUnits: PayrollUnitType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; unit: PayrollUnitType; error?: string }>;
    update: (data: Partial<PayrollUnitType>) => Promise<{ success: boolean; unit: PayrollUnitType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };
}
