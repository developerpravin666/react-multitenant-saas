import React, { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import {
  CreditCard,
  DollarSign,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Play,
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RotateCcw,
  X,
  Building,
  Shield,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Calculator,
} from "lucide-react";
import { hrService } from "./hrService";
import type { PayrollRun, Payslip, SalaryStructure, Employee } from "./hr.types";
import { useNotifications } from "../../context/NotificationContext";

export function PayrollManagementPage() {
  const notifications = useNotifications();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [runPayslips, setRunPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"RUNS" | "STRUCTURES" | "PAYSLIPS">("RUNS");
  const [search, setSearch] = useState<string>("");

  // Process Payroll Modal
  const [showProcessModal, setShowProcessModal] = useState<boolean>(false);
  const [processForm, setProcessForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    remarks: "",
  });
  const [processErrors, setProcessErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // View Payroll Run Details Modal
  const [viewingRun, setViewingRun] = useState<PayrollRun | null>(null);

  // Edit Payroll Run Remarks Modal
  const [editingRun, setEditingRun] = useState<{ id: string; runNumber: string; remarks: string } | null>(null);
  const [isUpdatingRun, setIsUpdatingRun] = useState<boolean>(false);

  // Payslip Details / Printable Modal
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // Edit Payslip Modal
  const [editingPayslip, setEditingPayslip] = useState<{
    payslip: Payslip;
    presentDays: number;
    unpaidLeaveDays: number;
    notes: string;
  } | null>(null);

  // Mark Paid Modal
  const [markPaidModal, setMarkPaidModal] = useState<{
    payslip: Payslip;
    paymentMode: string;
    reference: string;
  } | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState<boolean>(false);

  // View Salary Structure Modal
  const [viewingStructure, setViewingStructure] = useState<{
    employee: Employee;
    structure?: SalaryStructure;
  } | null>(null);

  // Configure Salary Modal
  const [salaryModal, setSalaryModal] = useState<{
    employeeId: string;
    employeeName: string;
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
  } | null>(null);
  const [salaryErrors, setSalaryErrors] = useState<Record<string, string>>({});
  const [isSavingSalary, setIsSavingSalary] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [runList, structList, empList] = await Promise.all([
        hrService.getPayrollRuns(),
        hrService.getSalaryStructures(),
        hrService.getEmployees(),
      ]);
      setRuns(runList || []);
      setStructures(structList || []);
      setEmployees(empList || []);

      if (runList && runList.length > 0 && !selectedRun) {
        const firstRun = runList[0];
        if (firstRun) {
          setSelectedRun(firstRun);
          const slips = await hrService.getPayslipsForRun(firstRun.id);
          setRunPayslips(slips || []);
        }
      }
    } catch {
      notifications.error("Failed to load payroll records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectRun = async (run: PayrollRun) => {
    setSelectedRun(run);
    try {
      const slips = await hrService.getPayslipsForRun(run.id);
      setRunPayslips(slips || []);
      setActiveTab("PAYSLIPS");
    } catch {
      notifications.error("Failed to load payslips for selected batch");
    }
  };

const processPayrollSchema = z.object({
  month: z
    .number({ error: "Select a valid month (1 to 12)." })
    .min(1, "Select a valid month (1 to 12).")
    .max(12, "Select a valid month (1 to 12)."),
  year: z
    .number({ error: "Enter a valid year between 2020 and 2035." })
    .min(2020, "Enter a valid year between 2020 and 2035.")
    .max(2035, "Enter a valid year between 2020 and 2035."),
  remarks: z
    .string()
    .max(500, "Remarks cannot exceed 500 characters.")
    .optional(),
});

const salaryStructureSchema = z.object({
  basicSalary: z.number({ error: "Invalid basic salary" }).min(0, "Basic salary cannot be negative."),
  houseRentAllowance: z.number({ error: "Invalid HRA" }).min(0, "HRA cannot be negative."),
  specialAllowance: z.number({ error: "Invalid special allowance" }).min(0, "Special allowance cannot be negative."),
  providentFundEmployee: z.number({ error: "Invalid PF" }).min(0, "Provident fund deduction cannot be negative."),
  professionalTax: z.number({ error: "Invalid PT" }).min(0, "Professional tax cannot be negative."),
});

  // Process Payroll with Product Master Zod validation
  const validateProcessForm = (): boolean => {
    const errs: Record<string, string> = {};

    const parseResult = processPayrollSchema.safeParse({
      month: Number(processForm.month),
      year: Number(processForm.year),
      remarks: processForm.remarks || undefined,
    });

    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errs[field]) {
          errs[field] = issue.message;
        }
      }
    }

    setProcessErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProcessForm()) return;

    try {
      setIsProcessing(true);
      const newRun = await hrService.processPayroll(
        processForm.month,
        processForm.year,
        processForm.remarks
      );
      notifications.success(`Payroll batch ${newRun.runNumber} processed successfully!`);
      setShowProcessModal(false);
      await loadData();
      await handleSelectRun(newRun);
    } catch (err: any) {
      notifications.error(err?.response?.data?.message || err?.message || "Failed to process payroll batch.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete Payroll Run
  const handleDeleteRun = async (run: PayrollRun) => {
    const confirmed = await notifications.confirm({
      title: `Delete Payroll Run ${run.runNumber}?`,
      message: `Are you sure you want to delete and void this payroll batch for ${monthNames[run.month - 1]} ${run.year}? All ${run.totalEmployees} associated payslips will be marked as cancelled.`,
      variant: "danger",
      confirmLabel: "Delete Batch",
    });
    if (!confirmed) return;

    try {
      await hrService.deletePayrollRun(run.id);
      notifications.success(`Payroll run ${run.runNumber} deleted successfully.`);
      if (selectedRun?.id === run.id) {
        setSelectedRun(null);
        setRunPayslips([]);
      }
      await loadData();
    } catch {
      notifications.error("Failed to delete payroll batch.");
    }
  };

  // Save Edit Run Remarks
  const handleSaveEditRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRun) return;
    try {
      setIsUpdatingRun(true);
      // Soft-update remarks in state
      setRuns((prev) =>
        prev.map((r) => (r.id === editingRun.id ? { ...r, remarks: editingRun.remarks } : r))
      );
      notifications.success("Payroll run remarks updated successfully.");
      setEditingRun(null);
    } catch {
      notifications.error("Failed to update remarks.");
    } finally {
      setIsUpdatingRun(false);
    }
  };

  // Mark Paid Submit
  const handleMarkPaid = async () => {
    if (!markPaidModal) return;
    try {
      setIsMarkingPaid(true);
      await hrService.markPayslipPaid(markPaidModal.payslip.id, {
        paymentMode: markPaidModal.paymentMode,
        paymentReference: markPaidModal.reference,
      });
      notifications.success(`Payslip for ${markPaidModal.payslip.employeeName} marked as paid.`);
      setMarkPaidModal(null);
      if (selectedRun) {
        const slips = await hrService.getPayslipsForRun(selectedRun.id);
        setRunPayslips(slips || []);
      }
    } catch {
      notifications.error("Failed to record payment.");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  // Delete Individual Payslip
  const handleDeletePayslip = async (slip: Payslip) => {
    const confirmed = await notifications.confirm({
      title: `Void Payslip for ${slip.employeeName}?`,
      message: `Are you sure you want to void this payslip (Net: ₹${(slip.netSalary ?? 0).toLocaleString("en-IN")})?`,
      variant: "danger",
      confirmLabel: "Void Payslip",
    });
    if (!confirmed) return;

    setRunPayslips((prev) => prev.filter((s) => s.id !== slip.id));
    notifications.success(`Payslip for ${slip.employeeName} voided.`);
  };

  // Save Edit Payslip
  const handleSaveEditPayslip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayslip) return;

    const updatedNet = Math.max(
      0,
      editingPayslip.payslip.grossEarnings -
        editingPayslip.payslip.totalDeductions -
        (editingPayslip.unpaidLeaveDays * (editingPayslip.payslip.grossEarnings / 30))
    );

    setRunPayslips((prev) =>
      prev.map((s) =>
        s.id === editingPayslip.payslip.id
          ? {
              ...s,
              presentDays: editingPayslip.presentDays,
              unpaidLeaveDays: editingPayslip.unpaidLeaveDays,
              netSalary: Math.round(updatedNet),
            }
          : s
      )
    );
    notifications.success(`Attendance adjustments saved for ${editingPayslip.payslip.employeeName}.`);
    setEditingPayslip(null);
  };

  // Configure Salary with statutory auto-breakdown
  const openConfigureSalary = (emp: Employee) => {
    const baseSal = emp.baseSalary ?? emp.monthlyBaseSalary ?? 0;
    const existing = structures.find((s) => s.employeeId === emp.id);
    const basic = existing ? existing.basicSalary : baseSal * 0.5;
    const hra = existing ? existing.houseRentAllowance : basic * 0.4;
    const special = existing ? existing.specialAllowance : Math.max(0, baseSal - (basic + hra));
    const pf = existing ? existing.providentFundEmployee : Math.min(1800, basic * 0.12);

    setSalaryModal({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      basicSalary: Math.round(basic),
      houseRentAllowance: Math.round(hra),
      specialAllowance: Math.round(special),
      conveyanceAllowance: existing ? existing.conveyanceAllowance : 1600,
      medicalAllowance: existing ? existing.medicalAllowance : 1250,
      performanceBonus: existing ? existing.performanceBonus : 0,
      providentFundEmployee: Math.round(pf),
      providentFundEmployer: Math.round(pf),
      employeeStateInsurance: existing ? existing.employeeStateInsurance : (baseSal <= 21000 ? Math.round(baseSal * 0.0075) : 0),
      professionalTax: existing ? existing.professionalTax : 200,
      taxDeductedAtSource: existing ? existing.taxDeductedAtSource : 0,
    });
    setSalaryErrors({});
  };

  // Product Master Zod validation for Salary Structure
  const validateSalaryModal = (): boolean => {
    if (!salaryModal) return false;
    const errs: Record<string, string> = {};

    const parseResult = salaryStructureSchema.safeParse({
      basicSalary: Number(salaryModal.basicSalary),
      houseRentAllowance: Number(salaryModal.houseRentAllowance),
      specialAllowance: Number(salaryModal.specialAllowance),
      providentFundEmployee: Number(salaryModal.providentFundEmployee),
      professionalTax: Number(salaryModal.professionalTax),
    });

    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errs[field]) {
          errs[field] = issue.message;
        }
      }
    }

    setSalaryErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryModal || !validateSalaryModal()) return;

    try {
      setIsSavingSalary(true);
      await hrService.saveSalaryStructure(salaryModal);
      notifications.success(`Salary structure saved for ${salaryModal.employeeName}.`);
      setSalaryModal(null);
      await loadData();
    } catch {
      notifications.error("Failed to save salary structure.");
    } finally {
      setIsSavingSalary(false);
    }
  };

  // Delete / Reset Salary Structure
  const handleDeleteStructure = async (emp: Employee) => {
    const confirmed = await notifications.confirm({
      title: `Reset Salary Structure?`,
      message: `Reset custom compensation structure for ${emp.firstName} ${emp.lastName} to standard auto-calculated statutory values?`,
      variant: "danger",
      confirmLabel: "Reset Structure",
    });
    if (!confirmed) return;

    try {
      await hrService.deleteSalaryStructure(emp.id);
      notifications.success(`Salary structure reset for ${emp.firstName} ${emp.lastName}.`);
      await loadData();
    } catch {
      notifications.error("Failed to reset salary structure.");
    }
  };

  const stats = useMemo(() => {
    const lastRun = runs[0];
    const totalDisbursed = runs.reduce((sum, r) => sum + r.totalNetAmount, 0);
    const totalDeductions = runs.reduce((sum, r) => sum + r.totalDeductions, 0);
    const totalEmployeesOnboarded = employees.length;

    return {
      lastRunAmount: lastRun?.totalNetAmount || 0,
      lastRunEmployees: lastRun?.totalEmployees || 0,
      totalDisbursed,
      totalDeductions,
      totalEmployeesOnboarded,
    };
  }, [runs, employees]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-indigo-600" />
            Smart Payroll & Compensation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated monthly salary calculation with EPF, ESI, Professional Tax, and Leave Loss of Pay.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setProcessErrors({});
              setShowProcessModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
          >
            <Play className="w-4 h-4" />
            Run Monthly Payroll
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Active Employees</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalEmployeesOnboarded}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Last Batch Payout</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{stats.lastRunAmount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Statutory Deductions</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              ₹{stats.totalDeductions.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">All-Time Disbursed</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₹{stats.totalDisbursed.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("RUNS")}
          className={`py-3 px-2 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "RUNS"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Payroll Runs ({runs.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("PAYSLIPS")}
          className={`py-3 px-2 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "PAYSLIPS"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Batch Payslips {selectedRun ? `(${selectedRun.runNumber})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("STRUCTURES")}
          className={`py-3 px-2 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "STRUCTURES"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building className="w-4 h-4" />
          Salary Compensation Structures ({employees.length})
        </button>
      </div>

      {/* Tab: Payroll Runs */}
      {activeTab === "RUNS" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                <tr>
                  <th className="px-5 py-3">Run Ref</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Processed Date</th>
                  <th className="px-4 py-3">Staff Count</th>
                  <th className="px-4 py-3">Gross Earnings</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net Disbursal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400">
                      No payroll runs executed yet. Click "Run Monthly Payroll" to compute your first salary cycle.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr
                      key={run.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer ${
                        selectedRun?.id === run.id ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                      }`}
                      onClick={() => handleSelectRun(run)}
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {run.runNumber}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white">
                        {monthNames[run.month - 1]} {run.year}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {run.processedAt ? run.processedAt.slice(0, 10) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{run.totalEmployees} Staff</td>
                      <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                        ₹{run.totalGrossAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-rose-600">
                        ₹{run.totalDeductions.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        ₹{run.totalNetAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Action */}
                          <button
                            type="button"
                            onClick={() => setViewingRun(run)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Run Summary"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Action */}
                          <button
                            type="button"
                            onClick={() => setEditingRun({ id: run.id, runNumber: run.runNumber, remarks: run.remarks || "" })}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Run Remarks"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Action */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRun(run)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* View Slips shortcut */}
                          <button
                            type="button"
                            onClick={() => handleSelectRun(run)}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-1"
                          >
                            Slips
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Payslips */}
      {activeTab === "PAYSLIPS" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                Payslips for {selectedRun ? `${monthNames[selectedRun.month - 1]} ${selectedRun.year}` : "Active Run"}
              </h3>
              <p className="text-xs text-slate-500">
                Batch: {selectedRun?.runNumber || "None selected"} | Total Disbursed: ₹
                {selectedRun?.totalNetAmount.toLocaleString("en-IN") || 0}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff in batch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Gross Pay</th>
                  <th className="px-4 py-3">LOP Deduction</th>
                  <th className="px-4 py-3">Statutory (PF/ESI)</th>
                  <th className="px-4 py-3">Net Take Home</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {runPayslips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      No payslips found for this cycle. Select a run or execute a new monthly batch.
                    </td>
                  </tr>
                ) : (
                  runPayslips
                    .filter((s) => !search || s.employeeName.toLowerCase().includes(search.toLowerCase()))
                    .map((slip) => (
                      <tr key={slip.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{slip.employeeName}</div>
                          <div className="text-xs text-slate-400 font-mono">{slip.employeeCode}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {slip.presentDays} / {(slip.totalWorkingDays ?? (slip as any).workingDays ?? 30)} Days
                          {(slip.unpaidLeaveDays ?? 0) > 0 && (
                            <span className="block text-rose-500 font-medium">
                              {slip.unpaidLeaveDays}d Unpaid LOP
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                          ₹{(slip.grossEarnings ?? 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-rose-600">
                          {(slip.lossOfPayDeduction ?? (slip as any).lopDeduction ?? 0) > 0
                            ? `-₹${(slip.lossOfPayDeduction ?? (slip as any).lopDeduction ?? 0).toLocaleString("en-IN")}`
                            : "₹0"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                          <div>PF: ₹{(slip.providentFund ?? (slip as any).pfDeduction ?? 0).toLocaleString("en-IN")}</div>
                          <div>PT: ₹{(slip.professionalTax ?? 0).toLocaleString("en-IN")}</div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          ₹{(slip.netSalary ?? 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              slip.paymentStatus === "PAID"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                            }`}
                          >
                            {slip.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Action */}
                            <button
                              type="button"
                              onClick={() => setSelectedPayslip(slip)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View & Print Slip"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit Action */}
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPayslip({
                                  payslip: slip,
                                  presentDays: slip.presentDays,
                                  unpaidLeaveDays: slip.unpaidLeaveDays,
                                  notes: "",
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit Attendance / Adjustments"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Delete Action */}
                            <button
                              type="button"
                              onClick={() => handleDeletePayslip(slip)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Void Payslip"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Pay Action */}
                            {slip.paymentStatus !== "PAID" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setMarkPaidModal({
                                    payslip: slip,
                                    paymentMode: "NEFT",
                                    reference: `TXN${Date.now().toString().slice(-6)}`,
                                  })
                                }
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors ml-1"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Salary Structures */}
      {activeTab === "STRUCTURES" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-4 py-3">Basic Pay</th>
                  <th className="px-4 py-3">HRA</th>
                  <th className="px-4 py-3">Special & Allowances</th>
                  <th className="px-4 py-3">Gross Salary</th>
                  <th className="px-4 py-3">EPF Employee</th>
                  <th className="px-4 py-3">PT / ESI</th>
                  <th className="px-4 py-3">Net Take-Home</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map((emp) => {
                  const baseSal = emp.baseSalary ?? emp.monthlyBaseSalary ?? 0;
                  const struct = structures.find((s) => s.employeeId === emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{emp.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                        ₹{(struct?.basicSalary || baseSal * 0.5).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                        ₹{(struct?.houseRentAllowance || baseSal * 0.2).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                        ₹{(struct?.specialAllowance || baseSal * 0.3).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                        ₹{(struct?.grossSalary || baseSal).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-rose-600">
                        ₹{(struct?.providentFundEmployee || Math.min(1800, Math.round(baseSal * 0.5 * 0.12))).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-rose-600">
                        ₹{(struct?.professionalTax || 200).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600">
                        ₹{(struct?.netSalary || Math.round(baseSal - (Math.min(1800, baseSal * 0.5 * 0.12) + 200))).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Action */}
                          <button
                            type="button"
                            onClick={() => setViewingStructure({ employee: emp, structure: struct })}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Detailed Structure"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit / Configure Action */}
                          <button
                            type="button"
                            onClick={() => openConfigureSalary(emp)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Configure Structure"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Reset / Delete Action */}
                          <button
                            type="button"
                            onClick={() => handleDeleteStructure(emp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Reset to Statutory Formula"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Payroll Run Details Modal */}
      {viewingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Payroll Run Details: {viewingRun.runNumber}
              </h3>
              <button onClick={() => setViewingRun(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 uppercase">Period</span>
                  <div className="font-semibold text-slate-900 dark:text-white text-base">
                    {monthNames[viewingRun.month - 1]} {viewingRun.year}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase">Status</span>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      {viewingRun.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-400 uppercase">Staff Processed</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white">{viewingRun.totalEmployees}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-400 uppercase">Total Gross</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    ₹{viewingRun.totalGrossAmount.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-slate-800 text-center">
                  <span className="text-xs text-rose-600 uppercase">Deductions</span>
                  <div className="text-base font-bold text-rose-600">
                    ₹{viewingRun.totalDeductions.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 uppercase font-bold block">Net Salary Disbursal</span>
                  <span className="text-xs text-emerald-600">Total payable across batch</span>
                </div>
                <div className="text-2xl font-black text-emerald-700">
                  ₹{viewingRun.totalNetAmount.toLocaleString("en-IN")}
                </div>
              </div>

              {viewingRun.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 uppercase block mb-1">Batch Notes</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{viewingRun.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setViewingRun(null);
                  handleSelectRun(viewingRun);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Inspect Payslips &rarr;
              </button>
              <button
                type="button"
                onClick={() => setViewingRun(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payroll Run Remarks Modal */}
      {editingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Edit Remarks: {editingRun.runNumber}
              </h3>
              <button onClick={() => setEditingRun(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRun} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Batch Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  value={editingRun.remarks}
                  onChange={(e) => setEditingRun({ ...editingRun, remarks: e.target.value })}
                  placeholder="Update run remarks or audit references..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRun(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRun}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Remarks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Individual Payslip Modal */}
      {editingPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Adjust Payslip: {editingPayslip.payslip.employeeName}
              </h3>
              <button onClick={() => setEditingPayslip(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPayslip} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Present Days (of {editingPayslip.payslip.totalWorkingDays})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={editingPayslip.payslip.totalWorkingDays}
                    value={editingPayslip.presentDays}
                    onChange={(e) =>
                      setEditingPayslip({ ...editingPayslip, presentDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unpaid Leave Days (LOP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={editingPayslip.payslip.totalWorkingDays}
                    value={editingPayslip.unpaidLeaveDays}
                    onChange={(e) =>
                      setEditingPayslip({ ...editingPayslip, unpaidLeaveDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Reason / Notes
                </label>
                <textarea
                  rows={2}
                  value={editingPayslip.notes}
                  onChange={(e) => setEditingPayslip({ ...editingPayslip, notes: e.target.value })}
                  placeholder="Reason for manual attendance adjustment..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPayslip(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save Adjustments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Salary Structure Modal */}
      {viewingStructure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                Salary Structure: {viewingStructure.employee.firstName} {viewingStructure.employee.lastName}
              </h3>
              <button onClick={() => setViewingStructure(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {viewingStructure.employee.designation} - {viewingStructure.employee.department}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">Code: {viewingStructure.employee.employeeCode}</div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-green-100 text-green-800 rounded-full">
                  Statutory Formatted
                </span>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block border-b pb-1">Earnings</span>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Basic Pay:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ₹{(viewingStructure.structure?.basicSalary || (viewingStructure.employee.baseSalary ?? 45000) * 0.5).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">HRA:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ₹{(viewingStructure.structure?.houseRentAllowance || (viewingStructure.employee.baseSalary ?? 45000) * 0.2).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Special Allowance:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ₹{(viewingStructure.structure?.specialAllowance || (viewingStructure.employee.baseSalary ?? 45000) * 0.3).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t text-indigo-700">
                    <span>Gross Salary:</span>
                    <span>
                      ₹{(viewingStructure.structure?.grossSalary || (viewingStructure.employee.baseSalary ?? 45000)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block border-b pb-1">Deductions</span>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Employee PF (12%):</span>
                    <span className="font-semibold text-rose-600">
                      ₹{(viewingStructure.structure?.providentFundEmployee || Math.min(1800, ((viewingStructure.employee.baseSalary ?? 45000) * 0.5 * 0.12))).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Professional Tax:</span>
                    <span className="font-semibold text-rose-600">
                      ₹{(viewingStructure.structure?.professionalTax || 200).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ESIC:</span>
                    <span className="font-semibold text-rose-600">
                      ₹{(viewingStructure.structure?.employeeStateInsurance || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t text-rose-700">
                    <span>Total Deductions:</span>
                    <span>
                      ₹{((viewingStructure.structure?.providentFundEmployee || Math.min(1800, ((viewingStructure.employee.baseSalary ?? 45000) * 0.5 * 0.12))) + 200).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const emp = viewingStructure.employee;
                  setViewingStructure(null);
                  openConfigureSalary(emp);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Configure Values &rarr;
              </button>
              <button
                type="button"
                onClick={() => setViewingStructure(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Payroll Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-600" />
                Execute Monthly Payroll Batch
              </h3>
              <button
                type="button"
                onClick={() => setShowProcessModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Month *
                  </label>
                  <select
                    value={processForm.month}
                    onChange={(e) => setProcessForm({ ...processForm, month: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={processForm.year}
                    onChange={(e) => setProcessForm({ ...processForm, year: Number(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${
                      processErrors.year ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500"
                    }`}
                  />
                  {processErrors.year && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{processErrors.year}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Batch Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Regular monthly disbursal with loss of pay deduction"
                  value={processForm.remarks}
                  onChange={(e) => setProcessForm({ ...processForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
                {processErrors.remarks && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{processErrors.remarks}</p>
                )}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  The calculation engine will automatically check approved leave requests, subtract unpaid Loss of Pay
                  (LOP) days, apply EPF & statutory deductions, and generate individual payslips.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProcessModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                  {isProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Execute Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Structure Configuration Modal */}
      {salaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                Configure Salary Breakup: {salaryModal.employeeName}
              </h3>
              <button onClick={() => setSalaryModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} noValidate className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Monthly Earnings
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Basic Salary (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salaryModal.basicSalary}
                    onChange={(e) => setSalaryModal({ ...salaryModal, basicSalary: Number(e.target.value) })}
                    className={`w-full px-3 py-1.5 border rounded-lg text-sm ${
                      salaryErrors.basicSalary ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                    }`}
                  />
                  {salaryErrors.basicSalary && (
                    <p className="text-xs text-rose-500 mt-1">{salaryErrors.basicSalary}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    HRA (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salaryModal.houseRentAllowance}
                    onChange={(e) => setSalaryModal({ ...salaryModal, houseRentAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Special Allowance (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salaryModal.specialAllowance}
                    onChange={(e) => setSalaryModal({ ...salaryModal, specialAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Conveyance (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salaryModal.conveyanceAllowance}
                    onChange={(e) => setSalaryModal({ ...salaryModal, conveyanceAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
                  />
                </div>
              </div>

              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-200 dark:border-slate-800">
                Statutory Deductions
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Employee PF (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salaryModal.providentFundEmployee}
                    onChange={(e) => setSalaryModal({ ...salaryModal, providentFundEmployee: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    ESI (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salaryModal.employeeStateInsurance}
                    onChange={(e) => setSalaryModal({ ...salaryModal, employeeStateInsurance: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Professional Tax (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salaryModal.professionalTax}
                    onChange={(e) => setSalaryModal({ ...salaryModal, professionalTax: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSalaryModal(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSalary}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                  {isSavingSalary && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  Salary Pay Slip ({monthNames[selectedPayslip.month - 1]} {selectedPayslip.year})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayslip(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Slip Header */}
              <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">SIDDHI COMMERCE</h2>
                <p className="text-xs text-slate-500 mt-0.5">Automated Multi-Tenant HR & Enterprise Payroll</p>
                <div className="mt-2 inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-full">
                  Payslip for {monthNames[selectedPayslip.month - 1]} {selectedPayslip.year}
                </div>
              </div>

              {/* Employee Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-950/30 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block">Employee Name:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {selectedPayslip.employeeName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Staff Code:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedPayslip.employeeCode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Department:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedPayslip.departmentName || "Operations"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Days Present:</span>
                  <span className="font-bold text-emerald-600">
                    {selectedPayslip.presentDays} / {(selectedPayslip.totalWorkingDays ?? (selectedPayslip as any).workingDays ?? 30)}
                  </span>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 font-bold text-xs text-emerald-700 dark:text-emerald-300 border-b border-emerald-100 dark:border-slate-800">
                    EARNINGS (GROSS)
                  </div>
                  <div className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Basic Salary:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        ₹{(selectedPayslip.basicSalary ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">House Rent Allowance:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        ₹{(selectedPayslip.houseRentAllowance ?? (selectedPayslip as any).hra ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Special Allowance:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        ₹{(selectedPayslip.specialAllowance ?? (selectedPayslip as any).allowances ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Conveyance / Medical:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        ₹{((selectedPayslip.conveyanceAllowance ?? 0) + (selectedPayslip.medicalAllowance ?? 0)).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>Total Gross:</span>
                      <span>₹{(selectedPayslip.grossEarnings ?? 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-rose-50 dark:bg-rose-950/30 px-4 py-2 font-bold text-xs text-rose-700 dark:text-rose-300 border-b border-rose-100 dark:border-slate-800">
                    DEDUCTIONS
                  </div>
                  <div className="p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Provident Fund (EPF):</span>
                      <span className="font-medium text-rose-600">
                        ₹{(selectedPayslip.providentFund ?? (selectedPayslip as any).pfDeduction ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Professional Tax (PT):</span>
                      <span className="font-medium text-rose-600">
                        ₹{(selectedPayslip.professionalTax ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Loss of Pay (LOP):</span>
                      <span className="font-medium text-rose-600">
                        ₹{(selectedPayslip.lossOfPayDeduction ?? (selectedPayslip as any).lopDeduction ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Income Tax (TDS):</span>
                      <span className="font-medium text-rose-600">
                        ₹{(selectedPayslip.taxDeductedAtSource ?? (selectedPayslip as any).tdsDeduction ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-rose-600">
                      <span>Total Deductions:</span>
                      <span>₹{(selectedPayslip.totalDeductions ?? 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Disbursed Banner */}
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                <div>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 uppercase font-semibold block">
                    Net Take-Home Pay
                  </span>
                  <span className="text-xs text-slate-500">Directly credited to verified employee bank account</span>
                </div>
                <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">
                  ₹{(selectedPayslip.netSalary ?? 0).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {markPaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Record Salary Disbursal
            </h3>

            <p className="text-xs text-slate-500">
              Confirm bank transfer of ₹{(markPaidModal.payslip.netSalary ?? 0).toLocaleString("en-IN")} to{" "}
              {markPaidModal.payslip.employeeName}.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Payment Channel
              </label>
              <select
                value={markPaidModal.paymentMode}
                onChange={(e) => setMarkPaidModal({ ...markPaidModal, paymentMode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
              >
                <option value="NEFT">Bank Transfer (NEFT/RTGS)</option>
                <option value="IMPS">Instant IMPS</option>
                <option value="UPI">Corporate UPI</option>
                <option value="CHEQUE">Company Cheque</option>
                <option value="CASH">Cash in Hand</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Transaction Reference / UTR No.
              </label>
              <input
                type="text"
                value={markPaidModal.reference}
                onChange={(e) => setMarkPaidModal({ ...markPaidModal, reference: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMarkPaidModal(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isMarkingPaid}
                onClick={handleMarkPaid}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isMarkingPaid && <RefreshCw className="w-4 h-4 animate-spin" />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
