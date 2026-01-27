"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { FiArrowLeft, FiShare2 } from "react-icons/fi";
import { Card, CardContent } from "@/components/ui/card";

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  tags?: string[];
  image_url?: string;
  author_id: string;
  created_at: string;
  view_count: number;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-400">
        Loading…
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-400">
        Post not found
      </div>
    );
  }

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
      {/* HEADER */}
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.article
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {isValidImage(post.image_url) && (
            <Card className="mb-10 bg-[#020617] border-white/10 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative w-full h-[220px] sm:h-[350px] lg:h-[450px]">
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    fill
                    priority
                    sizes="
                      (max-width: 640px) 100vw,
                      (max-width: 1200px) 100vw,
                      1200px
                    "
                    className="object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              {post.title}
            </h1>

            <div className="text-sm text-slate-400 mb-6 flex flex-wrap gap-2">
              <span>{formatDate(post.created_at)}</span>
              <span>•</span>
              <span>{getReadTime(post.content)}</span>
              <span>•</span>
              <span>{post.view_count} views</span>
            </div>

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
                        <Image
                          src={p.image_url}
                          alt={p.title}
                          width={80}
                          height={80}
                          className="w-20 h-20 object-cover rounded-md border border-white/5"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </motion.article>
      </div>
    </main>
  );
}