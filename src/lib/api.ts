export function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || "https://integrate.api.nvidia.com/v1";
}

export function getApiKey(): string {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("API_KEY environment variable is not set");
  }
  return key;
}
