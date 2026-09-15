"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFamilyMembers, addFamilyMember, getVault } from "@/lib/api";
import {
  UserPlus,
  Lock,
  CreditCard,
  X,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  initials: string;
  document_count: number;
}

interface Document {
  id: string;
  filename: string;
  category: string;
  expiry_date: string | null;
  member_id?: string;
}

export default function FamilyPage() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Father");
  const [submitting, setSubmitting] = useState(false);

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
      const [m, d] = await Promise.all([
        getFamilyMembers() as Promise<FamilyMember[]>,
        getVault() as Promise<Document[]>,
      ]);

      const defaultMembers: FamilyMember[] =
        m && m.length > 0
          ? m
          : [
              { id: "me", name: "Me", relation: "Self", initials: "ME", document_count: 5 },
              { id: "dad", name: "Dad", relation: "Father", initials: "DA", document_count: 2 },
              { id: "mom", name: "Mom", relation: "Mother", initials: "MO", document_count: 3 },
            ];

      setMembers(defaultMembers);
      setSelectedMember(defaultMembers[0]);
      setDocs(d || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await addFamilyMember(name.trim(), relation);
      toast.success("Family member added!");
      setShowAddModal(false);
      setName("");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add member";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const memberDisplayName = selectedMember
    ? `${selectedMember.name.toUpperCase()} (${selectedMember.name === "Me" ? "AKSHAT" : selectedMember.name.toUpperCase()})'S DOCUMENTS (${docs.length})`
    : "DOCUMENTS";

  return (
    <div className="w-full max-w-4xl mx-auto pb-24 space-y-6">
      {/* Header matching PDF Page 6 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Family Vault
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Shared, but each member&apos;s documents stay separate
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-pdf-teal self-start sm:self-auto !px-5 !py-2.5"
        >
          <UserPlus className="w-4 h-4" />
          Add Family Member
        </button>
      </div>

      <div className="border-b border-[var(--border-subtle)]" />

      {/* Member Selection Grid matching PDF Page 6 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {members.map((member) => {
          const isSelected = selectedMember?.id === member.id;
          return (
            <div
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className={`pdf-card p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isSelected
                  ? "border-[var(--primary-teal)] shadow-md ring-2 ring-[var(--primary-teal-light)]"
                  : "hover:border-[var(--border-strong)]"
              }`}
            >
              <div className="pdf-icon-circle !w-14 !h-14 mb-3 text-base font-bold">
                {member.initials || member.name.slice(0, 2).toUpperCase()}
              </div>
              <h4 className="text-base font-bold text-[var(--text-primary)]">
                {member.name}
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                {member.relation}
              </p>
            </div>
          );
        })}

        {/* Add Card (Dashed Border) matching PDF Page 6 */}
        <div
          onClick={() => setShowAddModal(true)}
          className="rounded-[20px] border-2 border-dashed border-[var(--border-default)] p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[var(--primary-teal)] hover:bg-[var(--bg-surface)] transition-all"
        >
          <Plus className="w-8 h-8 text-[var(--text-muted)] mb-2" />
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Add
          </span>
        </div>
      </div>

      {/* Member's Documents Subheader matching PDF Page 6 */}
      <div className="pt-4 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {memberDisplayName}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 bg-[var(--bg-card)] rounded-[24px] border border-[var(--border-default)] animate-pulse"
              />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="pdf-card p-10 text-center">
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              No documents added for this member yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/document/${doc.id}`)}
                className="pdf-card p-5 flex flex-col justify-between h-44 cursor-pointer hover:border-[var(--border-strong)] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="pdf-icon-circle-soft">
                    <CreditCard className="w-5 h-5 text-[var(--primary-teal)]" />
                  </div>
                  <Lock className="w-4 h-4 text-[var(--text-muted)]" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)] truncate">
                    {doc.filename}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize">
                    {doc.category}
                  </p>
                </div>

                <div>
                  <span className="pdf-badge-teal text-[11px]">
                    {doc.expiry_date ? doc.expiry_date : "No expiry"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Family Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--bg-card)] rounded-[24px] p-6 border border-[var(--border-default)] shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Add Family Member
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="pdf-input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Relation
                </label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="pdf-input"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-pdf-teal !py-2.5"
                >
                  {submitting ? "Adding..." : "Add Member"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
