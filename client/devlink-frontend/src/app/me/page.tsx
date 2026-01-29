"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import {
  FiMoreVertical,
  FiEdit2,
  FiArchive,
  FiTrash2,
  FiEye,
  FiMail,
  FiX,
} from "react-icons/fi";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

/* ================= TYPES ================= */

type User = {
  id: string;
  username: string;
  email: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [archive, setArchive] = useState<Post[]>([]);
  const [tab, setTab] = useState<"posts" | "archive" | "analytics">("posts");
  const [editing, setEditing] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/auth/me"),
      apiFetch("/posts/me"),
      apiFetch("/posts/archive"),
    ])
      .then(([me, p, a]) => {
        setUser(me);
        setPosts(Array.isArray(p) ? p : p.posts || []);
        setArchive(Array.isArray(a) ? a : a.posts || []);
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

  const totalViews = posts.reduce((a, b) => a + b.view_count, 0);
  const devPoints = Math.floor(totalViews / 10);

  const refresh = async () => {
    const [p, a] = await Promise.all([
      apiFetch("/posts/me"),
      apiFetch("/posts/archive"),
    ]);
    setPosts(Array.isArray(p) ? p : p.posts || []);
    setArchive(Array.isArray(a) ? a : a.posts || []);
  };

  const updatePost = async (data: Partial<Post>) => {
    if (!editing) return;

    await apiFetch(`/updatepost/${editing.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        image_url: data.image_url,
        published: editing.published,
        tags: [],
      }),
    });

    setEditing(null);
    refresh();
  };

  const archivePost = async (post: Post) => {
    await apiFetch(`/updatepost/${post.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...post, published: false }),
    });
    refresh();
  };

  const publishPost = async (post: Post) => {
    await apiFetch(`/updatepost/${post.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...post, published: true }),
    });
    refresh();
  };

  const deletePost = async (id: string) => {
    await apiFetch(`/deletepost/${id}`, { method: "DELETE" });
    refresh();
  };

  const list = tab === "posts" ? posts : archive;

  return (
    <main className="min-h-screen bg-[#101922] px-3 lg:px-8 pb-24">
      {/* PROFILE */}
      <div className="max-w-6xl mx-auto pt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex gap-4 items-center">
            <img
              src={
                user.profile_image ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`
              }
              className="w-20 h-20 rounded-full border-2 border-primary"
            />
            <div>
              <p className="text-2xl font-bold text-white">@{user.username}</p>
              <div className="flex items-center gap-2 text-[#92adc9] text-sm">
                <FiMail /> {user.email}
              </div>
            </div>
          </div>

          <div className="flex gap-4 lg:ml-auto">
            <Stat label="Posts" value={posts.length} />
            <Stat label="Views" value={totalViews} />
            <Stat label="Dev Points" value={devPoints} />
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-6 mt-8 border-b border-slate-800">
          <Tab label="Posts" active={tab === "posts"} onClick={() => setTab("posts")} />
          <Tab label="Archive" active={tab === "archive"} onClick={() => setTab("archive")} />
          <Tab
            label="Analytics"
            active={tab === "analytics"}
            onClick={() => setTab("analytics")}
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto mt-6">
        {tab !== "analytics" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {list.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onEdit={() => setEditing(post)}
                onArchive={() => archivePost(post)}
                onPublish={() => publishPost(post)}
                onDelete={() => deletePost(post.id)}
              />
            ))}
          </div>
        ) : (
          <AnalyticsSection posts={posts} />
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <EditorModal
            post={editing}
            onClose={() => setEditing(null)}
            onSave={updatePost}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ================= POST CARD ================= */

function PostCard({
  post,
  onEdit,
  onArchive,
  onPublish,
  onDelete,
}: {
  post: Post;
  onEdit: () => void;
  onArchive: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-[#192633] rounded-xl border border-slate-800 relative"
    >
      {post.image_url && (
        <div className="relative aspect-video">
          <Image src={post.image_url} alt="" fill className="object-cover" />
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex justify-between">
          <h3 className="text-white font-bold">{post.title || "Untitled"}</h3>

          <button onClick={() => setOpen(!open)}>
            <FiMoreVertical />
          </button>

          {open && (
            <div className="absolute right-4 top-10 w-40 bg-[#101922]
              border border-slate-800 rounded-xl z-50 shadow-xl">
              {post.published ? (
                <>
                  <MenuItem label="Edit" onClick={onEdit} />
                  <MenuItem label="Archive" onClick={onArchive} />
                </>
              ) : (
                <MenuItem label="Publish" onClick={onPublish} />
              )}
              <MenuItem label="Delete" danger onClick={onDelete} />
            </div>
          )}
        </div>

        <p className="text-sm text-[#92adc9] line-clamp-2">
          {post.content || "No content"}
        </p>

        <div className="flex items-center gap-1 text-xs text-[#92adc9]">
          <FiEye /> {post.view_count}
        </div>
      </div>
    </motion.div>
  );
}

/* ================= ANALYTICS ================= */

function AnalyticsSection({ posts }: { posts: Post[] }) {
  const labels = posts.map((_, i) => `Post ${i + 1}`);
  const views = posts.map((p) => p.view_count);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-[#192633] p-4 rounded-xl">
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Views",
                data: views,
                borderColor: "#137fec",
                backgroundColor: "rgba(19,127,236,0.3)",
              },
            ],
          }}
        />
      </div>

      <div className="bg-[#192633] p-4 rounded-xl">
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Dev Points",
                data: views.map((v) => Math.floor(v / 10)),
                backgroundColor: "#22c55e",
              },
            ],
          }}
        />
      </div>
    </div>
  );
}

/* ================= UI ================= */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#192633] px-4 py-3 rounded-xl text-center">
      <p className="text-xs text-[#92adc9]">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
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
      className={`pb-3 text-sm font-bold ${
        active
          ? "text-primary border-b-2 border-primary"
          : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function MenuItem({
  label,
  danger,
  onClick,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2 text-sm text-left ${
        danger ? "text-red-400" : "text-white"
      } hover:bg-slate-800`}
    >
      {label}
    </button>
  );
}

/* ================= EDITOR ================= */

function EditorModal({
  post,
  onClose,
  onSave,
}: {
  post: Post;
  onClose: () => void;
  onSave: (data: Partial<Post>) => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [image, setImage] = useState(post.image_url || "");

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-[#101922] rounded-xl max-w-lg w-full p-5 space-y-4"
      >
        <div className="flex justify-between">
          <p className="text-white font-bold">Edit Post</p>
          <button onClick={onClose}>
            <FiX />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#192633] px-3 py-2 rounded-lg text-white"
          placeholder="Title"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="w-full bg-[#192633] px-3 py-2 rounded-lg text-white"
          placeholder="Content"
        />

        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="w-full bg-[#192633] px-3 py-2 rounded-lg text-white"
          placeholder="Image URL"
        />

        {image && (
          <button
            onClick={() => setImage("")}
            className="text-red-400 text-sm"
          >
            Remove image
          </button>
        )}

        <button
          onClick={() =>
            onSave({
              title,
              content,
              image_url: image || "",
            })
          }
          className="w-full bg-primary py-2 rounded-lg text-white font-bold"
        >
          Update Post
        </button>
      </motion.div>
    </motion.div>
  );
}
