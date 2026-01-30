"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Filter } from "lucide-react";
import { apiFetch } from "@/lib/api";

type User = {
  id: string;
  username: string;
  profile_image?: string;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  tags: string[];
  image_url?: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    profile_image?: string;
  };
};

export default function SearchPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"posts" | "users">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [suggested, setSuggested] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= Suggested Users ================= */

  useEffect(() => {
    if (!query) {
      apiFetch("/users/suggested?limit=6")
        .then((res) => setSuggested(res.users || []));
    }
  }, [query]);

  /* ================= Search ================= */

  useEffect(() => {
    if (query.trim().length < 2) {
      setPosts([]);
      setUsers([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        if (tab === "posts") {
          const res = await apiFetch(`/posts/tags?t=${query}`);
          setPosts(res.posts || []);
        } else {
          const res = await apiFetch(`/search/users?q=${query}`);
          setUsers(res.users || []);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, tab]);

  return (
    <main className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-5xl mx-auto px-4 pb-24">

        {/* ================= HEADER ================= */}
        <header className="sticky top-0 z-40 bg-[#0f172a]/90 backdrop-blur">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-white/10 transition"
            >
              <ArrowLeft />
            </button>

            <h1 className="text-xl font-bold flex-1">Search</h1>

            <Filter className="text-blue-400" />
          </div>

          {/* Search Bar */}
          <div className="flex items-center bg-[#1e293b] rounded-xl h-12 px-4">
            <Search className="text-slate-400" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, users or tags"
              className="bg-transparent outline-none w-full ml-3 text-sm placeholder-slate-400"
            />
          </div>

          {/* Tabs */}
          <div className="flex mt-4 border-b border-slate-700">
            <Tab active={tab === "posts"} onClick={() => setTab("posts")}>
              Posts
            </Tab>
            <Tab active={tab === "users"} onClick={() => setTab("users")}>
              Users
            </Tab>
          </div>
        </header>

        {/* ================= CONTENT ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

          {/* ===== MAIN RESULTS ===== */}
          <section className="lg:col-span-2 space-y-4">

            {/* Posts */}
            {tab === "posts" && (
              <AnimatePresence>
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => router.push(`/post/${post.slug}`)}
                    className="flex gap-4 p-4 bg-[#111827] rounded-xl border border-slate-800 hover:border-blue-500/40 cursor-pointer transition"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-28 h-20 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                      {post.image_url ? (
                        <Image
                          src={post.image_url}
                          alt={post.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <p className="font-bold leading-snug">
                        {post.title}
                      </p>

                      <div className="flex gap-2 mt-2 flex-wrap">
                        {post.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 uppercase"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div
                        className="flex items-center gap-2 mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/users/${post.author.id}`);
                        }}
                      >
                        <Avatar src={post.author.profile_image} />
                        <span className="text-xs text-slate-400">
                          @{post.author.username}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {/* Users */}
            {tab === "users" && users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                onClick={() => router.push(`/users/${u.id}`)}
              />
            ))}
          </section>

          {/* ===== SUGGESTED USERS (DESKTOP SIDEBAR) ===== */}
          <aside className="hidden lg:block">
            {!query && (
              <div className="bg-[#111827] rounded-xl border border-slate-800 p-4">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
                  Suggested Users
                </p>

                <div className="space-y-3">
                  {suggested.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      compact
                      onClick={() => router.push(`/users/${u.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ================= COMPONENTS ================= */

function Tab({
  children,
  active,
  onClick,
}: {
  children: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-bold transition ${
        active
          ? "border-b-2 border-blue-500 text-blue-500"
          : "text-slate-400"
      }`}
    >
      {children}
    </button>
  );
}

function Avatar({ src }: { src?: string }) {
  return (
    <div
      className="w-7 h-7 rounded-full bg-cover bg-center border border-slate-700"
      style={{
        backgroundImage: `url(${
          src || "https://api.dicebear.com/7.x/initials/svg?seed=user"
        })`,
      }}
    />
  );
}

function UserRow({
  user,
  onClick,
  compact,
}: {
  user: User;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl bg-[#111827] border border-slate-800 hover:border-blue-500/40 cursor-pointer ${
        compact ? "" : "mt-3"
      }`}
    >
      <Avatar src={user.profile_image} />
      <div className="min-w-0">
        <p className="font-bold text-sm truncate">@{user.username}</p>
        <p className="text-xs text-slate-400 truncate">Developer</p>
      </div>
    </motion.div>
  );
}
