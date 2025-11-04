import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ReviewPayload {
  id: string;
  content: string;
  rating: number;
  serviceId: string;
  userId: string;
  photoUrl?: string | null;
  created_at?: string;
  author_name?: string;
}

interface UseReviewSocketProps {
  serviceId?: string;
  onNewReview?: (review: ReviewPayload) => void;
}

export const useReviewSocket = ({ serviceId, onNewReview }: UseReviewSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socketRef.current = io('http://localhost:3000', { transports: ['websocket', 'polling'] });
    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      if (serviceId) {
        socket.emit('join_service', { serviceId });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new_review', (review: ReviewPayload) => {
      if (onNewReview) onNewReview(review);
    });

    return () => {
      if (serviceId) socket.emit('leave_service', { serviceId });
      socket.disconnect();
    };
  }, [serviceId, onNewReview]);

  const sendReview = (review: ReviewPayload) => {
    if (socketRef.current) {
      socketRef.current.emit('send_review', review);
    }
  };

  return { isConnected, sendReview };
};