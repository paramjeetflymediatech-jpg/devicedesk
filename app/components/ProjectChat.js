'use client';
import { useState, useEffect, useRef } from 'react';
import { FiPaperclip, FiMic, FiSend, FiFileText, FiImage, FiSquare, FiDownload, FiX } from 'react-icons/fi';

export default function ProjectChat({ projectId, departmentId, currentUserId, currentUserName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // File Upload State
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (projectId && departmentId) {
      fetchMessages();
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

  const uploadMedia = async (fileOrBlob, filename) => {
    const formData = new FormData();
    formData.append('files', fileOrBlob, filename);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Upload failed');
    return data.fileUrls[0]; 
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    setLoading(true);
    let uploadedFileUrl = null;
    let uploadedFileName = null;
    let uploadedFileSize = null;

    try {
      if (selectedFile) {
        uploadedFileUrl = await uploadMedia(selectedFile, selectedFile.name);
        uploadedFileName = selectedFile.name;
        uploadedFileSize = selectedFile.size;
      }

      const res = await fetch(`/api/chat/project/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_id: departmentId,
          sender_id: currentUserId,
          sender_name: currentUserName,
          content: newMessage || (uploadedFileName ? `Sent a file: ${uploadedFileName}` : ''),
          file_url: uploadedFileUrl,
          file_name: uploadedFileName,
          file_size: uploadedFileSize
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        setSelectedFile(null);
        setMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      alert("Error sending message: " + err.message);
    }
    setLoading(false);
  };

  // ----- Audio Recording -----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop()); // stop mic
        
        // Auto send audio
        setLoading(true);
        try {
          const filename = `voice_message_${Date.now()}.webm`;
          const audioUrl = await uploadMedia(audioBlob, filename);

          const res = await fetch(`/api/chat/project/${projectId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              department_id: departmentId,
              sender_id: currentUserId,
              sender_name: currentUserName,
              content: 'Voice Message',
              file_url: audioUrl,
              file_name: filename,
              file_size: audioBlob.size
            })
          });
          const data = await res.json();
          if (data.success) {
            setMessages(prev => [...prev, data.message]);
          }
        } catch(err) {
           alert("Failed to send voice message: " + err.message);
        }
        setLoading(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ----- UI Renderers -----
  const renderAttachment = (url, name) => {
    if (!url) return null;
    const lowerUrl = url.toLowerCase();
    const isImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/) != null;
    const isAudio = lowerUrl.match(/\.(webm|mp3|wav|ogg|m4a)(\?.*)?$/) != null;

    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="block mt-2">
          <img src={url} alt={name || "Attachment"} className="max-w-full max-h-48 rounded-lg border border-gray-200" />
        </a>
      );
    }

    if (isAudio) {
      return (
        <div className="mt-2">
           <audio controls src={url} className="w-full h-10" />
        </div>
      );
    }

    // Default File Download
    return (
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-2 p-3 bg-white/10 rounded-lg border border-gray-200 hover:bg-white/20 transition-colors">
         <FiFileText size={20} className="shrink-0" />
         <span className="text-sm font-medium truncate">{name || "Download File"}</span>
         <FiDownload size={16} className="ml-auto shrink-0" />
      </a>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50/50">
        {messages.map((msg, index) => {
          const isMine = msg.senderId === currentUserId;
          const showName = index === 0 || messages[index - 1].senderId !== msg.senderId;

          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {showName && <span className="text-xs text-gray-500 mb-1 mx-2">{msg.senderName}</span>}
              <div className={`max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm ${
                isMine 
                  ? 'bg-indigo-600 text-white rounded-br-sm' 
                  : 'bg-white border border-gray-200 rounded-bl-sm text-gray-800'
              }`}>
                {msg.content && msg.content !== 'Voice Message' && !msg.content.startsWith('Sent a file:') && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                )}
                
                {msg.fileUrl && renderAttachment(msg.fileUrl, msg.fileName)}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 mx-2">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-gray-100">
        {selectedFile && (
          <div className="flex items-center gap-3 mb-3 p-3 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-lg text-sm">
             <FiFileText size={18} />
             <span className="font-medium truncate flex-1">{selectedFile.name}</span>
             <button onClick={() => setSelectedFile(null)} className="text-indigo-400 hover:text-indigo-600"><FiX size={18} /></button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={e => setSelectedFile(e.target.files[0])} 
            className="hidden" 
          />

          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors shrink-0"
            title="Attach File"
          >
            <FiPaperclip size={20} />
          </button>

          <div className="flex-1 bg-gray-100 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all flex items-center">
            <input 
              type="text" 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder={isRecording ? "Recording audio..." : "Type your message..."}
              disabled={isRecording}
              className="w-full bg-transparent border-none px-4 py-3 focus:outline-none text-sm disabled:opacity-50"
            />
          </div>

          {isRecording ? (
             <button 
               type="button" 
               onClick={stopRecording}
               className="p-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-full transition-colors shrink-0 flex items-center justify-center animate-pulse"
               title="Stop Recording"
             >
               <FiSquare size={18} fill="currentColor" />
             </button>
          ) : (
            <button 
              type="button" 
              onClick={startRecording}
              className="p-3 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors shrink-0"
              title="Record Voice Message"
            >
              <FiMic size={20} />
            </button>
          )}

          <button 
            type="submit" 
            disabled={loading || (!newMessage.trim() && !selectedFile)}
            className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:bg-gray-300 shrink-0 shadow-md"
            title="Send Message"
          >
            <FiSend size={18} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
