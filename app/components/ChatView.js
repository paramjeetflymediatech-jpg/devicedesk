"use client";

import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { io } from "socket.io-client";

export default function ChatView({ user }) {
  const [employees, setEmployees] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState("general"); // 'general', 'dept_DepartmentName', group ID, or employee ID
  const [messageText, setMessageText] = useState("");
  const [uploading, setUploading] = useState(false);

  // Socket.io states
  const [onlineUsersList, setOnlineUsersList] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});
  const socketRef = useRef(null);

  // Right Sidebar: Details & Media States
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null);
  const [mediaFilter, setMediaFilter] = useState("all");

  // Message Edit / Delete / Clear Chat States
  const [clearedChats, setClearedChats] = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");

  // Forward Message States
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");
  const [forwardTargetId, setForwardTargetId] = useState("");

  // Three Dots Context Menu State
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null);

  // Pin Chat State
  const [pinnedChats, setPinnedChats] = useState([]);

  // Responsive Mobile Toggle
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  // All Members Modal State
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [membersSearchQuery, setMembersSearchQuery] = useState("");

  // Add Members Modal State
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [addMembersSelected, setAddMembersSelected] = useState([]);
  const [addMembersSearchQuery, setAddMembersSearchQuery] = useState("");

  // Create Group Modal State
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Camera Capture State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Refs for Chat
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Polling Interval Ref
  const pollingRef = useRef(null);

  // Get current user's department
  const currentDept = user?.department || "";

  // Unread Tracking States
  const [unreadCounts, setUnreadCounts] = useState({});
  const lastReadTimestamps = useRef({});

  // Request notification permission and load read timestamps on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devicedesk_chat_last_read");
      if (stored) {
        try {
          lastReadTimestamps.current = JSON.parse(stored);
        } catch (e) {
          lastReadTimestamps.current = {};
        }
      }
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Update read timestamp when room changes
  useEffect(() => {
    if (activeChatId) {
      lastReadTimestamps.current[activeChatId.toLowerCase()] = new Date().toISOString();
      if (typeof window !== "undefined") {
        localStorage.setItem("devicedesk_chat_last_read", JSON.stringify(lastReadTimestamps.current));
      }
      recalculateUnread(messages);
    }
  }, [activeChatId]);

  // Recalculate unread messages counts
  const recalculateUnread = (allMsgs) => {
    const counts = {};
    const currentUserId = String(user?.id || "").toLowerCase();
    const activeChatIdLower = String(activeChatId).toLowerCase();

    allMsgs.forEach(msg => {
      const msgSenderIdLower = String(msg.senderId).toLowerCase();
      const msgReceiverIdLower = String(msg.receiverId).toLowerCase();

      // Skip own messages
      if (msgSenderIdLower === currentUserId) return;

      // Determine chat room key
      let roomKey = msgReceiverIdLower;
      if (roomKey !== "general" && !roomKey.startsWith("dept_") && !roomKey.startsWith("group_")) {
        // Direct Message: room is the other user's ID
        roomKey = msgSenderIdLower;
      }

      // Check if room is active
      const isRoomActive = roomKey === activeChatIdLower;
      if (isRoomActive) return;

      // Check if message is newer than last read timestamp
      const lastRead = lastReadTimestamps.current[roomKey] || "1970-01-01T00:00:00.000Z";
      if (msg.timestamp > lastRead) {
        counts[roomKey] = (counts[roomKey] || 0) + 1;
      }
    });

    setUnreadCounts(counts);

    // Compute total unread count across all rooms
    const totalUnread = Object.values(counts).reduce((a, b) => a + b, 0);
    if (typeof window !== "undefined") {
      localStorage.setItem("devicedesk_unread_chat_count", totalUnread);
      window.dispatchEvent(new CustomEvent("devicedesk_unread_chat_changed", { detail: totalUnread }));
    }
  };

  // Play notification chime sound
  const playNotificationSound = () => {
    try {
      const soundEnabled = localStorage.getItem("devicedesk_sound_enabled") !== "false";
      if (!soundEnabled) return;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playTone = (freq, start, duration) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        
        gainNode.gain.setValueAtTime(0.08, start);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      playTone(900, now, 0.15);
      playTone(1100, now + 0.08, 0.2);
    } catch (err) {
      console.warn("Failed to play notification audio:", err);
    }
  };

  // Desktop Toast Notification
  const showDesktopNotification = (msg) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const bodyText = msg.messageType === "text" ? msg.content : `Shared a ${msg.messageType}`;
      new Notification(`New message from ${msg.senderName}`, {
        body: bodyText,
        icon: "/flymedia-logo-white.png"
      });
    }
  };

  // Scroll to bottom when messages or active chat change
  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChatId]);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch Employees and Chat History on Mount
  useEffect(() => {
    fetchEmployees();
    fetchChatHistory();

    // Start polling for new messages every 2 seconds
    pollingRef.current = setInterval(fetchChatHistory, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      stopRecordingStream();
      stopCameraStream();
    };
  }, []);

  // Seed lastSeen from DB on mount (survives socket-server restarts)
  useEffect(() => {
    fetch('/api/presence')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.lastSeen) {
          setLastSeenMap(prev => ({ ...data.lastSeen, ...prev }));
        }
      })
      .catch(() => {});
  }, []);

  // Socket.io client connection and events subscription
  useEffect(() => {
    if (!user || !user.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:3001`;
    console.log("Connecting to Socket.io server at:", socketUrl);

    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket.io connected:", socket.id);
      socket.emit("register-user", user.id);
      socket.emit("join-room", "general");
      if (user.department) {
        socket.emit("join-room", `dept_${user.department}`);
      }
    });

    socket.on("online-users", (users) => {
      console.log("Online users list received:", users);
      setOnlineUsersList(users.map(u => String(u).toLowerCase()));
    });

    socket.on("last-seen", (map) => {
      // Normalise all keys to lowercase
      const normalised = {};
      Object.entries(map || {}).forEach(([k, v]) => { normalised[String(k).toLowerCase()] = v; });
      setLastSeenMap(normalised);
    });

    socket.on("receive-message", (message) => {
      console.log("Real-time message received:", message);
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });

      const isOwnMsg = String(message.senderId).toLowerCase() === String(user.id).toLowerCase();
      if (!isOwnMsg) {
        playNotificationChime();
        showDesktopNotification(message);
      }
    });

    socket.on("message-edited", (data) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
          return { ...m, content: data.content, isEdited: 1, editedAt: data.editedAt };
        }
        return m;
      }));
    });

    socket.on("message-deleted", (data) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
          if (data.deleteType === 'everyone') {
            return { ...m, deletedForEveryone: 1 };
          }
        }
        return m;
      }));
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  // Join group chat rooms dynamically when groups are updated
  useEffect(() => {
    if (socketRef.current && groups.length > 0) {
      groups.forEach(group => {
        socketRef.current.emit("join-room", group.id);
      });
    }
  }, [groups]);

  // Load clearedChats from localStorage on mount
  useEffect(() => {
    try {
      if (user?.id) {
        const saved = localStorage.getItem(`devicedesk_cleared_chats_${user.id}`);
        if (saved) {
          setClearedChats(JSON.parse(saved));
        }
      }
    } catch (e) {}
  }, [user]);

  // Load pinnedChats from localStorage on mount
  useEffect(() => {
    try {
      if (user?.id) {
        const saved = localStorage.getItem(`devicedesk_pinned_chats_${user.id}`);
        if (saved) {
          setPinnedChats(JSON.parse(saved));
        }
      }
    } catch (e) {}
  }, [user]);

  const isPinned = (chatId) => pinnedChats.includes(String(chatId).toLowerCase());

  const togglePinChat = (chatId, e) => {
    if (e) e.stopPropagation();
    const chatKey = String(chatId).toLowerCase();
    let updated;
    if (pinnedChats.includes(chatKey)) {
      updated = pinnedChats.filter(id => id !== chatKey);
    } else {
      updated = [...pinnedChats, chatKey];
    }
    setPinnedChats(updated);
    try {
      localStorage.setItem(`devicedesk_pinned_chats_${user?.id}`, JSON.stringify(updated));
    } catch (err) {}
  };

  // Close message options context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest || !e.target.closest(".msg-menu-container")) {
        setActiveMenuMessageId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Returns a human-readable "Last seen X ago" string from an ISO timestamp
  const formatLastSeen = (isoTimestamp) => {
    if (!isoTimestamp) return "Last seen: unknown";
    const diff = Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000);
    if (diff < 60) return "Last seen: just now";
    if (diff < 3600) {
      const mins = Math.floor(diff / 60);
      return `Last seen: ${mins} min${mins === 1 ? "" : "s"} ago`;
    }
    if (diff < 86400) {
      const hrs = Math.floor(diff / 3600);
      return `Last seen: ${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    }
    // Show date if more than 24h ago
    const d = new Date(isoTimestamp);
    return `Last seen: ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/db");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Error fetching employees for chat list:", err);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await fetch("/api/chat");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Update messages if changed
          setMessages(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.messages)) {
              if (prev.length > 0 && data.messages.length > prev.length) {
                const lastMsg = data.messages[data.messages.length - 1];
                const isOwnLast = String(lastMsg.senderId).toLowerCase() === String(user?.id || "").toLowerCase();
                
                if (!isOwnLast) {
                  playNotificationSound();
                  showDesktopNotification(lastMsg);
                }
              }
              return data.messages;
            }
            return prev;
          });

          // Update groups if changed
          setGroups(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.groups)) {
              return data.groups || [];
            }
            return prev;
          });

          // Always recalculate unread counts on fresh fetch
          recalculateUnread(data.messages);
        }
      }
    } catch (err) {
      console.error("Error polling chat history:", err);
    }
  };

  // 2. Sending Messages
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageText.trim()) return;

    const payload = {
      receiverId: activeChatId,
      messageType: "text",
      content: messageText.trim()
    };

    setMessageText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          socketRef.current?.emit("send-message", data.message);
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
        fetchChatHistory();
      } else {
        const errData = await res.json();
        Swal.fire("Error", errData.error || "Failed to send message", "error");
      }
    } catch (err) {
      console.error("Send message error:", err);
      Swal.fire("Error", "Network error. Failed to send message.", "error");
    }
  };

  // 3. Custom Group Creation
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      Swal.fire("Error", "Group name is required", "error");
      return;
    }
    if (selectedMembers.length === 0) {
      Swal.fire("Error", "Please select at least one group member", "error");
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createGroup",
          name: newGroupName.trim(),
          members: selectedMembers
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire("Success", `Group "${newGroupName}" created successfully!`, "success");
        setNewGroupName("");
        setSelectedMembers([]);
        setShowCreateGroupModal(false);
        fetchChatHistory();
        
        // Auto-select newly created group
        if (data.group && data.group.id) {
          setActiveChatId(data.group.id);
          setShowMobileSidebar(false);
        }
      } else {
        Swal.fire("Error", data.error || "Failed to create group", "error");
      }
    } catch (err) {
      console.error("Create group error:", err);
      Swal.fire("Error", "Network error. Failed to create group.", "error");
    }
  };

  const handleRemoveMember = async (employeeId, employeeName) => {
    const isSelf = String(employeeId).toLowerCase() === String(user?.id || "").toLowerCase();
    const confirmText = isSelf 
      ? "Are you sure you want to leave this group?" 
      : `Are you sure you want to remove "${employeeName}" from this group?`;

    const result = await Swal.fire({
      title: isSelf ? "Leave Group?" : "Remove Member?",
      text: confirmText,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--status-critical)",
      cancelButtonColor: "#6e7881",
      confirmButtonText: isSelf ? "Yes, leave" : "Yes, remove"
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "removeGroupMember",
            groupId: activeChatId,
            employeeId
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          Swal.fire(
            isSelf ? "Left!" : "Removed!",
            isSelf ? "You have successfully left the group." : `${employeeName} has been removed from the group.`,
            "success"
          );
          
          if (isSelf) {
            setActiveChatId("general");
          }
          fetchChatHistory();
        } else {
          Swal.fire("Error", data.error || "Failed to remove member", "error");
        }
      } catch (err) {
        console.error("Remove member error:", err);
        Swal.fire("Error", "Network error. Failed to remove member.", "error");
      }
    }
  };

  const handleAddMembers = async (e) => {
    if (e) e.preventDefault();
    if (addMembersSelected.length === 0) {
      Swal.fire("Error", "Please select at least one employee", "error");
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addGroupMembers",
          groupId: activeChatId,
          members: addMembersSelected
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire("Success", "Members added successfully!", "success");
        setAddMembersSelected([]);
        setShowAddMembersModal(false);
        fetchChatHistory();
      } else {
        Swal.fire("Error", data.error || "Failed to add members", "error");
      }
    } catch (err) {
      console.error("Add members error:", err);
      Swal.fire("Error", "Network error. Failed to add members.", "error");
    }
  };

  const cropAndUploadImage = (file, isGroup = false) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          Swal.fire({
            title: isGroup ? "Adjust Group Icon" : "Adjust Profile Picture",
            html: `
              <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin: 10px 0;">
                <div style="position:relative; width:180px; height:180px; border-radius:${isGroup ? '12px' : '50%'}; overflow:hidden; border:3px solid var(--accent-cyan); background:#000; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                  <canvas id="crop-canvas" width="180" height="180" style="cursor:move; display:block;"></canvas>
                </div>
                <div style="display:flex; align-items:center; gap:10px; width:100%; max-width:200px; margin-top:8px;">
                  <span style="font-size:12px;">➖</span>
                  <input type="range" id="crop-zoom" min="1" max="4" step="0.05" value="1" style="flex-grow:1; accent-color:var(--accent-cyan); cursor:pointer;" />
                  <span style="font-size:12px;">➕</span>
                </div>
                <p style="font-size:0.75rem; color:var(--text-secondary); margin:0;">Drag to adjust position • Use slider to zoom</p>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Apply & Upload",
            cancelButtonText: "Cancel",
            confirmButtonColor: "var(--accent-cyan)",
            cancelButtonColor: "#6e7881",
            background: "#161b22",
            color: "#f0f6fc",
            didOpen: (popup) => {
              const canvas = popup.querySelector("#crop-canvas");
              const ctx = canvas.getContext("2d");
              const zoomInput = popup.querySelector("#crop-zoom");

              let zoom = 1;
              let offsetX = 0;
              let offsetY = 0;
              let isDragging = false;
              let startX = 0;
              let startY = 0;

              const draw = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const minScale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const scale = minScale * zoom;
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (canvas.width - w) / 2 + offsetX;
                const y = (canvas.height - h) / 2 + offsetY;
                ctx.drawImage(img, x, y, w, h);
              };

              draw();

              zoomInput.oninput = (e) => {
                zoom = parseFloat(e.target.value);
                draw();
              };

              canvas.onmousedown = (e) => {
                isDragging = true;
                startX = e.clientX - offsetX;
                startY = e.clientY - offsetY;
              };

              window.onmousemove = (e) => {
                if (!isDragging) return;
                offsetX = e.clientX - startX;
                offsetY = e.clientY - startY;
                draw();
              };

              window.onmouseup = () => {
                isDragging = false;
              };

              canvas.ontouchstart = (e) => {
                isDragging = true;
                const touch = e.touches[0];
                startX = touch.clientX - offsetX;
                startY = touch.clientY - offsetY;
              };

              canvas.ontouchmove = (e) => {
                if (!isDragging) return;
                const touch = e.touches[0];
                offsetX = touch.clientX - startX;
                offsetY = touch.clientY - startY;
                draw();
              };

              canvas.ontouchend = () => {
                isDragging = false;
              };
            },
            preConfirm: () => {
              const canvas = document.getElementById("crop-canvas");
              return new Promise((res) => {
                canvas.toBlob((blob) => {
                  res(blob);
                }, "image/jpeg", 0.9);
              });
            }
          }).then((result) => {
            if (result.isConfirmed && result.value) {
              resolve(result.value);
            } else {
              reject(new Error("Cancelled"));
            }
          });
        };
        img.src = event.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleUpdateProfilePictureClick = async () => {
    const currentEmp = employees.find(e => String(e.id).toLowerCase() === String(user?.id).toLowerCase());
    const hasAvatar = !!currentEmp?.avatarUrl;

    if (hasAvatar) {
      const choice = await Swal.fire({
        title: "Profile Picture Options",
        text: "Would you like to upload a new photo or remove the current one?",
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Upload New",
        denyButtonText: "Remove Current",
        cancelButtonText: "Cancel",
        confirmButtonColor: "var(--accent-cyan)",
        denyButtonColor: "var(--status-critical)",
        cancelButtonColor: "#6e7881",
        background: '#161b22',
        color: '#f0f6fc'
      });

      if (choice.isDenied) {
        Swal.fire({
          title: "Removing Profile Picture...",
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });
        try {
          const saveRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateProfilePicture", avatarUrl: null })
          });
          const saveData = await saveRes.json();
          if (saveRes.ok && saveData.success) {
            Swal.fire("Removed", "Your profile picture has been removed.", "success");
            fetchEmployees();
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("devicedesk_db_synced"));
            }
          } else {
            Swal.fire("Error", saveData.error || "Failed to remove profile picture", "error");
          }
        } catch (err) {
          console.error("Remove profile picture error:", err);
          Swal.fire("Error", "Network error. Failed to remove profile picture.", "error");
        }
        return;
      }

      if (!choice.isConfirmed) {
        return;
      }
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const croppedBlob = await cropAndUploadImage(file, false);

        Swal.fire({
          title: "Uploading Profile Picture...",
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });

        const formData = new FormData();
        formData.append("file", croppedBlob, "profile.jpg");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success && uploadData.fileUrls?.length > 0) {
          const avatarUrl = uploadData.fileUrls[0];

          const saveRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateProfilePicture", avatarUrl })
          });

          const saveData = await saveRes.json();
          if (saveRes.ok && saveData.success) {
            Swal.fire("Success", "Profile picture updated successfully!", "success");
            fetchEmployees();
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("devicedesk_db_synced"));
            }
          } else {
            Swal.fire("Error", saveData.error || "Failed to update profile picture", "error");
          }
        } else {
          Swal.fire("Error", uploadData.error || "Upload failed", "error");
        }
      } catch (err) {
        if (err.message !== "Cancelled") {
          console.error("Upload avatar error:", err);
          Swal.fire("Error", err.message || "Upload failed.", "error");
        }
      }
    };
    input.click();
  };

  const handleUpdateGroupAvatarClick = async (groupId) => {
    const group = groups.find(g => g.id === groupId);
    const hasAvatar = !!group?.avatarUrl;

    if (hasAvatar) {
      const choice = await Swal.fire({
        title: "Group Icon Options",
        text: "Would you like to upload a new icon or remove the current one?",
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Upload New",
        denyButtonText: "Remove Current",
        cancelButtonText: "Cancel",
        confirmButtonColor: "var(--accent-cyan)",
        denyButtonColor: "var(--status-critical)",
        cancelButtonColor: "#6e7881",
        background: '#161b22',
        color: '#f0f6fc'
      });

      if (choice.isDenied) {
        Swal.fire({
          title: "Removing Group Icon...",
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });
        try {
          const saveRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateGroupAvatar", groupId, avatarUrl: null })
          });
          const saveData = await saveRes.json();
          if (saveRes.ok && saveData.success) {
            Swal.fire("Removed", "Group icon has been removed.", "success");
            fetchChatHistory();
          } else {
            Swal.fire("Error", saveData.error || "Failed to remove group icon", "error");
          }
        } catch (err) {
          console.error("Remove group icon error:", err);
          Swal.fire("Error", "Network error. Failed to remove group icon.", "error");
        }
        return;
      }

      if (!choice.isConfirmed) {
        return;
      }
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const croppedBlob = await cropAndUploadImage(file, true);

        Swal.fire({
          title: "Uploading Group Icon...",
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });

        const formData = new FormData();
        formData.append("file", croppedBlob, "group.jpg");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success && uploadData.fileUrls?.length > 0) {
          const avatarUrl = uploadData.fileUrls[0];

          const saveRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateGroupAvatar", groupId, avatarUrl })
          });

          const saveData = await saveRes.json();
          if (saveRes.ok && saveData.success) {
            Swal.fire("Success", "Group icon updated successfully!", "success");
            fetchChatHistory();
          } else {
            Swal.fire("Error", saveData.error || "Failed to update group icon", "error");
          }
        } else {
          Swal.fire("Error", uploadData.error || "Upload failed", "error");
        }
      } catch (err) {
        if (err.message !== "Cancelled") {
          console.error("Upload group avatar error:", err);
          Swal.fire("Error", err.message || "Upload failed.", "error");
        }
      }
    };
    input.click();
  };

  const toggleMemberSelection = (empId) => {
    setSelectedMembers(prev => {
      if (prev.includes(empId)) {
        return prev.filter(id => id !== empId);
      } else {
        return [...prev, empId];
      }
    });
  };

  const toggleAddMemberSelection = (empId) => {
    setAddMembersSelected(prev => {
      if (prev.includes(empId)) {
        return prev.filter(id => id !== empId);
      } else {
        return [...prev, empId];
      }
    });
  };

  // 4. Audio Recording Implementation
  const startRecording = async () => {
    audioChunksRef.current = [];
    setRecordingTime(0);
    setRecordedBlob(null);
    setRecordedUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to access microphone:", err);
      Swal.fire("Microphone Error", "Could not access your microphone. Please verify permissions.", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      stopRecordingStream();
    }
  };

  const cancelRecording = () => {
    stopRecordingStream();
    setRecordedBlob(null);
    setRecordedUrl(null);
  };

  const stopRecordingStream = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const sendVoiceNote = async () => {
    if (!recordedBlob) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", recordedBlob, `voice_note_${Date.now()}.webm`);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload audio file");
      }

      const fileUrl = uploadData.fileUrls[0];
      const payload = {
        receiverId: activeChatId,
        messageType: "audio",
        fileUrl,
        fileName: "Voice Note",
        fileSize: formatBytes(recordedBlob.size)
      };

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (chatRes.ok) {
        const data = await chatRes.json();
        if (data.success && data.message) {
          socketRef.current?.emit("send-message", data.message);
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
        fetchChatHistory();
        cancelRecording();
      } else {
        const chatErr = await chatRes.json();
        Swal.fire("Error", chatErr.error || "Failed to send voice note", "error");
      }
    } catch (err) {
      console.error("Upload/Send voice note error:", err);
      Swal.fire("Error", err.message || "Failed to send voice note.", "error");
    } finally {
      setUploading(false);
    }
  };

  // 5. Camera Snapshot Capture
  const openCamera = async () => {
    setCapturedBlob(null);
    setCapturedUrl(null);
    setShowCameraModal(true);

    // Timeout to let video render in DOM
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to access camera:", err);
        Swal.fire("Camera Error", "Could not access your camera. Please check permissions.", "error");
        setShowCameraModal(false);
      }
    }, 200);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Match canvas dimensions to video aspect
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        stopCameraStream();
      }, "image/jpeg", 0.9);
    }
  };

  const retakePhoto = async () => {
    setCapturedBlob(null);
    setCapturedUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Retake camera access failed:", err);
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setCapturedBlob(null);
    setCapturedUrl(null);
    setShowCameraModal(false);
  };

  const sendCameraPhoto = async () => {
    if (!capturedBlob) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", capturedBlob, `camera_${Date.now()}.jpg`);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload snapshot");
      }

      const fileUrl = uploadData.fileUrls[0];
      const payload = {
        receiverId: activeChatId,
        messageType: "image",
        fileUrl,
        fileName: "Camera Snapshot",
        fileSize: formatBytes(capturedBlob.size)
      };

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (chatRes.ok) {
        const data = await chatRes.json();
        if (data.success && data.message) {
          socketRef.current?.emit("send-message", data.message);
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
        fetchChatHistory();
        closeCameraModal();
      } else {
        const chatErr = await chatRes.json();
        Swal.fire("Error", chatErr.error || "Failed to send photo", "error");
      }
    } catch (err) {
      console.error("Upload/Send camera photo error:", err);
      Swal.fire("Error", err.message || "Failed to send camera photo.", "error");
    } finally {
      setUploading(false);
    }
  };

  // 6. File Attachment Uploads
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Upload rejected.");
      }

      const fileUrl = uploadData.fileUrls[0];
      
      // Categorize type
      let messageType = "file";
      const ext = file.name.split(".").pop().toLowerCase();
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
        messageType = "image";
      } else if (["mp4", "webm", "mov"].includes(ext)) {
        messageType = "video";
      } else if (["mp3", "wav", "m4a", "ogg"].includes(ext)) {
        messageType = "audio";
      }

      const payload = {
        receiverId: activeChatId,
        messageType,
        fileUrl,
        fileName: file.name,
        fileSize: formatBytes(file.size)
      };

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (chatRes.ok) {
        const data = await chatRes.json();
        if (data.success && data.message) {
          socketRef.current?.emit("send-message", data.message);
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
        fetchChatHistory();
      } else {
        const chatErr = await chatRes.json();
        Swal.fire("Error", chatErr.error || "Failed to send attachment", "error");
      }
    } catch (err) {
      console.error("File attachment upload error:", err);
      Swal.fire("Error", err.message || "File upload failed. Ensure the format is supported.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Helpers
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const getGradient = (name) => {
    const code = (name || "").charCodeAt(0) || 0;
    const gradients = [
      "linear-gradient(135deg, #00f0ff, #3b82f6)",
      "linear-gradient(135deg, #8b5cf6, #ec4899)",
      "linear-gradient(135deg, #10b981, #059669)",
      "linear-gradient(135deg, #f59e0b, #d97706)",
      "linear-gradient(135deg, #3b82f6, #8b5cf6)"
    ];
    return gradients[code % gradients.length];
  };

  const renderAvatar = (type, item, size = "36px", borderRadius = null) => {
    const defaultRadius = type === "group" ? "8px" : "50%";
    const finalRadius = borderRadius || defaultRadius;

    if (item?.avatarUrl) {
      return (
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <img 
            src={item.avatarUrl} 
            alt={item.name || "Avatar"} 
            style={{
              width: "100%",
              height: "100%",
              borderRadius: finalRadius,
              objectFit: "cover",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
            }}
          />
        </div>
      );
    }

    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: finalRadius,
        background: getGradient(item?.name || ""),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "700",
        fontSize: size === "60px" ? "1.4rem" : (size === "20px" || size === "28px") ? "0.65rem" : "0.85rem",
        color: "#fff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        flexShrink: 0
      }}>
        {getInitials(item?.name || "")}
      </div>
    );
  };

  // Group Messages by date
  const getGroupedMessages = () => {
    const filtered = getActiveConversationMessages();

    const groups = {};
    filtered.forEach(msg => {
      if (!msg.timestamp) return;
      const date = new Date(msg.timestamp).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const filteredEmployees = employees.filter(emp => {
    if (String(emp.id).toLowerCase() === String(user?.id || "").toLowerCase()) return false;
    return emp.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredEmployeesForGroup = employees.filter(emp => {
    if (String(emp.id).toLowerCase() === String(user?.id || "").toLowerCase()) return false;
    return emp.name.toLowerCase().includes(groupSearchQuery.toLowerCase());
  });

  const getLastMessageInfo = (chatId) => {
    const targetId = String(chatId).toLowerCase();
    const currentUserId = String(user?.id || "").toLowerCase();

    let lastMsg = null;
    messages.forEach(msg => {
      let isMatch = false;
      if (targetId === "general") {
        isMatch = msg.receiverId === "general";
      } else if (targetId.startsWith("dept_") || targetId.startsWith("group_")) {
        isMatch = String(msg.receiverId).toLowerCase() === targetId;
      } else {
        const sender = String(msg.senderId).toLowerCase();
        const receiver = String(msg.receiverId).toLowerCase();
        isMatch = (sender === currentUserId && receiver === targetId) || (sender === targetId && receiver === currentUserId);
      }
      if (isMatch && msg.timestamp) {
        if (!lastMsg || new Date(msg.timestamp).getTime() > new Date(lastMsg.timestamp).getTime()) {
          lastMsg = msg;
        }
      }
    });

    return {
      timestamp: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0,
      timeFormatted: lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
      content: lastMsg ? (
        lastMsg.deletedForEveryone ? "🚫 Message deleted" :
        lastMsg.messageType === "image" ? "📷 Photo" :
        lastMsg.messageType === "video" ? "🎥 Video" :
        lastMsg.messageType === "audio" ? "🎙️ Voice Note" :
        lastMsg.messageType === "file" ? `📎 ${lastMsg.fileName || "File"}` :
        lastMsg.content?.replace(/^↪️ Forwarded\n?/, "↪️ ") || ""
      ) : ""
    };
  };

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const isPinnedA = isPinned(a.id);
    const isPinnedB = isPinned(b.id);
    if (isPinnedA && !isPinnedB) return -1;
    if (!isPinnedA && isPinnedB) return 1;

    const timeA = getLastMessageInfo(a.id).timestamp;
    const timeB = getLastMessageInfo(b.id).timestamp;
    if (timeA !== timeB) return timeB - timeA;
    return a.name.localeCompare(b.name);
  });

  const sortedGroups = [...groups].sort((a, b) => {
    const isPinnedA = isPinned(a.id);
    const isPinnedB = isPinned(b.id);
    if (isPinnedA && !isPinnedB) return -1;
    if (!isPinnedA && isPinnedB) return 1;

    const timeA = getLastMessageInfo(a.id).timestamp;
    const timeB = getLastMessageInfo(b.id).timestamp;
    if (timeA !== timeB) return timeB - timeA;
    return a.name.localeCompare(b.name);
  });

  const getGroupMemberNames = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || !group.memberIds) return "No members";
    const ids = group.memberIds.split(",");
    
    // Map ids to names
    const names = ids.map(id => {
      if (String(id).toLowerCase() === String(user?.id || "").toLowerCase()) return "You";
      return employees.find(e => String(e.id).toLowerCase() === String(id).toLowerCase())?.name || id;
    });

    return names.join(", ");
  };

  const getActiveConversationMessages = () => {
    const currentUserId = String(user?.id || "").toLowerCase();
    const activeChatIdLower = String(activeChatId).toLowerCase();

    return messages.filter(msg => {
      let isForChat = false;
      if (activeChatIdLower === "general") {
        isForChat = msg.receiverId === "general";
      } else if (activeChatIdLower.startsWith("dept_") || activeChatIdLower.startsWith("group_")) {
        isForChat = String(msg.receiverId).toLowerCase() === activeChatIdLower;
      } else {
        const msgSenderIdLower = String(msg.senderId).toLowerCase();
        const msgReceiverIdLower = String(msg.receiverId).toLowerCase();
        isForChat = (msgSenderIdLower === currentUserId && msgReceiverIdLower === activeChatIdLower) ||
                    (msgSenderIdLower === activeChatIdLower && msgReceiverIdLower === currentUserId);
      }
      if (!isForChat) return false;

      // Filter out if deleted for self
      let deletedUsers = [];
      try {
        if (msg.deletedForUsers) {
          deletedUsers = typeof msg.deletedForUsers === 'string' ? JSON.parse(msg.deletedForUsers) : msg.deletedForUsers;
        }
      } catch (e) {}
      if (deletedUsers.some(u => String(u).toLowerCase() === currentUserId)) return false;

      // Filter out if chat was cleared prior to message timestamp
      const clearedTimestamp = clearedChats[activeChatIdLower];
      if (clearedTimestamp && new Date(msg.timestamp).getTime() <= new Date(clearedTimestamp).getTime()) {
        return false;
      }

      return true;
    });
  };

  const handleClearChatDisplay = async () => {
    const confirm = await Swal.fire({
      title: "Clear Chat Display?",
      text: "This will clear past messages from your screen for this chat. (Other members will still see their chat history).",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Clear Chat",
      cancelButtonText: "Cancel",
      confirmButtonColor: "var(--accent-cyan)",
      cancelButtonColor: "#6e7881",
      background: "#161b22",
      color: "#f0f6fc"
    });

    if (confirm.isConfirmed) {
      const nowIso = new Date().toISOString();
      const chatKey = String(activeChatId).toLowerCase();
      const updated = { ...clearedChats, [chatKey]: nowIso };
      setClearedChats(updated);
      try {
        localStorage.setItem(`devicedesk_cleared_chats_${user?.id}`, JSON.stringify(updated));
      } catch (e) {}
      Swal.fire({
        icon: "success",
        title: "Chat Cleared",
        text: "Past messages hidden from your display.",
        timer: 1500,
        showConfirmButton: false,
        background: "#161b22",
        color: "#f0f6fc"
      });
    }
  };

  const handleSaveEditMessage = async (msgId) => {
    if (!editingText.trim()) return;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "editMessage", messageId: msgId, content: editingText.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: data.content, isEdited: 1, editedAt: data.editedAt } : m));
        if (socketRef.current) {
          socketRef.current.emit("edit-message", { messageId: msgId, content: data.content, isEdited: 1, editedAt: data.editedAt, receiverId: activeChatId, senderId: user.id });
        }
        setEditingMessageId(null);
        setEditingText("");
      } else {
        Swal.fire({ icon: "error", title: "Cannot Edit", text: data.error || "Failed to edit message", background: "#161b22", color: "#f0f6fc" });
      }
    } catch (err) {
      console.error("Edit message error:", err);
    }
  };

  const handleDeleteMessage = async (msg) => {
    const isOwn = String(msg.senderId).toLowerCase() === String(user?.id || "").toLowerCase();
    const diffMins = (Date.now() - new Date(msg.timestamp).getTime()) / (1000 * 60);
    const canDeleteEveryone = isOwn && diffMins <= 15 && !msg.deletedForEveryone;

    if (canDeleteEveryone) {
      const choice = await Swal.fire({
        title: "Delete Message",
        text: "Would you like to delete this message for everyone or only for yourself?",
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Delete for Everyone",
        denyButtonText: "Delete for Me",
        cancelButtonText: "Cancel",
        confirmButtonColor: "var(--status-critical)",
        denyButtonColor: "#6e7881",
        cancelButtonColor: "#30363d",
        background: "#161b22",
        color: "#f0f6fc"
      });

      if (choice.isConfirmed) {
        // Delete for Everyone
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteMessage", messageId: msg.id, deleteType: "everyone" })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deletedForEveryone: 1 } : m));
          if (socketRef.current) {
            socketRef.current.emit("delete-message", { messageId: msg.id, deleteType: "everyone", receiverId: activeChatId, senderId: user.id });
          }
        } else {
          Swal.fire({ icon: "error", title: "Error", text: data.error || "Failed to delete message", background: "#161b22", color: "#f0f6fc" });
        }
      } else if (choice.isDenied) {
        // Delete for Me
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteMessage", messageId: msg.id, deleteType: "self" })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setMessages(prev => prev.map(m => {
            if (m.id === msg.id) {
              let deletedUsers = [];
              try { deletedUsers = typeof m.deletedForUsers === 'string' ? JSON.parse(m.deletedForUsers) : (m.deletedForUsers || []); } catch(e){}
              if (!deletedUsers.includes(user.id)) deletedUsers.push(user.id);
              return { ...m, deletedForUsers: JSON.stringify(deletedUsers) };
            }
            return m;
          }));
        }
      }
    } else {
      // Older message or someone else's message: Delete for Me
      const confirm = await Swal.fire({
        title: "Delete for Me?",
        text: isOwn && diffMins > 15 ? "This message is older than 15 minutes and can only be deleted for yourself." : "Remove this message from your display?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete for Me",
        cancelButtonText: "Cancel",
        confirmButtonColor: "var(--status-critical)",
        background: "#161b22",
        color: "#f0f6fc"
      });

      if (confirm.isConfirmed) {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteMessage", messageId: msg.id, deleteType: "self" })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setMessages(prev => prev.map(m => {
            if (m.id === msg.id) {
              let deletedUsers = [];
              try { deletedUsers = typeof m.deletedForUsers === 'string' ? JSON.parse(m.deletedForUsers) : (m.deletedForUsers || []); } catch(e){}
              if (!deletedUsers.includes(user.id)) deletedUsers.push(user.id);
              return { ...m, deletedForUsers: JSON.stringify(deletedUsers) };
            }
            return m;
          }));
        }
      }
    }
  };

  const handleConfirmForward = async () => {
    if (!forwardingMessage || !forwardTargetId) return;

    try {
      const payload = {
        receiverId: forwardTargetId,
        messageType: forwardingMessage.messageType || "text",
        content: forwardingMessage.content ? `↪️ Forwarded\n${forwardingMessage.content}` : "↪️ Forwarded",
        fileUrl: forwardingMessage.fileUrl || null,
        fileName: forwardingMessage.fileName || null,
        fileSize: forwardingMessage.fileSize || null
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          socketRef.current?.emit("send-message", data.message);
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
        setShowForwardModal(false);
        setForwardingMessage(null);
        setForwardTargetId("");
        Swal.fire({
          icon: "success",
          title: "Message Forwarded",
          timer: 1500,
          showConfirmButton: false,
          background: "#161b22",
          color: "#f0f6fc"
        });
      } else {
        const errData = await res.json();
        Swal.fire("Error", errData.error || "Failed to forward message", "error");
      }
    } catch (err) {
      console.error("Forward message error:", err);
      Swal.fire("Error", "Failed to forward message.", "error");
    }
  };

  const handleShowMessageOptions = async (msg) => {
    const isOwn = String(msg.senderId).toLowerCase() === String(user?.id || "").toLowerCase();
    const msgAgeMins = (Date.now() - new Date(msg.timestamp).getTime()) / (1000 * 60);
    const canEdit = isOwn && msgAgeMins <= 15 && msg.messageType === "text" && !msg.deletedForEveryone;

    const inputOptions = {
      forward: "↪️ Forward Message",
      ...(canEdit ? { edit: "✏️ Edit Message" } : {}),
      delete: "🗑️ Delete Message"
    };

    const { value: action } = await Swal.fire({
      title: "Message Options",
      input: "radio",
      inputOptions: inputOptions,
      inputValidator: (value) => {
        if (!value) return "Please select an option";
      },
      showCancelButton: true,
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel",
      confirmButtonColor: "var(--accent-cyan)",
      cancelButtonColor: "#6e7881",
      background: "#161b22",
      color: "#f0f6fc"
    });

    if (action === "forward") {
      setForwardingMessage(msg);
      setForwardTargetId("");
      setForwardSearchQuery("");
      setShowForwardModal(true);
    } else if (action === "edit") {
      setEditingMessageId(msg.id);
      setEditingText(msg.content || "");
    } else if (action === "delete") {
      handleDeleteMessage(msg);
    }
  };

  const getSharedMediaAndFiles = () => {
    const activeMsgs = getActiveConversationMessages();
    const media = [];
    const docs = [];
    const links = [];

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    activeMsgs.forEach(msg => {
      if (msg.messageType === "image" || msg.messageType === "video") {
        media.push({
          id: msg.id,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
          fileUrl: msg.fileUrl || msg.content,
          type: msg.messageType
        });
      } else if (msg.messageType === "file" || msg.messageType === "audio") {
        docs.push({
          id: msg.id,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
          fileName: msg.fileName || (msg.messageType === "audio" ? "Voice Note.webm" : "Attachment"),
          fileUrl: msg.fileUrl,
          fileSize: msg.fileSize,
          type: msg.messageType
        });
      } else if (msg.messageType === "text" && msg.content) {
        const matches = msg.content.match(urlRegex);
        if (matches) {
          matches.forEach(url => {
            links.push({
              id: `${msg.id}_${url}`,
              senderName: msg.senderName,
              timestamp: msg.timestamp,
              url: url
            });
          });
        }
      }
    });

    return { media, docs, links };
  };

  const groupedMessages = getGroupedMessages();
  
  // Resolve title
  let selectedChatName = "General Chat";
  if (activeChatId.startsWith("dept_")) {
    selectedChatName = `${activeChatId.replace("dept_", "")} Department`;
  } else if (activeChatId.startsWith("group_")) {
    selectedChatName = groups.find(g => g.id === activeChatId)?.name || "Group Chat";
  } else if (activeChatId !== "general") {
    selectedChatName = employees.find(e => e.id === activeChatId)?.name || "Direct Message";
  }

  return (
    <div style={{
      display: "flex",
      width: "100%",
      height: "100%",
      minHeight: "550px",
      borderRadius: "20px",
      background: "var(--bg-secondary)",
      border: "1px solid var(--glass-border)",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* LEFT SIDEBAR: List DMs, Groups and Channels */}
      <div 
        className="chat-sidebar"
        style={{
          width: "320px",
          borderRight: "1px solid var(--glass-border)",
          background: "rgba(10, 11, 16, 0.5)",
          display: showMobileSidebar ? "flex" : "none",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0
      }}>
        {/* Search Header */}
        <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--glass-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--accent-cyan)", margin: 0 }}>💬 Teams Chat</h3>
            <div 
              onClick={handleUpdateProfilePictureClick}
              style={{ position: "relative", cursor: "pointer" }}
              title="Change Profile Picture"
            >
              {(() => {
                const currentUserEmp = employees.find(e => String(e.id).toLowerCase() === String(user?.id || "").toLowerCase());
                return renderAvatar("employee", currentUserEmp, "32px");
              })()}
              <div style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                background: "var(--accent-cyan)",
                borderRadius: "50%",
                width: "12px",
                height: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "7px",
                color: "#000",
                border: "1px solid var(--bg-secondary)"
              }}>
                📷
              </div>
            </div>
          </div>
          <input
            type="text"
            placeholder="Search chats or members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--glass-border)",
              color: "#fff",
              outline: "none",
              fontSize: "0.85rem",
              fontFamily: "var(--font-main)"
            }}
          />
        </div>

        {/* Scrollable list */}
        <div style={{ flexGrow: 1, overflowY: "auto", padding: "0.5rem" }}>
          {/* Section: Channels */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Channels</div>
            
            {/* General Channel */}
            <div 
              onClick={() => { setActiveChatId("general"); setShowMobileSidebar(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 12px",
                margin: "2px 0",
                borderRadius: "10px",
                cursor: "pointer",
                background: activeChatId === "general" ? "rgba(255, 255, 255, 0.05)" : "transparent",
                border: activeChatId === "general" ? "1px solid var(--glass-border)" : "1px solid transparent",
                transition: "background 0.2s"
              }}
            >
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, #4f46e5, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", marginRight: "10px" }}>🏢</div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "180px" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>General Office Chat</div>
                  {unreadCounts["general"] > 0 && (
                    <span style={{ background: "var(--status-critical)", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "0.7rem", fontWeight: "700" }}>
                      {unreadCounts["general"]}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Everyone in company</div>
              </div>
            </div>

            {/* Department Channel */}
            {currentDept && (
              <div 
                onClick={() => { setActiveChatId(`dept_${currentDept}`); setShowMobileSidebar(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 12px",
                  margin: "2px 0",
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: activeChatId === `dept_${currentDept}` ? "rgba(255, 255, 255, 0.05)" : "transparent",
                  border: activeChatId === `dept_${currentDept}` ? "1px solid var(--glass-border)" : "1px solid transparent",
                  transition: "background 0.2s"
                }}
              >
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, #7c3aed, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", marginRight: "10px" }}>💻</div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "180px" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>{currentDept} Team</div>
                    {unreadCounts[`dept_${currentDept}`.toLowerCase()] > 0 && (
                      <span style={{ background: "var(--status-critical)", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "0.7rem", fontWeight: "700" }}>
                        {unreadCounts[`dept_${currentDept}`.toLowerCase()]}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Only {currentDept} members</div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Custom Groups */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Group Chats</span>
              <button 
                onClick={() => setShowCreateGroupModal(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-cyan)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: "600"
                }}
              >
                ➕ Create
              </button>
            </div>
            
            {sortedGroups.length === 0 ? (
              <div style={{ padding: "0.5rem 0.75rem", fontStyle: "italic", fontSize: "0.8rem", color: "var(--text-muted)" }}>No groups joined</div>
            ) : (
              sortedGroups.map(group => {
                const lastMsgInfo = getLastMessageInfo(group.id);
                return (
                  <div 
                    key={group.id}
                    onClick={() => { setActiveChatId(group.id); setShowMobileSidebar(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 12px",
                      margin: "2px 0",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: activeChatId === group.id ? "rgba(255, 255, 255, 0.05)" : "transparent",
                      border: activeChatId === group.id ? "1px solid var(--glass-border)" : "1px solid transparent",
                      transition: "background 0.2s"
                    }}
                  >
                    <div style={{ marginRight: "10px" }}>
                      {renderAvatar("group", group, "36px")}
                    </div>
                    <div style={{ minWidth: 0, flexGrow: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexGrow: 1, display: "flex", alignItems: "center", gap: "4px" }}>
                          {group.name}
                          {isPinned(group.id) && <span style={{ fontSize: "0.75rem" }} title="Pinned group">📌</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {lastMsgInfo.timeFormatted && (
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{lastMsgInfo.timeFormatted}</span>
                          )}
                          <span 
                            onClick={(e) => togglePinChat(group.id, e)}
                            style={{ fontSize: "0.75rem", cursor: "pointer", opacity: isPinned(group.id) ? 1 : 0.4, padding: "2px" }}
                            title={isPinned(group.id) ? "Unpin group" : "Pin group"}
                          >
                            {isPinned(group.id) ? "📍" : "📌"}
                          </span>
                          {unreadCounts[group.id.toLowerCase()] > 0 && (
                            <span style={{ background: "var(--status-critical)", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "0.7rem", fontWeight: "700" }}>
                              {unreadCounts[group.id.toLowerCase()]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lastMsgInfo.content || `${group.memberIds ? group.memberIds.split(",").length : 0} members`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Section: Direct DMs */}
          <div>
            <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Direct Messages</div>
            {sortedEmployees.length === 0 ? (
              <div style={{ padding: "1rem", fontStyle: "italic", fontSize: "0.8rem", color: "var(--text-muted)" }}>No members found</div>
            ) : (
              sortedEmployees.map(emp => {
                const lastMsgInfo = getLastMessageInfo(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => { setActiveChatId(emp.id); setShowMobileSidebar(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 12px",
                      margin: "2px 0",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: activeChatId === emp.id ? "rgba(255, 255, 255, 0.05)" : "transparent",
                      border: activeChatId === emp.id ? "1px solid var(--glass-border)" : "1px solid transparent",
                      transition: "background 0.2s"
                    }}
                  >
                    <div style={{ marginRight: "10px" }}>
                      {renderAvatar("employee", emp, "36px")}
                    </div>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexGrow: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          {emp.name}
                          {isPinned(emp.id) && <span style={{ fontSize: "0.75rem" }} title="Pinned conversation">📌</span>}
                          <span 
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: onlineUsersList.includes(String(emp.id).toLowerCase()) ? "var(--status-success)" : "rgba(255, 255, 255, 0.25)",
                              display: "inline-block"
                            }}
                            title={onlineUsersList.includes(String(emp.id).toLowerCase()) ? "Online" : formatLastSeen(lastSeenMap[String(emp.id).toLowerCase()])}
                          />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {lastMsgInfo.timeFormatted && (
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{lastMsgInfo.timeFormatted}</span>
                          )}
                          <span 
                            onClick={(e) => togglePinChat(emp.id, e)}
                            style={{ fontSize: "0.75rem", cursor: "pointer", opacity: isPinned(emp.id) ? 1 : 0.4, padding: "2px" }}
                            title={isPinned(emp.id) ? "Unpin member" : "Pin member"}
                          >
                            {isPinned(emp.id) ? "📍" : "📌"}
                          </span>
                          {emp.status === "Paused" && <span style={{ fontSize: "0.6rem", background: "var(--status-critical)", padding: "1px 4px", borderRadius: "4px" }}>Paused</span>}
                          {unreadCounts[emp.id.toLowerCase()] > 0 && (
                            <span style={{ background: "var(--status-critical)", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "0.7rem", fontWeight: "700" }}>
                              {unreadCounts[emp.id.toLowerCase()]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lastMsgInfo.content || `${emp.role} • ${emp.department}`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Messaging Area */}
      <div style={{
        flexGrow: 1,
        display: !showMobileSidebar || window.innerWidth > 768 ? "flex" : "none",
        flexDirection: "row",
        height: "100%",
        background: "rgba(18, 20, 32, 0.3)",
        position: "relative"
      }}>
        {/* Middle Column: Chat Feed */}
        <div style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minWidth: 0,
          borderRight: showDetailsPanel ? "1px solid var(--glass-border)" : "none"
        }}>
        {/* Chat Header */}
        <div style={{
          padding: "1.25rem",
          borderBottom: "1px solid var(--glass-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10, 11, 16, 0.4)"
        }}>
          <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            {/* Mobile Back Button (only shown when sidebar is closed) */}
            {!showMobileSidebar && (
              <button 
                className="chat-back-button"
                onClick={() => setShowMobileSidebar(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-cyan)",
                  marginRight: "10px",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center"
                }}
                title="Back to Chat List"
              >
                ⬅️
              </button>
            )}

            {/* Conversation Avatar / Profile Picture */}
            <div style={{ marginRight: "12px", display: "flex", alignItems: "center" }}>
              {activeChatId === "general" ? (
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, #4f46e5, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🏢</div>
              ) : activeChatId.startsWith("dept_") ? (
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg, #7c3aed, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>💻</div>
              ) : activeChatId.startsWith("group_") ? (() => {
                const gp = groups.find(g => String(g.id).toLowerCase() === String(activeChatId).toLowerCase());
                return renderAvatar("group", gp, "36px");
              })() : (() => {
                const emp = employees.find(e => String(e.id).toLowerCase() === String(activeChatId).toLowerCase());
                return renderAvatar("employee", emp, "36px");
              })()}
            </div>

            <div style={{ minWidth: 0 }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedChatName}</h4>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeChatId === "general" 
                  ? "Open Company-wide Channel" 
                  : activeChatId.startsWith("dept_") 
                    ? `Only authorized ${activeChatId.replace("dept_", "")} personnel`
                    : activeChatId.startsWith("group_")
                      ? `Members: ${getGroupMemberNames(activeChatId)}`
                      : (() => {
                          const emp = employees.find(e => String(e.id).toLowerCase() === String(activeChatId).toLowerCase());
                          const isOnline = onlineUsersList.includes(String(activeChatId).toLowerCase());
                          const lastSeenStr = formatLastSeen(lastSeenMap[String(activeChatId).toLowerCase()]);
                          return `${isOnline ? "🟢 Online" : `⚪ ${lastSeenStr}`} — ${emp?.role || "Active Member"}`;
                        })()}
              </span>
            </div>
          </div>

          {/* Top Actions Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button 
              onClick={(e) => togglePinChat(activeChatId, e)}
              style={{
                background: isPinned(activeChatId) ? "rgba(255, 215, 0, 0.15)" : "none",
                border: isPinned(activeChatId) ? "1px solid rgba(255, 215, 0, 0.4)" : "1px solid var(--glass-border)",
                color: isPinned(activeChatId) ? "#ffd700" : "var(--text-secondary)",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8rem",
                fontWeight: "600",
                transition: "background 0.2s"
              }}
              title={isPinned(activeChatId) ? "Unpin chat" : "Pin chat to top"}
            >
              {isPinned(activeChatId) ? "📍 Pinned" : "📌 Pin"}
            </button>
            <button 
              onClick={handleClearChatDisplay}
              style={{
                background: "none",
                border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8rem",
                fontWeight: "600",
                transition: "background 0.2s"
              }}
              title="Clear chat display for me"
            >
              🧹 Clear Chat
            </button>
            <button 
              onClick={() => setShowDetailsPanel(!showDetailsPanel)}
              style={{
                background: showDetailsPanel ? "rgba(255, 255, 255, 0.15)" : "none",
                border: "1px solid var(--glass-border)",
                color: "var(--text-main)",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.8rem",
                fontWeight: "600",
                transition: "background 0.2s"
              }}
              title="Conversation details & shared files"
            >
              ℹ️ Info
            </button>
          </div>
        </div>

        {/* Messages Feed */}
        <div style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem"
        }}>
          {Object.keys(groupedMessages).length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyStyle: "center", flexGrow: 1, marginTop: "20%" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>💬</div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No messages here yet. Break the ice!</p>
            </div>
          ) : (
            Object.keys(groupedMessages).map(date => (
              <div key={date} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Date Divider */}
                <div style={{ display: "flex", alignItems: "center", width: "100%", margin: "0.5rem 0" }}>
                  <div style={{ flexGrow: 1, height: "1px", background: "var(--glass-border)" }} />
                  <span style={{ fontSize: "0.7rem", padding: "0 10px", color: "var(--text-muted)", fontWeight: "600" }}>{date}</span>
                  <div style={{ flexGrow: 1, height: "1px", background: "var(--glass-border)" }} />
                </div>

                {/* Date messages list */}
                {groupedMessages[date].map(msg => {
                  const isOwn = String(msg.senderId).toLowerCase() === String(user?.id || "").toLowerCase();
                  const msgAgeMins = (Date.now() - new Date(msg.timestamp).getTime()) / (1000 * 60);
                  const canEdit = isOwn && msgAgeMins <= 15 && msg.messageType === "text" && !msg.deletedForEveryone;
                  const canDelete = !msg.deletedForEveryone;

                  return (
                    <div 
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: isOwn ? "flex-end" : "flex-start",
                        width: "100%"
                      }}
                    >
                      <div style={{
                        maxWidth: "70%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isOwn ? "flex-end" : "flex-start",
                        marginLeft: isOwn ? "auto" : "0",
                        marginRight: isOwn ? "0" : "auto"
                      }}>
                        {/* Sender name (for channel/group chats and not own) */}
                        {!isOwn && (activeChatId === "general" || activeChatId.startsWith("dept_") || activeChatId.startsWith("group_")) && (
                          <span style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", fontWeight: "600", marginBottom: "4px" }}>
                            {msg.senderName}
                          </span>
                        )}

                        {/* Bubble Container with Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexDirection: isOwn ? "row-reverse" : "row", width: "100%" }}>
                          {/* Deleted message indicator */}
                          {msg.deletedForEveryone ? (
                            <div style={{
                              padding: "8px 12px",
                              borderRadius: "10px",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid var(--glass-border)",
                              color: "var(--text-muted)",
                              fontSize: "0.8rem",
                              fontStyle: "italic",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px"
                            }}>
                              <span>🚫</span> This message was deleted
                            </div>
                          ) : editingMessageId === msg.id ? (
                            /* Inline Edit Box */
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", minWidth: "220px", background: "rgba(0,0,0,0.4)", padding: "8px", borderRadius: "8px", border: "1px solid var(--accent-cyan)" }}>
                              <input 
                                type="text" 
                                value={editingText} 
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEditMessage(msg.id); if (e.key === 'Escape') setEditingMessageId(null); }}
                                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--glass-border)", borderRadius: "4px", color: "#fff", padding: "6px", fontSize: "0.85rem", width: "100%" }}
                                autoFocus
                              />
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                <button onClick={() => setEditingMessageId(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.75rem" }}>Cancel</button>
                                <button onClick={() => handleSaveEditMessage(msg.id)} style={{ background: "var(--accent-cyan)", border: "none", color: "#000", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "700" }}>Save</button>
                              </div>
                            </div>
                          ) : (
                            /* Normal Bubble */
                            <div style={{
                              padding: "10px 14px",
                              borderRadius: isOwn ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                              background: isOwn 
                                ? "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))" 
                                : "var(--bg-card)",
                              border: isOwn ? "none" : "1px solid var(--glass-border)",
                              color: "#fff",
                              fontSize: "0.85rem",
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                              wordBreak: "break-word"
                            }}>
                              {/* Render based on message type */}
                              {msg.messageType === "text" && (
                                <div>
                                  {msg.content?.startsWith("↪️ Forwarded") ? (
                                    <div>
                                      <span style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", fontWeight: "600", display: "block", marginBottom: "2px" }}>
                                        ↪️ Forwarded
                                      </span>
                                      <div>{msg.content.replace(/^↪️ Forwarded\n?/, "")}</div>
                                    </div>
                                  ) : (
                                    <div>{msg.content}</div>
                                  )}
                                </div>
                              )}

                              {msg.messageType === "image" && (
                                <div>
                                  {msg.content?.startsWith("↪️ Forwarded") && (
                                    <span style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                                      ↪️ Forwarded
                                    </span>
                                  )}
                                  {msg.content && !msg.content.startsWith("↪️ Forwarded") && <div style={{ marginBottom: "8px" }}>{msg.content}</div>}
                                  <img 
                                    src={msg.fileUrl} 
                                    alt={msg.fileName || "Shared media"}
                                    style={{ maxWidth: "100%", maxHeight: "250px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
                                    onClick={() => setPreviewMediaUrl(msg.fileUrl)}
                                  />
                                </div>
                              )}

                              {msg.messageType === "audio" && (
                                <div>
                                  {msg.content?.startsWith("↪️ Forwarded") && (
                                    <span style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                                      ↪️ Forwarded
                                    </span>
                                  )}
                                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <audio controls src={msg.fileUrl} style={{ width: "240px", height: "40px" }} />
                                    <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>🎙️ Voice Note ({msg.fileSize || "Size Unknown"})</span>
                                  </div>
                                </div>
                              )}

                              {msg.messageType === "file" && (
                                <div>
                                  {msg.content?.startsWith("↪️ Forwarded") && (
                                    <span style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                                      ↪️ Forwarded
                                    </span>
                                  )}
                                  <a 
                                    href={msg.fileUrl} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                      textDecoration: "none",
                                      color: "#fff",
                                      padding: "4px"
                                    }}
                                  >
                                    <span style={{ fontSize: "1.5rem" }}>📎</span>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontWeight: "600", fontSize: "0.8rem", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {msg.fileName || "Attachment File"}
                                      </div>
                                      <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>Download ({msg.fileSize || "Unknown"})</span>
                                    </div>
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Three Dots Action Menu Dropdown */}
                          {canDelete && editingMessageId !== msg.id && (
                            <div className="msg-menu-container" style={{ position: "relative", display: "inline-block" }}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuMessageId(prev => String(prev) === String(msg.id) ? null : String(msg.id));
                                }}
                                style={{
                                  background: "rgba(255, 255, 255, 0.12)",
                                  border: "1px solid var(--glass-border)",
                                  color: "var(--text-main)",
                                  cursor: "pointer",
                                  fontSize: "1rem",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  lineHeight: "1",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.2s"
                                }}
                                title="Message options"
                              >
                                ⋮
                              </button>

                              {/* Dropdown Menu Popup */}
                              {String(activeMenuMessageId) === String(msg.id) && (
                                <div 
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    [isOwn ? "right" : "left"]: 0,
                                    marginTop: "4px",
                                    background: "#161b22",
                                    border: "1px solid var(--glass-border)",
                                    borderRadius: "10px",
                                    boxShadow: "0 8px 28px rgba(0,0,0,0.8)",
                                    zIndex: 999,
                                    minWidth: "160px",
                                    padding: "6px 0",
                                    display: "flex",
                                    flexDirection: "column"
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Forward Option */}
                                  <button 
                                    onClick={() => {
                                      setActiveMenuMessageId(null);
                                      setForwardingMessage(msg);
                                      setForwardTargetId("");
                                      setForwardSearchQuery("");
                                      setShowForwardModal(true);
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "var(--text-main)",
                                      padding: "9px 14px",
                                      textAlign: "left",
                                      cursor: "pointer",
                                      fontSize: "0.85rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                      width: "100%",
                                      transition: "background 0.15s"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                  >
                                    <span style={{ fontSize: "1rem" }}>↪️</span> Forward
                                  </button>

                                  {/* Edit Option (if allowed) */}
                                  {canEdit && (
                                    <button 
                                      onClick={() => {
                                        setActiveMenuMessageId(null);
                                        setEditingMessageId(msg.id);
                                        setEditingText(msg.content || "");
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--text-main)",
                                        padding: "9px 14px",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        width: "100%",
                                        transition: "background 0.15s"
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                                      onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                    >
                                      <span style={{ fontSize: "1rem" }}>✏️</span> Edit
                                    </button>
                                  )}

                                  {/* Delete Option */}
                                  <button 
                                    onClick={() => {
                                      setActiveMenuMessageId(null);
                                      handleDeleteMessage(msg);
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#ff6b6b",
                                      padding: "9px 14px",
                                      textAlign: "left",
                                      cursor: "pointer",
                                      fontSize: "0.85rem",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                      width: "100%",
                                      transition: "background 0.15s"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(218, 54, 55, 0.15)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                  >
                                    <span style={{ fontSize: "1rem" }}>🗑️</span> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {(msg.isEdited === 1 || msg.isEdited === true) && (
                            <span style={{ marginLeft: "4px", opacity: 0.8, fontStyle: "italic" }}>(edited)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messageEndRef} />
        </div>

        {/* Voice Note Recording Preview */}
        {recordedUrl && (
          <div style={{
            padding: "1rem",
            background: "rgba(30, 32, 50, 0.95)",
            borderTop: "1px solid var(--glass-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.2rem" }}>🎙️</span>
              <span style={{ fontSize: "0.8rem", fontWeight: "600" }}>Voice Note Preview:</span>
              <audio src={recordedUrl} controls style={{ height: "36px" }} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={cancelRecording}
                disabled={uploading}
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid var(--status-critical)",
                  color: "var(--status-critical)",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.8rem"
                }}
              >
                Cancel
              </button>
              <button 
                onClick={sendVoiceNote}
                disabled={uploading}
                style={{
                  background: "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
                  border: "none",
                  color: "#fff",
                  padding: "6px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: "600"
                }}
              >
                {uploading ? "Sending..." : "Send Note"}
              </button>
            </div>
          </div>
        )}

        {/* Active Audio Recorder Panel */}
        {isRecording && (
          <div style={{
            padding: "1rem",
            background: "rgba(239, 68, 68, 0.12)",
            borderTop: "1px solid var(--status-critical)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "var(--status-critical)",
                animation: "pulse 1s infinite alternate"
              }} />
              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>
                Recording Audio: {formatTimer(recordingTime)}
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={cancelRecording}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  textDecoration: "underline"
                }}
              >
                Discard
              </button>
              <button 
                onClick={stopRecording}
                style={{
                  background: "var(--status-critical)",
                  border: "none",
                  color: "#fff",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "0.8rem"
                }}
              >
                Stop Recording
              </button>
            </div>
          </div>
        )}

        {/* Input Control Area */}
        <div style={{
          padding: "1.25rem",
          borderTop: "1px solid var(--glass-border)",
          background: "rgba(10, 11, 16, 0.4)"
        }}>
          <form onSubmit={handleSendMessage} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Pick file input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              onChange={handleFileChange}
            />

            {/* Media Options buttons */}
            <div style={{ display: "flex", gap: "6px" }}>
              {/* Attachment */}
              <button
                type="button"
                onClick={triggerFileSelect}
                title="Attach Document/Media"
                disabled={isRecording || uploading}
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
              >
                📎
              </button>

              {/* Camera snap */}
              <button
                type="button"
                onClick={openCamera}
                title="Snap Live Photo"
                disabled={isRecording || uploading}
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
              >
                📷
              </button>

              {/* Audio Note recorder */}
              <button
                type="button"
                onClick={startRecording}
                title="Record Voice Note"
                disabled={isRecording || uploading}
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
              >
                🎙️
              </button>
            </div>

            {/* Input field */}
            <input
              type="text"
              placeholder={isRecording ? "Finish recording to send..." : "Type a message..."}
              value={messageText}
              disabled={isRecording || uploading}
              onChange={(e) => setMessageText(e.target.value)}
              style={{
                flexGrow: 1,
                padding: "12px 16px",
                borderRadius: "10px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--glass-border)",
                color: "#fff",
                outline: "none",
                fontSize: "0.85rem",
                fontFamily: "var(--font-main)"
              }}
            />

            {/* Send Message Button */}
            <button
              type="submit"
              disabled={isRecording || uploading || !messageText.trim()}
              style={{
                background: messageText.trim() 
                  ? "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))" 
                  : "var(--bg-tertiary)",
                border: messageText.trim() ? "none" : "1px solid var(--glass-border)",
                color: messageText.trim() ? "#000" : "var(--text-muted)",
                width: "50px",
                height: "40px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                cursor: messageText.trim() ? "pointer" : "not-allowed",
                transition: "all 0.2s"
              }}
            >
              🚀
            </button>
          </form>
        </div>
        </div>

        {/* Right Column: Conversation Details & Media */}
        {showDetailsPanel && (
          <div style={{
            width: "320px",
            height: "100%",
            background: "rgba(15, 17, 26, 0.95)",
            borderLeft: "1px solid var(--glass-border)",
            display: "flex",
            flexDirection: "column",
            animation: "fade-in 0.3s ease",
            overflow: "hidden"
          }}>
            {/* Panel Header */}
            <div style={{
              padding: "1rem",
              borderBottom: "1px solid var(--glass-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(10, 11, 16, 0.4)"
            }}>
              <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                ℹ️ Chat Details
              </h4>
              <button 
                onClick={() => setShowDetailsPanel(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "1.1rem"
                }}
              >
                ✕
              </button>
            </div>

            {/* Panel Content (Scrollable) */}
            <div style={{
              flexGrow: 1,
              overflowY: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem"
            }}>
              {/* SECTION 1: Room Details Card */}
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--glass-border)",
                borderRadius: "12px",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center"
              }}>
                {/* DM / Group details */}
                {activeChatId.startsWith("group_") ? (
                  (() => {
                    const group = groups.find(g => g.id === activeChatId);
                    const memberIds = group?.memberIds ? group.memberIds.split(",") : [];
                    return (
                      <>
                        <div 
                          onClick={() => handleUpdateGroupAvatarClick(group.id)}
                          style={{ position: "relative", cursor: "pointer", marginBottom: "0.75rem" }}
                          title="Change Group Icon"
                        >
                          {renderAvatar("group", group, "60px", "12px")}
                          <div style={{
                            position: "absolute",
                            bottom: -4,
                            right: -4,
                            background: "var(--accent-cyan)",
                            borderRadius: "50%",
                            width: "20px",
                            height: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            color: "#000",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                            border: "2px solid var(--bg-tertiary)"
                          }}>
                            📷
                          </div>
                        </div>
                        <h5 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: "700" }}>{group?.name || "Group"}</h5>

                        {/* Group Admin row */}
                        {(() => {
                          const admin = employees.find(e => String(e.id).toLowerCase() === String(group?.createdBy || "").toLowerCase());
                          return admin ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem", background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: "8px", padding: "6px 10px" }}>
                              {renderAvatar("employee", admin, "22px")}
                              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                <span style={{ color: "#ffd700", fontWeight: "700" }}>👑 Admin: </span>{admin.name}
                              </span>
                            </div>
                          ) : null;
                        })()}
                        <div style={{ width: "100%", textAlign: "left" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <h6 style={{ margin: 0, fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>Members ({memberIds.length})</h6>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button 
                                onClick={() => { setAddMembersSelected([]); setAddMembersSearchQuery(""); setShowAddMembersModal(true); }}
                                style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer", fontSize: "0.7rem", fontWeight: "700", padding: 0 }}
                              >
                                ➕ Add
                              </button>
                              {memberIds.length > 5 && (
                                <button 
                                  onClick={() => { setMembersSearchQuery(""); setShowAllMembersModal(true); }}
                                  style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer", fontSize: "0.7rem", fontWeight: "700", padding: 0 }}
                                >
                                  See All
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
                            {memberIds.slice(0, 5).map(id => {
                              const emp = employees.find(e => String(e.id).toLowerCase() === String(id).toLowerCase());
                              const isSelf = String(id).toLowerCase() === String(user?.id || "").toLowerCase();
                              return (
                                <div key={id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", width: "100%" }}>
                                  {renderAvatar("employee", emp || { name: id }, "20px")}
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexGrow: 1 }}>
                                    {emp?.name || id} {isSelf && "(You)"}
                                    {String(id).toLowerCase() === String(group?.createdBy || "").toLowerCase() && (
                                      <span style={{ marginLeft: "4px", fontSize: "0.6rem", background: "rgba(255,215,0,0.15)", color: "#ffd700", border: "1px solid rgba(255,215,0,0.3)", borderRadius: "4px", padding: "1px 4px", fontWeight: "700" }}>👑 Admin</span>
                                    )}
                                  </span>
                                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginRight: "4px" }}>{emp?.role || "Member"}</span>
                                  <button 
                                    onClick={() => handleRemoveMember(id, emp?.name || id)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "var(--status-critical)",
                                      cursor: "pointer",
                                      fontSize: "0.7rem",
                                      padding: "2px",
                                      display: "flex",
                                      alignItems: "center"
                                    }}
                                    title={isSelf ? "Leave Group" : "Remove Member"}
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          {memberIds.length > 5 && (
                            <div style={{ textAlign: "center", marginTop: "8px" }}>
                              <button 
                                onClick={() => { setMembersSearchQuery(""); setShowAllMembersModal(true); }}
                                style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer", fontSize: "0.75rem", fontWeight: "700", textDecoration: "underline" }}
                              >
                                See all {memberIds.length} members
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()
                ) : activeChatId.startsWith("dept_") || activeChatId === "general" ? (
                  <>
                    <div style={{ width: "60px", height: "60px", borderRadius: "12px", background: activeChatId === "general" ? "linear-gradient(135deg, #4f46e5, #06b6d4)" : "linear-gradient(135deg, #7c3aed, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", marginBottom: "0.75rem", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                      {activeChatId === "general" ? "🏢" : "💻"}
                    </div>
                    <h5 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: "700" }}>{selectedChatName}</h5>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                      {activeChatId === "general" ? "Company-wide Announcements" : `${activeChatId.replace("dept_", "")} Team Channel`}
                    </p>
                    
                    <div style={{ width: "100%", textAlign: "left" }}>
                      {(() => {
                        const channelMembers = employees.filter(emp => activeChatId === "general" || String(emp.department).toLowerCase() === String(activeChatId.replace("dept_", "")).toLowerCase());
                        return (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <h6 style={{ margin: 0, fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>Channel Members ({channelMembers.length})</h6>
                              {channelMembers.length > 5 && (
                                <button 
                                  onClick={() => { setMembersSearchQuery(""); setShowAllMembersModal(true); }}
                                  style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer", fontSize: "0.7rem", fontWeight: "700", padding: 0 }}
                                >
                                  See All
                                </button>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
                              {channelMembers.slice(0, 5).map(emp => (
                                <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem" }}>
                                  {renderAvatar("employee", emp, "20px")}
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexGrow: 1 }}>{emp.name}</span>
                                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{emp.role}</span>
                                </div>
                              ))}
                            </div>
                            {channelMembers.length > 5 && (
                              <div style={{ textAlign: "center", marginTop: "8px" }}>
                                <button 
                                  onClick={() => { setMembersSearchQuery(""); setShowAllMembersModal(true); }}
                                  style={{ background: "none", border: "none", color: "var(--accent-cyan)", cursor: "pointer", fontSize: "0.75rem", fontWeight: "700", textDecoration: "underline" }}
                                >
                                  See all {channelMembers.length} members
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  (() => {
                    const emp = employees.find(e => String(e.id).toLowerCase() === String(activeChatId).toLowerCase());
                    return (
                      <>
                        {String(emp?.id).toLowerCase() === String(user?.id || "").toLowerCase() ? (
                          <div 
                            onClick={handleUpdateProfilePictureClick}
                            style={{ position: "relative", cursor: "pointer", marginBottom: "0.75rem" }}
                            title="Change Profile Picture"
                          >
                            {renderAvatar("employee", emp, "60px")}
                            <div style={{
                              position: "absolute",
                              bottom: -4,
                              right: -4,
                              background: "var(--accent-cyan)",
                              borderRadius: "50%",
                              width: "20px",
                              height: "20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              color: "#000",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                              border: "2px solid var(--bg-tertiary)"
                            }}>
                              📷
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginBottom: "0.75rem" }}>
                            {renderAvatar("employee", emp, "60px")}
                          </div>
                        )}
                        <h5 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: "700" }}>{emp?.name}</h5>
                        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.75rem", color: onlineUsersList.includes(String(emp?.id).toLowerCase()) ? "var(--status-success)" : "var(--text-secondary)" }}>
                          {onlineUsersList.includes(String(emp?.id).toLowerCase()) ? "🟢 Online" : `⚪ ${formatLastSeen(lastSeenMap[String(emp?.id).toLowerCase()])}`}
                        </p>
                        
                        <div style={{ width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.75rem" }}>
                          <div><strong style={{ color: "var(--text-secondary)" }}>Role:</strong> {emp?.role}</div>
                          <div><strong style={{ color: "var(--text-secondary)" }}>Department:</strong> {emp?.department}</div>
                          <div>
                            <strong style={{ color: "var(--text-secondary)" }}>Email:</strong>{" "}
                            <a href={`mailto:${emp?.email}`} style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}>
                              {emp?.email}
                            </a>
                          </div>
                        </div>
                      </>
                    );
                  })()
                )}

                <button 
                  onClick={(e) => togglePinChat(activeChatId, e)}
                  style={{
                    width: "100%",
                    background: isPinned(activeChatId) ? "rgba(255, 215, 0, 0.12)" : "rgba(255, 255, 255, 0.05)",
                    border: isPinned(activeChatId) ? "1px solid rgba(255, 215, 0, 0.3)" : "1px solid var(--glass-border)",
                    color: isPinned(activeChatId) ? "#ffd700" : "var(--text-main)",
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    marginTop: "14px",
                    marginBottom: "8px"
                  }}
                >
                  {isPinned(activeChatId) ? "📍 Unpin Conversation" : "📌 Pin Conversation"}
                </button>

                <button 
                  onClick={handleClearChatDisplay}
                  style={{
                    width: "100%",
                    background: "rgba(218, 54, 55, 0.12)",
                    border: "1px solid rgba(218, 54, 55, 0.3)",
                    color: "#ff6b6b",
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    marginTop: "14px"
                  }}
                >
                  🧹 Clear Chat Display
                </button>
              </div>

              {/* SECTION 2: Shared Files & Media Gallery */}
              <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: "250px" }}>
                <h5 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Shared Contents</h5>
                
                {/* Media Filters tabs */}
                <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--glass-border)", paddingBottom: "6px", marginBottom: "10px" }}>
                  {[
                    { id: "all", label: "📁 All" },
                    { id: "media", label: "🖼️ Media" },
                    { id: "docs", label: "📄 Docs" },
                    { id: "links", label: "🔗 Links" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setMediaFilter(tab.id)}
                      style={{
                        background: mediaFilter === tab.id ? "rgba(255, 255, 255, 0.1)" : "none",
                        border: "none",
                        color: mediaFilter === tab.id ? "var(--accent-cyan)" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "0.7rem",
                        fontWeight: "700",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        flexGrow: 1,
                        textAlign: "center"
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Filtered Content Area */}
                <div style={{ flexGrow: 1 }}>
                  {(() => {
                    const { media, docs, links } = getSharedMediaAndFiles();
                    
                    if (mediaFilter === "media") {
                      if (media.length === 0) return <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--text-muted)", padding: "10px 0" }}>No photos/videos shared</div>;
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                          {media.map(m => (
                            <div 
                              key={m.id} 
                              onClick={() => setPreviewMediaUrl(m.fileUrl)} 
                              title={`Shared by ${m.senderName}`}
                              style={{ 
                                display: "block", 
                                width: "100%", 
                                aspectRatio: "1", 
                                borderRadius: "8px", 
                                overflow: "hidden", 
                                border: "1px solid var(--glass-border)",
                                background: "#000",
                                cursor: "pointer"
                              }}
                            >
                              <img src={m.fileUrl} alt="shared" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      );
                    }

                    if (mediaFilter === "docs") {
                      if (docs.length === 0) return <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--text-muted)", padding: "10px 0" }}>No files shared</div>;
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {docs.map(d => (
                            <a 
                              key={d.id} 
                              href={d.fileUrl} 
                              download={d.fileName}
                              target="_blank" 
                              rel="noreferrer"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "8px",
                                background: "rgba(255, 255, 255, 0.03)",
                                border: "1px solid var(--glass-border)",
                                borderRadius: "8px",
                                textDecoration: "none",
                                color: "inherit",
                                fontSize: "0.75rem",
                                gap: "8px"
                              }}
                            >
                              <span style={{ fontSize: "1.2rem" }}>{d.type === "audio" ? "🎵" : "📄"}</span>
                              <div style={{ flexGrow: 1, minWidth: 0 }}>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "600" }}>{d.fileName}</div>
                                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{d.fileSize || "Unknown size"} • {d.senderName}</div>
                              </div>
                              <span style={{ fontSize: "0.9rem" }}>📥</span>
                            </a>
                          ))}
                        </div>
                      );
                    }

                    if (mediaFilter === "links") {
                      if (links.length === 0) return <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--text-muted)", padding: "10px 0" }}>No web links shared</div>;
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {links.map(l => (
                            <a 
                              key={l.id} 
                              href={l.url} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{
                                display: "block",
                                padding: "8px",
                                background: "rgba(255, 255, 255, 0.03)",
                                border: "1px solid var(--glass-border)",
                                borderRadius: "8px",
                                textDecoration: "none",
                                color: "var(--accent-cyan)",
                                fontSize: "0.75rem"
                              }}
                            >
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "600", textDecoration: "underline" }}>{l.url}</div>
                              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px" }}>Shared by {l.senderName}</div>
                            </a>
                          ))}
                        </div>
                      );
                    }

                    // "all" filter: combines them all
                    const allItems = [
                      ...media.map(m => ({ ...m, category: "media" })),
                      ...docs.map(d => ({ ...d, category: "docs" })),
                      ...links.map(l => ({ ...l, category: "links" }))
                    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                    if (allItems.length === 0) return <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--text-muted)", padding: "10px 0" }}>No files or links shared yet</div>;
                    
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {allItems.map(item => {
                          if (item.category === "media") {
                            return (
                              <div 
                                key={item.id} 
                                onClick={() => setPreviewMediaUrl(item.fileUrl)} 
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "8px",
                                  background: "rgba(255, 255, 255, 0.03)",
                                  border: "1px solid var(--glass-border)",
                                  borderRadius: "8px",
                                  color: "inherit",
                                  fontSize: "0.75rem",
                                  gap: "8px",
                                  cursor: "pointer"
                                }}
                              >
                                <img src={item.fileUrl} alt="shared" style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "cover" }} />
                                <div style={{ flexGrow: 1, minWidth: 0 }}>
                                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "600" }}>Image / Photo</div>
                                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Shared by {item.senderName}</div>
                                </div>
                                <span style={{ fontSize: "0.9rem" }}>👁️</span>
                              </div>
                            );
                          }
                          if (item.category === "docs") {
                            return (
                              <a 
                                key={item.id} 
                                href={item.fileUrl} 
                                download={item.fileName}
                                target="_blank" 
                                rel="noreferrer"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "8px",
                                  background: "rgba(255, 255, 255, 0.03)",
                                  border: "1px solid var(--glass-border)",
                                  borderRadius: "8px",
                                  textDecoration: "none",
                                  color: "inherit",
                                  fontSize: "0.75rem",
                                  gap: "8px"
                                }}
                              >
                                <span style={{ fontSize: "1.2rem" }}>{item.type === "audio" ? "🎵" : "📄"}</span>
                                <div style={{ flexGrow: 1, minWidth: 0 }}>
                                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "600" }}>{item.fileName}</div>
                                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{item.fileSize || "Audio"} • {item.senderName}</div>
                                </div>
                                <span style={{ fontSize: "0.9rem" }}>📥</span>
                              </a>
                            );
                          }
                          // link
                          return (
                            <a 
                              key={item.id} 
                              href={item.url} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{
                                display: "block",
                                padding: "8px",
                                background: "rgba(255, 255, 255, 0.03)",
                                border: "1px solid var(--glass-border)",
                                borderRadius: "8px",
                                textDecoration: "none",
                                color: "var(--accent-cyan)",
                                fontSize: "0.75rem"
                              }}
                            >
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: "600", textDecoration: "underline" }}>{item.url}</div>
                              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px" }}>Shared by {item.senderName}</div>
                            </a>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ALL MEMBERS MODAL */}
      {showAllMembersModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            background: "var(--bg-tertiary)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "460px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            animation: "scale-up 0.3s ease"
          }}>
            {/* Header */}
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#fff" }}>Conversation Members</h3>
              <button 
                onClick={() => setShowAllMembersModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.25rem" }}
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--glass-border)" }}>
              <input
                type="text"
                placeholder="Search member name or department..."
                value={membersSearchQuery}
                onChange={(e) => setMembersSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid var(--glass-border)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  outline: "none"
                }}
              />
            </div>

            {/* Scrollable Members List */}
            <div style={{ flexGrow: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(() => {
                // Get the raw members list for this room
                let rawMembers = [];
                if (activeChatId.startsWith("group_")) {
                  const group = groups.find(g => g.id === activeChatId);
                  const memberIds = group?.memberIds ? group.memberIds.split(",") : [];
                  rawMembers = memberIds.map(id => {
                    const emp = employees.find(e => String(e.id).toLowerCase() === String(id).toLowerCase());
                    return emp || { id, name: id, role: "Member", department: "External" };
                  });
                } else if (activeChatId.startsWith("dept_") || activeChatId === "general") {
                  rawMembers = employees.filter(emp => activeChatId === "general" || String(emp.department).toLowerCase() === String(activeChatId.replace("dept_", "")).toLowerCase());
                }

                // Filter by query
                const filtered = rawMembers.filter(emp => {
                  const q = membersSearchQuery.toLowerCase();
                  return emp.name?.toLowerCase().includes(q) || emp.department?.toLowerCase().includes(q) || emp.role?.toLowerCase().includes(q);
                });

                if (filtered.length === 0) {
                  return <div style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.85rem", padding: "20px 0" }}>No members found</div>;
                }

                return filtered.map(emp => {
                  const isSelf = String(emp.id).toLowerCase() === String(user?.id || "").toLowerCase();
                  return (
                    <div 
                      key={emp.id} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "12px", 
                        padding: "10px", 
                        background: "rgba(255,255,255,0.02)", 
                        border: "1px solid var(--glass-border)", 
                        borderRadius: "10px" 
                      }}
                    >
                      {renderAvatar("employee", emp, "32px")}
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {emp.name} {isSelf && "(You)"}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: emp.status === "Paused" ? "var(--status-critical)" : "var(--status-success)" }}>
                            ● {emp.status === "Paused" ? "Paused" : "Active"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{emp.role} • {emp.department}</span>
                          {emp.email && (
                            <a href={`mailto:${emp.email}`} style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", textDecoration: "underline" }}>
                              {emp.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBERS TO GROUP MODAL */}
      {showAddMembersModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            background: "var(--bg-tertiary)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "460px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            animation: "scale-up 0.3s ease"
          }}>
            {/* Header */}
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#fff" }}>Add Members to Group</h3>
              <button 
                onClick={() => setShowAddMembersModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.25rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMembers} style={{ display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden" }}>
              {/* Search Box */}
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--glass-border)" }}>
                <input
                  type="text"
                  placeholder="Search employee by name or department..."
                  value={addMembersSearchQuery}
                  onChange={(e) => setAddMembersSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid var(--glass-border)",
                    color: "#fff",
                    fontSize: "0.85rem",
                    outline: "none"
                  }}
                />
              </div>

              {/* Checklist */}
              <div style={{ flexGrow: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {(() => {
                  const group = groups.find(g => g.id === activeChatId);
                  const memberIds = group?.memberIds ? group.memberIds.split(",").map(id => id.toLowerCase()) : [];
                  
                  const notInGroup = employees.filter(emp => {
                    const isMember = memberIds.includes(String(emp.id).toLowerCase());
                    const matchesSearch = emp.name.toLowerCase().includes(addMembersSearchQuery.toLowerCase()) ||
                                         emp.department.toLowerCase().includes(addMembersSearchQuery.toLowerCase());
                    return !isMember && matchesSearch;
                  });

                  if (notInGroup.length === 0) {
                    return <div style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.85rem", padding: "20px 0" }}>No matching employees to add</div>;
                  }

                  return notInGroup.map(emp => {
                    const isChecked = addMembersSelected.includes(emp.id);
                    return (
                      <div 
                        key={emp.id} 
                        onClick={() => toggleAddMemberSelection(emp.id)}
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "12px", 
                          padding: "10px", 
                          background: isChecked ? "rgba(6, 182, 212, 0.1)" : "rgba(255,255,255,0.02)", 
                          border: isChecked ? "1px solid var(--accent-cyan)" : "1px solid var(--glass-border)", 
                          borderRadius: "10px",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by outer div onClick
                          style={{ cursor: "pointer" }}
                        />
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: getGradient(emp.name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "0.75rem" }}>
                          {getInitials(emp.name)}
                        </div>
                        <div style={{ minWidth: 0, flexGrow: 1 }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: "600", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.name}</div>
                          <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{emp.role} • {emp.department}</div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Submit Footer */}
              <div style={{ padding: "1.25rem", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddMembersModal(false)}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "#fff", padding: "8px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMembersSelected.length === 0}
                  style={{
                    background: addMembersSelected.length > 0 ? "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))" : "var(--bg-tertiary)",
                    border: addMembersSelected.length > 0 ? "none" : "1px solid var(--glass-border)",
                    color: addMembersSelected.length > 0 ? "#000" : "var(--text-muted)",
                    padding: "8px 24px",
                    borderRadius: "10px",
                    cursor: addMembersSelected.length > 0 ? "pointer" : "not-allowed",
                    fontWeight: "700",
                    fontSize: "0.85rem"
                  }}
                >
                  Add Selected ({addMembersSelected.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--glass-border)",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "480px",
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontWeight: "700", color: "var(--accent-cyan)", margin: 0 }}>👥 Create Custom Group Chat</h4>
              <button 
                onClick={() => { setShowCreateGroupModal(false); setSelectedMembers([]); setNewGroupName(""); }}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateGroup} style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "500px" }}>
              <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
                {/* Group Name Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Group Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. IT support & Devs"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--glass-border)",
                      color: "#fff",
                      outline: "none",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>

                {/* Member Search */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Select Group Members</label>
                  <input 
                    type="text"
                    placeholder="Search directory..."
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--glass-border)",
                      color: "#fff",
                      outline: "none",
                      fontSize: "0.8rem",
                      marginBottom: "6px"
                    }}
                  />
                </div>

                {/* Member List Checklist */}
                <div style={{
                  maxHeight: "180px",
                  overflowY: "auto",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "10px",
                  padding: "6px",
                  background: "rgba(0,0,0,0.2)"
                }}>
                  {filteredEmployeesForGroup.length === 0 ? (
                    <div style={{ padding: "10px", fontStyle: "italic", fontSize: "0.8rem", color: "var(--text-muted)" }}>No members found</div>
                  ) : (
                    filteredEmployeesForGroup.map(emp => (
                      <div 
                        key={emp.id}
                        onClick={() => toggleMemberSelection(emp.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: selectedMembers.includes(emp.id) ? "rgba(0, 240, 255, 0.08)" : "transparent",
                          transition: "background 0.2s"
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedMembers.includes(emp.id)}
                          onChange={() => {}} // handled by parent onClick
                          style={{ marginRight: "10px", pointerEvents: "none" }}
                        />
                        <div style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: getGradient(emp.name),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "0.7rem",
                          color: "#fff",
                          marginRight: "8px"
                        }}>
                          {getInitials(emp.name)}
                        </div>
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: "600", display: "block" }}>{emp.name}</span>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{emp.role} • {emp.department}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ padding: "1.25rem", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button 
                  type="button"
                  onClick={() => { setShowCreateGroupModal(false); setSelectedMembers([]); setNewGroupName(""); }}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "#fff", padding: "8px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newGroupName.trim() || selectedMembers.length === 0}
                  style={{
                    background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
                    border: "none",
                    color: "#000",
                    padding: "8px 24px",
                    borderRadius: "10px",
                    cursor: (!newGroupName.trim() || selectedMembers.length === 0) ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    fontSize: "0.85rem"
                  }}
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMERA VIEWFINDER MODAL */}
      {showCameraModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--glass-border)",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "600px",
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontWeight: "700", color: "var(--accent-cyan)" }}>📷 Capture Live Photo</h4>
              <button 
                onClick={closeCameraModal}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            {/* Video Feed / Photo Preview */}
            <div style={{ position: "relative", width: "100%", background: "#000", minHeight: "350px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!capturedUrl ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: "100%", maxHeight: "400px", objectFit: "contain" }}
                />
              ) : (
                <img 
                  src={capturedUrl} 
                  alt="Snapshot captured" 
                  style={{ width: "100%", maxHeight: "400px", objectFit: "contain" }}
                />
              )}
              {/* Hidden Canvas for rasterization */}
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>

            {/* Modal Actions */}
            <div style={{ padding: "1.25rem", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {!capturedUrl ? (
                <>
                  <button 
                    onClick={closeCameraModal}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "#fff", padding: "8px 16px", borderRadius: "10px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={capturePhoto}
                    style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))", border: "none", color: "#000", padding: "8px 20px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" }}
                  >
                    Snap Photo
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={retakePhoto}
                    disabled={uploading}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--glass-border)", color: "#fff", padding: "8px 16px", borderRadius: "10px", cursor: "pointer" }}
                  >
                    Retake
                  </button>
                  <button 
                    onClick={sendCameraPhoto}
                    disabled={uploading}
                    style={{ background: "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))", border: "none", color: "#fff", padding: "8px 24px", borderRadius: "10px", cursor: "pointer", fontWeight: "700" }}
                  >
                    {uploading ? "Uploading..." : "Send Photo"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* IN-PAGE MEDIA LIGHTBOX VIEWER MODAL */}
      {previewMediaUrl && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            zIndex: 999999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setPreviewMediaUrl(null)}
        >
          {/* Top Control Bar */}
          <div 
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              zIndex: 1000000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <a 
              href={previewMediaUrl} 
              download
              className="btn-secondary"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              📥 Download File
            </a>
            <button
              onClick={() => setPreviewMediaUrl(null)}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#fff",
                fontSize: "1.4rem",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s"
              }}
              title="Close Preview (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Media Content Display */}
          <div 
            style={{
              maxWidth: "92vw",
              maxHeight: "88vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/\.(mp4|webm|ogg|mov|mkv|avi|m4v|3gp)$/i.test(previewMediaUrl) ? (
              <video 
                src={previewMediaUrl} 
                controls 
                autoPlay
                style={{
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
                  outline: "none"
                }} 
              />
            ) : /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(previewMediaUrl) ? (
              <img 
                src={previewMediaUrl} 
                alt="Media Preview" 
                style={{
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  objectFit: "contain",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.8)"
                }} 
              />
            ) : /\.pdf$/i.test(previewMediaUrl) ? (
              <iframe 
                src={previewMediaUrl} 
                style={{
                  width: "82vw",
                  height: "82vh",
                  border: "none",
                  borderRadius: "12px",
                  background: "#fff"
                }}
                title="PDF Document Preview"
              />
            ) : (
              <div style={{ background: "#161b22", padding: "2.5rem", borderRadius: "16px", textAlign: "center", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: "3.5rem" }}>📄</span>
                <h4 style={{ margin: "1rem 0 0.5rem 0" }}>File Preview</h4>
                <p style={{ margin: "0 0 1.5rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  {previewMediaUrl.split('/').pop()}
                </p>
                <a href={previewMediaUrl} download className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  📥 Download Attachment
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FORWARD MESSAGE MODAL */}
      {showForwardModal && (
        <div className="modal-overlay active" onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}>
          <div className="modal-card" style={{ maxWidth: "480px", width: "92%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                ↪️ Forward Message To...
              </h3>
              <button className="modal-close" onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}>&times;</button>
            </div>

            {/* Message Preview snippet */}
            {forwardingMessage && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", padding: "10px 14px", borderRadius: "10px", margin: "1rem 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                  Preview message:
                </span>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {forwardingMessage.content?.replace(/^↪️ Forwarded\n?/, "") || forwardingMessage.fileName || "Media Attachment"}
                </div>
              </div>
            )}

            {/* Search Bar */}
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search recipient..." 
              value={forwardSearchQuery}
              onChange={(e) => setForwardSearchQuery(e.target.value)}
              style={{ width: "100%", marginBottom: "1rem" }}
            />

            {/* Recipients Selection List */}
            <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1rem" }}>
              {/* General Channel */}
              <div 
                onClick={() => setForwardTargetId("general")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: forwardTargetId === "general" ? "rgba(0, 204, 255, 0.15)" : "rgba(255, 255, 255, 0.02)",
                  border: forwardTargetId === "general" ? "1px solid var(--accent-cyan)" : "1px solid var(--glass-border)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}
              >
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #4f46e5, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>🏢</div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>General Channel</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Company-wide</div>
                </div>
                {forwardTargetId === "general" && <span style={{ color: "var(--accent-cyan)", fontWeight: "bold" }}>✓</span>}
              </div>

              {/* Groups */}
              {sortedGroups.filter(g => g.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).map(g => (
                <div 
                  key={g.id}
                  onClick={() => setForwardTargetId(g.id)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: forwardTargetId === g.id ? "rgba(0, 204, 255, 0.15)" : "rgba(255, 255, 255, 0.02)",
                    border: forwardTargetId === g.id ? "1px solid var(--accent-cyan)" : "1px solid var(--glass-border)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}
                >
                  {renderAvatar("group", g, "32px")}
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>{g.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Group Chat</div>
                  </div>
                  {forwardTargetId === g.id && <span style={{ color: "var(--accent-cyan)", fontWeight: "bold" }}>✓</span>}
                </div>
              ))}

              {/* Employees */}
              {sortedEmployees.filter(e => String(e.id).toLowerCase() !== String(user?.id || "").toLowerCase() && e.name.toLowerCase().includes(forwardSearchQuery.toLowerCase())).map(e => (
                <div 
                  key={e.id}
                  onClick={() => setForwardTargetId(e.id)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: forwardTargetId === e.id ? "rgba(0, 204, 255, 0.15)" : "rgba(255, 255, 255, 0.02)",
                    border: forwardTargetId === e.id ? "1px solid var(--accent-cyan)" : "1px solid var(--glass-border)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}
                >
                  {renderAvatar("employee", e, "32px")}
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>{e.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{e.role} • {e.department}</div>
                  </div>
                  {forwardTargetId === e.id && <span style={{ color: "var(--accent-cyan)", fontWeight: "bold" }}>✓</span>}
                </div>
              ))}
            </div>

            <div className="modal-footer" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" className="btn-secondary" onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                disabled={!forwardTargetId}
                onClick={handleConfirmForward}
                style={{ opacity: forwardTargetId ? 1 : 0.5, cursor: forwardTargetId ? "pointer" : "not-allowed" }}
              >
                ↪️ Send Forward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic pulse recording animation style */}
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0.5; }
        }
        @media (min-width: 768px) {
          .chat-sidebar {
            display: flex !important;
          }
          .chat-back-button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
