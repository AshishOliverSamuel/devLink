"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { FiMessageCircle } from "react-icons/fi";
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


const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const readTime = (t: string) =>
  `${Math.max(1, Math.ceil(t.split(" ").length / 200))} min read`;


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

  useEffect(() => {
    if (!userId) return;

    Promise.all([
      apiFetch(`/users/${userId}`),
      apiFetch(`/users/${userId}/stats`),
    ]).then(([profile, stats]) => {
      setUser(profile.user);
      setPosts(profile.posts || []);
      setStats(stats);
    });
  }, [userId]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101922] text-[#92adc9]">
        Loading profile…
      </div>
    );
  }

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

          <button
            onClick={() => router.push(`/chat/request/${userId}`)}
            className="flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition"
          >
            <FiMessageCircle />
            Send request
          </button>

          {user.bio && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mt-3 max-w-xl w-full rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 shadow-sm shadow-blue-500/10"
            >
              <p className="text-sm leading-relaxed text-[#92adc9]">
                {user.bio}
              </p>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Stat label="Posts" value={stats.total_posts} />
          <Stat label="Views" value={stats.total_views} />
        </div>

        <h2 className="text-sm font-bold text-white mb-4">Posts</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="cursor-pointer rounded-xl overflow-hidden bg-[#192633] border border-slate-800 hover:border-blue-500/40 transition"
              onClick={() => router.push(`/post/${post.slug}`)}
            >
              {post.image_url && (
                <div className="relative h-44">
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-1">
                  {post.title}
                </h3>

                <p className="text-sm text-[#92adc9] line-clamp-2">
                  {post.content}
                </p>

                <div className="flex gap-2 text-xs text-slate-400 mt-3">
                  <span>{formatDate(post.created_at)}</span>
                  <span>•</span>
                  <span>{readTime(post.content)}</span>
                </div>
              </div>
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
