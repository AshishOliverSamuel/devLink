"use client";

import { useEffect, useState } from "react";
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
      .catch(() => setError("Failed to load user"));
  }, [receiverId]);


  const sendRequest = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError("");

      await apiFetch("/chat/request", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: receiverId,
        }),
      });

      router.replace("/chats");
    } catch (err: any) {
      setError(err?.error || "Failed to send message request");
    } finally {
      setLoading(false);
    }
  };

  if (!receiver) {
    return (
      <div className="min-h-screen bg-[#101922] flex items-center justify-center text-[#92adc9]">
        Loading…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#101922] text-white pb-28">
      <div className="max-w-3xl mx-auto px-4">

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

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-[#192633] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
        >
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary shrink-0">
            <Image
              src={
                receiver.profile_image ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${receiver.username}`
              }
              alt={receiver.username}
              fill
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

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <div className="flex justify-between items-center mb-2">
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
        </motion.section>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-6 flex gap-3 bg-primary/10 border border-primary/20 rounded-lg p-4"
        >
          <Info className="text-primary shrink-0" />
          <p className="text-sm text-[#92adc9]">
            Messaging will be enabled once your request is accepted to keep the
            platform spam-free.
          </p>
        </motion.div>

        {error && (
          <p className="mt-4 text-red-400 text-sm">{error}</p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <button
            disabled={loading}
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
