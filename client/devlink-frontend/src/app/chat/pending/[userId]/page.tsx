"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";

type User = {
  id: string;
  username: string;
  bio?: string;
  profile_image?: string;
};

export default function PendingChatPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    apiFetch(`/api/users/${userId}`)
      .then((res) => {
        setUser({
          id: userId,
          username: res.user.name,
          bio: res.user.bio,
          profile_image: res.user.profile_image,
        });
      })
      .catch(() => router.back());
  }, [userId, router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#101922] flex items-center justify-center text-[#92adc9]">
        Loading…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#101922] text-white flex flex-col">
      <header className="sticky top-0 z-40 bg-[#101922]/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-white/10 transition"
          >
            <ArrowLeft />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{user.username}</h2>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
              Pending Connection
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-md mx-auto w-full px-4 pb-32">

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center pt-8 pb-6 border-b border-slate-800"
        >
          <div className="relative mb-4">
            <img
              src={
                user.profile_image ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
              }
              alt={user.username}
              className="w-24 h-24 rounded-full border-2 border-primary object-cover"
            />
          </div>

          <p className="text-xl font-bold">{user.username}</p>
          <p className="text-sm text-[#92adc9] text-center">
            {user.bio || "Developer on DevLink"}
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-[40px_1fr] gap-x-3 mt-8 opacity-70"
        >
          <div className="flex flex-col items-center">
            <div className="bg-primary/20 p-2 rounded-full text-primary">
              <Lock size={18} />
            </div>
            <div className="w-0.5 flex-1 bg-slate-700 mt-1" />
          </div>

          <div className="pb-4">
            <p className="text-sm font-semibold">Message request sent</p>
            <p className="text-xs text-[#92adc9]">Waiting for acceptance</p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col items-center text-center gap-6 mt-12"
        >
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-25" />
            <div className="bg-slate-800 p-5 rounded-full">
              <Lock size={36} className="text-slate-400" />
            </div>
          </div>

          <div className="space-y-2 max-w-[280px]">
            <h3 className="text-lg font-bold">Waiting for acceptance</h3>
            <p className="text-sm text-[#92adc9]">
              Messaging will unlock once the request is accepted.
            </p>
          </div>
        </motion.section>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-[#101922] border-t border-slate-800 p-4 pb-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl opacity-60 cursor-not-allowed">
            <Lock className="text-slate-400" />
            <span className="text-sm text-slate-400">
              Messaging is locked
            </span>
          </div>

          <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            Secure Developer Network
          </p>
        </div>
      </footer>
    </main>
  );
}
