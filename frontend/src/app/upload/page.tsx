"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument, analyzeDocument, getFamilyMembers } from "@/lib/api";
import {
  UploadCloud,
  Sparkles,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = [
  "Identity",
  "Insurance",
  "Vehicle",
  "Property",
  "Education",
  "Medical",
  "Other",
];

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [memberId, setMemberId] = useState("me");
  const [familyMembers, setFamilyMembers] = useState<
    { id: string; name: string; relation: string }[]
  >([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadFamily();
  }, []);

  async function loadFamily() {
    try {
      const data = (await getFamilyMembers()) as {
        id: string;
        name: string;
        relation: string;
      }[];
      setFamilyMembers(data || []);
    } catch {
      // ignore
    }
  }

  async function handleFileSelect(f: File) {
    setFile(f);
    setError("");
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const result = (await analyzeDocument(formData)) as {
        suggested_category?: string;
        detected_expiry?: string;
      };
      if (result.suggested_category) {
        const found = CATEGORIES.find(
          (c) => c.toLowerCase() === result.suggested_category?.toLowerCase()
        );
        if (found) setCategory(found);
      }
      if (result.detected_expiry) {
        setExpiryDate(result.detected_expiry);
      }
      toast.success("AI OCR extracted details!");
    } catch {
      // fallback
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a document to upload");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      if (expiryDate) formData.append("expiry_date", expiryDate);
      if (memberId && memberId !== "me") formData.append("member_id", memberId);

      await uploadDocument(formData);
      toast.success("Document uploaded to vault!");
      router.push("/vault");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 space-y-6">
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border-default)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Upload Document
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Encrypted and processed with local on-device OCR
          </p>
        </div>
      </div>

      <div className="border-b border-[var(--border-subtle)]" />

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dropzone Card */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
          }}
          onClick={() => fileRef.current?.click()}
          className={`rounded-[24px] border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all ${
            dragging
              ? "border-[var(--primary-teal)] bg-[var(--primary-teal-light)]"
              : "border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--primary-teal)]"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />

          <div className="pdf-icon-circle-soft !w-16 !h-16 mx-auto mb-4">
            <UploadCloud className="w-8 h-8 text-[var(--primary-teal)]" />
          </div>

          {file ? (
            <div>
              <p className="text-base font-bold text-[var(--text-primary)]">
                {file.name}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB • Click to change
              </p>
            </div>
          ) : (
            <div>
              <p className="text-base font-bold text-[var(--text-primary)]">
                Drop your document here, or browse
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Supports PDF, JPG, PNG up to 25MB
              </p>
            </div>
          )}

          {analyzing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--primary-teal)]">
              <Sparkles className="w-4 h-4 animate-spin" />
              Analyzing document with AI OCR...
            </div>
          )}
        </div>

        {/* Metadata fields in PDF Card */}
        <div className="pdf-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Document Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`pdf-filter-pill text-center ${
                    category === c ? "active" : ""
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="pdf-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Vault Member
              </label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="pdf-input"
              >
                <option value="me">Me (Self)</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.relation})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full btn-pdf-teal !py-3.5 text-base !rounded-2xl"
        >
          {loading ? "Encrypting & Storing..." : "Save to Vault"}
        </button>
      </form>
    </div>
  );
}
