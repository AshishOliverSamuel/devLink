"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  FiBell,
  FiHome,
  FiMessageCircle,
  FiPlus,
  FiCompass,
  FiUser,
  FiEye,
  FiSearch,
  FiCode,
  FiLogOut,
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

/* ================= HELPERS ================= */

const formatViews = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString();

const excerpt = (t: string, l = 90) =>
  t.length > l ? t.slice(0, l) + "…" : t;

/* ================= PAGE ================= */

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/auth/me")
      .then(setUser)
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    apiFetch("/posts/trending")
      .then((res) => setPosts(res.posts || []))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#101922] flex items-center justify-center text-[#92adc9]">
        Loading dashboard…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#101922] flex justify-center">
      <div className="w-full max-w-6xl px-2 lg:px-6 pb-28">

        {/* ================= HEADER ================= */}
        <div className="sticky top-0 z-50 bg-[#101922]/80 backdrop-blur">
          <div className="flex items-center justify-between p-4">

            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#233648] flex items-center justify-center">
                <FiCode className="text-primary" size={18} />
              </div>

              <div className="leading-tight">
                <p className="text-white font-semibold text-sm">DevLink</p>

                <div className="flex items-center gap-2 text-xs text-[#92adc9] mt-3">
                  <img
                    src={
                      user.profile_image ||
                      "https://api.dicebear.com/7.x/initials/svg?seed=ayush_dev"
                    }
                    alt="user"
                    className="w-[18px] h-[18px] rounded-full"
                  />
                  @{user.username}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-slate-800">
                <FiBell />
              </button>
              <button
                onClick={logout}
                className="h-10 w-10 rounded-full flex items-center justify-center text-primary hover:bg-slate-800"
              >
                <FiLogOut />
              </button>
            </div>
          </div>

          {/* SEARCH */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 bg-[#233648] h-11 rounded-xl px-4">
              <FiSearch className="text-[#92adc9]" />
              <input
                placeholder="Search posts, developers, or tags"
                className="bg-transparent outline-none text-sm w-full text-white placeholder-[#92adc9]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-2">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-56 rounded-xl bg-[#192633] animate-pulse"
              />
            ))}

          {!loading &&
            posts.map((post) => (
              <div
                key={post.id}
                onClick={() => router.push(`/post/${post.slug}`)}
                className="cursor-pointer rounded-xl bg-[#192633] border border-slate-800 overflow-hidden hover:border-primary/40 transition"
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
                  {post.tags && (
                    <div className="flex gap-2">
                      {post.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs font-bold text-primary"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-lg font-bold text-white">
                    {post.title}
                  </p>

                  <p className="text-sm text-[#92adc9] line-clamp-2">
                    {excerpt(post.content)}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-[#92adc9]">
                    <div
                      className="flex items-center gap-3 cursor-pointer hover:text-primary transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/users/${post.author.id}`);
                      }}
                    >
                      <img
                        src={
                          post.author.profile_image ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${post.author.username}`
                        }
                        alt={post.author.username}
                        className="w-8 h-8 rounded-full border border-slate-700"
                      />
                      <span className="text-sm font-semibold">
                        @{post.author.username}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <FiEye />
                      {formatViews(post.view_count)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-[#101922]/95 border-t border-slate-800 backdrop-blur px-6 pt-3 pb-8 flex justify-between max-w-6xl mx-auto">
          <Nav icon={<FiHome />} label="Feed" active />
          <Nav icon={<FiMessageCircle />} label="Chat" />

          <button className="-top-6 relative w-14 h-14 rounded-full mt-4 text-white flex items-center justify-center shadow-lg shadow-primary/30 bg-blue-500">
            <FiPlus size={24} />
          </button>

          <Nav icon={<FiCompass />} label="Discover" />
          <Nav  icon={<FiUser />} label="Profile"   onClick={() => router.push("/me")}
 />
        </div>
      </div>
    </main>
  );
}


function Nav({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 font-bold
        text-[10px] lg:text-[12px] hover:text-blue-500
        ${active ? "text-primary" : "text-slate-400"}`}
    >
      <div className="text-base lg:text-lg">{icon}</div>
      {label}
    </button>
  );
}
