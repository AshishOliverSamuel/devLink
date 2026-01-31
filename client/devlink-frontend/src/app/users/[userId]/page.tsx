"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { FiMessageCircle, FiClock } from "react-icons/fi";
import { motion } from "framer-motion";
import AppFooter from "@/components/ui/AppFooter";

type User = {
  name: string;
  bio?: string;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  image_url?: string;
  created_at: string;
};

type Stats = {
  total_posts: number;
  total_views: number;
};

type ChatStatus =
  | { status: "none" }
  | { status: "pending"; type: "sent" | "received" }
  | { status: "accepted"; room_id: string };

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string | undefined;
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_posts: 0,
    total_views: 0,
  });
  const [chatStatus, setChatStatus] = useState<ChatStatus | null>(null);

  useEffect(() => {
    if (!userId) return;

    Promise.all([
      apiFetch(`/users/${userId}`),
      apiFetch(`/users/${userId}/stats`),
      apiFetch(`/chat/request/status/${userId}`),
    ]).then(([profile, stats, status]) => {
      setUser(profile.user);
      setPosts(profile.posts || []);
      setStats(stats);
      setChatStatus(status);
    });
  }, [userId]);

  if (!user || !chatStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101922] text-[#92adc9]">
        Loading profile…
      </div>
    );
  }

  const renderChatCTA = () => {
    if (chatStatus.status === "accepted") {
      return (
        <button
          onClick={() => router.push(`/chats/${chatStatus.room_id}`)}
          className="flex items-center gap-2 text-sm font-semibold text-green-400 hover:text-green-300 transition"
        >
          <FiMessageCircle />
          Message
        </button>
      );
    }

    if (chatStatus.status === "pending") {
      return (
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 cursor-not-allowed">
          <FiClock />
          Request pending
        </div>
      );
    }

    return (
      <button
        onClick={() => router.push(`/chat/request/${userId}`)}
        className="flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition"
      >
        <FiMessageCircle />
        Send request
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-[#101922] px-3 py-6 flex justify-center">
      <div className="w-full max-w-6xl">

        <div className="flex items-center mb-6">
          <button onClick={() => router.back()} className="mr-4 text-white">
            ←
          </button>
          <h1 className="text-lg font-bold text-white">Dev Profile</h1>
        </div>

        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div
            className="w-32 h-32 rounded-full border-4 border-blue-500 bg-cover bg-center"
            style={{
              backgroundImage: `url(https://api.dicebear.com/7.x/initials/svg?seed=${user.name})`,
            }}
          />

          <p className="text-2xl font-bold text-white">@{user.name}</p>

          {renderChatCTA()}

          {user.bio && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 max-w-xl w-full rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3"
            >
              <p className="text-sm text-[#92adc9]">{user.bio}</p>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Stat label="Posts" value={stats.total_posts} />
          <Stat label="Views" value={stats.total_views} />
        </div>

        <h2 className="text-sm font-bold text-white mb-4">Posts</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              whileHover={{ y: -4 }}
              className="cursor-pointer rounded-xl bg-[#192633] border border-slate-800 p-4"
              onClick={() => router.push(`/post/${post.slug}`)}
            >
              <h3 className="text-lg font-bold text-white mb-1">
                {post.title}
              </h3>
              <p className="text-sm text-[#92adc9] line-clamp-2">
                {post.content}
              </p>
            </motion.div>
          ))}

          {posts.length === 0 && (
            <p className="col-span-full text-center text-[#92adc9]">
              No posts yet
            </p>
          )}
        </div>

        <div className="h-12" />
      </div>

      <AppFooter />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl bg-[#192633] border border-slate-800">
      <p className="text-xs uppercase tracking-wider text-[#92adc9]">
        {label}
      </p>
      <p className="text-2xl font-bold text-white mt-1">
        {value}
      </p>
    </div>
  );
}
