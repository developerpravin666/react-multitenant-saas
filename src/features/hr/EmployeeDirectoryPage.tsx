import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Mail,
  Phone,
  Briefcase,
  Building,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  FileText,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Landmark,
  Network,
} from "lucide-react";
import { hrService } from "./hrService";
import type { Employee, Department } from "./hr.types";
import { useNotifications } from "../../context/NotificationContext";
import { APP_ROUTES } from "../../config/routes";

export function EmployeeDirectoryPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

  const loadData = async () => {
    try {
      setLoading(true);
      const [empList, deptList] = await Promise.all([
        hrService.getEmployees(),
        hrService.getDepartments(),
      ]);
      setEmployees(empList || []);
      setDepartments(deptList || []);
    } catch {
      notifications.error("Failed to load employees data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(`Are you sure you want to deactivate employee ${emp.firstName} ${emp.lastName}?`)) {
      return;
    }
    try {
      await hrService.deleteEmployee(emp.id);
      notifications.success(`Employee ${emp.firstName} ${emp.lastName} deactivated.`);
      await loadData();
    } catch {
      notifications.error("Failed to deactivate employee.");
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        emp.designation.toLowerCase().includes(search.toLowerCase());

      const empDept = emp.department || emp.departmentName || "";
      const matchesDept = selectedDept === "ALL" || empDept === selectedDept;

      const empStatus = emp.status || emp.employmentStatus || "ACTIVE";
      const matchesStatus = selectedStatus === "ALL" || empStatus === selectedStatus;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, search, selectedDept, selectedStatus]);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => (e.status || e.employmentStatus) === "ACTIVE").length;
    const probation = employees.filter((e) => (e.status || e.employmentStatus) === "PROBATION").length;
    const onLeave = employees.filter((e) => (e.status || e.employmentStatus) === "ON_LEAVE").length;
    return { total, active, probation, onLeave };
  }, [employees]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Employee Directory
          </h1>
          <p className="text-sm text-gray-500">
            Manage your workforce profiles, hierarchy, statutory compensation, and bank details
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.hr.hierarchy)}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Network className="w-4 h-4 text-indigo-600" />
            Org Hierarchy
          </button>
          {/* Dedicated Add Employee Route */}
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.hr.employeeAdd)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total Employees</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
            <div className="text-xs text-gray-500">Active Staff</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.probation}</div>
            <div className="text-xs text-gray-500">Under Probation</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.onLeave}</div>
            <div className="text-xs text-gray-500">On Leave</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, code or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="RESIGNED">Resigned</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              className={`px-3 py-1.5 text-xs font-medium ${
                viewMode === "GRID" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`px-3 py-1.5 text-xs font-medium ${
                viewMode === "TABLE" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Directory Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-xs text-gray-500 font-medium">Loading workforce directory...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">No employees found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or add your first organization employee.
          </p>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.hr.employeeAdd)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Employee
          </button>
        </div>
      ) : viewMode === "GRID" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => {
            const statusKey = emp.status || emp.employmentStatus || "ACTIVE";
            const bankAcc = emp.bankAccountNumber || "";
            const bankName = emp.bankName || "";
            const ifsc = emp.bankIfscCode || emp.bankIfsc || "";
            const salary = emp.monthlyBaseSalary || emp.baseSalary || 0;
            const salaryType = emp.salaryType || "Monthly";

            return (
              <div
                key={emp.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {emp.firstName.charAt(0)}
                        {emp.lastName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 leading-tight">
                          {emp.firstName} {emp.lastName}
                        </h3>
                        <p className="text-xs text-indigo-600 font-medium">{emp.designation}</p>
                        <span className="text-[11px] font-mono text-gray-500">{emp.employeeCode}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        statusKey === "ACTIVE"
                          ? "bg-green-50 text-green-700"
                          : statusKey === "PROBATION"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {statusKey}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-gray-400" />
                      <span>{emp.department || emp.departmentName || "General Department"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{emp.phone}</span>
                    </div>
                    {emp.reportsToEmployeeName && (
                      <div className="flex items-center gap-2 text-indigo-700 font-medium">
                        <Network className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Reports to: {emp.reportsToEmployeeName}</span>
                      </div>
                    )}
                  </div>

                  {/* Bank & Salary Summary Box */}
                  <div className="mt-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="text-gray-500 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-600" />
                        {salaryType}:
                      </span>
                      <span className="font-bold text-gray-900">₹{salary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 pt-1 border-t border-gray-200/60">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Landmark className="w-3 h-3 text-blue-600" />
                        Bank Details:
                      </span>
                      <span className="font-mono text-[11px] text-gray-800">
                        {bankAcc ? `${bankName || "Bank"}: ••••${bankAcc.slice(-4)} (${ifsc || ""})` : "Not Provided"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => navigate(APP_ROUTES.hr.employeeEdit(emp.id))}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(emp)}
                    className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                    title="Deactivate"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Reporting Manager</th>
                  <th className="py-3 px-4">Salary Package</th>
                  <th className="py-3 px-4">Bank Account</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((emp) => {
                  const statusKey = emp.status || emp.employmentStatus || "ACTIVE";
                  const bankAcc = emp.bankAccountNumber || "";
                  const bankName = emp.bankName || "";
                  const ifsc = emp.bankIfscCode || emp.bankIfsc || "";
                  const salary = emp.monthlyBaseSalary || emp.baseSalary || 0;

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {emp.firstName.charAt(0)}
                            {emp.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 leading-tight">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">{emp.employeeCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-gray-900">{emp.designation}</div>
                        <div className="text-xs text-gray-500">{emp.department || emp.departmentName || "General"}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {emp.reportsToEmployeeName ? (
                          <span className="font-medium text-indigo-700">{emp.reportsToEmployeeName}</span>
                        ) : (
                          <span className="text-gray-400 italic">None (Root)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs font-bold text-gray-900">₹{salary.toLocaleString()}</div>
                        <div className="text-[11px] text-gray-500">{emp.salaryType || "Monthly"}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {bankAcc ? (
                          <div>
                            <div className="font-mono text-gray-900">••••{bankAcc.slice(-4)}</div>
                            <div className="text-gray-400 text-[10px]">{bankName} ({ifsc})</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not Added</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusKey === "ACTIVE"
                              ? "bg-green-50 text-green-700"
                              : statusKey === "PROBATION"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {statusKey}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(APP_ROUTES.hr.employeeEdit(emp.id))}
                            className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(emp)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
}
