"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Post = {
  id: string;
  title: string;
  slug?: string;
  content: string;
  tags?: string[];
  image_url?: string;
  view_count: number;
  created_at: string;
};

const getExcerpt = (content: string, len = 140) =>
  content.length > len ? content.slice(0, len) + "..." : content;

const getReadTime = (content: string) =>
  `${Math.max(1, Math.ceil(content.split(" ").length / 200))} min read`;

function PostSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-[#192633] border border-white/10 animate-pulse">
      <div className="aspect-video bg-white/10" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-24 bg-white/10 rounded" />
        <div className="h-4 w-3/4 bg-white/10 rounded" />
        <div className="h-3 w-full bg-white/10 rounded" />
        <div className="h-3 w-2/3 bg-white/10 rounded" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHome();
  }, []);

  const fetchHome = async () => {
    try {
      const res = await apiFetch("/home");
console.log("HOME POSTS:", res.posts);

      setPosts(res.posts || []);
    } catch (err) {
      console.error("HOME API ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const isSinglePost = posts.length === 1;

  return (
    <main className="min-h-screen bg-[var(--color-background-dark)] text-white">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 backdrop-blur bg-black/60 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 text-xl font-bold">
            <span className="text-primary">⌘</span> DevLink
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-white/10 transition"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/register")}
              className="px-4 py-2 text-sm font-bold rounded-lg bg-primary hover:opacity-90 transition"
            >
              Register
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 lg:grid-cols-2 gap-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-6"
        >
          <div
            className="h-60 sm:h-72 rounded-2xl bg-cover bg-center shadow-2xl"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1555066931-4365d14bab8c)",
            }}
          />

          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Where Developers{" "}
            <span className="text-primary">Connect</span> & Create
          </h1>

          <p className="text-slate-400 text-lg max-w-xl">
            A modern blogging and real-time chat platform built for developers.
          </p>

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => router.push("/register")}
              className="px-8 py-4 rounded-xl bg-primary font-bold text-lg shadow-lg shadow-primary/30 hover:scale-[1.03] transition"
            >
              Get Started Free
            </button>
            <button
              onClick={() => router.push("/login")}
              className="px-8 py-4 rounded-xl border border-white/20 font-semibold hover:bg-white/10 transition"
            >
              Sign In
            </button>
          </div>
        </motion.div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Trending Now</h2>
            <span className="text-slate-400">📈</span>
          </div>

          <div
            className={
              isSinglePost
                ? "flex justify-center"
                : "grid grid-cols-1 sm:grid-cols-2 gap-6"
            }
          >
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <PostSkeleton key={i} />
              ))}

            {!loading && posts.length === 0 && (
              <div className="col-span-full text-center py-16">
                <div className="text-5xl mb-4">📝</div>
                <h3 className="text-xl font-bold mb-2">
                  No posts yet
                </h3>
                <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                  Be the first one to write on DevLink and start the
                  conversation.
                </p>
                <button
                  onClick={() => router.push("/register")}
                  className="px-6 py-3 rounded-xl bg-primary font-bold hover:scale-[1.05] transition"
                >
                  Create the first post
                </button>
              </div>
            )}

            {!loading &&
              posts.map((post, i) => {
                const hasImage = Boolean(post.image_url);

                return (
                  <div
                    key={post.id}
                    className={isSinglePost ? "w-full max-w-lg" : ""}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() =>
                        router.push(`/post/${post.slug || post.id}`)
                      }
                      className="cursor-pointer rounded-xl overflow-hidden bg-[#192633] border border-white/10 hover:scale-[1.02] transition"
                    >
                      {hasImage ? (
                        <div
                          className="aspect-video bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${post.image_url})`,
                          }}
                        />
                      ) : (
                        <div className="h-32 sm:h-36 bg-gradient-to-br from-primary/20 to-blue-700/20 flex items-end p-4">
                          <h3 className="text-lg sm:text-xl font-bold line-clamp-2">
                            {post.title}
                          </h3>
                        </div>
                      )}

                      <div className="p-4 flex flex-col gap-2">
                        <div className="text-xs text-slate-400">
                          {getReadTime(post.content)} •{" "}
                          {post.view_count} views
                        </div>

                        {hasImage && (
                          <h3 className="text-lg font-bold line-clamp-2">
                            {post.title}
                          </h3>
                        )}

                        <p className="text-slate-400 text-sm line-clamp-2">
                          {getExcerpt(post.content)}
                        </p>

                        {post.tags && post.tags.length > 0 && (
                          <div className="flex gap-2 flex-wrap mt-1">
                            {post.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-primary text-xs font-medium"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-20">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-3xl p-10 bg-gradient-to-br from-primary to-blue-700 text-center shadow-2xl shadow-primary/30"
        >
          <h2 className="text-3xl font-bold mb-3">
            Join the DevLink Community
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Share ideas, write blogs, and connect with developers
            worldwide.
          </p>
          <button
            onClick={() => router.push("/register")}
            className="px-10 py-4 bg-white text-primary font-bold rounded-xl text-lg hover:scale-[1.05] transition"
          >
            Create Your Account
          </button>
        </motion.div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-slate-400 text-sm">
        <div className="flex justify-center gap-6 mb-3 flex-wrap">
          <a href="#">About</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
        </div>
        © 2026 DevLink — Built for devs, by devs.
      </footer>
    </main>
  );
}
