"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  /* Redirect if email missing */
  useEffect(() => {
    if (!email) {
      router.replace("/register");
    }
  }, [email, router]);

  /* Countdown timer */
  useEffect(() => {
    if (seconds === 0) return;

    const interval = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds]);

  /* Auto-submit when OTP complete */
  useEffect(() => {
    const otpValue = otp.join("");
    if (otpValue.length === 6 && !loading) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  /* Mask email (dev***@gmail.com) */
  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  };

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) return;

    try {
      setLoading(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: otpValue }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Email verified 🎉");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/resend-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("OTP resent successfully");
      setOtp(["", "", "", "", "", ""]);
      setSeconds(60);
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-4">
      <div className="w-full max-w-md pt-10 text-center animate-fade-in">
        <h1 className="text-3xl font-bold">Verify your email</h1>
        <p className="mt-2 text-slate-400 text-sm">
          Enter the 6-digit code sent to
        </p>
        <p className="text-primary font-medium">
          {email ? maskEmail(email) : ""}
        </p>
      </div>

      <div className="w-full max-w-md mt-8 bg-white dark:bg-[#121c26] rounded-2xl p-6 shadow-lg animate-slide-up">
        <div className="flex justify-center gap-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              inputMode="numeric"
              maxLength={1}
              className="h-14 w-11 sm:w-12 text-center text-xl font-bold rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-transparent focus:outline-none focus:border-primary transition-all"
            />
          ))}
        </div>

        {/* Manual verify fallback (accessibility) */}
        <button
          onClick={handleVerify}
          disabled={loading}
          className="mt-6 w-full h-12 bg-primary text-white font-semibold rounded-lg active:scale-[0.98] transition disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>

        {/* Resend */}
        <div className="mt-4 text-center text-sm">
          {seconds > 0 ? (
            <p className="text-slate-400">
              Resend OTP in{" "}
              <span className="font-semibold text-primary">
                {seconds}s
              </span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-primary font-semibold hover:underline"
            >
              {resending ? "Resending..." : "Resend OTP"}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.45s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
