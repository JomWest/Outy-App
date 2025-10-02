import io from 'socket.io-client';
import { CONFIG } from '../config';

class SocketService {
  constructor() {
    this.socket = null;
    this.messageListeners = new Map();
    this.statusListeners = new Map();
    this.globalMessageListeners = new Set();
    this.isConnected = false;
    this.joinedRooms = new Set();
    this.statusGlobalListeners = new Set();
  }

  connect(token) {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return;
    }

    if (!token) {
      console.error('No token provided for socket connection');
      return;
    }

    console.log('Connecting to socket server with token...');

    const isWeb = typeof window !== 'undefined';

    // Build socket URL from CONFIG.API_URL ensuring same origin/host as API
    const url = CONFIG.API_URL;

    this.socket = io(url, {
      auth: { token },
      // Use websocket first, then polling as fallback to avoid CORS/timeouts in some mobile networks
      transports: isWeb ? ['websocket', 'polling'] : ['websocket', 'polling'],
      withCredentials: false,
      timeout: 20000,
      forceNew: true,
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.isConnected = true;
      if (this.joinedRooms.size > 0) {
        console.log('Rejoining rooms after connect:', Array.from(this.joinedRooms));
        this.joinedRooms.forEach((roomId) => {
          this.socket.emit('join_conversation', roomId);
        });
      }
    });

    this.socket.on('reconnect', (attempt) => {
      console.log('Socket reconnected, attempt:', attempt);
      // Ensure rooms are rejoined on reconnect
      if (this.joinedRooms.size > 0) {
        console.log('Rejoining rooms after reconnect:', Array.from(this.joinedRooms));
        this.joinedRooms.forEach((roomId) => {
          this.socket.emit('join_conversation', roomId);
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
    });

    // Listen for incoming messages
    this.socket.on('message_received', (message) => {
      console.log('Message received via socket:', message);
      const conversationListeners = this.messageListeners.get(message.conversation_id);
      if (conversationListeners) {
        conversationListeners.forEach(callback => callback(message));
      }
      this.globalMessageListeners.forEach(callback => callback(message));
    });

    // Listen for message status updates
    this.socket.on('message_status_update', (statusUpdate) => {
      console.log('Message status update:', statusUpdate);
      const statusListeners = this.statusListeners.get(statusUpdate.conversation_id);
      if (statusListeners) {
        statusListeners.forEach(callback => callback(statusUpdate));
      }
      this.statusGlobalListeners.forEach(callback => callback(statusUpdate));
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting from socket server...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.messageListeners.clear();
      this.statusListeners.clear();
      this.globalMessageListeners.clear();
      this.joinedRooms.clear();
    }
  }

  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Join a conversation room
  joinConversation(conversationId) {
    this.joinedRooms.add(conversationId);
    if (this.socket && this.socket.connected) {
      console.log(`Joining conversation: ${conversationId}`);
      this.socket.emit('join_conversation', conversationId);
    }
  }

  // Leave a conversation room
  leaveConversation(conversationId) {
    this.joinedRooms.delete(conversationId);
    if (this.socket && this.socket.connected) {
      console.log(`Leaving conversation: ${conversationId}`);
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  sendMessage(conversationId, messageText) {
    if (this.socket && this.socket.connected) {
      console.log(`Sending message to conversation ${conversationId}:`, messageText);
      this.socket.emit('new_message', {
        conversationId,
        messageText
      });
    }
  }

  markMessageAsRead(conversationId, messageId) {
    if (this.socket && this.socket.connected) {
      console.log(`Marking message ${messageId} as read in conversation ${conversationId}`);
      this.socket.emit('message_read', {
        conversationId,
        messageId
      });
    }
  }

  addMessageStatusListener(callback) {
    this.statusGlobalListeners.add(callback);
    console.log('Added message status listener');
  }

  addMessageListener(conversationId, callback) {
    if (!this.messageListeners.has(conversationId)) {
      this.messageListeners.set(conversationId, new Set());
    }
    this.messageListeners.get(conversationId).add(callback);
    console.log(`Added message listener for conversation: ${conversationId}`);
  }

  removeMessageStatusListener(callback) {
    this.statusGlobalListeners.delete(callback);
    console.log('Removed message status listener');
  }

  removeMessageListener(conversationId, callback) {
    const listeners = this.messageListeners.get(conversationId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.messageListeners.delete(conversationId);
      }
      console.log(`Removed message listener for conversation: ${conversationId}`);
    }
  }

  addGlobalMessageListener(callback) {
    this.globalMessageListeners.add(callback);
    console.log('Added global message listener');
  }

  removeGlobalMessageListener(callback) {
    this.globalMessageListeners.delete(callback);
    console.log('Removed global message listener');
  }

  addStatusListener(conversationId, callback) {
    if (!this.statusListeners.has(conversationId)) {
      this.statusListeners.set(conversationId, new Set());
    }
    this.statusListeners.get(conversationId).add(callback);
    console.log(`Added status listener for conversation: ${conversationId}`);
  }

  removeStatusListener(conversationId, callback) {
    const listeners = this.statusListeners.get(conversationId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.statusListeners.delete(conversationId);
      }
      console.log(`Removed status listener for conversation: ${conversationId}`);
    }
  }
}

const socketService = new SocketService();
export default socketService;