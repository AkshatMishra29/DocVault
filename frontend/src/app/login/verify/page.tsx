"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyOTP } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: authLogin } = useAuth();
  const target = searchParams?.get("target") || "your account";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const dev = sessionStorage.getItem("dev_otp");
    if (dev && dev.length === 6) {
      setOtp(dev.split(""));
    }
  }, []);

  function handleChange(idx: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const nextOtp = [...otp];
    nextOtp[idx] = val.slice(-1);
    setOtp(nextOtp);

    if (val && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const data = (await verifyOTP(target, code)) as {
        access_token: string;
        user?: { id: string; email: string; name: string };
      };
      const user = data.user || {
        id: "user",
        email: target.includes("@") ? target : "",
        name: "Akshat",
      };
      authLogin(data.access_token, user);
      toast.success("Identity verified! Welcome to your vault.");
      router.replace("/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid code";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[var(--bg-canvas)]">
      <div className="w-full max-w-[420px] bg-[var(--bg-card)] rounded-[24px] p-8 border border-[var(--border-default)] shadow-sm">
        {/* Brand Shield Header */}
        <div className="flex items-center gap-3.5 mb-8">
          <div className="pdf-icon-circle">
            <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2.4} />
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)]">
            Doc Vault
          </span>
        </div>

        {/* Verify OTP Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Verify OTP
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            We sent a 6-digit code to your account.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 6 Digit Inputs Box */}
          <div className="flex justify-between items-center gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-[var(--border-default)] focus:border-[var(--primary-teal)] focus:ring-2 focus:ring-[var(--primary-teal-light)] outline-none bg-[var(--bg-input)] text-[var(--text-primary)]"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-pdf-teal !py-3 text-base !rounded-xl"
          >
            {loading ? "Verifying..." : "Verify & Enter Vault"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full text-center text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center">Loading...</div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}
