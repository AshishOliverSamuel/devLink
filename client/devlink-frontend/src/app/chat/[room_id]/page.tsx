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
  optimistic?: boolean;
};

type User = {
  id: string;
  name: string;
  avatar: string;
};

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatLastSeenSmart = (date?: string) => {
  if (!date) return "last seen recently";
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
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center gap-3 animate-pulse"
  >
    <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700" />
    <div className="space-y-2">
      <div className="h-3 w-24 bg-slate-300 dark:bg-slate-700 rounded" />
      <div className="h-2 w-16 bg-slate-200 dark:bg-slate-600 rounded" />
    </div>
  </motion.div>
);

const ChatSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-6 animate-pulse"
  >
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
        <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className={`space-y-2 flex flex-col ${i % 2 === 0 ? "items-end" : ""}`}>
          <div className="h-10 w-48 bg-slate-300 dark:bg-slate-700 rounded-xl" />
          <div className="h-3 w-12 bg-slate-200 dark:bg-slate-600 rounded" />
        </div>
      </div>
    ))}
  </motion.div>
);

const EmptyChatState = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="flex flex-col items-center justify-center mt-16 text-slate-500"
  >
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="text-2xl"
    >
      👋
    </motion.div>
    <p className="mt-2 text-sm">No messages yet</p>
    <p className="text-xs">Say hi to start the conversation</p>
  </motion.div>
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
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

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

    apiFetch(`/chat/rooms/${room_id}/messages`)
      .then((msgs: Message[]) => {
        const sorted = [...msgs].sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        );
        setMessages(sorted);
        if (!otherUser) {
          const otherId = sorted.find(
            (m) => m.sender_id !== me.id
          )?.sender_id;
          if (otherId) fetchOtherUser(otherId);
        }
      })
      .finally(() => setLoadingMessages(false)); // ✅ Stop loading regardless of success/fail
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
          setMessages((prev) =>
            prev.some((m) => m.id === data.id) ? prev : [...prev, data]
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

  const emitTyping = () => {
    socketRef.current?.send(
      JSON.stringify({ type: "typing", is_typing: true })
    );
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.send(
        JSON.stringify({ type: "typing", is_typing: false })
      );
    }, 1200);
  };

  const sendMessage = () => {
    if (!text.trim() || !me) return;
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
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b backdrop-blur">
        <button onClick={() => router.back()}>
          <FiArrowLeft />
        </button>

        {!otherUser ? (
          <HeaderSkeleton />
        ) : (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-10 h-10 rounded-full bg-cover bg-center border relative"
              style={{ backgroundImage: `url(${otherUser.avatar})` }}
            >
              {online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
              )}
            </motion.div>

            <div>
              <h2 className="text-sm font-bold">{otherUser.name}</h2>
              <AnimatePresence mode="wait">
                {typing ? (
                  <motion.p
                    key="typing"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="text-xs text-primary italic"
                  >
                    typing…
                  </motion.p>
                ) : online ? (
                  <motion.p
                    key="online"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-green-500"
                  >
                    online
                  </motion.p>
                ) : (
                  <motion.p
                    key="lastseen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-slate-500"
                  >
                    {formatLastSeenSmart(lastSeen)}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-28">
        {loadingMessages ? (
          <ChatSkeleton />
        ) : messages.length === 0 ? (
          <EmptyChatState />
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date} className="space-y-4">
              <div className="flex justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>

              {msgs.map((msg, idx) => {
                const isMe = msg.sender_id === me?.id;
                return (
                  <motion.div
                    key={`${msg.id}-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-3 max-w-[85%] ${
                      isMe ? "ml-auto justify-end" : ""
                    }`}
                  >
                    {!isMe && otherUser && (
                      <div
                        className="w-8 h-8 rounded-full bg-cover bg-center border"
                        style={{ backgroundImage: `url(${otherUser.avatar})` }}
                      />
                    )}
                    <div
                      className={`px-4 py-3 text-sm rounded-2xl ${
                        isMe
                          ? "bg-primary text-white rounded-br-none"
                          : "bg-white dark:bg-[#233648] rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-4 backdrop-blur border-t bg-background-light/90 dark:bg-background-dark/90">
        <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
          <button className="text-slate-500">
            <FiPlus />
          </button>
          <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                emitTyping();
              }}
              rows={1}
              placeholder="Type a message..."
              className="w-full bg-transparent resize-none focus:outline-none"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            className="size-10 rounded-full bg-primary text-white p-2"
          >
            <FiSend />
          </motion.button>
        </div>
      </footer>
    </div>
  );
}