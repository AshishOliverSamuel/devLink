"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function CreatePostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/auth/me")
      .then(() => setLoading(false))
      .catch(() => router.replace("/login"));
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen w-full p-6 space-y-4 bg-background-light dark:bg-background-dark">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-2 w-20 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 w-full rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
