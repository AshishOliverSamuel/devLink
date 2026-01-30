"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  FiHome,
  FiMessageCircle,
  FiCompass,
  FiUser,
  FiPlus,
} from "react-icons/fi";

export default function AppFooter() {
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#101922]/95 border-t border-slate-800 backdrop-blur px-6 pt-3 pb-6 flex justify-between max-w-6xl mx-auto z-50">
      <Nav
        icon={<FiHome />}
        label="Feed"
        active={isDashboard}
        onClick={() => router.push("/dashboard")}
      />

      <Nav
        icon={<FiMessageCircle />}
        label="Chat"
        onClick={() => router.push("/chats")}
      />

      {isDashboard && (
        <button
          onClick={() => router.push("/post/create")}
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
