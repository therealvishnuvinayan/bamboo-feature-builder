import "server-only";

import { timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const LOCAL_ACCESS_COOKIE_NAME = "bamboo_feature_builder_access";
const DEFAULT_LOCAL_ACCESS_USERNAME = "Bamboo";
const COOKIE_VALUE = "granted";

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

type LocalAccessOverride = {
  username?: string;
  password?: string;
};

let cachedEnvFileMtime = 0;
let cachedLocalAccessOverride: LocalAccessOverride | null = null;

function stripWrappingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readLocalAccessOverrideFromEnvFile(): LocalAccessOverride | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const envPath = path.join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    cachedLocalAccessOverride = null;
    cachedEnvFileMtime = 0;
    return null;
  }

  const fileContents = readFileSync(envPath, "utf8");
  const fileMtime = statSync(envPath).mtimeMs;

  if (cachedLocalAccessOverride && cachedEnvFileMtime === fileMtime) {
    return cachedLocalAccessOverride;
  }

  const override: LocalAccessOverride = {};

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(line.slice(separatorIndex + 1));

    if (key === "LOCAL_ACCESS_USERNAME") {
      override.username = value.trim();
    }

    if (key === "LOCAL_ACCESS_PASSWORD") {
      override.password = value;
    }
  }

  cachedLocalAccessOverride = override;
  cachedEnvFileMtime = fileMtime;
  return override;
}

export function getLocalAccessConfig() {
  const localOverride = readLocalAccessOverrideFromEnvFile();
  const username =
    localOverride?.username ||
    process.env.LOCAL_ACCESS_USERNAME?.trim() ||
    DEFAULT_LOCAL_ACCESS_USERNAME;
  const password = localOverride?.password ?? process.env.LOCAL_ACCESS_PASSWORD ?? "";

  return {
    username,
    password,
    configured: Boolean(password),
  };
}

export function getLocalAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export function isLocalAccessCookieValid(cookieValue?: string) {
  return cookieValue === COOKIE_VALUE;
}

export function getLocalAccessCookieValue() {
  return COOKIE_VALUE;
}

export function validateLocalAccessCredentials(input: {
  username: string;
  password: string;
}) {
  const config = getLocalAccessConfig();

  if (!config.configured) {
    return {
      ok: false as const,
      code: "LOCAL_ACCESS_NOT_CONFIGURED",
      message:
        "LOCAL_ACCESS_PASSWORD is missing. Set it in the server environment before signing in.",
    };
  }

  const usernameValid = safeCompare(input.username.trim(), config.username);
  const passwordValid = safeCompare(input.password, config.password);

  if (!usernameValid || !passwordValid) {
    return {
      ok: false as const,
      code: "INVALID_CREDENTIALS",
      message: "Invalid credentials.",
    };
  }

  return {
    ok: true as const,
    username: config.username,
  };
}
