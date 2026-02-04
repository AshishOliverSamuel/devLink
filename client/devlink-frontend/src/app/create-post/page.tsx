"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80";

export default function CreatePostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(DEFAULT_IMAGE);
  const [published, setPublished] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 
  const [submitting, setSubmitting] = useState(false);

  const uploadImage = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    );

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      true
    );

    // Track Progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        setImageUrl(response.secure_url);
      } else {
        alert("Upload failed");
      }
      setUploading(false);
      setUploadProgress(0);
    };

    xhr.onerror = () => {
      alert("An error occurred during upload");
      setUploading(false);
    };

    xhr.send(formData);
  };

  const removeImage = () => {
    setImageUrl(null);
  };

  const onTagInput = (value: string) => {
    if (value.endsWith(" ")) {
      const t = value.trim().toLowerCase();
      if (t && !tags.includes(t)) {
        setTags((prev) => [...prev, t]);
      }
      setTagInput("");
    } else {
      setTagInput(value);
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const submitPost = async () => {
    if (!title || !content) {
      alert("Title and content are required");
      return;
    }

    setSubmitting(true);

    try {
      await apiFetch("/createpost", {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          image_url: imageUrl || "",
          tags,
          published,
        }),
      });

      if (published) {
        router.push("/dashboard");
      } else {
        alert("Post saved to archives");
        router.push("/me");
      }
    } catch {
      alert("Failed to save post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background-light dark:bg-background-dark text-white">
      <header className="sticky top-0 z-10 flex items-center p-4 border-b border-slate-800 bg-background-dark/80 backdrop-blur">
        <button onClick={() => router.back()} className="text-xl">
          ✕
        </button>
        <h1 className="flex-1 text-center font-bold text-lg">New Post</h1>
        <span className="w-8" />
      </header>

      <div className="p-4 max-w-3xl mx-auto space-y-6 pb-36">
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-[#192633] border border-slate-700 rounded-xl p-4 overflow-hidden relative"
        >
          {imageUrl ? (
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                className={`w-full h-full object-cover transition-opacity ${
                  uploading ? "opacity-50" : "opacity-100"
                }`}
              />

              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center gap-4">
                <label className="cursor-pointer bg-primary px-4 py-2 rounded-lg">
                  {uploading ? `Uploading ${uploadProgress}%` : "Change"}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) =>
                      e.target.files && uploadImage(e.target.files[0])
                    }
                  />
                </label>

                {!uploading && (
                  <button
                    onClick={removeImage}
                    className="bg-red-500 px-4 py-2 rounded-lg"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* PROGRESS BAR */}
              {uploading && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className="h-full bg-primary shadow-[0_0_10px_#3b82f6]"
                  />
                </div>
              )}
            </div>
          ) : (
            <label className="aspect-video flex flex-col items-center justify-center rounded-lg bg-slate-800 cursor-pointer relative overflow-hidden">
              {uploading ? `Uploading ${uploadProgress}%` : "Add image (optional)"}
              <input
                type="file"
                hidden
                accept="image/*"
                disabled={uploading}
                onChange={(e) =>
                  e.target.files && uploadImage(e.target.files[0])
                }
              />
              {uploading && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className="h-full bg-primary"
                  />
                </div>
              )}
            </label>
          )}
        </motion.div>

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

          <div className="flex flex-wrap gap-2 items-center">
            <AnimatePresence>
              {tags.map((t) => (
                <motion.span
                  key={t}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="text-primary font-medium text-sm flex items-center gap-1"
                >
                  #{t}
                  <button onClick={() => removeTag(t)}>✕</button>
                </motion.span>
              ))}
            </AnimatePresence>

            <input
              value={tagInput}
              onChange={(e) => onTagInput(e.target.value)}
              placeholder="type & press space"
              className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
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

      <footer className="fixed bottom-0 left-0 right-0 bg-background-dark/90 backdrop-blur border-t border-slate-800 p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="accent-primary w-5 h-5"
            />
            <span className="text-sm">
              {published ? "Publish post" : "Save to archives"}
            </span>
          </label>

          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={submitting || uploading}
            onClick={submitPost}
            className="ml-auto bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Confirm"}
          </motion.button>
        </div>
      </footer>
    </main>
  );
}