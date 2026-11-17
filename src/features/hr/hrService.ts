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

  async approveLeave(requestId: string, comments?: string): Promise<LeaveRequest> {
    return await apiClient.post<LeaveRequest>(`/hr/leaves/requests/${requestId}/approve`, { comments });
  },

  async rejectLeave(requestId: string, comments?: string): Promise<LeaveRequest> {
    return await apiClient.post<LeaveRequest>(`/hr/leaves/requests/${requestId}/reject`, { comments });
  },

  // Payroll
  async getSalaryStructures(): Promise<SalaryStructure[]> {
    return await apiClient.get<SalaryStructure[]>("/hr/payroll/structures");
  },

  async getSalaryStructureByEmployee(employeeId: string): Promise<SalaryStructure | null> {
    try {
      return await apiClient.get<SalaryStructure>(`/hr/payroll/structures/${employeeId}`);
    } catch {
      return null;
    }
  },

  async saveSalaryStructure(payload: Partial<SalaryStructure>): Promise<SalaryStructure> {
    return await apiClient.post<SalaryStructure>("/hr/payroll/structures", payload);
  },

  async getPayrollRuns(): Promise<PayrollRun[]> {
    return await apiClient.get<PayrollRun[]>("/hr/payroll/runs");
  },

  async processPayroll(month: number, year: number, remarks?: string): Promise<PayrollRun> {
    return await apiClient.post<PayrollRun>("/hr/payroll/runs/process", { month, year, remarks });
  },

  async getPayslipsForRun(runId: string): Promise<Payslip[]> {
    return await apiClient.get<Payslip[]>(`/hr/payroll/runs/${runId}/payslips`);
  },

  async getPayslip(payslipId: string): Promise<Payslip> {
    return await apiClient.get<Payslip>(`/hr/payroll/payslips/${payslipId}`);
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
    sortOrder?: number;
    isDefault?: boolean;
  }): Promise<HrMasterItem> {
    return await apiClient.post<HrMasterItem>("/hr/masters", payload);
  },

  // Statutory Calculations & Exclusions
  async calculateStatutory(salary: number, isCtc: boolean = false): Promise<StatutoryBreakdown> {
    return await apiClient.get<StatutoryBreakdown>(`/hr/payroll/calculate-statutory?salary=${salary}&isCtc=${isCtc}`);
  },

  async calculateWorkingDays(startDate: string, endDate: string): Promise<LeaveWorkingDaysResult> {
    return await apiClient.get<LeaveWorkingDaysResult>(`/hr/leaves/calculate-working-days?startDate=${startDate}&endDate=${endDate}`);
  },
};
