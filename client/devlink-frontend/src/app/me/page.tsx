"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import {
  FiEdit2,
  FiTrash2,
  FiArchive,
  FiMoreVertical,
  FiEye,
  FiMessageCircle,
} from "react-icons/fi";

/* ================= TYPES ================= */

type User = {
  id: string;
  username: string;
  profile_image?: string;
};

type Post = {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  slug: string;
  view_count: number;
  published: boolean;
};

/* ================= PAGE ================= */

export default function MyProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [archive, setArchive] = useState<Post[]>([]);
  const [tab, setTab] = useState<"posts" | "archive">("posts");
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */

  useEffect(() => {
    Promise.all([
      apiFetch("/auth/me"),
      apiFetch("/posts/me"),
      apiFetch("/posts/archive"),
    ])
      .then(([me, postsRes, archiveRes]) => {
        setUser(me);

        setPosts(
          Array.isArray(postsRes)
            ? postsRes
            : postsRes?.posts || []
        );

        setArchive(
          Array.isArray(archiveRes)
            ? archiveRes
            : archiveRes?.posts || []
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#101922] flex items-center justify-center text-[#92adc9]">
        Loading profile…
      </div>
    );
  }

  const list = tab === "posts" ? posts : archive;

  return (
    <main className="min-h-screen bg-[#101922] px-3 lg:px-8 pb-24">

      {/* ================= PROFILE HEADER ================= */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto pt-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">

          <div className="flex items-center gap-4">
            <img
              src={
                user.profile_image ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
              }
              className="w-20 h-20 rounded-full border-2 border-primary"
              alt={user.username}
            />

            <div>
              <p className="text-2xl font-bold text-white">
                @{user.username}
              </p>

              <button
                onClick={() => router.push("/messages")}
                className="mt-2 flex items-center gap-2 text-primary text-sm font-semibold"
              >
                <FiMessageCircle />
                Open chat
              </button>
            </div>
          </div>

          <div className="flex gap-4 lg:ml-auto">
            <Stat label="Posts" value={posts.length} />
            <Stat
              label="Views"
              value={posts.reduce((a, b) => a + b.view_count, 0)}
            />
            <Stat
              label="Dev Points"
              value={Math.floor(
                posts.reduce((a, b) => a + b.view_count, 0) / 10
              )}
            />
          </div>
        </div>

        {/* ================= TABS ================= */}
        <div className="flex gap-6 mt-8 border-b border-slate-800">
          <Tab
            active={tab === "posts"}
            onClick={() => setTab("posts")}
            label="Posts"
          />
          <Tab
            active={tab === "archive"}
            onClick={() => setTab("archive")}
            label="Archive"
          />
        </div>
      </motion.div>

      {/* ================= POSTS GRID ================= */}
      <div className="max-w-6xl mx-auto mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {list.length === 0 && (
              <p className="col-span-full text-center text-[#92adc9] py-12">
                No {tab === "posts" ? "posts" : "archived posts"} yet
              </p>
            )}

            {list.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ================= COMPONENTS ================= */

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 text-sm font-bold transition
        ${active
          ? "text-primary border-b-2 border-primary"
          : "text-slate-400 hover:text-white"}
      `}
    >
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#192633] rounded-xl px-4 py-3 text-center min-w-[90px]">
      <p className="text-xs text-[#92adc9]">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.01 }}
      className="bg-[#192633] rounded-xl border border-slate-800 overflow-hidden"
    >
      {post.image_url && (
        <div className="relative aspect-video bg-slate-800">
          {!imgLoaded && (
            <div className="absolute inset-0 animate-pulse bg-slate-700" />
          )}
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            className={`object-cover transition-opacity ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoadingComplete={() => setImgLoaded(true)}
          />
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="text-white font-bold text-lg line-clamp-2">
            {post.title || "Untitled post"}
          </h3>

          <div className="relative">
            <button onClick={() => setMenu(!menu)}>
              <FiMoreVertical />
            </button>

            {menu && (
              <div className="absolute right-0 mt-2 w-36 bg-[#101922] border border-slate-800 rounded-xl shadow-xl z-20">
                <MenuItem icon={<FiEdit2 />} label="Edit" />
                <MenuItem icon={<FiArchive />} label="Archive" />
                <MenuItem
                  icon={<FiTrash2 />}
                  label="Delete"
                  danger
                />
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-[#92adc9] line-clamp-2">
          {post.content || "No content"}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-[#92adc9]">
          <div className="flex items-center gap-1">
            <FiEye />
            {post.view_count}
          </div>

          {post.published && (
            <button
              onClick={() => router.push(`/post/${post.slug}`)}
              className="text-primary font-semibold"
            >
              View
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MenuItem({
  icon,
  label,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      className={`flex items-center gap-2 px-4 py-2 text-sm w-full text-left
        ${danger ? "text-red-400" : "text-white"}
        hover:bg-slate-800`}
    >
      {icon}
      {label}
    </button>
  );
}
