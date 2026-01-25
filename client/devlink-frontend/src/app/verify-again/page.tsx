"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { FaEnvelopeOpenText } from "react-icons/fa";

export default function VerifyAgainPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (seconds === 0) return;

    const timer = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    return name.slice(0, 2) + "***@" + domain;
  };

  const handleSendOtp = async () => {
    if (!email || loading || seconds > 0) return;

    try {
      setLoading(true);

      await apiFetch("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      toast.success("OTP sent to your email");
      setSeconds(60); 
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error(err.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Invalid verification link
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-background-dark)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#121c26] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center border border-primary/30">
            <FaEnvelopeOpenText className="text-primary text-xl" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-white">
          Verify your account
        </h1>

        <p className="text-center text-slate-400 mt-2 text-sm leading-relaxed">
          Your account is not verified yet.  
          Click below to send a one-time password to
          <span className="block mt-1 text-primary font-medium">
            {maskEmail(email)}
          </span>
        </p>

        <button
          onClick={handleSendOtp}
          disabled={loading || seconds > 0}
          className="mt-8 w-full h-12 rounded-xl bg-primary text-white font-semibold
                     hover:bg-primary/90 active:scale-[0.98] transition
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading
            ? "Sending OTP…"
            : seconds > 0
            ? `Resend in ${seconds}s`
            : "Send OTP"}
        </button>

        <p className="text-center text-xs text-slate-500 mt-4">
          Didn’t receive the email? Check spam or wait for the timer.
        </p>
      </div>
    </main>
  );
}
