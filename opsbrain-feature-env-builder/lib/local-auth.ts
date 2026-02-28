export const RUN_HISTORY_STORAGE_KEY = "bamboo-feature-builder-run-history";
export const THEME_STORAGE_KEY = "theme";
export const LOCAL_ACCESS_QUERY_KEY = ["local-access-session"] as const;

export type LocalAccessSession = {
  authenticated: boolean;
  configured: boolean;
  username: string;
};

type ApiAuthErrorPayload = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};

async function requestJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiAuthErrorPayload
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error?.message
        ? payload.error.message
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function getLocalAccessSession() {
  return requestJson<LocalAccessSession>("/api/auth/session");
}

export async function loginToLocalAccess(input: {
  username: string;
  password: string;
}) {
  return requestJson<LocalAccessSession>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logoutFromLocalAccess() {
  return requestJson<{ ok: true }>("/api/auth/logout", {
    method: "POST",
  });
}

export function clearWorkspaceBrowserState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(RUN_HISTORY_STORAGE_KEY);
  window.localStorage.removeItem(THEME_STORAGE_KEY);
  window.sessionStorage.clear();
}
