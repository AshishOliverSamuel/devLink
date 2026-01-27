// src/lib/api.ts

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${path}`,
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    }
  );

  let data: any = null;

  try {
    data = await res.json();
  } catch {
  }

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed (${res.status})`;

    throw new Error(message);
  }

  return data;
}
