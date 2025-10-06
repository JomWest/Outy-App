// Socket.IO end-to-end test: create conversation, send message via HTTP, and observe socket events
// Run with: node scripts/test_socket_flow.js

const io = require('socket.io-client');

const API_URL = 'http://localhost:4002/api';

async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const data = await res.json();
  return { token: data.token, user: data.user };
}

async function getUsers(token) {
  const res = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Get users failed: ${res.status}`);
  return res.json();
}

async function createConversation(token, user1Id, user2Id) {
  const res = await fetch(`${API_URL}/conversations/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user1Id, user2Id })
  });
  if (!res.ok) throw new Error(`Create conversation failed: ${res.status}`);
  return res.json();
}

async function sendMessage(token, conversationId, messageText) {
  const res = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message_text: messageText })
  });
  if (!res.ok) throw new Error(`Send message failed: ${res.status}`);
  return res.json();
}

async function markMessageRead(token, conversationId, messageId) {
  const res = await fetch(`${API_URL}/conversations/${conversationId}/messages/${messageId}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Mark read failed: ${res.status}`);
  return res.json();
}

function deriveSeedPassword(email) {
  const m = email.match(/^user(\d+)@example\.com$/i);
  if (m) return `User${m[1]}#2024`;
  if (email.toLowerCase() === 'jomwest@outy.com') return 'CEO2024!';
  return 'Outy123!';
}

async function main() {
  try {
    console.log('Logging in as admin...');
    const { token: adminToken, user: adminUser } = await login('admin@outy.local', 'Outy123!');
    console.log('Admin:', adminUser);

    console.log('Fetching users...');
    const users = await getUsers(adminToken);
    const other = users.find(u => u.email.toLowerCase() === 'jomwest@outy.com') || users.find(u => u.id !== adminUser.id);
    if (!other) throw new Error('No other user found to create conversation');
    console.log('Other user selected:', other);

    console.log('Creating/Getting conversation...');
    const convResp = await createConversation(adminToken, adminUser.id, other.id);
    const conversationId = convResp.conversation_id;
    console.log('Conversation ID:', conversationId, 'created:', convResp.created);

    console.log('Connecting socket client as admin and joining conversation...');
    const socket = io('http://localhost:4002', { auth: { token: adminToken } });

    let receivedMessageId = null;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket test timeout')), 30000);

      socket.on('connect', () => {
        console.log('Socket connected');
        socket.emit('join_conversation', conversationId);

        // After join, send message via HTTP
        const text = `Test message at ${new Date().toISOString()}`;
        sendMessage(adminToken, conversationId, text).then(sentMsg => {
          console.log('HTTP send response:', sentMsg);
        }).catch(err => {
          console.error('Error sending HTTP message:', err.message);
          clearTimeout(timeout);
          reject(err);
        });
      });

      socket.on('message_received', (m) => {
        console.log('message_received:', m);
        if (!receivedMessageId) {
          receivedMessageId = m.id;
        }
        // Consider test successful upon receiving message
        clearTimeout(timeout);
        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', (e) => {
        console.error('Socket connect_error:', e.message);
      });
    });

    if (!receivedMessageId) throw new Error('Did not receive message_received event');

    console.log('Test completed');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

main();