const DEFAULT_APP_API_BASE_URL = 'http://127.0.0.1:8787';

export function getAppApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_APP_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }
  // Dev: same-origin `/api` via Vite proxy (works for localhost, LAN IP, and avoids CORS quirks).
  if (import.meta.env.DEV) {
    return '';
  }
  return DEFAULT_APP_API_BASE_URL;
}

export async function postJson<TResponse>(path: string, payload: unknown): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetch(`${getAppApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof TypeError && import.meta.env.DEV) {
      throw new TypeError(
        'Could not reach the API (meal analysis and coach need the Express server). In one terminal run `npm run dev:api` (or `npm run start:local` for the full stack), and keep `npm run dev` running in another.',
      );
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}.`);
  }

  return response.json() as Promise<TResponse>;
}
