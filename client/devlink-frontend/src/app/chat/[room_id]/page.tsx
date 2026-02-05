"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiSend, FiPlus } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  seen_at?: string | null;
};

type User = {
  id: string;
  name: string;
  avatar: string;
};

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatLastSeenSmart = (date?: string) => {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (d.toDateString() === now.toDateString() && diffHours <= 6)
    return `last seen today at ${formatTime(date)}`;
  if (d.toDateString() === yesterday.toDateString())
    return `last seen yesterday at ${formatTime(date)}`;

  return `last seen ${d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${formatTime(date)}`;
};

const formatDateLabel = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const HeaderSkeleton = () => (
  <div className="flex items-center gap-3 animate-pulse">
    <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700" />
    <div className="space-y-2">
      <div className="h-3 w-24 bg-slate-300 dark:bg-slate-700 rounded" />
      <div className="h-2 w-16 bg-slate-200 dark:bg-slate-600 rounded" />
    </div>
  </div>
);

const MessageSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-3">
        <div className="h-8 w-8 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="h-4 w-48 rounded-xl bg-slate-300 dark:bg-slate-700" />
      </div>
    ))}
  </div>
);

export default function ChatRoomPage() {
  const { room_id } = useParams();
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [text, setText] = useState("");
  const [online, setOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | undefined>();
  const [typing, setTyping] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((res) =>
        setMe({
          id: res.id,
          name: res.username,
          avatar:
            res.profile_image ||
            "https://ui-avatars.com/api/?name=Me",
        })
      )
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchOtherUser = async (userId: string) => {
    const res = await apiFetch(`/users/${userId}`);
    setOtherUser({
      id: userId,
      name: res.user.name,
      avatar:
        res.user.profile_image ||
        "https://ui-avatars.com/api/?name=User",
    });
    if (res.user.last_seen) setLastSeen(res.user.last_seen);
  };

  useEffect(() => {
    if (!me) return;

    apiFetch(`/chat/rooms/${room_id}`).then((room) => {
      const other = room.users?.find((u: any) => u.id !== me.id);
      if (other) fetchOtherUser(other.id);
    });

    apiFetch(`/chat/rooms/${room_id}/messages`).then((msgs: Message[]) => {
      setMessages(
        msgs.sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        )
      );
      setLoadingMessages(false);
    });
  }, [me, room_id]);

  useEffect(() => {
    if (!me || socketRef.current) return;

    apiFetch("/ws/token").then((res) => {
      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/ws/chat/${room_id}?token=${res.token}`
      );
      socketRef.current = ws;

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "message") {
          setMessages((p) =>
            p.some((m) => m.id === data.id) ? p : [...p, data]
          );
        }
        if (data.type === "typing" && data.user_id !== me.id)
          setTyping(data.is_typing);
        if (data.type === "user_online") setOnline(true);
        if (data.type === "user_offline") {
          setOnline(false);
          setLastSeen(data.last_seen);
        }
      };
    });

    return () => socketRef.current?.close();
  }, [me, room_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = () => {
    if (!text.trim()) return;
    socketRef.current?.send(
      JSON.stringify({ type: "message", content: text })
    );
    setText("");
  };

  const groupedMessages = useMemo(() => {
    const map: Record<string, Message[]> = {};
    messages.forEach((m) => {
      const key = formatDateLabel(m.created_at);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <button onClick={() => router.back()}>
          <FiArrowLeft />
        </button>

        {!otherUser ? (
          <HeaderSkeleton />
        ) : (
          <>
            <div
              className="w-10 h-10 rounded-full bg-cover bg-center border relative"
              style={{ backgroundImage: `url(${otherUser.avatar})` }}
            >
              {online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold">{otherUser.name}</h2>
              <p className="text-xs text-slate-500">
                {typing
                  ? "typing…"
                  : online
                  ? "online"
                  : formatLastSeenSmart(lastSeen)}
              </p>
            </div>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28">
        {loadingMessages ? (
          <MessageSkeleton />
        ) : !messages.length ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center text-center text-sm text-slate-500"
          >
            No conversation started yet
          </motion.div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date} className="space-y-4">
              <div className="text-center text-xs text-slate-400">
                {date}
              </div>
              {msgs.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[80%] ${
                    msg.sender_id === me?.id
                      ? "ml-auto text-right"
                      : ""
                  }`}
                >
                  <div className="px-4 py-2 rounded-2xl bg-slate-200 dark:bg-slate-700">
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="p-4 border-t flex gap-3">
        <FiPlus />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 outline-none"
          placeholder="Type a message…"
        />
        <button onClick={sendMessage}>
          <FiSend />
        </button>
      </footer>
    </div>
  );
}
