"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <AuthProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "toast-custom",
            duration: 3500,
            style: {
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-lg)",
              borderRadius: "12px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
            },
            success: {
              iconTheme: { primary: "#10B981", secondary: "white" },
            },
            error: {
              iconTheme: { primary: "#F43F5E", secondary: "white" },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
