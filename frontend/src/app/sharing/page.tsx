"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getShareLinks,
  createShareLink,
  revokeShareLink,
  getVault,
} from "@/lib/api";
import { Plus, Link2, Copy, Check, X } from "lucide-react";
import toast from "react-hot-toast";

interface ShareLink {
  id: string;
  document_id: string;
  document_name: string;
  token: string;
  share_url: string;
  status: "Active" | "Revoked";
  expires_at?: string;
  created_at: string;
}

interface Document {
  id: string;
  filename: string;
}

export default function SharingPage() {
  const router = useRouter();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [vaultDocs, setVaultDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [expiryDays, setExpiryDays] = useState(7);
  const [creating, setCreating] = useState(false);

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
      const [l, d] = await Promise.all([
        getShareLinks() as Promise<ShareLink[]>,
        getVault() as Promise<Document[]>,
      ]);
      setLinks(l || []);
      setVaultDocs(d || []);
      if (d && d.length > 0) setSelectedDocId(d[0].id);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(link: ShareLink) {
    const url = link.share_url || `${window.location.origin}/s/${link.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleRevoke(id: string) {
    try {
      await revokeShareLink(id);
      toast.success("Share link revoked");
      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "Revoked" } : l))
      );
    } catch {
      toast.error("Failed to revoke share link");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDocId) return;
    setCreating(true);
    try {
      await createShareLink(selectedDocId, expiryDays);
      toast.success("Share link created!");
      setShowModal(false);
      loadData();
    } catch {
      toast.error("Failed to create share link");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-24 space-y-6">
      {/* Header matching PDF Page 8 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Sharing Center
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Time-limited links, revocable any time
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-pdf-teal self-start sm:self-auto !px-5 !py-2.5"
        >
          <Plus className="w-4 h-4" />
          Create Share Link
        </button>
      </div>

      <div className="border-b border-[var(--border-subtle)]" />

      {/* Share Links List matching PDF Page 8 */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 bg-[var(--bg-card)] rounded-[24px] border border-[var(--border-default)] animate-pulse"
            />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="pdf-card p-12 text-center">
          <p className="text-base font-bold text-[var(--text-primary)]">
            No active share links
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Generate secure links to share documents temporarily with third parties.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => {
            const isActive = link.status === "Active";
            return (
              <div
                key={link.id}
                className="pdf-card p-5 sm:p-6 flex flex-col justify-between gap-4"
              >
                {/* Header row: Link circle + details + status badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="pdf-icon-circle-soft shrink-0">
                      <Link2 className="w-5 h-5 text-[var(--primary-teal)]" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                        {link.document_name}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-sm">
                        {link.share_url || `https://docvault.in/s/${link.token}`}
                      </p>
                    </div>
                  </div>

                  <span
                    className={
                      isActive
                        ? "pdf-badge-green shrink-0 text-xs"
                        : "pdf-badge-red shrink-0 text-xs"
                    }
                  >
                    {link.status}
                  </span>
                </div>

                {/* Actions row: Copy + Revoke buttons matching PDF Page 8 */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleCopy(link)}
                    className="btn-secondary !py-2 !px-4 text-xs !rounded-xl"
                  >
                    {copiedId === link.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>

                  {isActive ? (
                    <button
                      onClick={() => handleRevoke(link.id)}
                      className="!py-2 !px-4 text-xs font-semibold rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-all shadow-sm cursor-pointer"
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      disabled
                      className="!py-2 !px-4 text-xs font-semibold rounded-xl bg-red-100 dark:bg-red-950/30 text-red-400 cursor-not-allowed"
                    >
                      Revoked
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Share Link Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--bg-card)] rounded-[24px] p-6 border border-[var(--border-default)] shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Create Share Link
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Select Document
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="pdf-input"
                  required
                >
                  {vaultDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.filename}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Expiry Duration
                </label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="pdf-input"
                >
                  <option value={1}>24 hours</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 btn-pdf-teal !py-2.5"
                >
                  {creating ? "Generating..." : "Generate Link"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary !py-2.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
