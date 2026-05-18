import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { useGlobalShortcuts } from "@/lib/shortcuts";

export function Layout() {
  const nav = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);

  useGlobalShortcuts({
    nav,
    openCommandPalette: () => setCmdOpen(true),
  });

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-base)] text-[var(--color-text-primary)]">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar onOpenCommandPalette={() => setCmdOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <StatusBar />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
