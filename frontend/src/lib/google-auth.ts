/**
 * google-auth.ts
 * Wraps the Google Identity Services (GIS) SDK.
 * The GIS script is loaded globally in layout.tsx.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (
            notification?: (n: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              isDismissedMoment: () => boolean;
              getNotDisplayedReason: () => string;
            }) => void
          ) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "615527746413-41s8oqhgmfrsn3r9q92t1k85vjali909.apps.googleusercontent.com";

/**
 * Initializes the GIS SDK and renders the official Google Sign-In button
 * into the provided DOM element.
 */
export function renderGoogleButton(
  element: HTMLElement,
  onSuccess: (credential: string) => void
) {
  function tryRender() {
    if (typeof window === "undefined" || !window.google?.accounts?.id) return false;

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) {
            onSuccess(response.credential);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      element.innerHTML = "";
      window.google.accounts.id.renderButton(element, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 380,
      });
      return true;
    } catch (err) {
      console.warn("Failed to render Google button:", err);
      return false;
    }
  }

  if (!tryRender()) {
    // Retry once script finishes loading
    const interval = setInterval(() => {
      if (tryRender()) clearInterval(interval);
    }, 200);
    setTimeout(() => clearInterval(interval), 4000);
  }
}

/**
 * Opens Google Sign-In prompt. Strictly requires real Google authentication.
 */
export function signInWithGoogle(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window not available"));
      return;
    }

    // If GIS SDK is not loaded yet
    if (!window.google?.accounts?.id) {
      reject(
        new Error(
          "Google Identity Services SDK is still loading or blocked by your browser. Please refresh and try again."
        )
      );
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      reject(new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured"));
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) {
            resolve(response.credential);
          } else {
            reject(new Error("No credential received from Google account"));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Trigger Google prompt
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason?.() || "unknown";
          reject(
            new Error(
              `Google sign-in prompt was not displayed (${reason}). In Google Cloud Console, ensure 'http://localhost:3000' is added to Authorized JavaScript Origins.`
            )
          );
        } else if (notification.isDismissedMoment()) {
          reject(new Error("Google sign-in was dismissed"));
        } else if (notification.isSkippedMoment()) {
          reject(new Error("Google sign-in was skipped"));
        }
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Google sign-in failed"));
    }
  });
}

