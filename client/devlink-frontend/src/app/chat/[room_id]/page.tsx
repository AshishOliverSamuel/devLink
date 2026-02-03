"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiMoreVertical,
  FiSend,
  FiPlus,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";

/* ================= TYPES ================= */

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

/* ================= HELPERS ================= */

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

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

/* ================= PAGE ================= */

export default function ChatRoomPage() {
  const { room_id } = useParams();
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ========== AUTH ME ========== */
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
  }, []);

  /* ========== INITIAL MESSAGES ========== */
  useEffect(() => {
    if (!me) return;

    apiFetch(`/chat/rooms/${room_id}/messages?limit=20`).then(
      (msgs: Message[]) => {
        setMessages(msgs);

        const otherId = msgs.find(
          (m) => m.sender_id !== me.id
        )?.sender_id;

        if (otherId) fetchOtherUser(otherId);
        if (msgs.length < 20) setHasMore(false);
      }
    );
  }, [me, room_id]);

  /* ========== LOAD OLDER ========== */
  const loadOlder = async () => {
    if (!hasMore || loadingMore || !messages.length) return;

    setLoadingMore(true);
    const oldest = messages[0];

    const older: Message[] = await apiFetch(
      `/chat/rooms/${room_id}/messages?before=${oldest.created_at}&limit=20`
    );

    if (!older.length) setHasMore(false);
    setMessages((prev) => [...older, ...prev]);
    setLoadingMore(false);
  };

  /* ========== OBSERVER ========== */
  useEffect(() => {
    if (!topRef.current) return;

    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && loadOlder(),
      { threshold: 1 }
    );

    obs.observe(topRef.current);
    return () => obs.disconnect();
  }, [messages]);

  /* ========== OTHER USER ========== */
  const fetchOtherUser = async (userId: string) => {
    const res = await apiFetch(`/users/${userId}`);
    setOtherUser({
      id: userId,
      name: res.user.name,
      avatar:
        res.user.profile_image ||
        "https://ui-avatars.com/api/?name=User",
    });
  };

  /* ========== WEBSOCKET ========== */
  useEffect(() => {
    if (!me || socketRef.current) return;

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL}/ws/chat/${room_id}`
    );

    socketRef.current = ws;

    ws.onmessage = (e) => {
      const msg: Message = JSON.parse(e.data);
      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => !(m.optimistic && m.content === msg.content)
        );
        return [...filtered, msg];
      });
    };

    ws.onclose = () => {
      socketRef.current = null;
    };

    return () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    };
  }, [me, room_id]);

  /* ========== MARK SEEN ========== */
  useEffect(() => {
    if (!me || !messages.length) return;

    const unseen = messages.some(
      (m) => m.sender_id !== me.id && !m.seen_at
    );

    if (unseen) {
      apiFetch(`/chat/rooms/${room_id}/seen`, {
        method: "POST",
      }).catch(() => {});
    }
  }, [messages, me, room_id]);

  /* ========== SCROLL ========== */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ========== SEND ========== */
  const sendMessage = () => {
    if (!text.trim() || !me) return;

    const tempId = `temp-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender_id: me.id,
        content: text,
        created_at: new Date().toISOString(),
        optimistic: true,
      },
    ]);

    socketRef.current?.send(JSON.stringify({ content: text }));
    setText("");
  };

  /* ========== HELPERS ========== */
  const lastMyMessageId = useMemo(
    () =>
      messages
        .filter((m) => m.sender_id === me?.id)
        .slice(-1)[0]?.id,
    [messages, me]
  );

  const groupedMessages = useMemo(() => {
    const map: Record<string, Message[]> = {};
    messages.forEach((m) => {
      const key = formatDateLabel(m.created_at);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [messages]);

  /* ================= UI ================= */

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">

      {/* HEADER */}
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b backdrop-blur">
        <button onClick={() => router.back()}>
          <FiArrowLeft />
        </button>

        {otherUser && (
          <>
            <div
              className="w-10 h-10 rounded-full bg-cover bg-center border"
              style={{ backgroundImage: `url(${otherUser.avatar})` }}
            />
            <div>
              <h2 className="text-sm font-bold">{otherUser.name}</h2>
              <p className="text-xs text-slate-500">Chat</p>
            </div>
          </>
        )}

        <div className="ml-auto">
          <FiMoreVertical />
        </div>
      </header>

      {/* MESSAGES */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <div ref={topRef} />

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date} className="space-y-4">
            <div className="flex justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {date}
              </span>
            </div>

            <AnimatePresence>
              {msgs.map((msg) => {
                const isMe = msg.sender_id === me?.id;
                const showSeen =
                  isMe &&
                  msg.id === lastMyMessageId &&
                  msg.seen_at;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
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
                      className={`flex flex-col gap-1 ${
                        isMe ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`px-4 py-3 text-sm rounded-2xl
                        ${
                          isMe
                            ? "bg-primary text-white rounded-br-none"
                            : "bg-white dark:bg-[#233648] rounded-bl-none"
                        }`}
                      >
                        {msg.content}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        {formatTime(msg.created_at)}
                        {msg.optimistic && (
                          <span className="italic">Sending…</span>
                        )}
                        {showSeen && (
                          <span className="text-primary font-medium">
                            Seen
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}

        <div ref={bottomRef} />
      </main>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 w-full p-4 border-t backdrop-blur">
        <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
          <button>
            <FiPlus />
          </button>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-2xl px-4 py-2 text-sm bg-slate-100"
          />

          <button
            onClick={sendMessage}
            className="size-10 rounded-full bg-primary text-white"
          >
            <FiSend />
          </button>
        </div>
      </footer>
    </div>
  );
}
