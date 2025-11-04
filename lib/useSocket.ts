import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  message: string;
  senderId: string;
  receiverId: string;
  created_at: string;
}

interface UseSocketProps {
  userId?: string;
  targetUserId?: string;
  onNewMessage?: (message: Message) => void;
}

export const useSocket = ({ userId, targetUserId, onNewMessage }: UseSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Conectar ao servidor WebSocket
    socketRef.current = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Conectado ao WebSocket');
      setIsConnected(true);
      
      // Autenticar o usuário
      socket.emit('authenticate', userId);
    });

    socket.on('disconnect', () => {
      console.log('Desconectado do WebSocket');
      setIsConnected(false);
    });

    socket.on('new_message', (message: Message) => {
      console.log('Nova mensagem recebida:', message);
      if (onNewMessage) {
        onNewMessage(message);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, onNewMessage]);

  // Entrar em uma sala de chat
  const joinChat = (targetId: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('join_chat', {
        userId,
        targetUserId: targetId
      });
    }
  };

  // Sair de uma sala de chat
  const leaveChat = (targetId: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit('leave_chat', {
        userId,
        targetUserId: targetId
      });
    }
  };

  // Enviar mensagem via WebSocket
  const sendMessage = (messageData: {
    senderId: string;
    receiverId: string;
    message: string;
    messageId: string;
    created_at: string;
  }) => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', messageData);
    }
  };

  return {
    isConnected,
    joinChat,
    leaveChat,
    sendMessage
  };
};