"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { FiArrowLeft, FiShare2 } from "react-icons/fi";
import { Card, CardContent } from "@/components/ui/card";

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
  tags?: string[];
  image_url?: string;
  created_at: string;
  view_count: number;
  author: Author;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const getReadTime = (content: string) =>
  `${Math.max(1, Math.ceil(content.split(" ").length / 200))} min read`;

const isValidImage = (url?: string): url is string =>
  typeof url === "string" && url.startsWith("http");

const PostSkeleton = () => (
  <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
    <div className="w-full h-[220px] sm:h-[350px] lg:h-[450px] bg-white/5 rounded-xl mb-10" />
    <div className="max-w-3xl">
      <div className="h-8 w-3/4 bg-white/5 rounded mb-4" />
      <div className="h-8 w-1/2 bg-white/5 rounded mb-10" />
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-full bg-white/5" />
        <div className="space-y-2">
          <div className="h-3 w-24 bg-white/5 rounded" />
          <div className="h-2 w-32 bg-white/5 rounded" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-4 w-full bg-white/5 rounded" />
        <div className="h-4 w-full bg-white/5 rounded" />
        <div className="h-4 w-5/6 bg-white/5 rounded" />
      </div>
    </div>
  </div>
);

export default function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [suggested, setSuggested] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      try {
        const postData = await apiFetch(`/posts/${slug}`);
        setPost(postData);

        const feed = await apiFetch("/home");
        const posts: Post[] = Array.isArray(feed)
          ? feed
          : feed?.posts ?? [];

        setSuggested(posts.filter((p) => p.slug !== slug).slice(0, 4));
      } catch (err) {
        console.error("Post load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <header className="sticky top-0 z-50 backdrop-blur bg-[#020617]/80 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-400 text-sm"
          >
            <FiArrowLeft size={16} />
            Back
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-blue-400 text-sm"
          >
            <FiShare2 size={16} />
            Share
          </button>
        </div>
      </header>

      {loading ? (
        <PostSkeleton />
      ) : !post ? (
        <div className="min-h-[50vh] flex items-center justify-center text-slate-400">
          Post not found
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <motion.article
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {isValidImage(post.image_url) && (
              <Card className="mb-10 bg-[#020617] border-white/10 overflow-hidden shadow-2xl">
                <CardContent className="p-0 leading-[0]">
                  <div className="relative w-full h-[220px] sm:h-[350px] lg:h-[450px]">
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      priority
                      className="object-cover object-center"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="max-w-3xl">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                {post.title}
              </h1>

              <div className="flex items-center gap-3 mb-10">
                <img
                  src={
                    post.author.profile_image ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${post.author.username}`
                  }
                  onClick={() => router.push(`/users/${post.author.id}`)}
                  className="w-10 h-10 rounded-full object-cover border border-white/10 cursor-pointer"
                />

                <div className="text-sm">
                  <p
                    onClick={() => router.push(`/users/${post.author.id}`)}
                    className="font-medium cursor-pointer hover:text-blue-400"
                  >
                    @{post.author.username}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {formatDate(post.created_at)} • {getReadTime(post.content)} •{" "}
                    {post.view_count} views
                  </p>
                </div>
              </div>

              {/* TAGS */}
              {post.tags?.length && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-medium px-3 py-1 rounded-full bg-blue-500/10 text-blue-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-slate-300 leading-relaxed space-y-4 whitespace-pre-line">
                {post.content}
              </div>

              {suggested.length > 0 && (
                <section className="mt-24 pt-10 border-t border-white/5">
                  <h3 className="text-lg font-semibold mb-6">
                    Recommended for you
                  </h3>

                  <div className="space-y-6">
                    {suggested.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => router.push(`/post/${p.slug}`)}
                        className="flex gap-4 cursor-pointer group"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold group-hover:text-blue-400 transition line-clamp-2">
                            {p.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {p.content}
                          </p>
                        </div>

                        {isValidImage(p.image_url) && (
                          <div className="relative w-20 h-20 shrink-0">
                            <Image
                              src={p.image_url}
                              alt={p.title}
                              fill
                              className="object-cover rounded-md border border-white/5"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.article>
        </div>
      )}
    </main>
  );
}