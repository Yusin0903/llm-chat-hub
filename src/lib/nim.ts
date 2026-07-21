export const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

export function getNimApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error("NVIDIA_API_KEY environment variable is not set");
  }
  return key;
}
