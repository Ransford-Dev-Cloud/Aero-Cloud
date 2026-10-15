export function getAuthToken(): string | null {
  return localStorage.getItem('aerovault_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('aerovault_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('aerovault_token');
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}
