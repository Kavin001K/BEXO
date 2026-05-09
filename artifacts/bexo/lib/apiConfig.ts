/**
 * Base URL for the BEXO API server.
 * In dev: built from EXPO_PUBLIC_DOMAIN (set by the Expo dev script).
 * In prod: set EXPO_PUBLIC_API_BASE_URL to your deployed API URL.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api-server`
    : "http://localhost:8080");

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}/api${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}
