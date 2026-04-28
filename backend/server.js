require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const { auth: firebaseAuth, db } = require('./config/firebase');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET','POST'] }
});

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));

// Socket.io — authentification par Firebase Token
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Non authentifié'));
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    socket.userId   = decoded.uid;
    socket.userName = decoded.name || decoded.email;
    next();
  } catch {
    next(new Error('Token invalide'));
  }
});

const onlineUsers = new Map();

io.on('connection', async (socket) => {
  console.log('✅ Connecté:', socket.userId);
  onlineUsers.set(socket.userId, socket.id);
  io.emit('online_users', Array.from(onlineUsers.keys()));

  socket.on('join_room', async (room) => {
    socket.join(room);
    try {
      const snapshot = await db.collection('messages')
        .where('room', '==', room)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const msgs = snapshot.docs.map(doc => ({
        _id: doc.id, ...doc.data()
      })).reverse();

      socket.emit('message_history', msgs);
    } catch (err) {
      console.error('Erreur historique:', err.message);
    }
  });

  socket.on('send_message', async ({ room, text }) => {
    if (!text?.trim()) return;
    try {
      const msgData = {
        room,
        text:      text.trim(),
        userId:    socket.userId,
        userName:  socket.userName,
        createdAt: new Date().toISOString(),
      };
      const docRef = await db.collection('messages').add(msgData);
      io.to(room).emit('receive_message', { _id: docRef.id, ...msgData });
    } catch (err) {
      console.error('Erreur message:', err.message);
    }
  });

  socket.on('typing',      ({ room }) => socket.to(room).emit('user_typing',      { userName: socket.userName }));
  socket.on('stop_typing', ({ room }) => socket.to(room).emit('user_stop_typing'));

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

// Démarrage direct (plus besoin d'attendre MongoDB)
server.listen(process.env.PORT || 5000, () =>
  console.log(`🚀 Serveur sur http://localhost:${process.env.PORT || 5000}`)
);