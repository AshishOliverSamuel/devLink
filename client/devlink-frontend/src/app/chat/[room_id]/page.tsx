"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiMoreVertical, FiSend, FiPlus } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";

/* ---------------- Types ---------------- */
type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  seen: boolean;
};

type User = {
  id: string;
  name: string;
  avatar: string;
};

/* ---------------- Helpers ---------------- */
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

/* ================================================= */

export default function ChatRoomPage() {
  const { room_id } = useParams();
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- Fetch Me ---------------- */
  useEffect(() => {
    apiFetch("/me")
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

  /* ---------------- Fetch Messages ---------------- */
  useEffect(() => {
    if (!me) return;

    setLoading(true);

    apiFetch(`/chat/rooms/${room_id}/messages`)
      .then((msgs: Message[]) => {
        setMessages(msgs);

        const otherId = msgs.find(
          (m) => m.sender_id !== me.id
        )?.sender_id;

        if (otherId) fetchOtherUser(otherId);
      })
      .finally(() => setLoading(false));
  }, [me, room_id]);

  /* ---------------- Fetch Other User ---------------- */
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

  /* ---------------- WebSocket ---------------- */
  useEffect(() => {
    if (!me) return;

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_API_URL}/ws/chat/${room_id}`
    );
    socketRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      setMessages((prev) => [...prev, msg]);
    };

    return () => ws.close();
  }, [me, room_id]);

  /* ---------------- Seen ---------------- */
  useEffect(() => {
    if (!messages.length) return;

    apiFetch(`/chat/rooms/${room_id}/seen`, {
      method: "POST",
    }).catch(() => {});
  }, [messages, room_id]);

  /* ---------------- Scroll ---------------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------------- Send ---------------- */
  const sendMessage = () => {
    if (!text.trim()) return;

    socketRef.current?.send(JSON.stringify({ content: text }));
    setText("");
  };

  /* ---------------- Group Messages ---------------- */
  const groupedMessages = useMemo(() => {
    const map: Record<string, Message[]> = {};

    messages.forEach((msg) => {
      const key = formatDateLabel(msg.created_at);
      if (!map[key]) map[key] = [];
      map[key].push(msg);
    });

    return map;
  }, [messages]);

  /* ================================================= */

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">

      {/* ---------------- Header ---------------- */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b bg-white/80 dark:bg-background-dark/80 backdrop-blur">
        <button onClick={() => router.back()}>
          <FiArrowLeft />
        </button>

        {loading ? (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-300" />
            <div className="h-3 w-24 bg-slate-300 rounded" />
          </div>
        ) : (
          otherUser && (
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
          )
        )}

        <div className="ml-auto">
          <FiMoreVertical />
        </div>
      </header>

      {/* ---------------- Messages ---------------- */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`h-12 w-2/3 rounded-2xl bg-slate-200 animate-pulse ${
                i % 2 ? "ml-auto" : ""
              }`}
            />
          ))
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date} className="space-y-4">
              <div className="flex justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>

              <AnimatePresence>
                {msgs.map((msg) => {
                  const isMe = msg.sender_id === me?.id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${
                        isMe ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isMe && otherUser && (
                        <div
                          className="w-8 h-8 rounded-full bg-cover bg-center border"
                          style={{
                            backgroundImage: `url(${otherUser.avatar})`,
                          }}
                        />
                      )}

                      <div
                        className={`max-w-[80%] flex flex-col ${
                          isMe ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`px-4 py-3 text-sm rounded-2xl shadow-sm
                          ${
                            isMe
                              ? "bg-primary text-white rounded-br-none"
                              : "bg-white dark:bg-[#233648] rounded-bl-none"
                          }`}
                        >
                          {msg.content}
                        </div>

                        <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                          {formatTime(msg.created_at)}
                          {isMe && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: msg.seen ? 1 : 0.4 }}
                              className="ml-1 text-primary font-medium"
                            >
                              {msg.seen ? "Seen" : "Sent"}
                            </motion.span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </main>

      {/* ---------------- Input ---------------- */}
      <footer className="p-4 border-t bg-white/90 dark:bg-background-dark/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <button className="text-slate-500">
            <FiPlus />
          </button>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-2xl px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 focus:outline-none"
          />

          <button
            onClick={sendMessage}
            className="p-3 rounded-full bg-primary text-white active:scale-95 transition"
          >
            <FiSend />
          </button>
        </div>
      </footer>
    </div>
  );
}
