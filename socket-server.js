const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Dynamically resolve environment file (.env.local, .env, or .env.production)
const envCandidates = ['.env.local', '.env', '.env.production'];
for (const envName of envCandidates) {
  const envPath = path.join(__dirname, envName);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cron = require('node-cron');

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// onlineUsers: Map of userId -> Set of socket.ids (handles multiple tabs per user!)
const onlineUsers = new Map();
// lastSeenMap: Map of userId -> ISO timestamp of when they last went fully offline
const lastSeenMap = new Map();

function broadcastPresence() {
  io.emit('online-users', Array.from(onlineUsers.keys()));
  io.emit('last-seen', Object.fromEntries(lastSeenMap));
}

// Trigger 9:00 PM Auto Punch Out via the Next.js auto-close API
async function triggerAutoClose() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const secret = process.env.SOCKET_INTERNAL_SECRET || 'devicedesk_socket_secret_2026';
  const body = JSON.stringify({ secret });

  const url = new URL('/api/attendance/auto-close', appUrl);
  const lib = url.protocol === 'https:' ? https : http;

  console.log(`[Cron] Triggering 9:00 PM IST Auto Punch-Out Sweep...`);
  return new Promise((resolve) => {
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { 
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`[Cron] Auto Punch-Out API Response: ${data}`);
          resolve();
        });
      }
    );
    req.on('error', (err) => { console.error('[Cron] triggerAutoClose error:', err.message); resolve(); });
    req.write(body);
    req.end();
  });
}

// Persist lastSeen to the database via the Next.js presence API
async function persistLastSeen(userId, isoTimestamp) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const secret = process.env.SOCKET_INTERNAL_SECRET || 'devicedesk_socket_secret_2026';
  const body = JSON.stringify({ userId, lastSeen: isoTimestamp, secret });

  const url = new URL('/api/presence', appUrl);
  const lib = url.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { res.resume(); resolve(); }
    );
    req.on('error', (err) => { console.warn('persistLastSeen error:', err.message); resolve(); });
    req.write(body);
    req.end();
  });
}

io.on('connection', (socket) => {
  console.log('Client connected to socket:', socket.id);

  socket.on('register-user', (userId) => {
    if (!userId) return;
    const lowerUserId = String(userId).toLowerCase();
    socket.userId = lowerUserId;
    
    if (!onlineUsers.has(lowerUserId)) {
      onlineUsers.set(lowerUserId, new Set());
    }
    onlineUsers.get(lowerUserId).add(socket.id);
    
    console.log(`User registered: ${lowerUserId} (Total tabs: ${onlineUsers.get(lowerUserId).size})`);
    
    // Broadcast presence + last-seen map to all clients
    broadcastPresence();

    // Also immediately send the new client the full last-seen map so they don't wait
    socket.emit('last-seen', Object.fromEntries(lastSeenMap));
  });

  socket.on('join-room', (roomId) => {
    if (!roomId) return;
    const lowerRoomId = String(roomId).toLowerCase();
    socket.join(lowerRoomId);
    console.log(`Socket ${socket.id} joined room ${lowerRoomId}`);
  });

  socket.on('leave-room', (roomId) => {
    if (!roomId) return;
    const lowerRoomId = String(roomId).toLowerCase();
    socket.leave(lowerRoomId);
    console.log(`Socket ${socket.id} left room ${lowerRoomId}`);
  });

  socket.on('send-message', (message) => {
    if (!message || !message.receiverId) return;
    const lowerReceiverId = String(message.receiverId).toLowerCase();

    if (lowerReceiverId.startsWith('group_') || lowerReceiverId.startsWith('dept_') || lowerReceiverId === 'general') {
      // Channel or Group: broadcast to everyone in the room except the sender
      socket.to(lowerReceiverId).emit('receive-message', message);
      console.log(`Broadcasted message in room: ${lowerReceiverId}`);
    } else {
      // Direct Message: emit to all socket connections of the receiver
      const receiverSockets = onlineUsers.get(lowerReceiverId);
      if (receiverSockets) {
        receiverSockets.forEach(socketId => {
          io.to(socketId).emit('receive-message', message);
        });
        console.log(`Sent direct message from ${message.senderId} to ${lowerReceiverId}`);
      }
    }
  });

  socket.on('edit-message', (data) => {
    if (!data || !data.receiverId) return;
    const lowerReceiverId = String(data.receiverId).toLowerCase();
    if (lowerReceiverId.startsWith('group_') || lowerReceiverId.startsWith('dept_') || lowerReceiverId === 'general') {
      io.to(lowerReceiverId).emit('message-edited', data);
    } else {
      const receiverSockets = onlineUsers.get(lowerReceiverId);
      if (receiverSockets) {
        receiverSockets.forEach(socketId => io.to(socketId).emit('message-edited', data));
      }
      const senderSockets = onlineUsers.get(String(data.senderId).toLowerCase());
      if (senderSockets) {
        senderSockets.forEach(socketId => io.to(socketId).emit('message-edited', data));
      }
    }
  });

  socket.on('delete-message', (data) => {
    if (!data || !data.receiverId) return;
    const lowerReceiverId = String(data.receiverId).toLowerCase();
    if (lowerReceiverId.startsWith('group_') || lowerReceiverId.startsWith('dept_') || lowerReceiverId === 'general') {
      io.to(lowerReceiverId).emit('message-deleted', data);
    } else {
      const receiverSockets = onlineUsers.get(lowerReceiverId);
      if (receiverSockets) {
        receiverSockets.forEach(socketId => io.to(socketId).emit('message-deleted', data));
      }
      const senderSockets = onlineUsers.get(String(data.senderId).toLowerCase());
      if (senderSockets) {
        senderSockets.forEach(socketId => io.to(socketId).emit('message-deleted', data));
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.userId) {
      const userSockets = onlineUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(socket.userId);
          const isoTimestamp = new Date().toISOString();
          // Record the last seen timestamp when the user fully goes offline
          lastSeenMap.set(socket.userId, isoTimestamp);
          console.log(`User went fully offline: ${socket.userId}`);
          // Persist to database
          persistLastSeen(socket.userId, isoTimestamp);
        }
      }
      broadcastPresence();
    }
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});

// Start the Cron Job for Auto Punch-Out (9:00 PM IST daily)
cron.schedule('0 21 * * *', () => {
  console.log(`[Cron] Executing daily 9:00 PM IST Auto Punch-Out script...`);
  triggerAutoClose();
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});
