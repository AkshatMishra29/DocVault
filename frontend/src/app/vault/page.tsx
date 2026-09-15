"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getVault } from "@/lib/api";
import {
  Upload,
  Search,
  Lock,
  FileText,
  Shield,
  CreditCard,
  Car,
  Home,
  GraduationCap,
  X,
} from "lucide-react";

interface Document {
  id: string;
  filename: string;
  category: string;
  expiry_date: string | null;
  created_at: string;
}

const CATEGORIES = ["All", "Identity", "Insurance", "Vehicle", "Property", "Education"];

function getCategoryIcon(cat: string) {
  switch (cat?.toLowerCase()) {
    case "identity":   return CreditCard;
    case "insurance":  return Shield;
    case "vehicle":    return Car;
    case "property":   return Home;
    case "education":  return GraduationCap;
    default:           return FileText;
  }
}

function getCategoryColor(cat: string): string {
  switch (cat?.toLowerCase()) {
    case "identity":   return "rgba(99,102,241,0.12)";
    case "insurance":  return "rgba(16,185,129,0.12)";
    case "vehicle":    return "rgba(245,158,11,0.12)";
    case "property":   return "rgba(239,68,68,0.12)";
    case "education":  return "rgba(59,130,246,0.12)";
    default:           return "var(--primary-teal-badge)";
  }
}

function getCategoryIconColor(cat: string): string {
  switch (cat?.toLowerCase()) {
    case "identity":   return "#6366f1";
    case "insurance":  return "#10b981";
    case "vehicle":    return "#f59e0b";
    case "property":   return "#ef4444";
    case "education":  return "#3b82f6";
    default:           return "var(--primary-teal)";
  }
}

function getExpiryBadge(expiry: string | null) {
  if (!expiry) return <span className="pdf-badge-teal text-[11px]">No expiry</span>;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((new Date(expiry).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return <span className="pdf-badge-red text-[11px]">Expired {Math.abs(diffDays)}d ago</span>;
  if (diffDays <= 30) return <span className="pdf-badge-amber text-[11px]">{diffDays} days left</span>;
  return <span className="pdf-badge-green text-[11px]">{diffDays} days left</span>;
}

export default function VaultPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    loadDocs();
  }, [router]);

  async function loadDocs() {
    setLoading(true);
    try {
      const data = (await getVault()) as Document[];
      setDocs(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const filtered = docs.filter((d) => {
    const matchCat =
      activeCategory === "All" ||
      d.category?.toLowerCase() === activeCategory.toLowerCase();
    const matchSearch =
      d.filename.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="w-full max-w-4xl mx-auto pb-28 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between pt-3">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">
            My Documents
          </p>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[var(--text-primary)]">
            Vault
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            {docs.length} {docs.length === 1 ? "document" : "documents"} stored
          </p>
        </div>

        <button
          onClick={() => router.push("/upload")}
          className="btn-pdf-teal !px-5 !py-2.5 text-sm"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      {/* Search */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-4 text-[var(--text-muted)] pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="pdf-input !pl-12 !pr-10 !py-3 !rounded-2xl text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`pdf-filter-pill whitespace-nowrap ${activeCategory === cat ? "active" : ""}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-[172px] rounded-[20px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="pdf-card p-12 text-center">
          <div className="pdf-icon-circle mx-auto mb-4" style={{ width: 52, height: 52 }}>
            <FileText className="w-6 h-6 text-white" />
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">No documents found</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {search
              ? "Try adjusting your search or category filter."
              : "Upload a document to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((doc) => {
            const Icon = getCategoryIcon(doc.category);
            const iconBg = getCategoryColor(doc.category);
            const iconColor = getCategoryIconColor(doc.category);
            return (
              <div
                key={doc.id}
                onClick={() => router.push(`/document/${doc.id}`)}
                className="pdf-card p-5 flex flex-col justify-between h-[172px] cursor-pointer hover:border-[var(--border-strong)] transition-all"
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
                    style={{ background: iconBg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: iconColor }} />
                  </div>
                  <Lock className="w-3.5 h-3.5 text-[var(--text-tertiary)] mt-0.5" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--text-primary)] truncate leading-tight">
                    {doc.filename}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium capitalize">
                    {doc.category}
                  </p>
                </div>

                <div>{getExpiryBadge(doc.expiry_date)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
