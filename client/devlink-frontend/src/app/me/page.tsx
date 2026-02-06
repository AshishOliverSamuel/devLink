"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  FiMoreVertical,
  FiEdit2,
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
import AppFooter from "@/components/ui/AppFooter";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

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

export default function MyProfilePage() {
  const router = useRouter();
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
    return <ProfileSkeleton />;
  }

  const totalViews = posts.reduce((a, b) => a + b.view_count, 0);
  const devPoints = Math.floor(totalViews / 10);
  const list = tab === "posts" ? posts : archive;

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

  return (
    <main className="min-h-screen bg-[#101922] px-3 lg:px-8 pb-24">
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

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/update-profile")}
                className="mt-4 inline-flex items-center gap-2
                  bg-[#137fec] hover:bg-[#0f6ad4]
                  text-white text-sm font-semibold
                  px-3 py-1.5 rounded-lg"
              >
                <FiEdit2 size={14} />
                Update Profile
              </motion.button>
            </div>
          </div>

          <div className="flex gap-4 lg:ml-auto">
            <Stat label="Posts" value={posts.length} />
            <Stat label="Views" value={totalViews} />
            <Stat label="Dev Points" value={devPoints} />
          </div>
        </div>

        <div className="flex gap-6 mt-8 border-b border-slate-800">
          <Tab label="Posts" active={tab === "posts"} onClick={() => setTab("posts")} />
          <Tab label="Archive" active={tab === "archive"} onClick={() => setTab("archive")} />
          <Tab label="Analytics" active={tab === "analytics"} onClick={() => setTab("analytics")} />
        </div>
      </div>

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

/* -------------------- SKELETON -------------------- */

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#101922] px-3 lg:px-8 pb-24 animate-pulse">
      <div className="max-w-6xl mx-auto pt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 rounded-full bg-slate-700" />
            <div className="space-y-3">
              <div className="h-6 w-40 bg-slate-700 rounded" />
              <div className="h-4 w-52 bg-slate-700 rounded" />
              <div className="h-8 w-32 bg-slate-700 rounded" />
            </div>
          </div>

          <div className="flex gap-4 lg:ml-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-24 h-16 bg-slate-700 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="flex gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 bg-slate-700 rounded" />
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 bg-slate-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* -------------------- REMAINING COMPONENTS -------------------- */

function PostCard({ post, onEdit, onArchive, onPublish, onDelete }: any) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div className="bg-[#192633] rounded-xl border border-slate-800 relative">
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#192633] px-4 py-3 rounded-xl text-center">
      <p className="text-xs text-[#92adc9]">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function Tab({ label, active, onClick }: any) {
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

function EditorModal({ post, onClose, onSave }: any) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [image, setImage] = useState(post.image_url || "");

  return (
    <motion.div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-3">
      <motion.div className="bg-[#101922] rounded-xl max-w-lg w-full p-5 space-y-4">
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
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="w-full bg-[#192633] px-3 py-2 rounded-lg text-white"
        />

        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="w-full bg-[#192633] px-3 py-2 rounded-lg text-white"
        />

        <button
          onClick={() => onSave({ title, content, image_url: image })}
          className="w-full bg-primary py-2 rounded-lg text-white font-bold"
        >
          Update Post
        </button>
      </motion.div>


    </motion.div>
  );
}
