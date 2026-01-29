"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  FiMoreVertical,
  FiEdit,
  FiTrash,
  FiArchive,
  FiUpload,
  FiMessageCircle,
} from "react-icons/fi";


type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  image_url?: string;
  tags?: string[];
};

type User = {
  id: string;
  username: string;
  profile_image?: string;
};


export default function MyProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [archivePosts, setArchivePosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"posts" | "archive">("posts");
  const [editingPost, setEditingPost] = useState<Post | null>(null);


  useEffect(() => {
    apiFetch("/auth/me")
      .then(setUser)
      .catch(() => router.replace("/login"));

    apiFetch("/posts/me").then((res) => setPosts(res.posts || []));
    apiFetch("/posts/archive").then((res) =>
      setArchivePosts(res.posts || [])
    );
  }, [router]);

  if (!user) return null;

  const list = tab === "posts" ? posts : archivePosts;


  const updatePost = async () => {
    if (!editingPost) return;

    await apiFetch(`/updatepost/${editingPost.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title: editingPost.title,
        content: editingPost.content,
        tags: editingPost.tags,
      }),
    });

    setEditingPost(null);
    location.reload();
  };

  const deletePost = async (id: string) => {
    await apiFetch(`/deletepost/${id}`, { method: "DELETE" });
    location.reload();
  };

  const publishPost = async (id: string) => {
    await apiFetch(`/updatepost/${id}`, {
      method: "PUT",
      body: JSON.stringify({ published: true }),
    });
    location.reload();
  };

  const archivePost = async (id: string) => {
    await apiFetch(`/updatepost/${id}`, {
      method: "PUT",
      body: JSON.stringify({ published: false }),
    });
    location.reload();
  };


  return (
    <main className="min-h-screen bg-[#101922] text-white px-4 pb-32">

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

        <button
          onClick={() => router.push("/messages")}
          className="mt-3 flex items-center gap-2 text-primary
            hover:scale-105 transition animate-bounce-soft"
        >
          <FiMessageCircle />
          Send Message
        </button>
      </div>

      <div className="flex justify-center gap-6 mt-8 border-b border-slate-800">
        {["posts", "archive"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`pb-2 font-semibold ${
              tab === t
                ? "text-primary border-b-2 border-primary"
                : "text-slate-400"
            }`}
          >
            {t === "posts" ? "Posts" : "Archive"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {list.map((post) => (
          <div
            key={post.id}
            className="bg-[#192633] rounded-xl overflow-hidden border border-slate-800 animate-scale-in"
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

            <div className="p-4">
              <div className="flex justify-between">
                <h3 className="font-bold text-lg">{post.title}</h3>

                <div className="relative group">
                  <FiMoreVertical />

                  <div className="absolute right-0 mt-2 hidden group-hover:block
                    bg-[#233648] rounded-lg text-sm z-10">

                    {tab === "posts" && (
                      <>
                        <MenuItem
                          icon={<FiEdit />}
                          label="Update"
                          onClick={() => setEditingPost(post)}
                        />
                        <MenuItem
                          icon={<FiArchive />}
                          label="Archive"
                          onClick={() => archivePost(post.id)}
                        />
                      </>
                    )}

                    {tab === "archive" && (
                      <MenuItem
                        icon={<FiUpload />}
                        label="Publish"
                        onClick={() => publishPost(post.id)}
                      />
                    )}

                    <MenuItem
                      icon={<FiTrash />}
                      label="Delete"
                      danger
                      onClick={() => deletePost(post.id)}
                    />
                  </div>
                </div>
              </div>

              <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                {post.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* UPDATE MODAL */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-[#192633] p-6 rounded-xl w-full max-w-xl animate-scale-in">

            <h3 className="text-xl font-bold mb-4">Update Post</h3>

            <input
              value={editingPost.title}
              onChange={(e) =>
                setEditingPost({ ...editingPost, title: e.target.value })
              }
              className="w-full mb-3 p-3 rounded bg-[#233648]"
              placeholder="Title"
            />

            <textarea
              value={editingPost.content}
              onChange={(e) =>
                setEditingPost({ ...editingPost, content: e.target.value })
              }
              className="w-full h-32 mb-3 p-3 rounded bg-[#233648]"
              placeholder="Content"
            />

            <input
              value={editingPost.tags?.join(",")}
              onChange={(e) =>
                setEditingPost({
                  ...editingPost,
                  tags: e.target.value.split(","),
                })
              }
              className="w-full mb-4 p-3 rounded bg-[#233648]"
              placeholder="Tags (comma separated)"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingPost(null)}
                className="text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={updatePost}
                className="bg-primary px-4 py-2 rounded font-bold"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 w-full text-left
        hover:bg-slate-700 ${
          danger ? "text-red-400" : "text-white"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
