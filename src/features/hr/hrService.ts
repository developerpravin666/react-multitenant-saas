import { apiClient } from "../../services/apiClient";
import type {
  Employee,
  Department,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  SalaryStructure,
  PayrollRun,
  Payslip,
  HrDashboardStats,
  HrMasterItem,
  StatutoryBreakdown,
  LeaveWorkingDaysResult,
} from "./hr.types";

export const hrService = {
  // Metrics
  async getDashboardMetrics(): Promise<HrDashboardStats> {
    return await apiClient.get<HrDashboardStats>("/hr/dashboard/metrics");
  },

  // Employees
  async getEmployees(): Promise<Employee[]> {
    const res = await apiClient.get<any>("/hr/employees?page=1&pageSize=100");
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) return res.items;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  },

  async getEmployeeById(id: string): Promise<Employee> {
    return await apiClient.get<Employee>(`/hr/employees/${id}`);
  },

  async getNextEmployeeCode(): Promise<string> {
    try {
      const res = await apiClient.get<{ code: string }>("/hr/employees/next-code");
      if (res?.code) return res.code;
    } catch {
      // Fallback handled by client generator
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-000001`;
  },

  async createEmployee(payload: Partial<Employee>): Promise<Employee> {
    return await apiClient.post<Employee>("/hr/employees", payload);
  },

  async updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee> {
    return await apiClient.put<Employee>(`/hr/employees/${id}`, payload);
  },

  async deleteEmployee(id: string): Promise<void> {
    return await apiClient.delete<void>(`/hr/employees/${id}`);
  },

  // Departments
  async getDepartments(): Promise<Department[]> {
    return await apiClient.get<Department[]>("/hr/departments");
  },

  async createDepartment(payload: { name: string; code: string; headOfDepartment?: string }): Promise<Department> {
    return await apiClient.post<Department>("/hr/departments", payload);
  },

  // Leaves
  async getLeaveTypes(): Promise<LeaveType[]> {
    return await apiClient.get<LeaveType[]>("/hr/leaves/types");
  },

  async getLeaveBalances(employeeId?: string, year?: number): Promise<LeaveBalance[]> {
    const params = new URLSearchParams();
    if (employeeId) params.append("employeeId", employeeId);
    if (year) params.append("year", year.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiClient.get<LeaveBalance[]>(`/hr/leaves/balances${query}`);
  },

  async getLeaveRequests(employeeId?: string, status?: string): Promise<LeaveRequest[]> {
    const params = new URLSearchParams();
    if (employeeId) params.append("employeeId", employeeId);
    if (status) params.append("status", status);
    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiClient.get<LeaveRequest[]>(`/hr/leaves/requests${query}`);
  },

  async applyLeave(payload: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<LeaveRequest> {
    return await apiClient.post<LeaveRequest>("/hr/leaves/requests", payload);
  },

  async updateLeaveRequest(id: string, payload: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
  }): Promise<LeaveRequest> {
    return await apiClient.put<LeaveRequest>(`/hr/leaves/requests/${id}`, payload);
  },

  async allocateLeaveBalance(employeeId: string, payload: {
    leaveTypeId: string;
    year: number;
    totalDays: number;
  }): Promise<LeaveBalance> {
    return await apiClient.post<LeaveBalance>(`/hr/leaves/balances/${employeeId}/allocate`, payload);
  },

  async approveLeave(requestId: string, comments?: string): Promise<LeaveRequest> {
    return await apiClient.post<LeaveRequest>(`/hr/leaves/requests/${requestId}/approve`, { comments });
  },

  async rejectLeave(requestId: string, comments?: string): Promise<LeaveRequest> {
    return await apiClient.post<LeaveRequest>(`/hr/leaves/requests/${requestId}/reject`, { comments });
  },

  // Payroll
  async getSalaryStructures(): Promise<SalaryStructure[]> {
    const list = await apiClient.get<SalaryStructure[]>("/hr/payroll/structures");
    return (list || []).map((s: any) => ({
      ...s,
      houseRentAllowance: s.houseRentAllowance ?? s.hra ?? 0,
    }));
  },

  async getSalaryStructureByEmployee(employeeId: string): Promise<SalaryStructure | null> {
    try {
      const s = await apiClient.get<SalaryStructure>(`/hr/payroll/structures/${employeeId}`);
      if (!s) return null;
      return {
        ...s,
        houseRentAllowance: (s as any).houseRentAllowance ?? (s as any).hra ?? 0,
      };
    } catch {
      return null;
    }
  },

  async saveSalaryStructure(payload: Partial<SalaryStructure>): Promise<SalaryStructure> {
    const hraValue = payload.houseRentAllowance ?? (payload as any).hra ?? 0;
    const body = {
      ...payload,
      houseRentAllowance: hraValue,
      hra: hraValue,
    };
    const endpoint = payload.employeeId
      ? `/hr/payroll/structures/${payload.employeeId}`
      : "/hr/payroll/structures";
    return await apiClient.post<SalaryStructure>(endpoint, body);
  },

  async getPayrollRuns(): Promise<PayrollRun[]> {
    return await apiClient.get<PayrollRun[]>("/hr/payroll/runs");
  },

  async processPayroll(month: number, year: number, remarks?: string): Promise<PayrollRun> {
    return await apiClient.post<PayrollRun>("/hr/payroll/runs/process", { month, year, remarks });
  },

  async getPayslipsForRun(runId: string): Promise<Payslip[]> {
    const list = await apiClient.get<Payslip[]>(`/hr/payroll/runs/${runId}/payslips`);
    return (list || []).map((p: any) => ({
      ...p,
      providentFund: p.providentFund ?? p.pfDeduction ?? 0,
      pfDeduction: p.providentFund ?? p.pfDeduction ?? 0,
      employeeStateInsurance: p.employeeStateInsurance ?? p.esiDeduction ?? 0,
      esiDeduction: p.employeeStateInsurance ?? p.esiDeduction ?? 0,
      taxDeductedAtSource: p.taxDeductedAtSource ?? p.tdsDeduction ?? 0,
      tdsDeduction: p.taxDeductedAtSource ?? p.tdsDeduction ?? 0,
      lossOfPayDeduction: p.lossOfPayDeduction ?? p.lopDeduction ?? 0,
      lopDeduction: p.lossOfPayDeduction ?? p.lopDeduction ?? 0,
      totalWorkingDays: p.totalWorkingDays ?? p.workingDays ?? 30,
      workingDays: p.totalWorkingDays ?? p.workingDays ?? 30,
      houseRentAllowance: p.houseRentAllowance ?? p.hra ?? 0,
      hra: p.houseRentAllowance ?? p.hra ?? 0,
      departmentName: p.departmentName ?? p.department ?? "",
    }));
  },

  async getPayslip(payslipId: string): Promise<Payslip> {
    const p: any = await apiClient.get<Payslip>(`/hr/payroll/payslips/${payslipId}`);
    return {
      ...p,
      providentFund: p?.providentFund ?? p?.pfDeduction ?? 0,
      pfDeduction: p?.providentFund ?? p?.pfDeduction ?? 0,
      employeeStateInsurance: p?.employeeStateInsurance ?? p?.esiDeduction ?? 0,
      esiDeduction: p?.employeeStateInsurance ?? p?.esiDeduction ?? 0,
      taxDeductedAtSource: p?.taxDeductedAtSource ?? p?.tdsDeduction ?? 0,
      tdsDeduction: p?.taxDeductedAtSource ?? p?.tdsDeduction ?? 0,
      lossOfPayDeduction: p?.lossOfPayDeduction ?? p?.lopDeduction ?? 0,
      lopDeduction: p?.lossOfPayDeduction ?? p?.lopDeduction ?? 0,
      totalWorkingDays: p?.totalWorkingDays ?? p?.workingDays ?? 30,
      workingDays: p?.totalWorkingDays ?? p?.workingDays ?? 30,
      houseRentAllowance: p?.houseRentAllowance ?? p?.hra ?? 0,
      hra: p?.houseRentAllowance ?? p?.hra ?? 0,
      departmentName: p?.departmentName ?? p?.department ?? "",
    };
  },

  async markPayslipPaid(payslipId: string, payload: { paymentMode: string; paymentReference: string }): Promise<Payslip> {
    return await apiClient.post<Payslip>(`/hr/payroll/payslips/${payslipId}/mark-paid`, payload);
  },

  // HR Masters (Job Title, Employment Type, Status, Salary Type, Leave Category)
  async getMasters(category?: string): Promise<HrMasterItem[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    return await apiClient.get<HrMasterItem[]>(`/hr/masters${query}`);
  },

  async createMaster(payload: {
    category: string;
    name: string;
    code?: string;
    description?: string;
    isDefault?: boolean;
  }): Promise<HrMasterItem> {
    return await apiClient.post<HrMasterItem>("/hr/masters", payload);
  },

  async updateMaster(id: string, payload: {
    name: string;
    description?: string;
    isDefault?: boolean;
    isActive?: boolean;
  }): Promise<HrMasterItem> {
    return await apiClient.put<HrMasterItem>(`/hr/masters/${id}`, payload);
  },

  async deleteMaster(id: string): Promise<void> {
    return await apiClient.delete<void>(`/hr/masters/${id}`);
  },

  async deleteLeaveRequest(id: string): Promise<void> {
    try {
      await apiClient.delete<void>(`/hr/leaves/requests/${id}`);
    } catch {
      // Graceful fallback for UI soft-delete
    }
  },

  async deletePayrollRun(id: string): Promise<void> {
    try {
      await apiClient.delete<void>(`/hr/payroll/runs/${id}`);
    } catch {
      // Graceful fallback
    }
  },

  async deleteSalaryStructure(employeeId: string): Promise<void> {
    try {
      await apiClient.delete<void>(`/hr/payroll/structures/${employeeId}`);
    } catch {
      // Graceful fallback
    }
  },

  // Statutory Calculations & Exclusions
  async calculateStatutory(salary: number, isCtc: boolean = false): Promise<StatutoryBreakdown> {
    const raw = await apiClient.get<any>(`/hr/payroll/calculate-statutory?salary=${salary}&isCtc=${isCtc}`);
    const gross = Number(raw?.monthlyGross ?? raw?.grossMonthlySalary ?? (isCtc ? Math.round(salary / 12) : salary) ?? 0);
    const basic = Number(raw?.basicSalary ?? Math.round(gross * 0.5));
    const hra = Number(raw?.houseRentAllowance ?? raw?.hra ?? Math.round(gross * 0.2));
    const conveyance = Number(raw?.conveyanceAllowance ?? Math.min(1600, Math.max(0, gross - basic - hra)));
    const medical = Number(raw?.medicalAllowance ?? Math.min(1250, Math.max(0, gross - basic - hra - conveyance)));
    const special = Number(raw?.specialAllowance ?? Math.max(0, gross - (basic + hra + conveyance + medical)));
    const bonus = Number(raw?.performanceBonus ?? 0);
    const pfEmp = Number(raw?.providentFundEmployee ?? (basic > 0 ? Math.round(Math.min(basic, 15000) * 0.12) : 0));
    const pfEmplr = Number(raw?.providentFundEmployer ?? pfEmp);
    const esi = Number(raw?.employeeStateInsurance ?? raw?.esiEmployee ?? (gross <= 21000 && gross > 0 ? Math.round(gross * 0.0075) : 0));
    const esiEmplr = Number(raw?.esiEmployer ?? (gross <= 21000 && gross > 0 ? Math.round(gross * 0.0325) : 0));
    const pt = Number(raw?.professionalTax ?? (gross > 10000 ? 200 : gross > 7500 ? 175 : 0));
    const tds = Number(raw?.taxDeductedAtSource ?? raw?.tdsTax ?? 0);
    const totalDed = Number(raw?.totalDeductions ?? (pfEmp + esi + pt + tds));
    const net = Number(raw?.netTakeHome ?? raw?.netMonthlySalary ?? Math.max(0, gross - totalDed));
    const ctc = Number(raw?.annualCtc ?? (isCtc ? salary : (gross * 12) + (pfEmplr * 12) + (esiEmplr * 12)));
    const salType = String(raw?.salaryType ?? (isCtc ? "Annual CTC" : "Monthly"));

    return {
      monthlyGross: gross,
      grossMonthlySalary: gross,
      basicSalary: basic,
      houseRentAllowance: hra,
      hra: hra,
      conveyanceAllowance: conveyance,
      medicalAllowance: medical,
      specialAllowance: special,
      performanceBonus: bonus,
      providentFundEmployee: pfEmp,
      providentFundEmployer: pfEmplr,
      employeeStateInsurance: esi,
      esiEmployee: esi,
      esiEmployer: esiEmplr,
      professionalTax: pt,
      taxDeductedAtSource: tds,
      tdsTax: tds,
      totalDeductions: totalDed,
      netTakeHome: net,
      netMonthlySalary: net,
      annualCtc: ctc,
      salaryType: salType,
    };
  },

  async calculateWorkingDays(startDate: string, endDate: string): Promise<LeaveWorkingDaysResult> {
    return await apiClient.get<LeaveWorkingDaysResult>(`/hr/leaves/calculate-working-days?startDate=${startDate}&endDate=${endDate}`);
  },
};
