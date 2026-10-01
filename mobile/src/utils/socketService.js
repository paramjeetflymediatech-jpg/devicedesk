import { io } from 'socket.io-client';
import { getApiUrl } from './api';

let socketInstance = null;
let registeredUser = null;
const eventListeners = new Map();

/**
 * Derives the appropriate socket URL from the configured API URL.
 */
export function getSocketUrl() {
  const apiUrl = getApiUrl();
  try {
    const parsed = new URL(apiUrl);
    if (parsed.port === '3000') {
      parsed.port = '3001';
      return parsed.toString().replace(/\/$/, '');
    }
    // In production or custom domains (e.g. https://devicedesk.flymediatech.com)
    return apiUrl.replace(/\/$/, '');
  } catch (e) {
    return apiUrl;
  }
}

/**
 * Initialize or reuse the Socket.io connection
 */
export function initSocket(user) {
  if (!user || !user.id) {
    console.warn('[SocketService] Cannot init socket without user info');
    return null;
  }

  registeredUser = user;
  const socketUrl = getSocketUrl();

  // If already connected with same user, return existing socket
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  // If socket exists but disconnected or re-initializing, clean up first
  if (socketInstance) {
    try {
      socketInstance.disconnect();
    } catch (e) {}
  }

  console.log('[SocketService] Connecting to Socket server at:', socketUrl);

  socketInstance = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socketInstance.on('connect', () => {
    console.log('[SocketService] Connected with socket ID:', socketInstance.id);
    
    // Register current user
    socketInstance.emit('register-user', user.id);

    // Join common channels
    socketInstance.emit('join-room', 'general');

    if (user.department) {
      socketInstance.emit('join-room', `dept_${String(user.department).toLowerCase()}`);
    }

    const roleLower = String(user.role || user.dbRole || '').toLowerCase();
    const isAdminOrTL = roleLower.includes('admin') || roleLower.includes('superadmin') || roleLower.includes('management') || roleLower.includes('leader') || roleLower === 'tl';
    if (isAdminOrTL) {
      socketInstance.emit('join-room', 'marketing_monitors');
      socketInstance.emit('join-room', 'admin_room');
    }
  });

  socketInstance.on('connect_error', (err) => {
    console.warn('[SocketService] Socket connection error (will retry):', err?.message || err);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[SocketService] Disconnected:', reason);
  });

  // Re-attach all registered external listeners to the new instance
  eventListeners.forEach((callbacks, event) => {
    callbacks.forEach((cb) => {
      socketInstance.on(event, cb);
    });
  });

  return socketInstance;
}

/**
 * Get active socket instance
 */
export function getSocket() {
  return socketInstance;
}

/**
 * Subscribe to an event on the socket
 */
export function onSocketEvent(event, callback) {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event).add(callback);

  if (socketInstance) {
    socketInstance.on(event, callback);
  }

  return () => {
    offSocketEvent(event, callback);
  };
}

/**
 * Unsubscribe from a socket event
 */
export function offSocketEvent(event, callback) {
  if (eventListeners.has(event)) {
    eventListeners.get(event).delete(callback);
  }
  if (socketInstance) {
    socketInstance.off(event, callback);
  }
}

/**
 * Emit an event through socket if connected
 */
export function emitSocketEvent(event, data) {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit(event, data);
    return true;
  }
  return false;
}

/**
 * Emit a live marketing GPS location update
 */
export function emitMarketingLocation(locationData) {
  return emitSocketEvent('marketing-location-update', {
    ...locationData,
    timestamp: locationData.timestamp || new Date().toISOString(),
  });
}

/**
 * Emit IT Ticket creation alert
 */
export function emitTicketCreated(ticket) {
  return emitSocketEvent('ticket-created', ticket);
}

/**
 * Emit IT Ticket status update alert
 */
export function emitTicketUpdated(ticket) {
  return emitSocketEvent('ticket-updated', ticket);
}

/**
 * Emit EOD Submission alert
 */
export function emitEODSubmitted(eod) {
  return emitSocketEvent('eod-submitted', eod);
}

/**
 * Send a chat message over socket
 */
export function sendSocketMessage(message) {
  return emitSocketEvent('send-message', message);
}

/**
 * Edit a chat message over socket
 */
export function editSocketMessage(data) {
  return emitSocketEvent('edit-message', data);
}

/**
 * Delete a chat message over socket
 */
export function deleteSocketMessage(data) {
  return emitSocketEvent('delete-message', data);
}

/**
 * Send typing status indicator
 */
export function sendSocketTyping(receiverId, senderName) {
  return emitSocketEvent('typing', { receiverId, senderName, senderId: registeredUser?.id });
}

/**
 * Send stop typing indicator
 */
export function sendSocketStopTyping(receiverId) {
  return emitSocketEvent('stop-typing', { receiverId, senderId: registeredUser?.id });
}

/**
 * Mark messages as read
 */
export function sendSocketMessagesRead(senderId, readerId) {
  return emitSocketEvent('messages-read', { senderId, readerId });
}

/**
 * Disconnect socket cleanly on logout
 */
export function disconnectSocket() {
  if (socketInstance) {
    try {
      socketInstance.disconnect();
    } catch (e) {}
    socketInstance = null;
  }
  registeredUser = null;
}
