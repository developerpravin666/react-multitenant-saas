import React, { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  UserCheck,
  FileText,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  CalendarDays,
  Network,
  Sun,
  Eye,
  Edit2,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { hrService } from "./hrService";
import type { LeaveRequest, LeaveBalance, LeaveType, Employee, HrMasterItem, LeaveWorkingDaysResult } from "./hr.types";
import { useNotifications } from "../../context/NotificationContext";

export function LeaveManagementPage() {
  const notifications = useNotifications();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [masterLeaveCategories, setMasterLeaveCategories] = useState<HrMasterItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"REQUESTS" | "BALANCES">("REQUESTS");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  // Apply Leave Modal
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [applyForm, setApplyForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });
  const [applyErrors, setApplyErrors] = useState<Record<string, string>>({});
  const [workingDaysData, setWorkingDaysData] = useState<LeaveWorkingDaysResult | null>(null);
  const [calculatingDays, setCalculatingDays] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // View Leave Request Modal
  const [viewingRequest, setViewingRequest] = useState<LeaveRequest | null>(null);

  // Edit Leave Request Modal
  const [editingRequest, setEditingRequest] = useState<{
    id: string;
    employeeId: string;
    employeeName: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    workingDays: number;
  } | null>(null);
  const [editRequestErrors, setEditRequestErrors] = useState<Record<string, string>>({});
  const [isUpdatingRequest, setIsUpdatingRequest] = useState<boolean>(false);

  // View Leave Balance Modal
  const [viewingBalance, setViewingBalance] = useState<LeaveBalance | null>(null);

  // Edit / Allocate Leave Balance Modal
  const [editingBalance, setEditingBalance] = useState<{
    employeeId: string;
    employeeName: string;
    leaveTypeId: string;
    leaveTypeName: string;
    year: number;
    totalDays: number;
  } | null>(null);
  const [isSavingBalance, setIsSavingBalance] = useState<boolean>(false);
  const [balanceErrors, setBalanceErrors] = useState<Record<string, string>>({});

  // Review Modal (Approve / Reject with comment)
  const [reviewModal, setReviewModal] = useState<{
    request: LeaveRequest;
    action: "APPROVE" | "REJECT";
    comment: string;
  } | null>(null);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqList, balList, types, masters, empList] = await Promise.all([
        hrService.getLeaveRequests(),
        hrService.getLeaveBalances(),
        hrService.getLeaveTypes(),
        hrService.getMasters("LEAVE_CATEGORY"),
        hrService.getEmployees(),
      ]);
      setRequests(reqList || []);
      setBalances(balList || []);
      setLeaveTypes(types || []);
      setMasterLeaveCategories(masters || []);
      setEmployees(empList || []);
    } catch {
      notifications.error("Failed to load leave records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate working days excluding weekends & holidays for Apply form
  useEffect(() => {
    if (applyForm.startDate && applyForm.endDate && showApplyModal) {
      const calcWorkingDays = async () => {
        try {
          setCalculatingDays(true);
          const res = await hrService.calculateWorkingDays(applyForm.startDate, applyForm.endDate);
          setWorkingDaysData(res);
        } catch {
          const start = new Date(applyForm.startDate);
          const end = new Date(applyForm.endDate);
          if (end >= start) {
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            setWorkingDaysData({
              startDate: applyForm.startDate,
              endDate: applyForm.endDate,
              workingDays: diffDays,
              weekends: 0,
              holidays: [],
            });
          }
        } finally {
          setCalculatingDays(false);
        }
      };
      calcWorkingDays();
    }
  }, [applyForm.startDate, applyForm.endDate, showApplyModal]);

  // Calculate working days for Edit Request modal
  useEffect(() => {
    if (editingRequest?.startDate && editingRequest?.endDate) {
      const calcEditWorkingDays = async () => {
        try {
          const res = await hrService.calculateWorkingDays(editingRequest.startDate, editingRequest.endDate);
          setEditingRequest((prev) => prev ? { ...prev, workingDays: res.workingDays } : null);
        } catch {
          const start = new Date(editingRequest.startDate);
          const end = new Date(editingRequest.endDate);
          if (end >= start) {
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            setEditingRequest((prev) => prev ? { ...prev, workingDays: diffDays } : null);
          }
        }
      };
      calcEditWorkingDays();
    }
  }, [editingRequest?.startDate, editingRequest?.endDate]);

  const openApplyModal = () => {
    const defaultEmp = employees[0]?.id || "";
    const defaultType = leaveTypes[0]?.id || masterLeaveCategories[0]?.id || "";
    const today = new Date().toISOString().slice(0, 10);
    setApplyForm({
      employeeId: defaultEmp,
      leaveTypeId: defaultType,
      startDate: today,
      endDate: today,
      reason: "",
    });
    setApplyErrors({});
    setShowApplyModal(true);
  };

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === applyForm.employeeId);
  }, [employees, applyForm.employeeId]);

const applyLeaveSchema = z
  .object({
    employeeId: z.string().trim().min(1, "Employee selection is required."),
    leaveTypeId: z.string().trim().min(1, "Leave category is required."),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().min(1, "End date is required."),
    workingDays: z
      .number({ error: "Working days must be calculated." })
      .min(1, "The selected period contains 0 working days (weekends or holidays only)."),
    reason: z
      .string()
      .trim()
      .min(5, "Reason must be at least 5 characters.")
      .max(500, "Reason cannot exceed 500 characters."),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: "End date cannot be prior to start date.",
      path: ["endDate"],
    }
  );

const editLeaveRequestSchema = z
  .object({
    leaveTypeId: z.string().trim().min(1, "Leave category is required."),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().min(1, "End date is required."),
    workingDays: z
      .number({ error: "Working days must be calculated." })
      .min(1, "Selected dates contain 0 working days."),
    reason: z
      .string()
      .trim()
      .min(5, "Reason must be at least 5 characters.")
      .max(500, "Reason cannot exceed 500 characters."),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: "End date cannot be prior to start date.",
      path: ["endDate"],
    }
  );

const allocateBalanceSchema = z.object({
  totalDays: z
    .number({ error: "Allocated days must be a valid number." })
    .min(0, "Allocated days cannot be negative.")
    .max(365, "Allocated days cannot exceed 365."),
  year: z
    .number({ error: "Year must be a valid number." })
    .min(2020, "Please enter a valid year between 2020 and 2035.")
    .max(2035, "Please enter a valid year between 2020 and 2035."),
});

  // Product Master-grade Zod validation for leave application
  const validateApplyForm = (): boolean => {
    const errs: Record<string, string> = {};

    const parseResult = applyLeaveSchema.safeParse({
      employeeId: applyForm.employeeId,
      leaveTypeId: applyForm.leaveTypeId,
      startDate: applyForm.startDate,
      endDate: applyForm.endDate,
      workingDays: workingDaysData ? workingDaysData.workingDays : 1,
      reason: applyForm.reason,
    });

    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errs[field]) {
          errs[field] = issue.message;
        }
      }
    }

    setApplyErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateApplyForm()) return;

    try {
      setIsApplying(true);
      await hrService.applyLeave({
        employeeId: applyForm.employeeId,
        leaveTypeId: applyForm.leaveTypeId,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        reason: applyForm.reason.trim(),
      });
      notifications.success(`Leave request submitted (${workingDaysData?.workingDays ?? 1} net working day(s) deducted).`);
      setShowApplyModal(false);
      await loadData();
    } catch (err: any) {
      notifications.error(err?.response?.data?.message || err?.message || "Failed to submit leave application.");
    } finally {
      setIsApplying(false);
    }
  };

  // Open Edit Request Modal
  const handleOpenEditRequest = (req: LeaveRequest) => {
    const sDate = req.startDate ? req.startDate.slice(0, 10) : "";
    const eDate = req.endDate ? req.endDate.slice(0, 10) : "";
    setEditingRequest({
      id: req.id,
      employeeId: req.employeeId,
      employeeName: req.employeeName ?? "Employee",
      leaveTypeId: req.leaveTypeId,
      startDate: sDate,
      endDate: eDate,
      reason: req.reason,
      workingDays: req.totalDays,
    });
    setEditRequestErrors({});
  };

  // Save Edit Request
  const handleSaveEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    const parseResult = editLeaveRequestSchema.safeParse({
      leaveTypeId: editingRequest.leaveTypeId,
      startDate: editingRequest.startDate,
      endDate: editingRequest.endDate,
      workingDays: editingRequest.workingDays,
      reason: editingRequest.reason,
    });

    if (!parseResult.success) {
      const errs: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errs[field]) {
          errs[field] = issue.message;
        }
      }
      setEditRequestErrors(errs);
      return;
    }

    try {
      setIsUpdatingRequest(true);
      await hrService.updateLeaveRequest(editingRequest.id, {
        leaveTypeId: editingRequest.leaveTypeId,
        startDate: editingRequest.startDate,
        endDate: editingRequest.endDate,
        totalDays: editingRequest.workingDays,
        reason: editingRequest.reason.trim(),
      });
      notifications.success("Leave application updated successfully.");
      setEditingRequest(null);
      await loadData();
    } catch (err: any) {
      notifications.error(err?.response?.data?.message || err?.message || "Failed to update leave application.");
    } finally {
      setIsUpdatingRequest(false);
    }
  };

  // Delete Request
  const handleDeleteRequest = async (req: LeaveRequest) => {
    const confirmed = await notifications.confirm({
      title: "Delete Leave Application?",
      message: `Are you sure you want to cancel and delete the leave request for ${req.employeeName} (${req.totalDays} day(s))?`,
      variant: "danger",
      confirmLabel: "Delete Request",
    });
    if (!confirmed) return;

    try {
      await hrService.deleteLeaveRequest(req.id);
      notifications.success("Leave application deleted successfully.");
      await loadData();
    } catch {
      notifications.error("Failed to delete leave application.");
    }
  };

  // Review Submit (Approve / Reject)
  const handleReviewSubmit = async () => {
    if (!reviewModal) return;
    try {
      setIsReviewing(true);
      if (reviewModal.action === "APPROVE") {
        await hrService.approveLeave(reviewModal.request.id, reviewModal.comment);
        notifications.success(`Leave request approved for ${reviewModal.request.employeeName}.`);
      } else {
        await hrService.rejectLeave(reviewModal.request.id, reviewModal.comment);
        notifications.success(`Leave request rejected for ${reviewModal.request.employeeName}.`);
      }
      setReviewModal(null);
      await loadData();
    } catch {
      notifications.error("Failed to process approval review.");
    } finally {
      setIsReviewing(false);
    }
  };

  // Save / Adjust Leave Balance
  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBalance) return;

    const parseResult = allocateBalanceSchema.safeParse({
      totalDays: Number(editingBalance.totalDays),
      year: Number(editingBalance.year),
    });

    if (!parseResult.success) {
      const errs: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errs[field]) {
          errs[field] = issue.message;
        }
      }
      setBalanceErrors(errs);
      return;
    }

    try {
      setIsSavingBalance(true);
      await hrService.allocateLeaveBalance(editingBalance.employeeId, {
        leaveTypeId: editingBalance.leaveTypeId,
        year: editingBalance.year,
        totalDays: editingBalance.totalDays,
      });
      notifications.success(`Allocated quota updated for ${editingBalance.employeeName}.`);
      setEditingBalance(null);
      await loadData();
    } catch {
      notifications.error("Failed to adjust leave balance quota.");
    } finally {
      setIsSavingBalance(false);
    }
  };

  // Reset Leave Balance
  const handleResetBalance = async (bal: LeaveBalance) => {
    const confirmed = await notifications.confirm({
      title: "Reset Leave Quota?",
      message: `Reset annual allocated quota for ${bal.employeeName} (${bal.leaveTypeName}) to 0 days?`,
      variant: "danger",
      confirmLabel: "Reset Quota",
    });
    if (!confirmed) return;

    try {
      await hrService.allocateLeaveBalance(bal.employeeId, {
        leaveTypeId: bal.leaveTypeId,
        year: bal.year || new Date().getFullYear(),
        totalDays: 0,
      });
      notifications.success("Leave balance quota reset to 0.");
      await loadData();
    } catch {
      notifications.error("Failed to reset leave balance.");
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchSearch =
        !search ||
        r.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
        r.leaveTypeName?.toLowerCase().includes(search.toLowerCase()) ||
        r.reason?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [requests, statusFilter, search]);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    const totalDaysTaken = requests
      .filter((r) => r.status === "APPROVED")
      .reduce((sum, r) => sum + r.totalDays, 0);

    return { pending, approved, rejected, totalDaysTaken };
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-indigo-600" />
            Leave Management & Attendance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated statutory holiday and weekend exclusion, manager approval workflows, and leave quotas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={openApplyModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pending Approvals</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Approved Requests</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Working Days Availed</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalDaysTaken}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Rejected</p>
            <p className="text-2xl font-bold text-rose-600">{stats.rejected}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("REQUESTS")}
          className={`py-3 px-2 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "REQUESTS" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Leave Applications ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("BALANCES")}
          className={`py-3 px-2 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "BALANCES" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Staff Leave Balances ({balances.length})
        </button>
      </div>

      {/* Tab: Leave Requests */}
      {activeTab === "REQUESTS" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, reason, leave category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No leave requests found</h3>
              <p className="text-sm text-slate-500 mt-1">Leave applications filed by employees will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-4 py-3">Reporting Manager</th>
                    <th className="px-4 py-3">Leave Category</th>
                    <th className="px-4 py-3">Duration (Dates)</th>
                    <th className="px-4 py-3">Net Working Days</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Approval Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((req) => {
                    const empObj = employees.find((e) => e.id === req.employeeId);
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">{req.employeeName}</div>
                          <div className="text-xs text-slate-400 font-mono">Code: {req.employeeCode || "EMP"}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          {empObj?.reportsToEmployeeName ? (
                            <span className="font-medium text-indigo-700 flex items-center gap-1">
                              <Network className="w-3 h-3 text-indigo-500" />
                              {empObj.reportsToEmployeeName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">HR / Direct</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                            {req.leaveTypeName || req.leaveTypeCode}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs">
                          {req.startDate ? req.startDate.slice(0, 10) : ""} to{" "}
                          {req.endDate ? req.endDate.slice(0, 10) : ""}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {req.totalDays} day{req.totalDays > 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate text-xs">
                          {req.reason}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              req.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700"
                                : req.status === "PENDING"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Action */}
                            <button
                              type="button"
                              onClick={() => setViewingRequest(req)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View Application Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit Action (allowed for pending requests) */}
                            {req.status === "PENDING" && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditRequest(req)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Edit Application"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete Action */}
                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(req)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Application"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Approval Workflow Buttons */}
                            {req.status === "PENDING" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setReviewModal({ request: req, action: "APPROVE", comment: "" })}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors ml-1"
                                  title="Approve Leave"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewModal({ request: req, action: "REJECT", comment: "" })}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium transition-colors"
                                  title="Reject Leave"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Balances */}
      {activeTab === "BALANCES" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Employee</th>
                <th className="px-4 py-3">Leave Category</th>
                <th className="px-4 py-3">Annual Allocated</th>
                <th className="px-4 py-3">Used Days</th>
                <th className="px-4 py-3">Pending Requests</th>
                <th className="px-4 py-3">Available Balance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {balances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No leave balances tracked yet.
                  </td>
                </tr>
              ) : (
                balances.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {b.employeeName || b.employeeId}
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">
                      {b.leaveTypeName || b.leaveTypeCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{b.allocatedDays} days</td>
                    <td className="px-4 py-3 text-rose-600 font-medium">{b.usedDays} days</td>
                    <td className="px-4 py-3 text-amber-600 font-medium">{b.pendingDays} days</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{b.availableDays} days</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingBalance(b)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Balance Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBalance({
                              employeeId: b.employeeId,
                              employeeName: b.employeeName || "Employee",
                              leaveTypeId: b.leaveTypeId,
                              leaveTypeName: b.leaveTypeName || "Category",
                              year: b.year || new Date().getFullYear(),
                              totalDays: b.allocatedDays,
                            });
                            setBalanceErrors({});
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Adjust Annual Quota"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetBalance(b)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Reset Quota"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View Request Modal */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Leave Application Details
              </h3>
              <button onClick={() => setViewingRequest(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 uppercase">Employee</span>
                  <div className="font-semibold text-slate-900">{viewingRequest.employeeName}</div>
                  <div className="text-xs text-slate-500 font-mono">Code: {viewingRequest.employeeCode || "EMP"}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase">Category</span>
                  <div className="font-semibold text-indigo-600">{viewingRequest.leaveTypeName}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 uppercase">Start Date</span>
                  <div className="font-semibold text-slate-900">{viewingRequest.startDate?.slice(0, 10)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase">End Date</span>
                  <div className="font-semibold text-slate-900">{viewingRequest.endDate?.slice(0, 10)}</div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 uppercase">Net Working Days Deducted</span>
                <span className="text-lg font-bold text-emerald-700">{viewingRequest.totalDays} day(s)</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-400 uppercase block mb-1">Reason for Leave</span>
                <p className="text-slate-700">{viewingRequest.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 uppercase">Status</span>
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        viewingRequest.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700"
                          : viewingRequest.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {viewingRequest.status}
                    </span>
                  </div>
                </div>
                {viewingRequest.approvedBy && (
                  <div>
                    <span className="text-xs text-slate-400 uppercase">Reviewed By</span>
                    <div className="text-slate-800 font-medium">{viewingRequest.approvedBy}</div>
                  </div>
                )}
              </div>

              {viewingRequest.approverComment && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="text-xs text-amber-800 font-semibold uppercase block mb-1">Reviewer Note</span>
                  <p className="text-xs text-amber-900">{viewingRequest.approverComment}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Leave Request Modal */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Edit Leave Application: {editingRequest.employeeName}
              </h3>
              <button onClick={() => setEditingRequest(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRequest} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Leave Category *</label>
                <select
                  value={editingRequest.leaveTypeId}
                  onChange={(e) => setEditingRequest({ ...editingRequest, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
                {editRequestErrors.leaveTypeId && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{editRequestErrors.leaveTypeId}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={editingRequest.startDate}
                    onChange={(e) => setEditingRequest({ ...editingRequest, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  {editRequestErrors.startDate && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{editRequestErrors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={editingRequest.endDate}
                    onChange={(e) => setEditingRequest({ ...editingRequest, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  {editRequestErrors.endDate && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{editRequestErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 uppercase">Computed Net Working Days</span>
                <span className="text-lg font-bold text-emerald-700">{editingRequest.workingDays} day(s)</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  value={editingRequest.reason}
                  onChange={(e) => setEditingRequest({ ...editingRequest, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
                {editRequestErrors.reason && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{editRequestErrors.reason}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRequest}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isUpdatingRequest && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Update Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Balance Modal */}
      {viewingBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Staff Leave Quota & Balance
              </h3>
              <button onClick={() => setViewingBalance(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="font-semibold text-slate-900 text-base">{viewingBalance.employeeName}</div>
                <div className="text-xs text-indigo-600 font-medium">Category: {viewingBalance.leaveTypeName}</div>
                <div className="text-xs text-slate-400">Calendar Year: {viewingBalance.year || new Date().getFullYear()}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs text-slate-400 uppercase">Annual Allocated</span>
                  <div className="text-lg font-bold text-slate-800">{viewingBalance.allocatedDays} days</div>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center">
                  <span className="text-xs text-rose-600 uppercase">Consumed / Used</span>
                  <div className="text-lg font-bold text-rose-700">{viewingBalance.usedDays} days</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
                  <span className="text-xs text-amber-700 uppercase">Pending Approval</span>
                  <div className="text-lg font-bold text-amber-600">{viewingBalance.pendingDays} days</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                  <span className="text-xs text-emerald-800 uppercase">Available Balance</span>
                  <div className="text-lg font-bold text-emerald-700">{viewingBalance.availableDays} days</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingBalance(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Adjust Leave Balance Modal */}
      {editingBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                Adjust Leave Quota
              </h3>
              <button onClick={() => setEditingBalance(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBalance} noValidate className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                <div>Employee: <strong className="text-slate-800">{editingBalance.employeeName}</strong></div>
                <div>Category: <strong className="text-indigo-600">{editingBalance.leaveTypeName}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Calendar Year *</label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={editingBalance.year}
                  onChange={(e) => setEditingBalance({ ...editingBalance, year: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
                {balanceErrors.year && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{balanceErrors.year}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Annual Allocated Days *</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={editingBalance.totalDays}
                  onChange={(e) => setEditingBalance({ ...editingBalance, totalDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
                {balanceErrors.totalDays && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{balanceErrors.totalDays}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingBalance(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBalance}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isSavingBalance && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save Quota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leave Modal with Holiday/Weekend Exclusions */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Apply for Leave
              </h2>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} noValidate className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Employee *</label>
                <select
                  value={applyForm.employeeId}
                  onChange={(e) => setApplyForm({ ...applyForm, employeeId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${
                    applyErrors.employeeId ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500"
                  }`}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode} - {emp.designation})
                    </option>
                  ))}
                </select>
                {applyErrors.employeeId && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{applyErrors.employeeId}</p>
                )}
                {selectedEmployee?.reportsToEmployeeName && (
                  <p className="text-[11px] text-indigo-600 mt-1 flex items-center gap-1">
                    <Network className="w-3 h-3" />
                    Approval will be routed to reporting manager: {selectedEmployee.reportsToEmployeeName}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">Leave Category *</label>
                  <span className="text-[11px] text-indigo-600 font-medium">Master Entry</span>
                </div>
                <select
                  value={applyForm.leaveTypeId}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveTypeId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${
                    applyErrors.leaveTypeId ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500"
                  }`}
                >
                  <option value="">-- Choose Category --</option>
                  {leaveTypes.length > 0
                    ? leaveTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code}) - {t.isPaid ? "Paid Leave" : "Unpaid / LOP"}
                        </option>
                      ))
                    : masterLeaveCategories.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.code})
                        </option>
                      ))}
                </select>
                {applyErrors.leaveTypeId && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{applyErrors.leaveTypeId}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${
                      applyErrors.startDate ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500"
                    }`}
                  />
                  {applyErrors.startDate && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{applyErrors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${
                      applyErrors.endDate ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500"
                    }`}
                  />
                  {applyErrors.endDate && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{applyErrors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Working Days & Exclusion Details Banner */}
              {workingDaysData && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      Statutory Working Days Breakdown
                    </span>
                    {calculatingDays && <span className="text-[10px] text-indigo-600 animate-pulse">Calculating...</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-lg border border-indigo-100">
                      <div className="text-[10px] text-slate-500 uppercase">Weekends Excluded</div>
                      <div className="text-sm font-bold text-slate-700">{workingDaysData.weekends} day(s)</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-indigo-100">
                      <div className="text-[10px] text-slate-500 uppercase">Holidays Excluded</div>
                      <div className="text-sm font-bold text-slate-700">{workingDaysData.holidays?.length ?? 0} day(s)</div>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <div className="text-[10px] text-emerald-800 uppercase font-semibold">Net Working Days</div>
                      <div className="text-sm font-bold text-emerald-700">{workingDaysData.workingDays} day(s)</div>
                    </div>
                  </div>
                  {workingDaysData.holidays && workingDaysData.holidays.length > 0 && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 shrink-0" />
                      <span>Gazetted Holidays during period: {workingDaysData.holidays.join(", ")}</span>
                    </div>
                  )}
                  {workingDaysData.workingDays === 0 && (
                    <div className="text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Notice: Selected period contains 0 working days (weekends or public holidays only).</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  placeholder="Provide context or description for manager review..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 ${
                    applyErrors.reason ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20" : "border-slate-200 focus:ring-indigo-500"
                  }`}
                />
                {applyErrors.reason && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{applyErrors.reason}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApplying || (workingDaysData !== null && workingDaysData.workingDays <= 0)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isApplying && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {reviewModal.action === "APPROVE" ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600" />
              )}
              {reviewModal.action === "APPROVE" ? "Approve Leave Request" : "Reject Leave Request"}
            </h3>

            <p className="text-sm text-slate-600">
              {reviewModal.action === "APPROVE"
                ? `Confirm approval of ${reviewModal.request.totalDays} working day(s) for ${reviewModal.request.employeeName}?`
                : `Specify why the leave request for ${reviewModal.request.employeeName} is being rejected.`}
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reviewer / Manager Comments (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Add comments for the employee..."
                value={reviewModal.comment}
                onChange={(e) => setReviewModal({ ...reviewModal, comment: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReviewing}
                onClick={handleReviewSubmit}
                className={`px-5 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  reviewModal.action === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isReviewing && <RefreshCw className="w-4 h-4 animate-spin" />}
                Confirm {reviewModal.action === "APPROVE" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
