"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getVault, getReminders, searchPrompt, confirmUpdateProposal } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Upload,
  ChevronRight,
  FileText,
  Bell,
  Files,
  AlertTriangle,
  CheckCircle2,
  X,
  Lock,
  LogOut,
  Sparkles,
  ArrowRight,
  Check,
  Edit3,
} from "lucide-react";
import toast from "react-hot-toast";


interface Document {
  id: string;
  filename: string;
  category: string;
  expiry_date: string | null;
  created_at: string;
}

interface Reminder {
  id: string;
  filename: string;
  category: string;
  expiry_date: string;
  status: string;
  days_remaining: number;
}

interface UpdateProposal {
  doc_id: string;
  doc_filename: string;
  field: string;
  old_value: string | null;
  new_value: string;
  explanation?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [updateProposal, setUpdateProposal] = useState<UpdateProposal | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Middleware already guards this route — just load data
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [v, r] = await Promise.all([
        getVault() as Promise<Document[]>,
        getReminders() as Promise<Reminder[]>,
      ]);
      setDocs(v || []);
      setReminders(r || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchLoading(true);
    setAiAnswer(null);
    setUpdateProposal(null);
    try {
      const res = (await searchPrompt(query.trim())) as {
        type?: string;
        answer: string;
        proposal?: UpdateProposal;
      };
      setAiAnswer(res.answer);
      if (res.type === "update_proposal" && res.proposal) {
        setUpdateProposal(res.proposal);
      }
    } catch {
      setAiAnswer("Could not reach AI assistant.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleConfirmUpdate() {
    if (!updateProposal) return;
    setUpdating(true);
    try {
      await confirmUpdateProposal(
        updateProposal.doc_id,
        updateProposal.field,
        updateProposal.new_value
      );
      toast.success(
        `Updated ${updateProposal.field.replace("_", " ")} to "${updateProposal.new_value}"!`
      );
      setAiAnswer(
        `✅ Successfully updated **${updateProposal.doc_filename}**! ${updateProposal.field.replace("_", " ")} is now **${updateProposal.new_value}**.`
      );
      setUpdateProposal(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  }

  function handleLogout() {
    toast.success("Logged out securely");
    logout(); // clears localStorage + cookie + redirects
  }

  const expiringSoon = reminders
    .filter((r) => r.days_remaining <= 30 && r.days_remaining >= 0)
    .slice(0, 4);
  const expiredCount = reminders.filter((r) => r.days_remaining < 0).length;
  const recentDocs = docs.slice(0, 4);
  const activeReminders = reminders.filter((r) => r.days_remaining >= 0).length;

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 space-y-7">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pt-3">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">
            Welcome back
          </p>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[var(--text-primary)] leading-tight flex items-center gap-2">
            Namaste, {user?.name || "there"} <span className="text-2xl">👋</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5 font-medium">
            Your family vault is secure and encrypted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/upload")}
            className="btn-pdf-teal !px-5 !py-2.5 text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--border-default)] hover:bg-red-50 dark:hover:bg-red-950/40 text-[var(--text-muted)] hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {loading ? (
          <>
            <div className="skeleton h-[110px] rounded-[20px]" />
            <div className="skeleton h-[110px] rounded-[20px]" />
            <div className="skeleton h-[110px] rounded-[20px]" />
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-card-icon">
                <Files className="w-5 h-5 text-[var(--primary-teal)]" />
              </div>
              <div>
                <div className="stat-card-value">{docs.length}</div>
                <div className="stat-card-label">Documents</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: "rgba(245,158,11,0.12)" }}>
                <Bell className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="stat-card-value">{activeReminders}</div>
                <div className="stat-card-label">Reminders</div>
              </div>
            </div>

            <div className={`stat-card${expiredCount > 0 ? " !border-red-200 dark:!border-red-900/40" : ""}`}>
              <div
                className="stat-card-icon"
                style={{ background: expiredCount > 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)" }}
              >
                {expiredCount > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
              </div>
              <div>
                <div
                  className="stat-card-value"
                  style={{ color: expiredCount > 0 ? "var(--accent-rose)" : "var(--accent-emerald)" }}
                >
                  {expiredCount > 0 ? expiredCount : "✓"}
                </div>
                <div className="stat-card-label">{expiredCount > 0 ? "Expired" : "All valid"}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI Search */}
      <form onSubmit={handleSearch}>
        <div className="relative flex items-center">
          <Sparkles className="w-4 h-4 absolute left-4 text-[var(--primary-teal)] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Doc Vault anything… e.g. When does my passport expire?"
            className="pdf-input !pl-12 !pr-12 !py-3.5 !rounded-2xl text-sm"
          />
          {searchLoading && (
            <div className="absolute right-4 w-4 h-4 border-2 border-[var(--primary-teal)] border-t-transparent rounded-full animate-spin" />
          )}
          {query && !searchLoading && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* AI Answer & Update Proposal Confirmation */}
      {aiAnswer && (
        <div className="pdf-card p-5 space-y-4" style={{ background: "var(--primary-teal-light)" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary-teal)]" />
              <span className="text-xs font-bold text-[var(--primary-teal)] uppercase tracking-wider">
                AI Assistant
              </span>
            </div>
            <button
              onClick={() => {
                setAiAnswer(null);
                setUpdateProposal(null);
              }}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">{aiAnswer}</p>

          {/* Module 15: Confirmation Card for Natural Language Document Update */}
          {updateProposal && (
            <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] shadow-xs space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-primary-500" />
                  Proposed Document Change
                </span>
                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                  {updateProposal.doc_filename}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-medium items-center">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Field</span>
                  <span className="font-semibold text-[var(--text-primary)] capitalize">
                    {updateProposal.field.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Current</span>
                  <span className="line-through text-rose-500">
                    {updateProposal.old_value || "None"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] hidden sm:block" />
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block">New Value</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {updateProposal.new_value}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUpdateProposal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpdate}
                  disabled={updating}
                  className="btn-pdf-teal !py-1.5 !px-4 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {updating ? (
                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm & Apply Update</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expiring Soon */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-label">Expiring Soon</h2>
          <Link
            href="/reminders"
            className="text-xs font-bold text-[var(--primary-teal)] flex items-center gap-0.5 hover:opacity-75 transition-opacity"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-20 rounded-[20px]" />
            <div className="skeleton h-20 rounded-[20px]" />
          </div>
        ) : expiringSoon.length === 0 ? (
          <div className="pdf-card p-5 flex items-center gap-4">
            <div className="stat-card-icon" style={{ background: "rgba(16,185,129,0.1)", borderRadius: "14px" }}>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">All documents are valid</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">No documents expiring within 30 days.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {expiringSoon.map((item) => {
              const badgeClass =
                item.days_remaining <= 7
                  ? "pdf-badge-red"
                  : item.days_remaining <= 30
                  ? "pdf-badge-amber"
                  : "pdf-badge-green";
              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/document/${item.id}`)}
                  className="pdf-card p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:border-[var(--border-strong)] transition-all"
                  style={{ willChange: "transform" }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="pdf-icon-circle-soft shrink-0">
                      <Bell className="w-4 h-4 text-[var(--primary-teal)]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {item.filename}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                        {item.category} &middot; {item.expiry_date}
                      </p>
                    </div>
                  </div>
                  <span className={`${badgeClass} shrink-0 text-[11px]`}>
                    {item.days_remaining} days left
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Documents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-label">Recent Documents</h2>
          <Link
            href="/vault"
            className="text-xs font-bold text-[var(--primary-teal)] flex items-center gap-0.5 hover:opacity-75 transition-opacity"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-36 rounded-[20px]" />
            <div className="skeleton h-36 rounded-[20px]" />
          </div>
        ) : recentDocs.length === 0 ? (
          <div className="pdf-card p-8 text-center">
            <div className="pdf-icon-circle mx-auto mb-3" style={{ width: 48, height: 48 }}>
              <Upload className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">No documents yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Upload your first document to get started.</p>
            <button
              onClick={() => router.push("/upload")}
              className="btn-pdf-teal mt-4 !py-2.5 !px-5 text-sm"
            >
              Upload Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/document/${doc.id}`)}
                className="pdf-card p-4 flex flex-col justify-between h-40 cursor-pointer hover:border-[var(--border-strong)] transition-all"
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
              >
                <div className="flex items-start justify-between">
                  <div className="pdf-icon-circle-soft">
                    <FileText className="w-4 h-4 text-[var(--primary-teal)]" />
                  </div>
                  <Lock className="w-3.5 h-3.5 text-[var(--text-tertiary)] mt-0.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] truncate leading-tight">
                    {doc.filename}
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 capitalize font-medium">
                    {doc.category}
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded-full">
                    {doc.expiry_date ? doc.expiry_date : "No expiry"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
