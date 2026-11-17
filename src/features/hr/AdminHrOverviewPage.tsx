import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Shield,
  Layers,
  Calendar,
  DollarSign,
  ToggleRight,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { hrService } from "./hrService";
import { useFeatureFlags } from "../feature-flags/FeatureFlagContext";
import type { HrDashboardStats } from "./hr.types";

export function AdminHrOverviewPage() {
  const { isEnabled } = useFeatureFlags();
  const [metrics, setMetrics] = useState<HrDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await hrService.getDashboardMetrics();
        setMetrics(data);
      } catch {
        // Fallback default metrics if tenant has no HR data yet
        setMetrics({
          totalEmployees: 0,
          activeEmployees: 0,
          onLeaveEmployees: 0,
          pendingLeaveRequests: 0,
          lastPayrollAmount: 0,
          currentMonthPayrollStatus: "DRAFT",
          departmentCounts: [],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const modules = [
    {
      key: "smart_hr",
      name: "Smart HR & Employee Directory",
      description: "Employee onboarding, digital staff records, statutory documents, and department hierarchy.",
      enabled: isEnabled("smart_hr"),
      link: "/hr/employees",
      icon: Users,
      color: "indigo",
    },
    {
      key: "leave_management",
      name: "Leave & Attendance Management",
      description: "Automated leave quota tracking, employee requests, approval workflows, and loss-of-pay reporting.",
      enabled: isEnabled("leave_management"),
      link: "/hr/leaves",
      icon: Calendar,
      color: "emerald",
    },
    {
      key: "payroll",
      name: "Smart Payroll & Disbursals",
      description: "Salary structures, automated monthly payroll engine, EPF/ESI statutory calculations, and printable payslips.",
      enabled: isEnabled("payroll"),
      link: "/hr/payroll",
      icon: DollarSign,
      color: "blue",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" />
            Human Resources & Workforce Governance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Product Owner & Super Admin control console for enterprise HR, leave policies, and payroll automation.
          </p>
        </div>
        <div>
          <Link
            to="/admin/feature-flags"
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <ToggleRight className="w-4 h-4 text-indigo-600" />
            Manage Module Feature Flags
          </Link>
        </div>
      </div>

      {/* Module Feature Flags Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.key}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      mod.enabled
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {mod.enabled ? "ACTIVE MODULE" : "DISABLED"}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mt-4 text-base">{mod.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">flag: {mod.key}</span>
                {mod.enabled ? (
                  <Link
                    to={mod.link}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Open Console
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    to="/admin/feature-flags"
                    className="text-xs text-amber-600 hover:underline font-medium"
                  >
                    Enable in Flags
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Aggregate Workforce Metrics */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Store Workforce Overview
            </h2>
            <p className="text-xs text-slate-500">Live analytics aggregated from active tenant schema</p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Payroll Cycle: {metrics?.currentMonthPayrollStatus || "PENDING"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 block uppercase font-medium">Total Onboarded Staff</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics?.totalEmployees || 0}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 block uppercase font-medium">Active Staff</span>
            <span className="text-2xl font-bold text-emerald-600">
              {metrics?.activeEmployees || 0}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 block uppercase font-medium">Pending Leaves</span>
            <span className="text-2xl font-bold text-amber-600">
              {metrics?.pendingLeaveRequests || 0}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 block uppercase font-medium">Latest Net Payroll</span>
            <span className="text-2xl font-bold text-indigo-600">
              ₹{(metrics?.lastPayrollAmount || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Department Distribution */}
        {metrics && metrics.departmentCounts && metrics.departmentCounts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Staff Distribution by Department
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {metrics.departmentCounts.map((dept) => (
                <div
                  key={dept.department}
                  className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-center"
                >
                  <span className="text-xs text-slate-500 block">{dept.department}</span>
                  <span className="font-bold text-lg text-slate-900 dark:text-white">{dept.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
