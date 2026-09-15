"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getUserSettings,
  updateUserSettings,
  getExportArchiveUrl,
  getVault,
} from "@/lib/api";
import {
  Download,
  ChevronDown,
  LogOut,
  HardDrive,
  ScanText,
  Languages,
  Archive,
  ShieldAlert,
} from "lucide-react";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";

interface SettingRowProps {
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  description: string;
  action: React.ReactNode;
}

function SettingRow({ icon, iconBg, title, description, action }: SettingRowProps) {
  return (
    <div className="pdf-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
          style={{ background: iconBg ?? "var(--primary-teal-light)" }}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{title}</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5 max-w-md">{description}</p>
        </div>
      </div>
      <div className="sm:shrink-0 sm:ml-4">{action}</div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [storageMode, setStorageMode] = useState<"Local" | "Cloud">("Local");
  const [ocrMode, setOcrMode] = useState<"On-device" | "Server">("On-device");
  const [language, setLanguage] = useState("English");
  const [docCount, setDocCount] = useState(9);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [settings, docs] = await Promise.all([
        getUserSettings() as Promise<{ storage_mode?: string; ocr_mode?: string; language?: string }>,
        getVault() as Promise<{ length: number }>,
      ]);
      if (settings) {
        setStorageMode((settings.storage_mode as "Local" | "Cloud") || "Local");
        setOcrMode((settings.ocr_mode as "On-device" | "Server") || "On-device");
        setLanguage(settings.language || "English");
      }
      if (docs) setDocCount(docs.length || 9);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStorage() {
    const next = storageMode === "Local" ? "Cloud" : "Local";
    setStorageMode(next);
    try {
      await updateUserSettings({ storage_mode: next, ocr_mode: ocrMode, language });
      toast.success(`Storage switched to ${next}`);
    } catch {
      setStorageMode(storageMode);
    }
  }

  async function handleToggleOCR() {
    const next = ocrMode === "On-device" ? "Server" : "On-device";
    setOcrMode(next);
    try {
      await updateUserSettings({ storage_mode: storageMode, ocr_mode: next, language });
      toast.success(`OCR switched to ${next}`);
    } catch {
      setOcrMode(ocrMode);
    }
  }

  function handleExport() {
    try {
      const url = getExportArchiveUrl();
      toast.success("Archive prepared! Downloading…");
      window.open(url, "_blank");
    } catch {
      toast.error("Failed to generate export archive");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    router.push("/login");
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 space-y-6">

      {/* Header */}
      <div className="pt-3">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">
          Preferences
        </p>
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
          Privacy-first controls for your vault.
        </p>
      </div>

      <div className="page-divider" />

      {/* Settings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-24 rounded-[20px]" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Storage Mode */}
          <SettingRow
            icon={<HardDrive className="w-5 h-5 text-[var(--primary-teal)]" />}
            title="Storage mode"
            description={`${storageMode === "Local" ? "Local-only" : "Cloud"} — documents stay encrypted ${storageMode === "Local" ? "on this device" : "in the cloud"}.`}
            action={
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold ${storageMode === "Cloud" ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                  Cloud
                </span>
                <label className="pdf-toggle">
                  <input type="checkbox" checked={storageMode === "Local"} onChange={handleToggleStorage} />
                  <span className="pdf-toggle-slider" />
                </label>
                <span className={`text-xs font-semibold ${storageMode === "Local" ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                  Local
                </span>
              </div>
            }
          />

          {/* OCR Mode */}
          <SettingRow
            icon={<ScanText className="w-5 h-5 text-indigo-500" />}
            iconBg="rgba(99,102,241,0.1)"
            title="OCR processing"
            description={`${ocrMode === "On-device" ? "On-device" : "Server-side"} — ${ocrMode === "On-device" ? "nothing is uploaded for text extraction" : "text extraction uses cloud processing"}.`}
            action={
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold ${ocrMode === "Server" ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                  Server
                </span>
                <label className="pdf-toggle">
                  <input type="checkbox" checked={ocrMode === "On-device"} onChange={handleToggleOCR} />
                  <span className="pdf-toggle-slider" />
                </label>
                <span className={`text-xs font-semibold ${ocrMode === "On-device" ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                  On-device
                </span>
              </div>
            }
          />

          {/* Language */}
          <SettingRow
            icon={<Languages className="w-5 h-5 text-emerald-500" />}
            iconBg="rgba(16,185,129,0.1)"
            title="Language"
            description="Interface language for the vault."
            action={
              <div className="relative w-full sm:w-48">
                <select
                  value={language}
                  onChange={(e) => {
                    const l = e.target.value;
                    setLanguage(l);
                    updateUserSettings({ storage_mode: storageMode, ocr_mode: ocrMode, language: l });
                  }}
                  className="pdf-input !py-2.5 !pr-10 appearance-none font-semibold text-sm cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Marathi">Marathi (मराठी)</option>
                  <option value="Spanish">Spanish</option>
                </select>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            }
          />

          {/* Export */}
          <SettingRow
            icon={<Archive className="w-5 h-5 text-amber-500" />}
            iconBg="rgba(245,158,11,0.1)"
            title="Export all documents"
            description={`Download an encrypted archive of all ${docCount} document${docCount !== 1 ? "s" : ""}.`}
            action={
              <button onClick={handleExport} className="btn-pdf-teal !py-2.5 !px-5 text-sm">
                <Download className="w-4 h-4" />
                Export Archive
              </button>
            }
          />

          {/* Sign Out */}
          <div className="pdf-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}>
                <ShieldAlert className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-red-500 dark:text-red-400">Account Session</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">Sign out from Doc Vault on this browser.</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all shrink-0"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "rgb(220,38,38)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
