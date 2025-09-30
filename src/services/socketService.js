import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.messageListeners = new Map();
    this.statusListeners = new Map();
    this.globalMessageListeners = new Set();
    this.isConnected = false;
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
    
    this.socket = io('http://localhost:4000', {
      auth: {
        token: token
      },
      transports: ['polling', 'websocket'],
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
    });

    // Listen for incoming messages
    this.socket.on('message_received', (message) => {
      console.log('Message received via socket:', message);
      
      // Notify conversation-specific listeners
      const conversationListeners = this.messageListeners.get(message.conversation_id);
      if (conversationListeners) {
        conversationListeners.forEach(callback => callback(message));
      }
      
      // Notify global listeners (for ChatsScreen)
      this.globalMessageListeners.forEach(callback => callback(message));
    });

    // Listen for message status updates
    this.socket.on('message_status_update', (statusUpdate) => {
      console.log('Message status update:', statusUpdate);
      
      const statusListeners = this.statusListeners.get(statusUpdate.conversation_id);
      if (statusListeners) {
        statusListeners.forEach(callback => callback(statusUpdate));
      }
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
    }
  }

  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Join a conversation room
  joinConversation(conversationId) {
    if (this.socket && this.socket.connected) {
      console.log(`Joining conversation: ${conversationId}`);
      this.socket.emit('join_conversation', conversationId);
    }
  }

  // Leave a conversation room
  leaveConversation(conversationId) {
    if (this.socket && this.socket.connected) {
      console.log(`Leaving conversation: ${conversationId}`);
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  // Send a message via socket (optional, can still use HTTP API)
  sendMessage(conversationId, messageText) {
    if (this.socket && this.socket.connected) {
      console.log(`Sending message to conversation ${conversationId}:`, messageText);
      this.socket.emit('new_message', {
        conversationId,
        messageText
      });
    }
  }

  // Mark message as read
  markMessageAsRead(conversationId, messageId) {
    if (this.socket && this.socket.connected) {
      console.log(`Marking message ${messageId} as read in conversation ${conversationId}`);
      this.socket.emit('message_read', {
        conversationId,
        messageId
      });
    }
  }

  // Mark message as read
  markMessageAsRead(conversationId, messageId) {
    if (this.socket && this.socket.connected) {
      console.log(`Marking message ${messageId} as read in conversation ${conversationId}`);
      this.socket.emit('message_read', {
        conversationId,
        messageId
      });
    }
  }

  // Add listener for message status updates
  addMessageStatusListener(callback) {
    if (this.socket) {
      this.socket.on('message_status_update', callback);
      console.log('Added message status listener');
    }
  }

  // Add listener for messages in a specific conversation
  addMessageListener(conversationId, callback) {
    if (!this.messageListeners.has(conversationId)) {
      this.messageListeners.set(conversationId, new Set());
    }
    this.messageListeners.get(conversationId).add(callback);
    console.log(`Added message listener for conversation: ${conversationId}`);
  }

  // Remove listener for message status updates
  removeMessageStatusListener(callback) {
    if (this.socket) {
      this.socket.off('message_status_update', callback);
      console.log('Removed message status listener');
    }
  }

  // Remove listener for messages in a specific conversation
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

  // Add global message listener (for ChatsScreen to update conversation list)
  addGlobalMessageListener(callback) {
    this.globalMessageListeners.add(callback);
    console.log('Added global message listener');
  }

  // Remove global message listener
  removeGlobalMessageListener(callback) {
    this.globalMessageListeners.delete(callback);
    console.log('Removed global message listener');
  }

  // Add listener for message status updates
  addStatusListener(conversationId, callback) {
    if (!this.statusListeners.has(conversationId)) {
      this.statusListeners.set(conversationId, new Set());
    }
    this.statusListeners.get(conversationId).add(callback);
    console.log(`Added status listener for conversation: ${conversationId}`);
  }

  // Remove listener for message status updates
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

// Export a singleton instance
const socketService = new SocketService();
export default socketService;