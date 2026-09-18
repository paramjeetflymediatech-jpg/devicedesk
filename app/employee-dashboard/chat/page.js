"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import ChatView from "../../components/ChatView.js";

export default function ChatWorkspacePage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  return (
    <div className="w-full h-[calc(100vh-60px)] md:h-[calc(100vh-80px)] flex flex-col p-2 md:p-4">
      <div className="flex-1 w-full relative" style={{ overflow: "hidden", padding: 0 }}>
        <ChatView user={user} />
      </div>
    </div>
  );
}
