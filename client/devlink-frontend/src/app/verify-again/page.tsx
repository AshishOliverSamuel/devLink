import { Suspense } from "react";
import VerifyAgainClient from "./VerifyAgainClient";

export default function VerifyAgainPage() {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading search…</div>}>
      <VerifyAgainClient />
    </Suspense>
  );
}
