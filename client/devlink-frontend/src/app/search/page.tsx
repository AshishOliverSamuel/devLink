"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import { apiFetch } from "@/lib/api";


type User = {
  id: string;              
  user_id?: string;
  username: string;
  profile_image?: string;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  tags?: string[];
};


export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") || "");
  const [tab, setTab] = useState<"posts" | "users">("posts");

  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= SUGGESTED USERS ================= */

  useEffect(() => {
    if (query.trim().length === 0) {
      apiFetch("/users/suggested?limit=6")
        .then((res) => setSuggestedUsers(res.users || []))
        .catch(console.error);
    }
  }, [query]);

  /* ================= SEARCH ================= */

  useEffect(() => {
    // ⛔ Never call search APIs for empty / short query
    if (!query || query.trim().length < 2) {
      setPosts([]);
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        if (tab === "posts") {
          // ✅ CORRECT PARAM: t
          const res = await apiFetch(
            `/posts/tags?t=${encodeURIComponent(query.trim())}`
          );
          setPosts(res.posts || []);
        } else {
          // ✅ CORRECT PARAM: q
          const res = await apiFetch(
            `/search/users?q=${encodeURIComponent(query.trim())}`
          );
          setUsers(res.users || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, tab]);


  return (
    <main className="min-h-screen bg-[#101922] flex justify-center">
      <div className="w-full max-w-3xl px-4 pb-28">

        <div className="sticky top-0 z-50 bg-[#101922]/90 backdrop-blur pt-4">
          <div className="flex items-center gap-3 bg-[#233648] h-12 rounded-xl px-4">
            <FiSearch className="text-[#92adc9]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, developers, or tags"
              className="bg-transparent outline-none text-sm w-full text-white placeholder-[#92adc9]"
              autoFocus
            />
          </div>

          {/* ===== TABS ===== */}
          <div className="flex mt-4 border-b border-slate-800">
            <Tab label="Posts" active={tab === "posts"} onClick={() => setTab("posts")} />
            <Tab label="Users" active={tab === "users"} onClick={() => setTab("users")} />
          </div>
        </div>

        {/* ===== CONTENT ===== */}
        <div className="mt-4 space-y-4">

          {/* ===== EMPTY QUERY → SUGGESTED USERS ===== */}
          {query.trim().length === 0 && (
            <section>
              <p className="text-xs font-bold uppercase text-[#92adc9] mb-3">
                Suggested Users
              </p>

              <div className="space-y-3">
                {suggestedUsers.map((u) => (
                  <UserCard key={u.id} user={u} />
                ))}
              </div>
            </section>
          )}

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-[#192633] animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading &&
            tab === "posts" &&
            posts.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/post/${p.slug}`)}
                className="cursor-pointer bg-[#192633] rounded-xl p-4 border border-slate-800 hover:border-primary/40 transition"
              >
                <p className="text-white font-bold">{p.title}</p>
                <p className="text-sm text-[#92adc9] line-clamp-2 mt-1">
                  {p.content}
                </p>

                {p.tags && (
                  <div className="flex gap-2 mt-2">
                    {p.tags.map((t) => (
                      <span key={t} className="text-xs font-bold text-primary">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

          {!loading &&
            tab === "users" &&
            users.map((u) => <UserCard key={u.id} user={u} />)}

          {!loading && query.trim().length >= 2 && tab === "posts" && posts.length === 0 && (
            <Empty label="No posts found" />
          )}

          {!loading && query.trim().length >= 2 && tab === "users" && users.length === 0 && (
            <Empty label="No users found" />
          )}
        </div>
      </div>
    </main>
  );
}


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
      className={`flex-1 py-3 text-sm font-bold transition
        ${active ? "text-primary border-b-2 border-primary" : "text-[#92adc9]"}`}
    >
      {label}
    </button>
  );
}

function UserCard({ user }: { user: User }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/users/${user.id}`)} // Mongo _id
      className="cursor-pointer flex items-center gap-4 p-3 rounded-xl bg-[#192633] border border-slate-800 hover:border-primary/40 transition"
    >
      <img
        src={
          user.profile_image ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
        }
        className="w-12 h-12 rounded-full border border-slate-700"
        alt={user.username}
      />

      <div className="flex-1 min-w-0">
        <p className="text-white font-bold truncate">@{user.username}</p>
        <p className="text-xs text-[#92adc9]">Developer</p>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center text-sm text-[#92adc9] py-10">
      {label}
    </div>
  );
}
