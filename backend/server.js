require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const Message    = require('./models/Message');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET','POST'] }
});

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));

// Socket.io — authentification par token
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Non authentifié'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userName = decoded.name;
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
    const msgs = await Message.find({ room })
      .sort({ createdAt: -1 }).limit(50)
      .populate('user', 'name email')
      .lean();
    socket.emit('message_history', msgs.reverse());
  });

  socket.on('send_message', async ({ room, text }) => {
    if (!text?.trim()) return;
    const msg = await Message.create({
      room, user: socket.userId, text: text.trim()
    });
    const populated = await msg.populate('user', 'name email');
    io.to(room).emit('receive_message', {
      _id:       populated._id,
      text:      populated.text,
      user:      populated.user,
      createdAt: populated.createdAt,
    });
  });

  socket.on('typing',      ({ room, userName }) => socket.to(room).emit('user_typing', { userName }));
  socket.on('stop_typing', ({ room })           => socket.to(room).emit('user_stop_typing'));

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connecté');
    server.listen(process.env.PORT, () =>
      console.log(`🚀 Serveur sur http://localhost:${process.env.PORT}`)
    );
  })
  .catch(err => {
    console.error('❌ Erreur MongoDB:', err.message);
    process.exit(1);
  });