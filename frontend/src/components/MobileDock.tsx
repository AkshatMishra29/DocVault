"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FolderLock,
  Bell,
  Share2,
  Users,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/home", label: "Dashboard", icon: LayoutGrid },
  { href: "/vault", label: "Vault", icon: FolderLock },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/sharing", label: "Sharing", icon: Share2 },
  { href: "/family", label: "Family", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

const HIDE_NAV = ["/login", "/signup", "/login/verify"];

export default function MobileDock() {
  const pathname = usePathname();
  if (HIDE_NAV.includes(pathname) || pathname?.startsWith("/s/")) return null;

  return (
    <nav className="lg:hidden pdf-bottom-nav">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/home" && pathname?.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`pdf-bottom-nav-item ${isActive ? "active" : ""}`}
          >
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.3 : 1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
