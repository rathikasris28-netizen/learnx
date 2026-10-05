
const configuredApiBase =
  import.meta.env.VITE_API_BASE_URL ||
  '/api';

const normalizedApiBase =
  configuredApiBase.replace(/\/+$/, '');

const API_BASE =
  normalizedApiBase.endsWith('/api')
    ? normalizedApiBase
    : `${normalizedApiBase}/api`;

interface ApiOptions
  extends Omit<RequestInit, 'body'> {
  body?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const token =
    localStorage.getItem('learnx_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const body =
    options.body !== undefined &&
    typeof options.body === 'object' &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob)
      ? JSON.stringify(options.body)
      : options.body;

  const normalizedEndpoint =
    endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

  const url =
    `${API_BASE}${normalizedEndpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    body,
  });

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
        `Request failed with status ${response.status}`,
    );
  }

  return data;
}
