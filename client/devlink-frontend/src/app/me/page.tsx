"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  FiMoreVertical,
  FiTrash,
  FiArchive,
  FiUpload,
  FiMessageCircle,
  FiEye,
  FiEdit,
} from "react-icons/fi";

/* ================= TYPES ================= */

type Post = {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  view_count: number;
  tags: string[];
};

type User = {
  id: string;
  username: string;
  profile_image?: string;
};

/* ================= HELPERS ================= */

const normalizePosts = (data: any[]): Post[] =>
  data.map((p) => ({
    id: p.id || p._id,
    title: p.title || "",
    content: p.content || "",
    image_url: p.image_url,
    view_count: p.view_count || 0,
    tags: p.tags || [],
  }));

/* ================= PAGE ================= */

export default function MyProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [archivePosts, setArchivePosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"posts" | "archive">("posts");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Post>>({});

  /* ================= FETCH ================= */

  useEffect(() => {
    apiFetch("/auth/me")
      .then(setUser)
      .catch(() => router.replace("/login"));

    apiFetch("/posts/me").then((res) =>
      setPosts(normalizePosts(Array.isArray(res) ? res : res.posts || []))
    );

    apiFetch("/posts/archive").then((res) =>
      setArchivePosts(
        normalizePosts(Array.isArray(res) ? res : res.posts || [])
      )
    );
  }, [router]);

  if (!user) return null;

  const list = tab === "posts" ? posts : archivePosts;

  /* ================= STATS ================= */

  const totalViews = [...posts, ...archivePosts].reduce(
    (s, p) => s + p.view_count,
    0
  );
  const devPoints = Math.floor(totalViews / 10 + posts.length * 5);

  /* ================= ACTIONS ================= */

  const savePost = async () => {
    if (!editingId) return;

    await apiFetch(`/updatepost/${editingId}`, {
      method: "PUT",
      body: JSON.stringify(draft),
    });

    setEditingId(null);
    setDraft({});
    location.reload();
  };

  const togglePublish = async (id: string, publish: boolean) => {
    await apiFetch(`/updatepost/${id}`, {
      method: "PUT",
      body: JSON.stringify({ published: publish }),
    });
    location.reload();
  };

  const deletePost = async (id: string) => {
    await apiFetch(`/deletepost/${id}`, { method: "DELETE" });
    location.reload();
  };

  /* ================= UI ================= */

  return (
    <main className="min-h-screen bg-[#101922] text-white px-4 pb-28">

      {/* PROFILE */}
      <div className="flex flex-col items-center mt-6 animate-fade-in">
        <img
          src={
            user.profile_image ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
          }
          className="w-24 h-24 rounded-full border-4 border-primary"
        />
        <h2 className="mt-3 text-xl font-bold">@{user.username}</h2>

        <div className="flex gap-4 mt-4">
          <Stat label="Posts" value={posts.length} />
          <Stat label="Views" value={totalViews} />
          <Stat label="Dev Points" value={devPoints} highlight />
        </div>

        <button
          onClick={() => router.push("/messages")}
          className="mt-4 flex items-center gap-2 text-primary hover:scale-105 transition"
        >
          <FiMessageCircle />
          Open Messages
        </button>
      </div>

      {/* TABS + ANALYTICS */}
      <div className="flex flex-col lg:flex-row gap-6 mt-10">

        {/* LEFT */}
        <div className="flex-1">
          <div className="flex gap-8 border-b border-slate-800">
            {["posts", "archive"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t as any)}
                className={`pb-2 font-semibold capitalize ${
                  tab === t
                    ? "text-primary border-b-2 border-primary"
                    : "text-slate-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* POSTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            {list.map((post) => {
              const isEditing = editingId === post.id;

              return (
                <div
                  key={post.id}
                  className="bg-[#192633] rounded-xl border border-slate-800 relative animate-scale-in"
                >
                  {post.image_url && (
                    <div className="relative aspect-video rounded-t-xl overflow-hidden">
                      <Image
                        src={post.image_url}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg">
                        {post.title || "Untitled"}
                      </h3>

                      <button
                        onClick={() =>
                          setMenuOpen(menuOpen === post.id ? null : post.id)
                        }
                      >
                        <FiMoreVertical />
                      </button>
                    </div>

                    {!isEditing && (
                      <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                        {post.content}
                      </p>
                    )}

                    {/* INLINE EDITOR */}
                    {isEditing && (
                      <div className="mt-3 space-y-3 animate-scale-in">
                        <input
                          className="w-full bg-[#233648] p-2 rounded"
                          defaultValue={post.title}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              title: e.target.value,
                            }))
                          }
                        />
                        <textarea
                          className="w-full bg-[#233648] p-2 rounded h-24"
                          defaultValue={post.content}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              content: e.target.value,
                            }))
                          }
                        />
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-slate-400"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={savePost}
                            className="bg-primary px-4 py-2 rounded"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-3">
                      <FiEye /> {post.view_count}
                    </div>
                  </div>

                  {/* MENU */}
                  {menuOpen === post.id && (
                    <div className="absolute right-3 top-14 bg-[#233648] rounded-lg w-44 z-20 animate-scale-in">
                      {tab === "posts" ? (
                        <>
                          <MenuItem
                            icon={<FiEdit />}
                            label="Edit"
                            onClick={() => {
                              setEditingId(post.id);
                              setMenuOpen(null);
                            }}
                          />
                          <MenuItem
                            icon={<FiArchive />}
                            label="Archive"
                            onClick={() => togglePublish(post.id, false)}
                          />
                        </>
                      ) : (
                        <MenuItem
                          icon={<FiUpload />}
                          label="Publish"
                          onClick={() => togglePublish(post.id, true)}
                        />
                      )}

                      <MenuItem
                        icon={<FiTrash />}
                        label="Delete"
                        danger
                        onClick={() => deletePost(post.id)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ANALYTICS */}
        <div className="w-full lg:w-80 bg-[#192633] rounded-xl border border-slate-800 p-4 h-fit animate-fade-in">
          <h4 className="font-bold mb-3">Profile Analytics</h4>
          <AnalyticsBar label="Views" value={totalViews} />
          <AnalyticsBar label="Posts" value={posts.length} />
          <AnalyticsBar label="Dev Points" value={devPoints} highlight />
        </div>
      </div>
    </main>
  );
}

/* ================= COMPONENTS ================= */

function Stat({ label, value, highlight }: any) {
  return (
    <div
      className={`px-4 py-2 rounded-xl text-center border ${
        highlight
          ? "border-primary bg-primary/10 text-primary"
          : "border-slate-700"
      }`}
    >
      <p className="font-bold">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function MenuItem({ icon, label, danger, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 w-full hover:bg-slate-700 ${
        danger ? "text-red-400" : "text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AnalyticsBar({ label, value, highlight }: any) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className={highlight ? "text-primary" : ""}>{value}</span>
      </div>
      <div className="h-2 rounded bg-slate-700">
        <div
          className={`h-2 rounded ${
            highlight ? "bg-primary" : "bg-slate-400"
          }`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
