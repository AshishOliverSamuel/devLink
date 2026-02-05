import { Suspense } from "react";
import VerifyOtpClient from "./VerifyOtpClient";

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading search…</div>}>
      <VerifyOtpClient />
    </Suspense>
  );
}
