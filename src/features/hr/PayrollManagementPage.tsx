import React, { useState, useEffect, useMemo } from "react";
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
  X,
  Building,
  Shield,
  ArrowRight,
  TrendingDown,
  TrendingUp,
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Payslip Details Modal
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // Mark Paid Modal
  const [markPaidModal, setMarkPaidModal] = useState<{
    payslip: Payslip;
    paymentMode: string;
    reference: string;
  } | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState<boolean>(false);

  // Configure Salary Modal
  const [salaryModal, setSalaryModal] = useState<{
    employeeId: string;
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

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch {
      notifications.error("Failed to process payroll batch.");
    } finally {
      setIsProcessing(false);
    }
  };

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

  const openConfigureSalary = (emp: Employee) => {
    const baseSal = emp.baseSalary ?? emp.monthlyBaseSalary ?? 0;
    const existing = structures.find((s) => s.employeeId === emp.id);
    const basic = existing ? existing.basicSalary : baseSal * 0.5;
    const hra = existing ? existing.houseRentAllowance : basic * 0.4;
    const special = existing ? existing.specialAllowance : Math.max(0, baseSal - (basic + hra));
    const pf = existing ? existing.providentFundEmployee : basic * 0.12;

    setSalaryModal({
      employeeId: emp.id,
      basicSalary: Math.round(basic),
      houseRentAllowance: Math.round(hra),
      specialAllowance: Math.round(special),
      conveyanceAllowance: existing ? existing.conveyanceAllowance : 1600,
      medicalAllowance: existing ? existing.medicalAllowance : 1250,
      performanceBonus: existing ? existing.performanceBonus : 0,
      providentFundEmployee: Math.round(pf),
      providentFundEmployer: Math.round(pf),
      employeeStateInsurance: existing ? existing.employeeStateInsurance : 0,
      professionalTax: existing ? existing.professionalTax : 200,
      taxDeductedAtSource: existing ? existing.taxDeductedAtSource : 0,
    });
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryModal) return;
    try {
      setIsSavingSalary(true);
      await hrService.saveSalaryStructure(salaryModal);
      notifications.success("Salary structure saved successfully.");
      setSalaryModal(null);
      await loadData();
    } catch {
      notifications.error("Failed to save salary structure.");
    } finally {
      setIsSavingSalary(false);
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
            onClick={loadData}
            className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowProcessModal(true)}
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
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Latest Net Payout</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              ₹{stats.lastRunAmount.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Staff in Batch</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.lastRunEmployees} / {stats.totalEmployeesOnboarded}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Statutory Deductions</p>
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
          onClick={() => setActiveTab("STRUCTURES")}
          className={`py-3 px-2 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "STRUCTURES"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building className="w-4 h-4" />
          Salary Compensation Structures
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
                        {run.processedAt ? run.processedAt.split("T")[0] : "-"}
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
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRun(run);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          View Slips
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
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
                          {slip.presentDays} / {slip.totalWorkingDays} Days
                          {slip.unpaidLeaveDays > 0 && (
                            <span className="block text-rose-500 font-medium">
                              {slip.unpaidLeaveDays}d Unpaid LOP
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                          ₹{slip.grossEarnings.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-rose-600">
                          {slip.lossOfPayDeduction > 0
                            ? `-₹${slip.lossOfPayDeduction.toLocaleString("en-IN")}`
                            : "₹0"}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                          <div>PF: ₹{slip.providentFund.toLocaleString("en-IN")}</div>
                          <div>PT: ₹{slip.professionalTax.toLocaleString("en-IN")}</div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          ₹{slip.netSalary.toLocaleString("en-IN")}
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedPayslip(slip)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View Slip
                            </button>
                            {slip.paymentStatus !== "PAID" && (
                              <button
                                onClick={() =>
                                  setMarkPaidModal({
                                    payslip: slip,
                                    paymentMode: "NEFT",
                                    reference: `TXN${Date.now().toString().slice(-6)}`,
                                  })
                                }
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors"
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
                        ₹{(struct?.providentFundEmployee || Math.round(baseSal * 0.5 * 0.12)).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-rose-600">
                        ₹{(struct?.professionalTax || 200).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600">
                        ₹{(struct?.netSalary || Math.round(baseSal - (baseSal * 0.5 * 0.12 + 200))).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => openConfigureSalary(emp)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded text-xs font-medium transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Configure
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                onClick={() => setShowProcessModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit} className="space-y-4">
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
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
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
                Configure Salary Breakup & Statutory Components
              </h3>
              <button onClick={() => setSalaryModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Monthly Earnings
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Basic Salary (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salaryModal.basicSalary}
                    onChange={(e) => setSalaryModal({ ...salaryModal, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg text-sm"
                  />
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
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
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
                    {selectedPayslip.presentDays} / {selectedPayslip.totalWorkingDays}
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
                        ₹{selectedPayslip.basicSalary.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">House Rent Allowance:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        ₹{selectedPayslip.houseRentAllowance.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Special Allowance:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        ₹{selectedPayslip.specialAllowance.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Conveyance / Medical:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        ₹{(selectedPayslip.conveyanceAllowance + selectedPayslip.medicalAllowance).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>Total Gross:</span>
                      <span>₹{selectedPayslip.grossEarnings.toLocaleString("en-IN")}</span>
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
                        ₹{selectedPayslip.providentFund.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Professional Tax (PT):</span>
                      <span className="font-medium text-rose-600">
                        ₹{selectedPayslip.professionalTax.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Loss of Pay (LOP):</span>
                      <span className="font-medium text-rose-600">
                        ₹{selectedPayslip.lossOfPayDeduction.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Income Tax (TDS):</span>
                      <span className="font-medium text-rose-600">
                        ₹{selectedPayslip.taxDeductedAtSource.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-rose-600">
                      <span>Total Deductions:</span>
                      <span>₹{selectedPayslip.totalDeductions.toLocaleString("en-IN")}</span>
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
                  ₹{selectedPayslip.netSalary.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
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
              Confirm bank transfer of ₹{markPaidModal.payslip.netSalary.toLocaleString("en-IN")} to{" "}
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
