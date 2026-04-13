const DEFAULT_APP_API_BASE_URL = 'http://127.0.0.1:8787';

export function getAppApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_APP_API_BASE_URL?.trim();
  return (configuredBaseUrl || DEFAULT_APP_API_BASE_URL).replace(/\/$/, '');
}

export async function postJson<TResponse>(path: string, payload: unknown): Promise<TResponse> {
  const response = await fetch(`${getAppApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}.`);
  }

  return response.json() as Promise<TResponse>;
}
