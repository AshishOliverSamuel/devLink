"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { FiArrowLeft, FiShare2 } from "react-icons/fi";


type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  image_url?: string;
  tags?: string[];
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


export default function PostPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      try {
        const data: Post = await apiFetch(`/posts/${slug}`);
        setPost(data);
      } catch (err) {
        console.error("FETCH ERROR:", err);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white">
        Loading…
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white">
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
    <main className="min-h-screen bg-[#020617] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-400 flex items-center gap-1"
          >
            <FiArrowLeft /> Back
          </button>

          <button
            onClick={handleShare}
            className="text-sm text-blue-400 flex items-center gap-1"
          >
            <FiShare2 /> Share
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {post.image_url && (
          <div className="mb-10 rounded-2xl overflow-hidden bg-white/5 shadow-xl">
            <div className="relative h-[240px] sm:h-[420px]">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          {post.title}
        </h1>

        <div className="text-sm text-gray-400 mb-8">
          {formatDate(post.created_at)} • {getReadTime(post.content)} •{" "}
          {post.view_count} views
        </div>

        <article className="text-lg leading-relaxed text-gray-200 whitespace-pre-line">
          {post.content}
        </article>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-md bg-blue-500/15 text-blue-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
