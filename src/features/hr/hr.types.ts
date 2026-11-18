export interface Department {
  id: string;
  name: string;
  code: string;
  headOfDepartment?: string;
  isActive: boolean;
  employeeCount?: number;
}

export interface HrMasterItem {
  id: string;
  category: "DEPARTMENT" | "JOB_TITLE" | "EMPLOYMENT_TYPE" | "EMPLOYEE_STATUS" | "SALARY_TYPE" | "LEAVE_CATEGORY" | string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault?: boolean;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  departmentId?: string;
  departmentName?: string;
  department?: string;
  joiningDate?: string;
  dateOfJoining?: string;
  salaryType?: string; // "Monthly" | "Annual CTC" | "MONTHLY" | "YEARLY_CTC"
  reportsToEmployeeId?: string | null;
  reportsToEmployeeName?: string | null;
  pan?: string;
  panNumber?: string;
  aadhaar?: string;
  aadhaarNumber?: string;
  uan?: string;
  uanNumber?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankIfscCode?: string;
  bankName?: string;
  baseSalary?: number;
  monthlyBaseSalary?: number;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN" | string;
  status: "ACTIVE" | "PROBATION" | "ON_LEAVE" | "TERMINATED" | "RESIGNED" | string;
  employmentStatus?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface StatutoryBreakdown {
  salaryType: string;
  annualCtc: number;
  monthlyGross: number;
  basicSalary: number;
  houseRentAllowance: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  providentFundEmployee: number;
  providentFundEmployer: number;
  employeeStateInsurance: number;
  professionalTax: number;
  taxDeductedAtSource: number;
  totalDeductions: number;
  netTakeHome: number;
}

export interface LeaveWorkingDaysResult {
  startDate: string;
  endDate: string;
  workingDays: number;
  weekends: number;
  holidays: string[];
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  daysAllowedPerYear: number;
  isPaid: boolean;
  isActive: boolean;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  appliedOn?: string;
  approverComments?: string;
  approverComment?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedBy?: string;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  employeeName?: string;
  basicSalary: number;
  houseRentAllowance: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  performanceBonus: number;
  providentFundEmployee: number;
  providentFundEmployer: number;
  employeeStateInsurance: number;
  professionalTax: number;
  taxDeductedAtSource: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  effectiveFrom: string;
  isActive: boolean;
}

export interface PayrollRun {
  id: string;
  runNumber: string;
  month: number;
  year: number;
  status: "DRAFT" | "PROCESSED" | "APPROVED" | "DISBURSED" | "CANCELLED";
  processedAt: string;
  totalEmployees: number;
  totalGrossAmount: number;
  totalDeductions: number;
  totalNetAmount: number;
  remarks?: string;
  notes?: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName?: string;
  designation?: string;
  month: number;
  year: number;
  totalWorkingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  basicSalary: number;
  houseRentAllowance: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  performanceBonus: number;
  grossEarnings: number;
  providentFund: number;
  employeeStateInsurance: number;
  professionalTax: number;
  taxDeductedAtSource: number;
  lossOfPayDeduction: number;
  totalDeductions: number;
  netSalary: number;
  paymentStatus: "PENDING" | "PAID" | "ON_HOLD";
  paymentMode?: string;
  paymentReference?: string;
  paymentDate?: string;
}

export interface HrDashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  pendingLeaveRequests: number;
  lastPayrollAmount: number;
  currentMonthPayrollStatus: string;
  departmentCounts: { department: string; count: number }[];
}
