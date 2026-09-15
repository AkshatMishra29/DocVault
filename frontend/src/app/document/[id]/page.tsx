"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  getDocument,
  updateDocument,
  deleteDocument,
  getDocumentDownloadUrl,
} from "@/lib/api";
import {
  Download,
  Trash2,
  Save,
  ArrowLeft,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = [
  "Insurance",
  "Vehicle",
  "Identity",
  "Education",
  "Property",
  "Medical",
  "Other",
];

interface DocumentDetail {
  id: string;
  filename: string;
  category: string;
  expiry_date: string | null;
  ocr_text?: string;
  created_at: string;
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const docId = resolvedParams.id;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [category, setCategory] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    loadDoc();
  }, [docId]);

  async function loadDoc() {
    setLoading(true);
    try {
      const data = (await getDocument(docId)) as DocumentDetail;
      setDoc(data);
      setCategory(data.category || CATEGORIES[0]);
      setExpiryDate(data.expiry_date || "");
    } catch {
      toast.error("Document not found");
      router.push("/vault");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDocument(docId, {
        category,
        expiry_date: expiryDate || null,
      });
      toast.success("Document updated successfully");
      loadDoc();
    } catch {
      toast.error("Failed to update document");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to permanently delete this document?"))
      return;
    setDeleting(true);
    try {
      await deleteDocument(docId);
      toast.success("Document deleted");
      router.push("/vault");
    } catch {
      toast.error("Failed to delete document");
      setDeleting(false);
    }
  }

  function handleDownload() {
    const downloadUrl = getDocumentDownloadUrl(docId);
    window.open(downloadUrl, "_blank");
  }

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 text-center text-sm font-semibold text-[var(--text-muted)]">
        Loading document...
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="w-full max-w-4xl mx-auto pb-24 space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border-default)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] truncate max-w-md">
              {doc.filename}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Added on {new Date(doc.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="btn-pdf-teal !py-2 !px-4 text-xs"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="!py-2 !px-3 text-xs font-semibold rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-[var(--border-subtle)]" />

      {/* Edit details card */}
      <form onSubmit={handleSave} className="pdf-card p-6 space-y-5">
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          Document Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="pdf-input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Expiry Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="pdf-input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-pdf-teal !py-2.5 !px-5"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Extracted OCR Text Card */}
      {doc.ocr_text && (
        <div className="pdf-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--primary-teal)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Extracted OCR Content
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-xs font-mono leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap max-h-96 overflow-y-auto">
            {doc.ocr_text}
          </div>
        </div>
      )}
    </div>
  );
}
