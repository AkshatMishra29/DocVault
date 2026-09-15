"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestOTP, login, googleLogin } from "@/lib/api";
import { signInWithGoogle, renderGoogleButton } from "@/lib/google-auth";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck, Lock, Eye, EyeOff, Smartphone } from "lucide-react";
import toast from "react-hot-toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: authLogin } = useAuth();

  const [tab, setTab] = useState<"mobile" | "email">("mobile");
  const [mobile, setMobile] = useState("+91 98765 43210");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mount Google's official sign-in button into container
  useEffect(() => {
    const container = document.getElementById("google-signin-btn-container");
    if (container) {
      renderGoogleButton(container, async (credential) => {
        setLoading(true);
        try {
          const data = (await googleLogin(credential)) as {
            access_token: string;
            user: { id: string; email: string; name: string };
          };
          authLogin(data.access_token, data.user);
          toast.success("Signed in with Google!");
          redirectAfterLogin();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Google login failed";
          setError(msg);
          toast.error(msg);
        } finally {
          setLoading(false);
        }
      });
    }
  }, []);

  // After login, redirect to the originally requested page (or /home)
  function redirectAfterLogin() {
    const redirect = searchParams.get("redirect") || "/home";
    // Prevent open redirects — only allow relative paths
    const safe = redirect.startsWith("/") ? redirect : "/home";
    router.replace(safe);
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!mobile.trim()) {
      setError("Please enter a valid mobile number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = (await requestOTP(mobile.trim())) as { dev_otp?: string };
      sessionStorage.setItem("otp_target", mobile.trim());
      if (res.dev_otp) sessionStorage.setItem("dev_otp", res.dev_otp);
      toast.success("OTP sent to your mobile");
      router.push(`/login/verify?target=${encodeURIComponent(mobile.trim())}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = (await login(email, password)) as {
        access_token: string;
        user: { id: string; email: string; name: string };
      };
      authLogin(data.access_token, data.user);
      toast.success("Welcome back!");
      redirectAfterLogin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
    try {
      // Step 1: Get real Google credential JWT from GIS SDK popup
      const credential = await signInWithGoogle();
      // Step 2: Send JWT to backend for server-side verification
      const data = (await googleLogin(credential)) as {
        access_token: string;
        user: { id: string; email: string; name: string };
      };
      authLogin(data.access_token, data.user);
      toast.success("Signed in with Google!");
      redirectAfterLogin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--bg-canvas)" }}
    >
      {/* Subtle background pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,85,128,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="w-full max-w-[420px] relative z-10">

        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="pdf-icon-circle mb-4"
            style={{ width: 56, height: 56 }}
          >
            <ShieldCheck className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Doc Vault
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            Secure Family Document Manager
          </p>
        </div>

        {/* Card */}
        <div
          className="pdf-card p-7 sm:p-8"
          style={{ borderRadius: 28 }}
        >
          <div className="mb-6">
            <h2 className="text-[22px] font-extrabold text-[var(--text-primary)] tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Sign in to open your vault.
            </p>
          </div>

          {/* Tab Switcher */}
          <div
            className="p-1 rounded-xl flex items-center mb-6"
            style={{ background: "var(--bg-surface)" }}
          >
            <button
              type="button"
              onClick={() => { setTab("mobile"); setError(""); }}
              className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
              style={
                tab === "mobile"
                  ? {
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile OTP
            </button>
            <button
              type="button"
              onClick={() => { setTab("email"); setError(""); }}
              className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
              style={
                tab === "email"
                  ? {
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }
                  : { color: "var(--text-muted)" }
              }
            >
              <Lock className="w-3.5 h-3.5" />
              Email Login
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3.5 text-xs font-semibold rounded-xl flex items-start gap-2.5"
              style={{ background: "var(--badge-red-bg)", color: "var(--badge-red-text)" }}
            >
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Mobile OTP Form */}
          {tab === "mobile" ? (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Mobile number
                </label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="pdf-input"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-pdf-teal !py-3 text-sm !rounded-xl"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Sending OTP…
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pdf-input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pdf-input !pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-pdf-teal !py-3 text-sm !rounded-xl"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-default)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-[var(--text-muted)] font-medium" style={{ background: "var(--bg-card)" }}>
                or continue with
              </span>
            </div>
          </div>

          {/* Google Login */}
          <div className="w-full flex justify-center min-h-[44px]">
            <div id="google-signin-btn-container" className="w-full flex justify-center" />
          </div>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-5 mt-6">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Lock className="w-3 h-3" />
            AES-256 encrypted
          </div>
          <div className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <ShieldCheck className="w-3 h-3" />
            Local-first
          </div>
          <div className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
          <div className="text-xs font-medium text-[var(--text-muted)]">No data selling</div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center text-sm text-[var(--text-muted)]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
