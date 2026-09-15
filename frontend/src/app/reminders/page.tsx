"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getReminders, toggleReminder } from "@/lib/api";
import {
  Shield,
  Car,
  FileText,
  CreditCard,
  Home,
  GraduationCap,
  Bell,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Reminder {
  id: string;
  filename: string;
  category: string;
  expiry_date: string;
  status: string;
  days_remaining: number;
  remind_me?: boolean;
  member_name?: string;
}

function getCategoryIcon(cat: string) {
  switch (cat?.toLowerCase()) {
    case "vehicle":    return Car;
    case "insurance":  return Shield;
    case "identity":   return CreditCard;
    case "property":   return Home;
    case "education":  return GraduationCap;
    default:           return FileText;
  }
}

export default function RemindersPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
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
      const data = (await getReminders()) as Reminder[];
      setReminders(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, currentVal: boolean) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, remind_me: !currentVal } : r))
    );
    try {
      await toggleReminder(id);
      toast.success(!currentVal ? "Reminder enabled" : "Reminder disabled");
    } catch {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, remind_me: currentVal } : r))
      );
      toast.error("Failed to update reminder");
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 space-y-6">

      {/* Header */}
      <div className="pt-3">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">
          Alerts
        </p>
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-[var(--text-primary)]">
          Reminders
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
          Sorted by how soon they expire
        </p>
      </div>

      <div className="page-divider" />

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-[20px]" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="pdf-card p-12 text-center">
          <div
            className="mx-auto mb-4 flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(16,185,129,0.1)",
            }}
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">No reminders active</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs mx-auto">
            Documents with expiry dates will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((item) => {
            const Icon = getCategoryIcon(item.category);
            const isExpired = item.days_remaining < 0;
            const remindActive = item.remind_me ?? true;

            return (
              <div key={item.id} className="pdf-card p-5 sm:p-6">

                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="pdf-icon-circle-soft shrink-0">
                      <Icon className="w-5 h-5 text-[var(--primary-teal)]" />
                    </div>

                    <div className="min-w-0">
                      <h3
                        onClick={() => router.push(`/document/${item.id}`)}
                        className="text-base font-bold text-[var(--text-primary)] truncate cursor-pointer hover:text-[var(--primary-teal)] transition-colors"
                      >
                        {item.filename}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                        {item.category} &bull; {item.member_name || "Me (Akshat)"} &bull; {item.expiry_date}
                      </p>
                    </div>
                  </div>

                  <span
                    className={
                      isExpired
                        ? "pdf-badge-red shrink-0 text-xs"
                        : item.days_remaining <= 30
                        ? "pdf-badge-amber shrink-0 text-xs"
                        : "pdf-badge-green shrink-0 text-xs"
                    }
                  >
                    {isExpired
                      ? `Expired ${Math.abs(item.days_remaining)}d ago`
                      : `${item.days_remaining} days left`}
                  </span>
                </div>

                {/* Remind me toggle */}
                <div
                  className="flex items-center justify-between mt-4 pt-4"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      Remind me
                    </span>
                  </div>
                  <label className="pdf-toggle">
                    <input
                      type="checkbox"
                      checked={remindActive}
                      onChange={() => handleToggle(item.id, remindActive)}
                    />
                    <span className="pdf-toggle-slider" />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
