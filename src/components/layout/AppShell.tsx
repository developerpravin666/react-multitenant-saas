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
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        <main className="flex-1 p-3 md:p-4">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
