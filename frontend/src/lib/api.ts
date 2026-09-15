export const BASE_URL = "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// ── 401 De-bounce ──────────────────────────────────────────────────────────
// Multiple parallel requests can all return 401 simultaneously.
// This flag ensures only the first one triggers logout + redirect.
let _redirectingOn401 = false;

function handle401Redirect() {
  if (_redirectingOn401) return;
  _redirectingOn401 = true;
  // Small delay so in-flight successful responses (e.g., after Google re-auth)
  // don't get cancelled by the redirect.
  setTimeout(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    document.cookie = "dv_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict";
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    // Reset after redirect so future 401s work
    setTimeout(() => { _redirectingOn401 = false; }, 3000);
  }, 300);
}

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type for JSON — let FormData set its own boundary
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
      handle401Redirect();
    }
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// --- Auth ---
export async function signup(email: string, password: string, name = "Akshat") {
  return apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login(email: string, password: string) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function requestOTP(mobile: string) {
  return apiFetch<{ message: string; dev_otp?: string }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ mobile }),
  });
}

export async function verifyOTP(target: string, otp: string) {
  return apiFetch("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ target, otp }),
  });
}

export async function googleLogin(credential: string) {
  return apiFetch("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}


// --- Documents & Vault ---
export async function uploadDocument(formData: FormData) {
  return apiFetch("/upload", {
    method: "POST",
    body: formData,
  });
}

export async function analyzeDocument(formData: FormData) {
  return apiFetch("/upload/analyze", {
    method: "POST",
    body: formData,
  });
}

export async function getVault(memberId?: string) {
  const query = memberId ? `?member_id=${memberId}` : "";
  return apiFetch(`/vault${query}`);
}

export async function getDocument(id: string) {
  return apiFetch(`/vault/${id}`);
}

export async function updateDocument(id: string, update: { category?: string; expiry_date?: string | null; member_id?: string; remind_me?: boolean }) {
  return apiFetch(`/vault/${id}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export async function deleteDocument(id: string) {
  return apiFetch(`/vault/${id}`, { method: "DELETE" });
}

export function getDocumentDownloadUrl(id: string): string {
  const token = getToken();
  return token ? `${BASE_URL}/vault/${id}/file?token=${token}` : `${BASE_URL}/vault/${id}/file`;
}

// --- Quick Cards ---
export async function getCards() {
  return apiFetch("/cards");
}

export async function createCard(formData: FormData) {
  return apiFetch("/cards", {
    method: "POST",
    body: formData,
  });
}

export async function scanCardText(formData: FormData) {
  return apiFetch<{ text: string; char_count: number }>("/cards/scan-text", {
    method: "POST",
    body: formData,
  });
}

export async function promoteCard(cardId: string) {
  return apiFetch(`/cards/${cardId}/promote`, {
    method: "POST",
  });
}

export async function deleteCard(cardId: string) {
  return apiFetch(`/cards/${cardId}`, {
    method: "DELETE",
  });
}

export async function cardPrompt(prompt: string) {
  return apiFetch("/cards/prompt", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function confirmUpdateProposal(docId: string, field: string, newValue: string) {
  return apiFetch(`/vault/${docId}`, {
    method: "PATCH",
    body: JSON.stringify({ [field]: newValue }),
  });
}


// --- Search / Intent Prompt ---
export async function searchPrompt(query: string) {
  return apiFetch("/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

// --- Reminders ---
export async function getReminders() {
  return apiFetch("/reminders");
}

export async function toggleReminder(docId: string) {
  return apiFetch(`/reminders/${docId}/toggle`, {
    method: "PATCH",
  });
}

// --- Family Vault ---
export async function getFamilyMembers() {
  return apiFetch("/family");
}

export async function addFamilyMember(name: string, relation: string) {
  return apiFetch("/family", {
    method: "POST",
    body: JSON.stringify({ name, relation }),
  });
}

// --- Sharing Center ---
export async function getShareLinks() {
  return apiFetch("/sharing");
}

export async function createShareLink(documentId: string, expiryDays = 7) {
  return apiFetch("/sharing", {
    method: "POST",
    body: JSON.stringify({ document_id: documentId, expiry_days: expiryDays }),
  });
}

export async function revokeShareLink(linkId: string) {
  return apiFetch(`/sharing/${linkId}/revoke`, {
    method: "PATCH",
  });
}

export async function getPublicShareDoc(token: string) {
  return apiFetch(`/public/share/${token}`);
}

// --- Settings ---
export async function getUserSettings() {
  return apiFetch("/settings");
}

export async function updateUserSettings(settings: { storage_mode: string; ocr_mode: string; language: string }) {
  return apiFetch("/settings", {
    method: "POST",
    body: JSON.stringify(settings),
  });
}

export function getExportArchiveUrl(): string {
  const token = getToken();
  return `${BASE_URL}/settings/export?token=${token}`;
}
