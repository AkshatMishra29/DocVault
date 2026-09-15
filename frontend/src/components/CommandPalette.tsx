"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LayoutDashboard, Shield, Bell, Share2,
  Users, Settings, Zap, Command, ArrowRight,
} from "lucide-react";

const COMMANDS = [
  { id: "home",      label: "Go to Dashboard",   icon: LayoutDashboard, href: "/home",      desc: "View stats & activity" },
  { id: "vault",     label: "Open Vault",         icon: Shield,          href: "/vault",     desc: "Browse your documents" },
  { id: "upload",    label: "Upload Document",    icon: ArrowRight,      href: "/upload",    desc: "Add a new file" },
  { id: "reminders", label: "View Reminders",     icon: Bell,            href: "/reminders", desc: "Expiring documents" },
  { id: "sharing",   label: "Sharing Center",     icon: Share2,          href: "/sharing",   desc: "Manage shared links" },
  { id: "family",    label: "Family Vault",        icon: Users,           href: "/family",    desc: "Manage family members" },
  { id: "cards",     label: "Quick Cards",         icon: Zap,             href: "/cards",     desc: "View saved card info" },
  { id: "settings",  label: "Settings",            icon: Settings,        href: "/settings",  desc: "Configure DocVault" },
];

let globalOpenFn: (() => void) | null = null;
export function openCommandPalette() { globalOpenFn?.(); }

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelected(0);
  }, []);

  useEffect(() => {
    globalOpenFn = openPalette;
    return () => { globalOpenFn = null; };
  }, [openPalette]);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setSelected(0);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = COMMANDS.filter(
    (c) =>
      !query.trim() ||
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.desc.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && filtered[selected]) {
        router.push(filtered[selected].href);
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, selected, filtered, router]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="cmd-overlay"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="cmd-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                placeholder="Search pages, actions..."
                className="flex-1 bg-transparent outline-none text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              />
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono-code font-semibold"
                style={{
                  background: "var(--bg-glass)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-tertiary)",
                }}
              >
                <Command className="w-2.5 h-2.5" />K
              </div>
            </div>

            {/* Results */}
            <div className="py-2 max-h-72 overflow-y-auto custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                filtered.map((cmd, i) => {
                  const Icon = cmd.icon;
                  const isSelected = i === selected;
                  return (
                    <button
                      key={cmd.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                      style={{
                        background: isSelected ? "var(--bg-glass-hover)" : "transparent",
                        borderLeft: isSelected ? "2px solid var(--accent-violet)" : "2px solid transparent",
                        color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => { router.push(cmd.href); setOpen(false); }}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: isSelected ? "var(--accent-violet-glow)" : "var(--bg-glass)",
                          color: isSelected ? "var(--accent-violet)" : "var(--text-tertiary)",
                        }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{cmd.label}</div>
                        <div className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>{cmd.desc}</div>
                      </div>
                      {isSelected && (
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent-violet)" }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer hint */}
            <div
              className="flex items-center justify-between px-4 py-2.5 text-[10px] font-medium"
              style={{
                borderTop: "1px solid var(--border-subtle)",
                color: "var(--text-tertiary)",
              }}
            >
              <span>↑↓ to navigate</span>
              <span>↵ to select</span>
              <span>esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
