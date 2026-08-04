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
    <div className="page-container emp-container" style={{ overflowY: "hidden", padding: 0 }}>
      <div className="page-section active" style={{ height: "calc(100vh - 140px)", overflow: "hidden", padding: 0 }}>
        <ChatView user={user} />
      </div>
    </div>
  );
}
