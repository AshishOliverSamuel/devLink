"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { FaBlog } from "react-icons/fa";
import Link from "next/link";

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
      console.log(err);
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 bg-[var(--color-background-dark)] flex flex-col items-center">
      {/* Login Card */}
      <div className="w-full max-w-md py-16">
        <div className="bg-white dark:bg-[#121c26] rounded-2xl p-6 sm:p-8 shadow-lg">
          <div className="flex justify-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dev<span className="text-primary">Link</span>
            </h2>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/15 rounded-xl flex items-center justify-center border border-primary/30">
              <FaBlog
                size={28}
                className="text-slate-500 dark:text-slate-300 sm:text-4xl"
              />
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
                className="w-full h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#192633] px-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                className="w-full h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#192633] px-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 text-white font-semibold rounded-lg shadow-md shadow-primary/20 hover:opacity-95 active:scale-[0.98] transition disabled:opacity-60"
            >
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-semibold hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <div className="w-full max-w-md pb-10">
        <div className="h-20 rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-indigo-600/50 backdrop-blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="animate-code-scroll text-white/30 font-mono text-[10px] sm:text-xs whitespace-nowrap px-4">
              console.log("Welcome to DevLink"); function auth() &#123; return
              success;&#125;
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes code-scroll {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateX(-100%);
            opacity: 0;
          }
        }

        .animate-code-scroll {
          animation: code-scroll 14s linear infinite;
          text-shadow: 0 0 12px rgba(99, 102, 241, 0.45);
        }
      `}</style>
    </main>
  );
}
