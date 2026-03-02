export function isDeveloperSettingsEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_DEVELOPER_SETTINGS === "true";
}

export const developerSettingsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_DEVELOPER_SETTINGS === "true";
