"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8 rounded-lg skeleton" />;

  const isDark = theme === "dark" || theme === "system";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex items-center gap-2.5 w-full px-3 py-2 rounded-xl transition-all group"
      style={{
        background: "var(--bg-glass)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div
        className="relative w-5 h-5 shrink-0 flex items-center justify-center"
        style={{ color: isDark ? "#F59E0B" : "#7C3AED" }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <Moon className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <Sun className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!collapsed && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {isDark ? "Dark Mode" : "Light Mode"}
        </motion.span>
      )}
    </button>
  );
}
