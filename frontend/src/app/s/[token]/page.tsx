"use client";

import { useEffect, useState, use } from "react";
import { getPublicShareDoc } from "@/lib/api";
import { motion } from "framer-motion";
import {
  FileText,
  Shield,
  Download,
  Calendar,
  Lock,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface PublicDoc {
  filename: string;
  category: string;
  expiry_date?: string;
  ocr_text?: string;
  download_available: boolean;
}

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolved = use(params);
  const token = resolved.token;

  const [doc, setDoc] = useState<PublicDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDoc();
  }, [token]);

  async function fetchDoc() {
    setLoading(true);
    try {
      const data = (await getPublicShareDoc(token)) as PublicDoc;
      setDoc(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Document link is expired or invalid"
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--text-tertiary)] font-mono">
            Decrypting sovereign record…
          </span>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full mac-card p-8 text-center border-rose-500/20"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">
            Access Expired or Revoked
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {error || "This cryptographic share link is no longer valid."}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg mac-window p-6 sm:p-8 space-y-6 shadow-2xl"
      >
        {/* Brand header */}
        <div className="flex items-center justify-between pb-5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-sky-400 p-0.5">
              <div className="w-full h-full bg-[var(--bg-primary)] rounded-[10px] flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-500" />
              </div>
            </div>
            <span className="font-bold text-sm text-[var(--text-primary)]">
              DocVault Share
            </span>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Shield className="w-3 h-3" /> Zero-Knowledge Verified
          </span>
        </div>

        {/* Document info */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 shrink-0">
            <FileText className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <h1 className="text-base font-bold text-[var(--text-primary)] truncate">
              {doc.filename}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-medium text-[var(--text-secondary)]">
                {doc.category}
              </span>
              {doc.expiry_date && (
                <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Exp: {doc.expiry_date}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* OCR snippet if available */}
        {doc.ocr_text && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" /> Document Excerpt
            </span>
            <div className="bg-[var(--bg-secondary)] p-3.5 rounded-xl border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)] max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {doc.ocr_text}
            </div>
          </div>
        )}

        {/* Action button */}
        {doc.download_available && (
          <a
            href={`/api/public/share/${token}/download`}
            download
            className="btn-primary w-full py-3 text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Verified File</span>
          </a>
        )}
      </motion.div>
    </div>
  );
}
