"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Info } from "lucide-react";
import { apiFetch } from "@/lib/api";

type User = {
  id: string;
  username: string;
  bio?: string;
  profile_image?: string;
};

export default function SendMessageRequestPage() {
  const router = useRouter();
  const params = useParams();
  const receiverId = params.userId as string;

  const [receiver, setReceiver] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔒 page guard
  const [checkingStatus, setCheckingStatus] = useState(true);
  const checkedOnce = useRef(false);

  /* ================= LOAD RECEIVER ================= */
  useEffect(() => {
    apiFetch(`/users/${receiverId}`)
      .then((res) => {
        setReceiver({
          id: receiverId,
          username: res.user.name,
          bio: res.user.bio,
          profile_image: res.user.profile_image,
        });
      })
      .catch(() => {
        setError("Failed to load user");
      });
  }, [receiverId]);

  /* ================= ENFORCE CHAT STATE ================= */
  useEffect(() => {
    if (!receiver || checkedOnce.current) return;
    checkedOnce.current = true;

    apiFetch(`/chat/request/status/${receiverId}`)
      .then((res) => {
        // 🚫 pending → must not stay here
        if (res.status === "pending") {
          router.replace(`/chat/pending/${receiverId}`);
          return;
        }

        // ✅ accepted → go to chat
        if (res.status === "accepted") {
          router.replace(`/chat/${res.room_id}`);
          return;
        }

        // status === "none" → allow send request page
      })
      .catch(() => {
        // fail-open (do not block UI)
      })
      .finally(() => {
        setCheckingStatus(false);
      });
  }, [receiver, receiverId, router]);

  /* ================= SEND REQUEST ================= */
  const sendRequest = async () => {
    if (loading || message.trim().length === 0) return;

    try {
      setLoading(true);
      setError("");

      await apiFetch("/chat/request", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: receiverId,
          msg: message.trim(),
        }),
      });

      router.replace(`/chat/pending/${receiverId}`);
    } catch (err: any) {
      setError(err?.error || "Failed to send message request");
    } finally {
      setLoading(false);
    }
  };

  /* ================= BLOCK UI UNTIL STATE IS KNOWN ================= */
  if (!receiver || checkingStatus) {
    return (
      <div className="min-h-screen bg-[#101922] flex items-center justify-center text-[#92adc9]">
        Checking chat status…
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <main className="min-h-screen bg-[#101922] text-white pb-28">
      <div className="max-w-3xl mx-auto px-4">

        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-[#101922]/90 backdrop-blur border-b border-slate-800">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-white/10 transition"
            >
              <ArrowLeft />
            </button>

            <h1 className="text-lg font-bold">Message Request</h1>

            <button
              onClick={() => router.back()}
              className="text-primary font-semibold"
            >
              Cancel
            </button>
          </div>
        </header>

        {/* RECEIVER CARD */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-[#192633] border border-slate-800 rounded-xl p-4 flex gap-4 items-center"
        >
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary shrink-0">
            <img
              src={
                receiver.profile_image ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${receiver.username}`
              }
              alt={receiver.username}
              className="object-cover"
            />
          </div>

          <div className="flex-1">
            <p className="text-lg font-bold">@{receiver.username}</p>
            <p className="text-sm text-[#92adc9]">
              {receiver.bio || "Developer on DevLink"}
            </p>
          </div>
        </motion.section>

        {/* MESSAGE INPUT */}
        <section className="mt-6">
          <div className="flex justify-between mb-2">
            <p className="font-medium">Personal Message</p>
            <p className="text-xs text-[#92adc9]">
              {message.length} / 250
            </p>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 250))}
            placeholder={`Hi ${receiver.username}, I’d love to connect with you…`}
            className="w-full min-h-[160px] rounded-lg bg-[#192633] border border-slate-700 p-4 outline-none focus:ring-2 focus:ring-primary transition"
          />
        </section>

        {/* INFO */}
        <div className="mt-6 flex gap-3 bg-primary/10 border border-primary/20 rounded-lg p-4">
          <Info className="text-primary shrink-0" />
          <p className="text-sm text-[#92adc9]">
            Messaging unlocks once the request is accepted to keep DevLink spam-free.
          </p>
        </div>

        {error && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <button
            disabled={loading || message.trim().length === 0}
            onClick={sendRequest}
            className="w-full h-14 rounded-lg bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send Message Request"}
            <Send size={18} />
          </button>
        </motion.div>
      </div>
    </main>
  );
}
