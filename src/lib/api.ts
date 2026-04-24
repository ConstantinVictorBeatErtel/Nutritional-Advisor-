const DEFAULT_APP_API_BASE_URL = 'http://127.0.0.1:8787';

function isLocalLoopbackApiUrl(baseUrl: string) {
  try {
    const { hostname } = new URL(baseUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function getAppApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_APP_API_BASE_URL?.trim();

  // Dev: always talk to Express through Vite's `/api` proxy when the configured API is on
  // this machine. That avoids "Failed to fetch" when the app is opened as http://localhost:3000
  // but .env points at http://127.0.0.1:8787 (cross-origin + some browser/extension quirks).
  if (import.meta.env.DEV) {
    if (!configuredBaseUrl || isLocalLoopbackApiUrl(configuredBaseUrl)) {
      return '';
    }
    return configuredBaseUrl.replace(/\/$/, '');
  }

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
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
