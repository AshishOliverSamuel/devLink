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
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (isToday && diffHours <= 6) return `last seen today at ${formatTime(date)}`;
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
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function ChatRoomPage() {
  const { room_id } = useParams();
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [online, setOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | undefined>();
  const [typing, setTyping] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((res) => {
        setMe({
          id: res.id,
          name: res.username,
          avatar: res.profile_image || "https://ui-avatars.com/api/?name=Me",
        });
      })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (!me) return;

    const loadChat = async () => {
      setLoadingMessages(true);

      const msgs: Message[] = await apiFetch(`/chat/rooms/${room_id}/messages`);
      const sorted = [...msgs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sorted);

      let otherId =
        sorted.find((m) => m.sender_id !== me.id)?.sender_id;

      if (!otherId) {
        const room = await apiFetch(`/chat/rooms/${room_id}`);
        otherId = room.other_user_id;
      }

      if (otherId) {
        const res = await apiFetch(`/users/${otherId}`);
        setOtherUser({
          id: otherId,
          name: res.user.name,
          avatar: res.user.profile_image || "https://ui-avatars.com/api/?name=User",
        });
        setLastSeen(res.user.last_seen);
      }

      setLoadingMessages(false);
    };

    loadChat();
  }, [me, room_id]);

  useEffect(() => {
    if (!me || socketRef.current) return;

    apiFetch("/ws/token").then((res) => {
      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"}/ws/chat/${room_id}?token=${res.token}`
      );

      socketRef.current = ws;

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "message") {
          setMessages((prev) => [...prev, data]);
        }
        if (data.type === "typing" && data.user_id !== me.id) {
          setTyping(data.is_typing);
        }
        if (data.type === "user_online") setOnline(true);
        if (data.type === "user_offline") {
          setOnline(false);
          setLastSeen(data.last_seen);
        }
      };
    });

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [me, room_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = () => {
    if (!text.trim() || !me) return;
    socketRef.current?.send(JSON.stringify({ type: "message", content: text }));
    setMessages((p) => [
      ...p,
      {
        id: `tmp-${Date.now()}`,
        sender_id: me.id,
        content: text,
        created_at: new Date().toISOString(),
        optimistic: true,
      },
    ]);
    setText("");
  };

  const groupedMessages = useMemo(() => {
    const map: Record<string, Message[]> = {};
    messages.forEach((m) => {
      const key = formatDateLabel(m.created_at);
      map[key] ||= [];
      map[key].push(m);
    });
    return map;
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-3 p-4 border-b">
        <button onClick={() => router.back()}><FiArrowLeft /></button>
        {otherUser && (
          <>
            <div
              className="w-10 h-10 rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(${otherUser.avatar})` }}
            />
            <div>
              <h2 className="text-sm font-bold">{otherUser.name}</h2>
              <AnimatePresence>
                {typing ? (
                  <motion.p className="text-xs italic">typing…</motion.p>
                ) : online ? (
                  <p className="text-xs text-green-500">online</p>
                ) : (
                  <p className="text-xs text-slate-500">
                    {formatLastSeenSmart(lastSeen)}
                  </p>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-28">
        {loadingMessages && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loadingMessages && messages.length === 0 && (
          <div className="flex justify-center items-center h-full text-slate-400 text-sm">
            No messages yet
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date} className="space-y-4">
            <div className="flex justify-center text-xs">{date}</div>
            {msgs.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[80%] ${
                  msg.sender_id === me?.id ? "ml-auto text-right" : ""
                }`}
              >
                <div className="px-4 py-2 rounded-2xl bg-slate-200 dark:bg-slate-700">
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      <footer className="fixed bottom-0 w-full p-4 border-t">
        <div className="flex gap-2">
          <button><FiPlus /></button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 resize-none"
            placeholder="Type a message…"
          />
          <button onClick={sendMessage}><FiSend /></button>
        </div>
      </footer>
    </div>
  );
}
