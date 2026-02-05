"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";


type User = {
  id: string;
  username: string;
  profile_image?: string;
};

type ChatRoom = {
  room_id: string;
  user: User;
  last_message?: string;
  last_sender_id?: string;
  last_seen_at?: string | null;
  updated_at?: string;
  unread: number;
};

type RawRoom = {
  room_id: string;
  user_id: string;
  last_message?: string;
  last_sender_id?: string;
  last_seen_at?: string | null;
  updated_at?: string;
  unread: number;
};

type RawRequest = {
  id: string;
  sender_id: string;
  msg: string;
};

type Request = RawRequest & {
  sender?: User;
};


const formatTime = (date?: string) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};


export default function ChatsPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"inbox" | "requests">("inbox");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [counts, setCounts] = useState({ requests: 0, unread: 0 });
  const [loading, setLoading] = useState(true);


  const loadCounts = () => {
    apiFetch("/api/chat/counts")
      .then((res) => {
        setCounts({
          requests: res?.requests ?? 0,
          unread: res?.unread_messages ?? 0,
        });
      })
      .catch(() => setCounts({ requests: 0, unread: 0 }));
  };

  useEffect(() => {
    loadCounts();
  }, []);


  useEffect(() => {
    setLoading(true);

    if (tab === "inbox") {
      apiFetch("/api/chatrooms")
        .then(async (res) => {
          const raw: RawRoom[] = res?.rooms || [];

          const hydrated = await Promise.all(
            raw.map(async (r) => {
              const u = await apiFetch(`/api/users/${r.user_id}`);

              return {
                room_id: r.room_id,
                last_message: r.last_message,
                last_sender_id: r.last_sender_id,
                last_seen_at: r.last_seen_at,
                updated_at: r.updated_at,
                unread: r.unread,
                user: {
                  id: r.user_id,
                  username: u.user.name,
                  profile_image: u.user.profile_image,
                },
              };
            })
          );

          setRooms(hydrated);
          setLoading(false);
        })
        .catch(() => {
          setRooms([]);
          setLoading(false);
        });

      return;
    }

    apiFetch("/api/chat/requests")
      .then(async (res) => {
        const raw: RawRequest[] = Array.isArray(res) ? res : [];

        const hydrated = await Promise.all(
          raw.map(async (r) => {
            const u = await apiFetch(`/api/users/${r.sender_id}`);
            return {
              ...r,
              sender: {
                id: r.sender_id,
                username: u.user.name,
                profile_image: u.user.profile_image,
              },
            };
          })
        );

        setRequests(hydrated);
        setLoading(false);
      })
      .catch(() => {
        setRequests([]);
        setLoading(false);
      });
  }, [tab]);


  const respond = async (id: string, action: "accept" | "reject") => {
    await apiFetch(`/api/chat/request/${id}/respond`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });

    setRequests((prev) => prev.filter((r) => r.id !== id));
    setCounts((c) => ({ ...c, requests: Math.max(0, c.requests - 1) }));

    if (action === "accept") setTab("inbox");
  };

  const totalNotifications = counts.requests + counts.unread;


  return (
    <main className="min-h-screen bg-[#101922] text-white flex justify-center">
      <div className="w-full max-w-xl">

        <header className="sticky top-0 z-40 bg-[#101922]/90 backdrop-blur border-b border-slate-800">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => router.back()}>←</button>
            <h1 className="font-bold text-lg">Chats</h1>

            <div className="relative">
              <AnimatePresence>
                {totalNotifications > 0 && (
                  <motion.div
                    key={totalNotifications}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0.8, 1.15, 1], opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="absolute -top-2 -right-2 min-w-[20px] h-[20px]
                               rounded-full bg-primary text-xs font-bold
                               flex items-center justify-center px-1"
                  >
                    {totalNotifications}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex border-b border-slate-800">
            <Tab active={tab === "inbox"} onClick={() => setTab("inbox")}>
              Inbox
            </Tab>
            <Tab active={tab === "requests"} onClick={() => setTab("requests")}>
              Requests
            </Tab>
          </div>
        </header>

        <div className="p-4 space-y-4">

          {loading && (
            <>
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </>
          )}

          {!loading && tab === "inbox" && rooms.length === 0 && (
            <p className="text-slate-400 text-center mt-10">
              No conversations yet
            </p>
          )}

          {!loading && tab === "inbox" &&
            rooms.map((r) => {
              const hasUnread = r.unread > 0;
              const sentByMe = r.last_sender_id !== r.user.id;
              const myMsgSeen = sentByMe && r.last_seen_at;

              return (
                <motion.div
                  key={r.room_id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => router.push(`/chat/${r.room_id}`)}
                  className="cursor-pointer bg-[#192633] border border-slate-800 rounded-xl p-4 flex gap-4"
                >
                  <img
                    src={
                      r.user.profile_image ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${r.user.username}`
                    }
                    className="w-14 h-14 rounded-full border border-slate-700 object-cover"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold truncate">@{r.user.username}</p>

                      {!sentByMe && hasUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-sm text-[#92adc9] truncate">
                      {sentByMe && (
                        <span className="font-semibold text-slate-300 ">
                          You
                        </span>
                      )}

                      <span className="truncate">
                        {r.last_message || "Say hello..."}
                      </span>

                      {myMsgSeen && (
                        <span className="ml-1 text-primary text-xs">✓✓</span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      {formatTime(r.updated_at)}
                    </p>
                  </div>

                  {hasUnread && (
                    <div className="ml-2 min-w-[22px] h-[22px] rounded-full bg-primary text-xs font-bold flex items-center justify-center">
                      {r.unread}
                    </div>
                  )}
                </motion.div>
              );
            })}

          {!loading && tab === "requests" && requests.length === 0 && (
            <p className="text-slate-400 text-center mt-10">
              No pending requests
            </p>
          )}

          {!loading && tab === "requests" &&
            requests.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#192633] border border-slate-800 rounded-xl p-4"
              >
                <div className="flex gap-4">
                  <img
                    onClick={() => router.push(`/users/${r.sender?.id}`)}
                    src={
                      r.sender?.profile_image ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${r.sender?.username}`
                    }
                    className="w-14 h-14 rounded-full border border-primary/40 cursor-pointer"
                  />

                  <div className="flex-1">
                    <p className="font-bold">@{r.sender?.username}</p>
                    <p className="text-sm text-[#92adc9] italic">
                      “{r.msg}”
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => respond(r.id, "reject")}
                    className="flex-1 h-10 rounded-lg bg-slate-700"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => respond(r.id, "accept")}
                    className="flex-1 h-10 rounded-lg bg-primary"
                  >
                    Accept
                  </button>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </main>
  );
}


function Tab({
  children,
  active,
  onClick,
}: {
  children: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-bold ${
        active
          ? "border-b-2 border-primary text-primary"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse bg-[#192633] border border-slate-800 rounded-xl p-4 flex gap-4">
      <div className="w-14 h-14 rounded-full bg-slate-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded w-1/3" />
        <div className="h-3 bg-slate-700 rounded w-2/3" />
      </div>
    </div>
  );
}
