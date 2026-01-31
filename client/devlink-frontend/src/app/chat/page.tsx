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
  updated_at: string;
  unread: number;
};

type RawRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  msg: string;
  status: string;
  created_at: string;
};

type Request = RawRequest & {
  sender?: User;
};

export default function ChatsPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"inbox" | "requests">("inbox");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [counts, setCounts] = useState({ requests: 0, unread: 0 });
  const [loading, setLoading] = useState(true);

  /* ================= COUNTS ================= */
  useEffect(() => {
    apiFetch("/chat/counts")
      .then((res) => setCounts(res || { requests: 0, unread: 0 }))
      .catch(() => {});
  }, []);

  /* ================= DATA ================= */
  useEffect(() => {
    setLoading(true);

    // 🔹 INBOX
    if (tab === "inbox") {
      apiFetch("/chatrooms")
        .then((res) => {
          const roomsData = Array.isArray(res)
            ? res
            : Array.isArray(res?.rooms)
            ? res.rooms
            : [];

          setRooms(roomsData);
          setLoading(false);
        })
        .catch(() => {
          setRooms([]);
          setLoading(false);
        });

      return;
    }

    // 🔹 REQUESTS (hydrate sender info)
    apiFetch("/chat/requests")
      .then(async (res) => {
        const rawRequests: RawRequest[] = Array.isArray(res) ? res : [];

        const hydrated = await Promise.all(
          rawRequests.map(async (r) => {
            try {
              const u = await apiFetch(`/users/${r.sender_id}`);
              return {
                ...r,
                sender: {
                  id: r.sender_id,
                  username: u.user.name,
                  profile_image: u.user.profile_image,
                },
              };
            } catch {
              return r;
            }
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

  /* ================= RESPOND ================= */
  const respond = async (id: string, action: "accept" | "reject") => {
    await apiFetch(`/chat/request/${id}/respond`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });

    setRequests((prev) => prev.filter((r) => r.id !== id));
    setCounts((c) => ({ ...c, requests: Math.max(0, c.requests - 1) }));
  };

  const totalNotifications = counts.unread + counts.requests;

  return (
    <main className="min-h-screen bg-[#101922] text-white flex justify-center">
      <div className="w-full max-w-xl">

        {/* ================= HEADER ================= */}
        <header className="sticky top-0 z-40 bg-[#101922]/90 backdrop-blur border-b border-slate-800">
          <div className="flex items-center justify-between p-4 relative">
            <button onClick={() => router.back()}>←</button>

            <h1 className="font-bold text-lg">Chats</h1>

            <div className="relative w-8 h-8">
              <AnimatePresence>
                {totalNotifications > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 bg-primary text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
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

        {/* ================= CONTENT ================= */}
        <div className="p-4 space-y-4">

          {loading && (
            <p className="text-slate-400 text-center">Loading…</p>
          )}

          {/* ================= INBOX ================= */}
          <AnimatePresence>
            {!loading && tab === "inbox" && rooms.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-400 text-center mt-10"
              >
                No conversations yet
              </motion.p>
            )}
          </AnimatePresence>

          {/* ================= REQUESTS ================= */}
          <AnimatePresence>
            {!loading && tab === "requests" && requests.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-400 text-center mt-10"
              >
                No pending requests
              </motion.p>
            )}

            {!loading &&
              tab === "requests" &&
              requests.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#192633] border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex gap-4">
                    <img
                      src={
                        r.sender?.profile_image ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${r.sender?.username || "user"}`
                      }
                      alt={r.sender?.username || "User"}
                      className="w-14 h-14 rounded-full border border-primary/40 object-cover"
                    />

                    <div className="flex-1">
                      <p className="font-bold">
                        @{r.sender?.username || "Unknown"}
                      </p>
                      <p className="text-sm text-[#92adc9] italic">
                        “{r.msg}”
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => respond(r.id, "reject")}
                      className="flex-1 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => respond(r.id, "accept")}
                      className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 transition"
                    >
                      Accept
                    </button>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

/* ================= TAB ================= */
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
      className={`flex-1 py-3 text-sm font-bold transition ${
        active
          ? "border-b-2 border-primary text-primary"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
