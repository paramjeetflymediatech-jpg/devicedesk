'use client';
import { useState, useEffect, useRef } from 'react';

export default function ProjectChat({ projectId, departmentId, currentUserId, currentUserName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (projectId && departmentId) {
      fetchMessages();
      // In a real app, set up WebSocket or polling here
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [projectId, departmentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/project/${projectId}?department_id=${departmentId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !fileUrl) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/chat/project/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_id: departmentId,
          sender_id: currentUserId,
          sender_name: currentUserName,
          content: newMessage,
          file_url: fileUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        setFileUrl('');
        setMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      alert("Error sending message");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-gray-50 shadow-sm">
      {/* Chat Header */}
      <div className="bg-white px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">
          Project Chat (Dept: {departmentId})
        </h3>
        <p className="text-sm text-gray-500">Communicate with your team and client</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-1 mx-1">{msg.senderName}</span>
              <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border rounded-bl-none text-gray-800'
              }`}>
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                {msg.fileUrl && (
                  <a 
                    href={msg.fileUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`block mt-2 text-sm underline ${isMine ? 'text-blue-100' : 'text-blue-600'}`}
                  >
                    View Attachment
                  </a>
                )}
              </div>
              <span className="text-xs text-gray-400 mt-1 mx-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex flex-col space-y-3">
          <input 
            type="text" 
            value={fileUrl}
            onChange={e => setFileUrl(e.target.value)}
            placeholder="Optional File URL (e.g. image link)"
            className="w-full text-sm border-gray-300 rounded-full border px-4 py-2 bg-gray-50"
          />
          <div className="flex space-x-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border-gray-300 rounded-full border px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 text-white rounded-full px-6 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
