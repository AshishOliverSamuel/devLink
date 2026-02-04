"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome,
  FiMessageCircle,
  FiCompass,
  FiUser,
  FiPlus,
} from "react-icons/fi";
import { apiFetch } from "@/lib/api";

export default function AppFooter() {
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";

  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    apiFetch("/chat/counts")
      .then((res) => {
        const total =
          (res?.requests || 0) + (res?.unread_messages || 0);
        setChatCount(total);
      })
      .catch(() => {});
  }, []);

  const displayCount =
    chatCount > 9 ? "9+" : chatCount.toString();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#101922]/95 border-t border-slate-800 backdrop-blur px-6 pt-3 pb-6 flex justify-between max-w-6xl mx-auto z-50">
      <Nav
        icon={<FiHome />}
        label="Feed"
        active={isDashboard}
        onClick={() => router.push("/dashboard")}
      />

      <Nav
        label="Chat"
        onClick={() => router.push("/chat")}
        icon={
          <div className="relative">
            <AnimatePresence>
              {chatCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-2 bg-primary text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center"
                >
                  {displayCount}
                </motion.span>
              )}
            </AnimatePresence>

            <motion.div
              animate={
                chatCount > 0
                  ? { scale: [1, 1.15, 1] }
                  : { scale: 1 }
              }
              transition={
                chatCount > 0
                  ? { repeat: Infinity, duration: 1.4 }
                  : undefined
              }
            >
              <FiMessageCircle />
            </motion.div>
          </div>
        }
      />

      {isDashboard && (
        <button
          onClick={() => router.push("/create-post")}
          className="-top-6 relative w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg shadow-primary/30 bg-blue-500"
        >
          <FiPlus size={24} />
        </button>
      )}

      <Nav
        icon={<FiCompass />}
        label="Discover"
        onClick={() => router.push("/search")}
      />

      <Nav
        icon={<FiUser />}
        label="Profile"
        onClick={() => router.push("/me")}
      />
    </nav>
  );
}

function Nav({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 font-bold
        text-[10px] lg:text-[12px]
        ${active ? "text-primary" : "text-slate-400"}
        hover:text-blue-500`}
    >
      <div className="text-base lg:text-lg">{icon}</div>
      {label}
    </button>
  );
}
