const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const apiFetch = async (
  url: string,
  options: RequestInit = {}
) => {
  const res = await fetch(`${API_URL}${url}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let error: any = { status: res.status };
    try {
      error = await res.json();
    } catch {}
    throw error;
  }

  return res.json();
};
