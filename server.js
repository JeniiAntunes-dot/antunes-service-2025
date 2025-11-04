const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Armazenar conexões por usuário
  const userConnections = new Map();
  
  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // Quando um usuário se autentica
    socket.on('authenticate', (userId) => {
      console.log(`Usuário ${userId} autenticado no socket ${socket.id}`);
      userConnections.set(userId, socket.id);
      socket.userId = userId;
      socket.join(`user_${userId}`);
    });

    // Entrar em uma sala de chat específica
    socket.on('join_chat', (chatData) => {
      const { userId, targetUserId } = chatData;
      const roomId = [userId, targetUserId].sort().join('_');
      socket.join(roomId);
      console.log(`Usuário ${userId} entrou na sala ${roomId}`);
    });

    // Sair de uma sala de chat
    socket.on('leave_chat', (chatData) => {
      const { userId, targetUserId } = chatData;
      const roomId = [userId, targetUserId].sort().join('_');
      socket.leave(roomId);
      console.log(`Usuário ${userId} saiu da sala ${roomId}`);
    });

    // Enviar mensagem em tempo real
    socket.on('send_message', (messageData) => {
      const { senderId, receiverId, message, messageId, created_at } = messageData;
      const roomId = [senderId, receiverId].sort().join('_');
      
      // Enviar para todos na sala (incluindo o remetente)
      io.to(roomId).emit('new_message', {
        id: messageId,
        message,
        senderId,
        receiverId,
        created_at
      });

      console.log(`Mensagem enviada na sala ${roomId}:`, message);
    });

    // Quando o cliente desconecta
    socket.on('disconnect', () => {
      if (socket.userId) {
        userConnections.delete(socket.userId);
        console.log(`Usuário ${socket.userId} desconectado`);
      }
      console.log('Cliente desconectado:', socket.id);
    });

    // ==== Reviews (sistema de avaliação) ====
    // Entrar na sala do serviço para receber novas avaliações
    socket.on('join_service', ({ serviceId }) => {
      if (!serviceId) return;
      const roomId = `service_${serviceId}`;
      socket.join(roomId);
      console.log(`Socket ${socket.id} entrou na sala de serviço ${roomId}`);
    });

    socket.on('leave_service', ({ serviceId }) => {
      if (!serviceId) return;
      const roomId = `service_${serviceId}`;
      socket.leave(roomId);
      console.log(`Socket ${socket.id} saiu da sala de serviço ${roomId}`);
    });

    // Receber uma avaliação criada e retransmitir para todos na sala do serviço
    socket.on('send_review', (reviewData) => {
      try {
        const { serviceId } = reviewData || {};
        if (!serviceId) return;
        const roomId = `service_${serviceId}`;
        io.to(roomId).emit('new_review', reviewData);
        console.log(`Nova avaliação emitida para ${roomId}`);
      } catch (err) {
        console.warn('Falha ao emitir avaliação:', err);
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});