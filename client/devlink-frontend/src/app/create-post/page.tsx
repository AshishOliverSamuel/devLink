"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function CreatePostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ================= IMAGE UPLOAD ================= */

  const uploadImage = async (file: File) => {
    setUploading(true);

    const form = new FormData();
    form.append("file", file);
    form.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    );

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: form,
      }
    );

    const data = await res.json();
    setCover(data.secure_url);
    setUploading(false);
  };

  /* ================= TAGS ================= */

  const addTag = () => {
    if (!tagInput.trim()) return;
    if (tags.includes(tagInput)) return;

    setTags((prev) => [...prev, tagInput]);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  /* ================= SUBMIT ================= */

  const submitPost = async () => {
    if (!title || !content || !cover) {
      alert("Title, image and content are required");
      return;
    }

    setSubmitting(true);

    try {
      await apiFetch("/createpost", {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          cover_image: cover,
          tags,
        }),
      });

      router.push("/"); // or /profile
    } catch {
      alert("Failed to publish post");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= UI ================= */

  return (
    <main className="min-h-screen bg-background-light dark:bg-background-dark text-white">

      {/* HEADER */}
      <header className="sticky top-0 z-10 flex items-center p-4 border-b border-slate-800 bg-background-dark/80 backdrop-blur">
        <button onClick={() => router.back()} className="text-xl">✕</button>
        <h1 className="flex-1 text-center font-bold text-lg">New Post</h1>
        <span className="w-8" />
      </header>

      {/* BODY */}
      <div className="p-4 max-w-3xl mx-auto space-y-6 pb-32">

        {/* IMAGE */}
        <div className="bg-[#192633] border border-slate-700 rounded-xl p-4">
          <div className="aspect-video rounded-lg bg-slate-800 overflow-hidden mb-3">
            {cover ? (
              <img src={cover} className="w-full h-full object-cover" />
            ) : (
              <label className="w-full h-full flex items-center justify-center cursor-pointer text-slate-400">
                {uploading ? "Uploading..." : "Click to upload cover image"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) =>
                    e.target.files && uploadImage(e.target.files[0])
                  }
                />
              </label>
            )}
          </div>
        </div>

        {/* TITLE */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a catchy title..."
          className="w-full bg-transparent text-3xl font-bold outline-none placeholder:text-slate-600"
        />

        {/* TAGS */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-slate-400">
            Tags
          </p>

          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                {t}
                <button onClick={() => removeTag(t)}>✕</button>
              </span>
            ))}

            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="Add tag"
              className="bg-transparent outline-none text-sm text-white"
            />
          </div>
        </div>

        {/* CONTENT */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your post..."
          className="w-full min-h-[300px] bg-transparent text-lg outline-none resize-none text-slate-200 placeholder:text-slate-600"
        />
      </div>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background-dark/90 backdrop-blur border-t border-slate-800 p-4">
        <div className="max-w-3xl mx-auto">
          <button
            disabled={submitting}
            onClick={submitPost}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition"
          >
            {submitting ? "Publishing..." : "Publish Post"}
          </button>
        </div>
      </footer>
    </main>
  );
}
