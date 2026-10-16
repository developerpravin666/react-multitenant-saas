import { useState } from "react";

import { Outlet } from "react-router-dom";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className="
        flex
        min-h-screen
        bg-slate-50
        text-slate-900
        dark:bg-slate-950
        dark:text-slate-100
      "
    >
      <div className="no-print">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="no-print">
          <Header />
        </div>

        <main className="flex-1 p-3 md:p-4 print:p-0">
          <Outlet />
        </main>

        <div className="no-print">
          <Footer />
        </div>
      </div>
    </div>
  );
}
