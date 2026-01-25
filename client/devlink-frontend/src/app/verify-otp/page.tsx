"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";
  const autoResendParam = searchParams.get("autoResend");

  const autoResentRef = useRef(false);

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);

  const inputsRef = useRef<HTMLInputElement[]>([]);

  
  useEffect(() => {
    if (!email) {
      router.replace("/login");
    }
  }, [email, router]);

  
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [seconds]);

  
  useEffect(() => {
    if (!email) return;

    if (autoResendParam === "1" && !autoResentRef.current) {
      autoResentRef.current = true;
      resendOtp(true);
    }
  }, [email, autoResendParam]);

  
  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    return name.slice(0, 2) + "***@" + domain;
  };

  
  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (updated.every((d) => d !== "")) {
      verifyOtp(updated.join(""));
    }
  };

  const handleBackspace = (index: number) => {
    if (otp[index] === "" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  
  const verifyOtp = async (finalOtp: string) => {
    try {
      setLoading(true);

      await apiFetch("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp: finalOtp }),
      });

      toast.success("Account verified!");
      router.replace("/dashboard");
    } catch (err: any) {
      toast.error(err?.error || "Invalid OTP");
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  
  const resendOtp = async (silent = false) => {
    try {
      await apiFetch("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (!silent) {
        toast.success("OTP resent");
      }

      setSeconds(60);
    } catch (err: any) {
      toast.error(err?.error || "Failed to resend OTP");
    }
  };

     
  return (
    <main className="min-h-screen bg-[var(--color-background-dark)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#121c26] rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white">
          Verify your email
        </h1>

        <p className="text-center text-slate-500 dark:text-slate-400 mt-2 text-sm">
          We’ve sent a 6-digit code to{" "}
          <span className="text-primary font-semibold">
            {maskEmail(email)}
          </span>
        </p>

        <div className="flex justify-center gap-3 mt-8">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                if (el) inputsRef.current[i] = el;
              }}
              value={digit}
              maxLength={1}
              inputMode="numeric"
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) =>
                e.key === "Backspace" && handleBackspace(i)
              }
              className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#192633] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          ))}
        </div>

        {loading && (
          <p className="text-center text-sm text-slate-500 mt-4">
            Verifying…
          </p>
        )}

        <div className="text-center mt-6">
          <button
            disabled={seconds > 0}
            onClick={() => resendOtp(false)}
            className="text-primary font-semibold disabled:text-slate-400"
          >
            {seconds > 0
              ? `Resend in ${seconds}s`
              : "Resend code"}
          </button>
        </div>
      </div>
    </main>
  );
}
