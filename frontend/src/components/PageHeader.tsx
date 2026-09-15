"use client";

import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { openCommandPalette } from "./CommandPalette";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  action?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-2 border-b"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div>
        {/* Breadcrumb Hierarchy */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 mb-1 text-xs">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <ChevronRight
                    className="w-3 h-3 shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="font-medium transition-colors hover:underline"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--primary-500)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-muted)")
                    }
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className="font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        <h1
          className="text-xl font-semibold tracking-tight leading-snug"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Quick Search shortcut trigger */}
        <button
          onClick={openCommandPalette}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-normal transition-colors"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            color: "var(--text-muted)",
          }}
          title="Search anything (⌘K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-[11px]">Search...</span>
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px] font-mono-code font-semibold border"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-default)",
              color: "var(--text-muted)",
            }}
          >
            ⌘K
          </kbd>
        </button>

        {action}
      </div>
    </div>
  );
}
