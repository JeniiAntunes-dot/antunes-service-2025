'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSocket } from '@/lib/useSocket';

export default function UserChatPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [peer, setPeer] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<
    { id: string; senderId: string; senderName: string; text: string; timestamp: string }[]
  >([]);
  const [messageInput, setMessageInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  // Callback para receber novas mensagens via WebSocket
  const handleNewMessage = useCallback((message: any) => {
    setMessages(prev => {
      // Evitar duplicatas
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      
      return [...prev, {
        id: message.id,
        senderId: message.senderId,
        senderName: message.senderId === user?.id ? 'Você' : peer?.name || 'Desconhecido',
        text: message.message,
        timestamp: message.created_at
      }];
    });
  }, [user?.id, peer?.name]);

  // Configurar WebSocket
  const { isConnected, joinChat, leaveChat, sendMessage: sendMessageWS } = useSocket({
    userId: user?.id,
    targetUserId: id,
    onNewMessage: handleNewMessage
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push(`/login?redirect=/chat/user/${id}`);
        setLoading(false);
        return;
      }
      setUser(session.user);

      // Resolve nome do peer usando API server-side
      try {
        const res = await fetch(`/api/users/resolve-names?ids=${encodeURIComponent(id)}`);
        const json = await res.json();
        const name = (json?.names?.[id] as string) || 'Desconhecido';
        setPeer({ id, name });
      } catch {
        setPeer({ id, name: 'Desconhecido' });
      }

      setLoading(false);
    };
    init();
  }, [id]);

  // Entrar/sair da sala de chat via WebSocket
  useEffect(() => {
    if (user?.id && id && isConnected) {
      joinChat(id);
      return () => {
        leaveChat(id);
      };
    }
  }, [user?.id, id, isConnected, joinChat, leaveChat]);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user || !peer) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          router.push(`/login?redirect=/chat/user/${id}`);
          return;
        }

        const res = await fetch(`/api/chat/history?peerId=${encodeURIComponent(peer.id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const t = await res.text();
          console.error('Erro ao carregar histórico (API):', t);
          return;
        }
        const json = await res.json();
        const formattedMessages = (json?.messages ?? []).map((m: any) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: '',
          text: m.message,
          timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString() : '',
        }));
        setMessages(formattedMessages);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      }
    };

    loadChatHistory();

    const interval = setInterval(() => {
      loadChatHistory();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, peer]);

  useEffect(() => {
    if (!user || !peer || channelRef.current) return;

    const channel = supabase
      .channel(`chat:${user.id}:${peer.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Chat' },
        async (payload) => {
          const newMessage = payload.new;
          const involvesConversation =
            (newMessage.senderId === user.id && newMessage.receiverId === peer.id) ||
            (newMessage.senderId === peer.id && newMessage.receiverId === user.id);
          if (!involvesConversation) return;

          const exists = messages.some((msg) => msg.id === newMessage.id);
          if (exists) return;

          const { data: senderData } = await supabase
            .from('User')
            .select('name')
            .eq('id', newMessage.senderId)
            .single();

          setMessages((prev) => [
            ...prev,
            {
              id: newMessage.id,
              senderId: newMessage.senderId,
              senderName: senderData?.name || 'Desconhecido',
              text: newMessage.message,
              timestamp: newMessage.created_at ? new Date(newMessage.created_at).toLocaleTimeString() : '',
            },
          ]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to chat channel:', `chat:${user.id}:${peer.id}`);
        }
      });

    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, peer, messages]);

  const sendMessage = async () => {
    if (!messageInput.trim() || !user || !peer) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageInput.trim(), receiverId: peer.id }),
      });
      if (res.ok) {
        const payload = await res.json();
        
        // Enviar via WebSocket para atualização em tempo real
        sendMessageWS({
          senderId: user.id,
          receiverId: peer.id,
          message: payload.message,
          messageId: payload.id,
          created_at: payload.created_at
        });
        
        setMessageInput('');
      } else {
        const json = await res.json();
        console.error('Falha ao enviar mensagem:', json?.error || res.status);
      }
    } catch (e) {
      console.error('Erro de rede ao enviar mensagem:', e);
    }
  };

  const sendImage = async () => {
    if (!imageFile || !user || !peer) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const form = new FormData();
      form.append('file', imageFile);
      form.append('receiverId', peer.id);

      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (res.ok) {
        const payload = await res.json();
        sendMessageWS({
          senderId: user.id,
          receiverId: peer.id,
          message: payload.message,
          messageId: payload.id,
          created_at: payload.created_at,
        });
        setImageFile(null);
      } else {
        const json = await res.json();
        console.error('Falha ao enviar imagem:', json?.error || res.status);
      }
    } catch (e) {
      console.error('Erro de rede ao enviar imagem:', e);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <p className="text-lg text-blue-300 animate-pulse">Carregando chat...</p>
      </div>
    );
  }

  if (!peer) {
    return <div className="container mx-auto p-4">Usuário não encontrado.</div>;
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto p-4 py-12">
        <section className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-200">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            Chat com {peer.name}
          </h2>
          <div className="flex-1 overflow-y-auto mb-4 border border-gray-200 p-3 rounded-lg bg-gray-50 h-96">
            {messages.map((msg) => {
              const isImage = typeof msg.text === 'string' && /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(msg.text);
              return (
                <div
                  key={msg.id}
                  className={`mb-2 p-3 rounded-lg max-w-[75%] ${
                    msg.senderId === user?.id
                      ? 'bg-blue-600 text-black ml-auto text-right'
                      : 'bg-gray-100 text-black mr-auto'
                  }`}
                >
                  {isImage ? (
                    <img src={msg.text} alt="imagem" className="max-w-full rounded-md" />
                  ) : (
                    <p className="text-sm">{msg.text}</p>
                  )}
                  <p className="text-xs text-black mt-1">{msg.timestamp}</p>
                </div>
              );
            })}
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 border border-gray-300 rounded-lg p-2 text-black"
              placeholder="Digite sua mensagem"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Enviar
            </button>
          </div>
          <div className="flex space-x-2 mt-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="flex-1 border border-gray-300 rounded-lg p-2 text-black"
            />
            <button
              onClick={sendImage}
              disabled={!imageFile}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              Enviar imagem
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}