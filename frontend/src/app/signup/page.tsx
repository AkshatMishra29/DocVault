"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { signup } from "@/lib/api";
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const data = (await signup(email, password)) as { access_token: string };
      localStorage.setItem("token", data.access_token);
      router.push("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const perks = [
    {
      icon: Shield,
      title: "Zero-Knowledge Encryption",
      desc: "AES-256 GCM client-side encrypted storage architecture.",
    },
    {
      icon: Zap,
      title: "Real-Time AI OCR",
      desc: "Instant document text indexing & automated expiry detection.",
    },
    {
      icon: Sparkles,
      title: "Family Vault Isolation",
      desc: "Granular sovereign access control for household dependents.",
    },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link href="/login" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-sky-400 p-0.5 shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[var(--bg-primary)] rounded-[14px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-500" />
              </div>
            </div>
            <span className="font-bold text-xl tracking-tight">DocVault</span>
          </Link>
        </div>

        <div className="relative z-10 my-auto py-12 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Next-Gen Document Sovereignty
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
              Step into the fortress for all your vital records.
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
              Protect your passports, policies, vehicle titles, and family IDs
              with enterprise-grade zero-knowledge privacy.
            </p>

            <div className="space-y-4">
              {perks.map((item, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center shrink-0 text-primary-500 shadow-xs">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-[var(--text-tertiary)] pt-6 border-t border-[var(--border-subtle)]">
          <span>© {new Date().getFullYear()} DocVault Intelligence</span>
          <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
            <Lock className="w-3.5 h-3.5 text-emerald-500" /> End-to-End Encrypted
          </span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-sky-400 p-0.5">
              <div className="w-full h-full bg-[var(--bg-primary)] rounded-[10px] flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-500" />
              </div>
            </div>
            <span className="font-bold text-lg">DocVault</span>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mac-window p-8"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Create your account
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Start securing your family documents in seconds.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2"
              >
                <span>⚠️</span>
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@domain.com"
                    className="mac-input pl-10 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="mac-input pl-10 pr-10 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="mac-input pl-10 text-xs"
                  />
                </div>
              </div>

              <div className="py-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-xs font-semibold shadow-md shadow-primary-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Sovereign Vault</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-center">
              <p className="text-xs text-[var(--text-secondary)]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
