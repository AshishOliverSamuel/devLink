const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw data; 
  }

  return data;
}
