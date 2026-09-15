"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileDock from "./MobileDock";
import CommandPalette from "./CommandPalette";
import { AuthGuard } from "@/lib/auth-context";

const NO_NAV_ROUTES = ["/login", "/signup"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage =
    NO_NAV_ROUTES.includes(pathname) || pathname?.startsWith("/s/");

  if (isAuthPage) {
    return (
      <div
        className="min-h-screen relative"
        style={{ background: "var(--bg-canvas)", color: "var(--text-primary)" }}
      >
        <main className="relative z-10">{children}</main>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div
        className="flex h-screen w-full overflow-hidden relative"
        style={{ background: "var(--bg-canvas)", color: "var(--text-primary)" }}
      >
        {/* Sidebar (desktop) */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
          <main className="flex-1 overflow-y-auto custom-scrollbar pb-24 lg:pb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile bottom dock */}
        <MobileDock />

        {/* Global command palette */}
        <CommandPalette />
      </div>
    </AuthGuard>
  );
}
