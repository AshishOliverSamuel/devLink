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
  new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatLastSeenSmart = (date?: string) => {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday && diffHours <= 6)
    return `last seen today at ${formatTime(date)}`;
  if (isYesterday)
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
  const [loadingHeader, setLoadingHeader] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  /* -------------------- AUTH -------------------- */
  useEffect(() => {
    apiFetch("/auth/me")
      .then((res) => {
        setMe({
          id: res.id,
          name: res.username,
          avatar:
            res.profile_image ||
            "https://ui-avatars.com/api/?name=Me",
        });
      })
      .catch(() => router.push("/login"));
  }, [router]);

  /* -------------------- LOAD HEADER USER (FIXED) -------------------- */
  useEffect(() => {
    if (!me || otherUser) return;
    fetchOtherUserFromRoom();
  }, [me, room_id]); // ✅ FIX: room_id added

  /* -------------------- LOAD MESSAGES -------------------- */
  useEffect(() => {
    if (!me) return;

    apiFetch(`/chat/rooms/${room_id}/messages`).then(
      (msgs: Message[]) => {
        const sorted = [...msgs].sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        );

        setMessages(sorted);

        const otherId = sorted.find(
          (m) => m.sender_id !== me.id
        )?.sender_id;

        if (otherId) {
          fetchOtherUser(otherId);
        } else {
          fetchOtherUserFromRoom();
        }
      }
    );
  }, [me, room_id]);

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
    setLoadingHeader(false);
  };

  const fetchOtherUserFromRoom = async () => {
    try {
      const room = await apiFetch(`/chat/rooms/${room_id}`);
      if (!room?.participants || !me) return;

      const other = room.participants.find(
        (u: any) => u.id !== me.id
      );
      if (!other) return;

      setOtherUser({
        id: other.id,
        name: other.name,
        avatar:
          other.profile_image ||
          "https://ui-avatars.com/api/?name=User",
      });

      if (other.last_seen) setLastSeen(other.last_seen);
    } finally {
      setLoadingHeader(false);
    }
  };

  /* -------------------- WEBSOCKET -------------------- */
  useEffect(() => {
    if (!me || socketRef.current) return;

    const connectWS = async () => {
      const res = await apiFetch("/ws/token");
      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"}/ws/chat/${room_id}?token=${res.token}`
      );

      socketRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({ type: "user_online", user_id: me.id })
        );
      };

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);

        switch (data.type) {
          case "message":
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;

              const optimisticIndex = prev.findIndex(
                (m) =>
                  m.optimistic &&
                  m.sender_id === data.sender_id &&
                  m.content === data.content
              );

              if (optimisticIndex !== -1) {
                const updated = [...prev];
                updated[optimisticIndex] = data;
                return updated;
              }

              return [...prev, data];
            });
            break;

          case "typing":
            if (data.user_id !== me.id)
              setTyping(data.is_typing);
            break;

          case "user_online":
            if (data.user_id !== me.id) setOnline(true);
            break;

          case "user_offline":
            if (data.user_id !== me.id) {
              setOnline(false);
              setLastSeen(data.last_seen);
            }
            break;
        }
      };
    };

    connectWS();
    return () => socketRef.current?.close();
  }, [me, room_id]);

  /* -------------------- SEEN LOGIC -------------------- */
  useEffect(() => {
    if (!me || !messages.length) return;

    const hasUnseen = messages.some(
      (m) => m.sender_id !== me.id && !m.seen_at
    );

    if (hasUnseen) {
      apiFetch(`/chat/rooms/${room_id}/seen`, {
        method: "POST",
      }).catch(() => {});
    }
  }, [messages, me, room_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const emitTyping = () => {
    socketRef.current?.send(
      JSON.stringify({ type: "typing", is_typing: true })
    );
    if (typingTimeout.current)
      clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.send(
        JSON.stringify({ type: "typing", is_typing: false })
      );
    }, 1200);
  };

  const sendMessage = () => {
    if (!text.trim() || !me) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        sender_id: me.id,
        content: text,
        created_at: new Date().toISOString(),
        optimistic: true,
      },
    ]);

    socketRef.current?.send(
      JSON.stringify({ type: "message", content: text })
    );
    setText("");
  };

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

 

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b backdrop-blur">
        <button onClick={() => router.back()}>
          <FiArrowLeft />
        </button>

        {loadingHeader && (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-300 dark:bg-slate-700 rounded" />
              <div className="h-2 w-16 bg-slate-300 dark:bg-slate-700 rounded" />
            </div>
          </div>
        )}

        {!loadingHeader && otherUser && (
          <>
            <div
              className="w-10 h-10 rounded-full bg-cover bg-center border relative"
              style={{
                backgroundImage: `url(${otherUser.avatar})`,
              }}
            >
              {online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {otherUser.name}
              </h2>
              <AnimatePresence>
                {typing ? (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="text-xs text-primary italic"
                  >
                    typing…
                  </motion.p>
                ) : online ? (
                  <p className="text-xs text-green-500">
                    online
                  </p>
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
        {Object.entries(groupedMessages).map(
          ([date, msgs]) => (
            <div key={date} className="space-y-4">
              <div className="flex justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>
              {msgs.map((msg, idx) => {
                const isMe =
                  msg.sender_id === me?.id;
                const showSeen =
                  isMe &&
                  msg.id === lastMyMessageId &&
                  msg.seen_at;
                return (
                  <motion.div
                    key={`${msg.id}-${idx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 max-w-[85%] ${
                      isMe
                        ? "ml-auto justify-end"
                        : ""
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
                      className={`flex flex-col gap-1 ${
                        isMe
                          ? "items-end"
                          : "items-start"
                      }`}
                    >
                      <div
                        className={`px-4 py-3 text-sm rounded-2xl ${
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
                          <span className="italic">
                            Sending…
                          </span>
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
            </div>
          )
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
          <button
            onClick={sendMessage}
            className="size-10 rounded-full bg-primary text-white p-2"
          >
            <FiSend />
          </button>
        </div>
      </footer>
    </div>
  );
}
