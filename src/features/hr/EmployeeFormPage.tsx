import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  Briefcase,
  Building,
  CreditCard,
  DollarSign,
  ChevronLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calculator,
  ShieldCheck,
  Calendar,
  Layers,
  Network,
} from "lucide-react";
import { hrService } from "./hrService";
import type { Employee, HrMasterItem, StatutoryBreakdown } from "./hr.types";
import { useNotifications } from "../../context/NotificationContext";
import { APP_ROUTES } from "../../config/routes";

export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"BASIC" | "EMPLOYMENT" | "COMPENSATION" | "BANK">("BASIC");

  // Dynamic Masters from DB
  const [departments, setDepartments] = useState<HrMasterItem[]>([]);
  const [jobTitles, setJobTitles] = useState<HrMasterItem[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<HrMasterItem[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<HrMasterItem[]>([]);
  const [salaryTypes, setSalaryTypes] = useState<HrMasterItem[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);

  // Form State
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    employeeCode: `EMP${Math.floor(1000 + Math.random() * 9000)}`,
    designation: "",
    department: "",
    joiningDate: new Date().toISOString().slice(0, 10),
    employmentType: "FULL_TIME",
    status: "ACTIVE",
    salaryType: "Monthly",
    salaryAmount: 45000,
    reportsToEmployeeId: "",
    reportsToEmployeeName: "",
    // KYC
    panNumber: "",
    aadhaarNumber: "",
    uanNumber: "",
    // Bank
    bankAccountNumber: "",
    bankName: "",
    bankIfscCode: "",
    // Additional
    gender: "MALE",
    dateOfBirth: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
  });

  // Statutory calculation preview
  const [statutory, setStatutory] = useState<StatutoryBreakdown | null>(null);
  const [calculatingStatutory, setCalculatingStatutory] = useState<boolean>(false);

  useEffect(() => {
    loadPrerequisites();
  }, [id]);

  const loadPrerequisites = async () => {
    try {
      setLoading(true);
      const [masters, allEmps] = await Promise.all([
        hrService.getMasters(),
        hrService.getEmployees(),
      ]);

      const depts = masters.filter((m) => m.category === "DEPARTMENT");
      const jobs = masters.filter((m) => m.category === "JOB_TITLE");
      const empTypes = masters.filter((m) => m.category === "EMPLOYMENT_TYPE");
      const empStats = masters.filter((m) => m.category === "EMPLOYEE_STATUS");
      const salTypes = masters.filter((m) => m.category === "SALARY_TYPE");

      setDepartments(depts);
      setJobTitles(jobs);
      setEmploymentTypes(empTypes);
      setEmployeeStatuses(empStats);
      setSalaryTypes(salTypes);
      setPotentialManagers(allEmps.filter((e) => e.id !== id));

      if (id) {
        const emp = await hrService.getEmployeeById(id);
        if (emp) {
          setForm({
            firstName: emp.firstName || "",
            lastName: emp.lastName || "",
            email: emp.email || "",
            phone: emp.phone || "",
            employeeCode: emp.employeeCode || "",
            designation: emp.designation || "",
            department: emp.department || emp.departmentName || "",
            joiningDate: (emp.joiningDate || emp.dateOfJoining || "").split("T")[0] ?? (new Date().toISOString().split("T")[0] ?? ""),
            employmentType: emp.employmentType || "FULL_TIME",
            status: emp.status || "ACTIVE",
            salaryType: emp.salaryType || "Monthly",
            salaryAmount: emp.monthlyBaseSalary || emp.baseSalary || 45000,
            reportsToEmployeeId: emp.reportsToEmployeeId || "",
            reportsToEmployeeName: emp.reportsToEmployeeName || "",
            panNumber: emp.panNumber || emp.pan || "",
            aadhaarNumber: emp.aadhaarNumber || emp.aadhaar || "",
            uanNumber: emp.uanNumber || emp.uan || "",
            bankAccountNumber: emp.bankAccountNumber || "",
            bankName: emp.bankName || "",
            bankIfscCode: emp.bankIfscCode || emp.bankIfsc || "",
            gender: "MALE",
            dateOfBirth: "",
            address: "",
            emergencyContactName: "",
            emergencyContactPhone: "",
            notes: "",
          });
          triggerStatutoryCalc(emp.monthlyBaseSalary || emp.baseSalary || 45000, emp.salaryType === "Annual CTC");
        }
      } else {
        // Defaults for create
        const defaultDept = depts[0]?.name || "Engineering";
        const defaultJob = jobs[0]?.name || "Software Engineer";
        const defaultSalType = salTypes[0]?.name || "Monthly";
        setForm((prev) => ({
          ...prev,
          department: defaultDept,
          designation: defaultJob,
          salaryType: defaultSalType,
        }));
        triggerStatutoryCalc(45000, defaultSalType === "Annual CTC");
      }
    } catch {
      notifications.error("Failed to load required HR master data");
    } finally {
      setLoading(false);
    }
  };

  const triggerStatutoryCalc = async (amount: number, isCtc: boolean) => {
    if (!amount || amount <= 0) return;
    try {
      setCalculatingStatutory(true);
      const res = await hrService.calculateStatutory(amount, isCtc);
      setStatutory(res);
    } catch {
      // Non-blocking calculation fallback
    } finally {
      setCalculatingStatutory(false);
    }
  };

  const handleSalaryChange = (value: number, type?: string) => {
    const sType = type ?? form.salaryType;
    setForm((prev) => ({ ...prev, salaryAmount: value, salaryType: sType }));
    triggerStatutoryCalc(value, sType === "Annual CTC" || sType === "YEARLY_CTC");
  };

  const handleManagerSelect = (managerId: string) => {
    const manager = potentialManagers.find((m) => m.id === managerId);
    setForm((prev) => ({
      ...prev,
      reportsToEmployeeId: managerId,
      reportsToEmployeeName: manager ? `${manager.firstName} ${manager.lastName}` : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      notifications.error("Please enter first and last name");
      return;
    }
    if (!form.email.trim() || !form.phone.trim()) {
      notifications.error("Email and phone number are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Partial<Employee> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        employeeCode: form.employeeCode.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        designation: form.designation,
        department: form.department,
        joiningDate: form.joiningDate,
        employmentType: form.employmentType,
        status: form.status,
        salaryType: form.salaryType,
        monthlyBaseSalary: form.salaryAmount,
        baseSalary: form.salaryAmount,
        reportsToEmployeeId: form.reportsToEmployeeId || null,
        reportsToEmployeeName: form.reportsToEmployeeName || null,
        // Bank details
        bankAccountNumber: form.bankAccountNumber.trim() || undefined,
        bankName: form.bankName.trim() || undefined,
        bankIfscCode: form.bankIfscCode.trim() || undefined,
        bankIfsc: form.bankIfscCode.trim() || undefined,
        // KYC
        panNumber: form.panNumber.trim() || undefined,
        pan: form.panNumber.trim() || undefined,
        aadhaarNumber: form.aadhaarNumber.trim() || undefined,
        aadhaar: form.aadhaarNumber.trim() || undefined,
        uanNumber: form.uanNumber.trim() || undefined,
        uan: form.uanNumber.trim() || undefined,
      };

      if (isEdit && id) {
        await hrService.updateEmployee(id, payload);
        notifications.success(`Employee ${form.firstName} ${form.lastName} updated successfully`);
      } else {
        await hrService.createEmployee(payload);
        notifications.success(`Employee ${form.firstName} ${form.lastName} added successfully`);
      }

      navigate(APP_ROUTES.hr.employees);
    } catch (err: any) {
      notifications.error(err?.response?.data?.message || err?.message || "Failed to save employee profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-500 font-medium">Loading employee configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.hr.employees)}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? `Edit Employee: ${form.firstName} ${form.lastName}` : "Add New Employee"}
            </h1>
            <p className="text-sm text-gray-500">
              {isEdit ? "Update employee profile, hierarchy, and statutory compensation" : "Create a new employee profile with master entries and statutory salary auto-calculation"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.hr.employees)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEdit ? "Update Employee" : "Save Employee"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 pt-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("BASIC")}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "BASIC"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Users className="w-4 h-4" />
          Basic & Contact
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("EMPLOYMENT")}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "EMPLOYMENT"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Role & Hierarchy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("COMPENSATION")}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "COMPENSATION"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Salary & Statutory
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("BANK")}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "BANK"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Bank & KYC
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-6 shadow-sm">
        {/* Tab 1: Basic & Contact */}
        {activeTab === "BASIC" && (
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.employeeCode}
                  onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Rahul"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Sharma"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Official Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, City, State, PIN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact (Name & Phone)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={form.emergencyContactName}
                    onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                    placeholder="Contact Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="tel"
                    value={form.emergencyContactPhone}
                    onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                    placeholder="Contact Phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Role & Hierarchy */}
        {activeTab === "EMPLOYMENT" && (
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Organization Structure & Masters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Department Master */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-indigo-600 font-medium">Master Entry</span>
                </div>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {departments.length === 0 ? (
                    <>
                      <option value="Engineering">Engineering</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Finance">Finance</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Operations">Operations</option>
                    </>
                  ) : (
                    departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name} ({dept.code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Job Title / Designation Master */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Job Title / Designation <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-indigo-600 font-medium">Master Entry</span>
                </div>
                <select
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {jobTitles.length === 0 ? (
                    <>
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="Senior Developer">Senior Developer</option>
                      <option value="Product Manager">Product Manager</option>
                      <option value="HR Executive">HR Executive</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Sales Lead">Sales Lead</option>
                    </>
                  ) : (
                    jobTitles.map((jt) => (
                      <option key={jt.id} value={jt.name}>
                        {jt.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employment Type Master */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Employment Type</label>
                  <span className="text-xs text-indigo-600 font-medium">Master Entry</span>
                </div>
                <select
                  value={form.employmentType}
                  onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {employmentTypes.length === 0 ? (
                    <>
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="INTERN">Intern</option>
                    </>
                  ) : (
                    employmentTypes.map((et) => (
                      <option key={et.id} value={et.code || et.name}>
                        {et.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Employee Status Master */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Employee Status</label>
                  <span className="text-xs text-indigo-600 font-medium">Master Entry</span>
                </div>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {employeeStatuses.length === 0 ? (
                    <>
                      <option value="ACTIVE">Active</option>
                      <option value="PROBATION">Probation</option>
                      <option value="ON_LEAVE">On Leave</option>
                      <option value="RESIGNED">Resigned</option>
                      <option value="TERMINATED">Terminated</option>
                    </>
                  ) : (
                    employeeStatuses.map((st) => (
                      <option key={st.id} value={st.code || st.name}>
                        {st.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Reporting Hierarchy Manager */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Network className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-semibold text-gray-900">Reporting Hierarchy & Approval Manager</h4>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                Leave requests and performance appraisals for this employee will be routed to the assigned manager.
              </p>
              <div className="max-w-md">
                <label className="block text-xs font-medium text-gray-700 mb-1">Reports To (Reporting Manager)</label>
                <select
                  value={form.reportsToEmployeeId}
                  onChange={(e) => handleManagerSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- No Direct Manager (Top of Hierarchy / Director) --</option>
                  {potentialManagers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.firstName} {mgr.lastName} ({mgr.designation} - {mgr.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Salary & Statutory Calculation */}
        {activeTab === "COMPENSATION" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-semibold text-gray-900">Compensation Package & Statutory Breakdown</h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Auto Formatted as per Indian Tax & PF Rules
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Salary Type Master */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Salary Type</label>
                  <span className="text-xs text-indigo-600 font-medium">Master Entry</span>
                </div>
                <select
                  value={form.salaryType}
                  onChange={(e) => handleSalaryChange(form.salaryAmount, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {salaryTypes.length === 0 ? (
                    <>
                      <option value="Monthly">Monthly Fixed Gross</option>
                      <option value="Annual CTC">Annual CTC (Yearly Package)</option>
                    </>
                  ) : (
                    salaryTypes.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Salary Input Amount */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.salaryType === "Annual CTC" ? "Annual CTC Amount (₹)" : "Monthly Gross Base Salary (₹)"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-sm font-semibold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={form.salaryAmount}
                    onChange={(e) => handleSalaryChange(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-base font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>
            </div>

            {/* Live Statutory Breakdown Card */}
            {statutory && (
              <div className="mt-6 border border-gray-200 rounded-xl bg-gray-50/70 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-sm font-bold text-gray-900">
                      Auto-Calculated Statutory Salary Breakdown ({statutory.salaryType})
                    </h4>
                  </div>
                  {calculatingStatutory && (
                    <span className="text-xs text-indigo-600 animate-pulse font-medium">Recalculating...</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Earnings Components */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm space-y-2">
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-1">
                      Earnings Components (A)
                    </h5>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">Basic Salary (50%):</span>
                      <span className="font-semibold text-gray-900">₹{statutory.basicSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">House Rent Allowance (HRA 20%):</span>
                      <span className="font-semibold text-gray-900">₹{statutory.houseRentAllowance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">Conveyance Allowance:</span>
                      <span className="font-semibold text-gray-900">₹{statutory.conveyanceAllowance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">Medical Allowance:</span>
                      <span className="font-semibold text-gray-900">₹{statutory.medicalAllowance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">Special Allowance (Balancing):</span>
                      <span className="font-semibold text-gray-900">₹{statutory.specialAllowance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-2 border-t text-indigo-900">
                      <span>Monthly Gross Earnings:</span>
                      <span>₹{statutory.monthlyGross.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Deductions & Statutory Taxes */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm space-y-2">
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-1">
                      Statutory Deductions (B)
                    </h5>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">Employee PF (12% of Basic, max ₹1,800):</span>
                      <span className="font-semibold text-gray-900">₹{statutory.providentFundEmployee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">ESIC Employee (0.75% if &le; ₹21k):</span>
                      <span className="font-semibold text-gray-900">₹{statutory.employeeStateInsurance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">Professional Tax (State PT Slab):</span>
                      <span className="font-semibold text-gray-900">₹{statutory.professionalTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">Income Tax / TDS (New Tax Regime):</span>
                      <span className="font-semibold text-gray-900">₹{statutory.taxDeductedAtSource.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 text-gray-400 text-xs">
                      <span>Employer PF Contribution (Not deducted from pay):</span>
                      <span>₹{statutory.providentFundEmployer.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-2 border-t text-red-700">
                      <span>Total Deductions:</span>
                      <span>₹{statutory.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Net Take Home Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                      Net Monthly Take-Home Pay (In-Hand)
                    </span>
                    <p className="text-xs text-emerald-600">Gross Earnings minus Statutory PF, PT & TDS</p>
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">
                    ₹{statutory.netTakeHome.toLocaleString()} <span className="text-xs font-normal text-emerald-600">/ month</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Bank & KYC */}
        {activeTab === "BANK" && (
          <div className="space-y-6">
            <h3 className="text-base font-semibold text-gray-900 border-b pb-2">Bank Account & Statutory KYC Identifiers</h3>

            {/* Bank Details */}
            <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-semibold text-gray-900">Direct Salary Bank Account</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={form.bankAccountNumber}
                    onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="e.g. 50100234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={form.bankIfscCode}
                    onChange={(e) => setForm({ ...form, bankIfscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                    placeholder="e.g. HDFC0001234"
                  />
                </div>
              </div>
            </div>

            {/* Government Identifiers */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-gray-900">Statutory Tax & Identity Numbers</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card Number</label>
                  <input
                    type="text"
                    value={form.panNumber}
                    onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    value={form.aadhaarNumber}
                    onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                    placeholder="XXXX XXXX XXXX"
                    maxLength={12}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provident Fund UAN</label>
                  <input
                    type="text"
                    value={form.uanNumber}
                    onChange={(e) => setForm({ ...form, uanNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                    placeholder="12-digit UAN"
                    maxLength={12}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-8 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {activeTab === "BASIC" && "Next: Role & Hierarchy"}
            {activeTab === "EMPLOYMENT" && "Next: Salary & Statutory"}
            {activeTab === "COMPENSATION" && "Next: Bank & KYC"}
            {activeTab === "BANK" && "Ready to save employee record"}
          </div>
          <div className="flex items-center gap-3">
            {activeTab !== "BASIC" && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === "EMPLOYMENT") setActiveTab("BASIC");
                  if (activeTab === "COMPENSATION") setActiveTab("EMPLOYMENT");
                  if (activeTab === "BANK") setActiveTab("COMPENSATION");
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Previous Step
              </button>
            )}
            {activeTab !== "BANK" ? (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === "BASIC") setActiveTab("EMPLOYMENT");
                  if (activeTab === "EMPLOYMENT") setActiveTab("COMPENSATION");
                  if (activeTab === "COMPENSATION") setActiveTab("BANK");
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
              >
                Next Step &rarr;
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : isEdit ? "Update Employee" : "Save Employee"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
