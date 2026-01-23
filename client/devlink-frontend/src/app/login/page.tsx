"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { FaBlog } from "react-icons/fa";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      console.log(err)
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-background-dark)]">

      
      <div className="w-full max-w-md bg-white dark:bg-[#121c26] rounded-2xl p-6 sm:p-8 shadow-lg">

<div className="flex justify-center mb-4">
  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
    Dev<span className="text-primary">Link</span>
  </h2>
</div>

        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/15 rounded-xl flex items-center justify-center border border-primary/30">
            <span className="material-symbols-outlined text-primary text-3xl sm:text-4xl">
<FaBlog size={28} className="text-slate-500 dark:text-slate-300 sm:text-4xl" />

            </span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
            Log in to your developer hub
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@devlink.com"
              className="w-full h-12 sm:h-13 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#192633] px-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <button
                type="button"
                className="text-primary text-sm font-semibold hover:underline"
              >
                Forgot?
              </button>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 sm:h-13 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#192633] px-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 sm:h-13 bg-blue-600 text-white font-semibold rounded-lg shadow-md shadow-primary/20 hover:opacity-95 active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-slate-300 dark:border-slate-700" />
          <span className="px-3 text-xs uppercase tracking-wide text-slate-400">
            or
          </span>
          <div className="flex-grow border-t border-slate-300 dark:border-slate-700" />
        </div>

        

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Don&apos;t have an account?{" "}
          <span className="text-primary font-semibold hover:underline cursor-pointer">
            Sign up
          </span>
        </p>
      </div>
    </main>
  );
}
