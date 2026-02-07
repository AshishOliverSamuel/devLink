"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import AppFooter from "@/components/ui/AppFooter";
import {
  FiBell,
  FiSearch,
  FiCode,
  FiLogOut,
  FiEye,
} from "react-icons/fi";

type Author = {
  id: string;
  username: string;
  profile_image?: string;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  image_url?: string;
  tags?: string[];
  view_count: number;
  author: Author;
};

type User = {
  id: string;
  username: string;
  profile_image?: string;
};

const excerpt = (t: string, l = 90) =>
  t.length > l ? t.slice(0, l) + "…" : t;

const formatViews = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString();

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-[#101922] flex justify-center animate-pulse">
    <div className="w-full max-w-6xl px-2 lg:px-6">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#233648]" />
          <div className="space-y-2">
            <div className="h-3 w-16 bg-[#233648] rounded" />
            <div className="h-2 w-12 bg-[#233648] rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-full bg-[#233648]" />
          <div className="h-10 w-10 rounded-full bg-[#233648]" />
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="h-11 w-full bg-[#233648] rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 rounded-xl bg-[#192633]" />
        ))}
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [searchPosts, setSearchPosts] = useState<Post[]>([]);
  const [searchUsers, setSearchUsers] = useState<User[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadMe = async () => {
      try {
        const data = await apiFetch("/auth/me");
        if (mounted) setUser(data);
      } catch {
        if (mounted) {
          setUser(null);
          router.replace("/login");
        }
      }
    };

    loadMe();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    apiFetch("/posts/trending")
      .then((res) => setPosts(res.posts || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search.trim().length < 2) {
      setShowSearch(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const [pRes, uRes] = await Promise.all([
          apiFetch(`/posts/tags?t=${search}`),
          apiFetch(`/search/users?q=${search}`),
        ]);

        setSearchPosts((pRes.posts || []).slice(0, 2));
        setSearchUsers((uRes.users || []).slice(0, 2));
        setShowSearch(true);
      } catch {
        setShowSearch(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [search]);

  const logout = async () => {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {}

  router.replace("/login");
  router.refresh();
};


  if (!user) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[#101922] flex justify-center">
      <div className="w-full max-w-6xl px-2 lg:px-6 pb-32">
        <div className="sticky top-0 z-50 bg-[#101922]/90 backdrop-blur">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#233648] flex items-center justify-center">
                <FiCode className="text-primary" size={18} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">DevLink</p>
                <p className="text-xs text-[#92adc9] mt-1"> @{user.username} </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-10 w-10 rounded-full hover:bg-slate-800 flex items-center justify-center">
                <FiBell />
              </button>
              <button
                onClick={() => router.push('/me')}
                className="h-10 w-10 rounded-full overflow-hidden border border-slate-700 hover:border-primary transition"
              >
                <img
                  src={
                    user.profile_image ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
                  }
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                onClick={logout}
                className="h-10 w-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-primary"
              >
                <FiLogOut />
              </button>
            </div>
          </div>
          <div className="px-4 pb-4 relative">
            <div className="flex items-center gap-2 bg-[#233648] h-11 rounded-xl px-4">
              <FiSearch className="text-[#92adc9]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts, developers, or tags"
                className="bg-transparent outline-none text-sm w-full text-white placeholder-[#92adc9]"
              />
            </div>
            {showSearch && (
              <div className="absolute top-14 left-4 right-4 bg-[#192633] border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50">
                {searchPosts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/post/${p.slug}`)}
                    className="px-4 py-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800"
                  >
                    <p className="text-sm font-bold truncate">{p.title}</p>
                    <p className="text-xs text-[#92adc9]">
                      {" "}
                      by @{p.author.username}{" "}
                    </p>
                  </div>
                ))}
                {searchUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => router.push(`/users/${u.id}`)}
                    className="px-4 py-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 flex items-center gap-3"
                  >
                    <img
                      src={
                        u.profile_image ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`
                      }
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm font-semibold"> @{u.username} </span>
                  </div>
                ))}
                <button
                  onClick={() => router.push(`/search?q=${search}`)}
                  className="w-full py-3 text-primary text-sm font-bold hover:bg-slate-800"
                >
                  View all results
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-2">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 rounded-xl bg-[#192633] animate-pulse" />
            ))}
          {!loading &&
            posts.map((post) => (
              <div
                key={post.id}
                onClick={() => router.push(`/post/${post.slug}`)}
                className="cursor-pointer rounded-xl bg-[#192633] border border-slate-800 hover:border-primary/40 transition overflow-hidden"
              >
                {post.image_url && (
                  <div className="relative aspect-video">
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <p className="text-lg font-bold">{post.title}</p>
                  <p className="text-sm text-[#92adc9] line-clamp-2">
                    {excerpt(post.content)}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-[#92adc9]">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/users/${post.author.id}`);
                      }}
                      className="flex items-center gap-3 hover:text-primary cursor-pointer"
                    >
                      <img
                        src={
                          post.author.profile_image ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${post.author.username}`
                        }
                        className="w-8 h-8 rounded-full border border-slate-700"
                      />
                      @{post.author.username}
                    </div>
                    <div className="flex items-center gap-1">
                      <FiEye /> {formatViews(post.view_count)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
        <AppFooter />
      </div>
    </main>
  );
}