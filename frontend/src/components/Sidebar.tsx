"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  FolderLock,
  Bell,
  Share2,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/home",      label: "Dashboard", icon: LayoutGrid },
  { href: "/vault",     label: "Vault",      icon: FolderLock },
  { href: "/reminders", label: "Reminders",  icon: Bell },
  { href: "/sharing",   label: "Sharing",    icon: Share2 },
  { href: "/family",    label: "Family",     icon: Users },
  { href: "/settings",  label: "Settings",   icon: Settings },
];

const HIDE_SIDEBAR = ["/login", "/signup", "/login/verify"];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  if (HIDE_SIDEBAR.includes(pathname) || pathname?.startsWith("/s/")) return null;

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 z-50 transition-all duration-200 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
      style={{
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sidebar)",
      }}
    >
      {/* Brand Header */}
      <div
        className="h-16 flex items-center justify-between px-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <Link href="/home" className="flex items-center gap-3 overflow-hidden min-w-0">
          <div className="pdf-icon-circle shrink-0" style={{ width: 36, height: 36 }}>
            <ShieldCheck className="w-4.5 h-4.5 text-white" strokeWidth={2.3} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-[15px] text-[var(--text-primary)] leading-tight truncate">
                Doc Vault
              </span>
              <span className="text-[10px] font-semibold text-[var(--text-muted)] truncate">
                Secure &amp; Encrypted
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-surface)] text-[var(--text-muted)] transition-colors shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="section-label px-2 pb-2 pt-1">Navigation</p>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/home" && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${isActive ? "active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.3 : 1.8} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Theme + Logout */}
      <div
        className="p-3 space-y-1 shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div
          className="flex items-center px-2 py-2 rounded-xl"
          style={{ justifyContent: collapsed ? "center" : "space-between" }}
        >
          {!collapsed && (
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              Appearance
            </span>
          )}
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="w-full sidebar-item hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-600 transition-all"
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span className="text-sm font-semibold">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
