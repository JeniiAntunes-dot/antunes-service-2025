'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';

export default function ChatPage() {
  const { serviceId } = useParams();
  const router = useRouter();
  const [service, setService] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<
    { id: string; senderId: string; senderName: string; text: string; timestamp: string }[]
  >([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const getServiceAndUser = async () => {
      setLoading(true);
      // Garantir que o usuário esteja autenticado; se não, redirecionar para login
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push(`/login?redirect=/chat/${serviceId}`);
        setLoading(false);
        return;
      }
      setUser(session.user);

      try {
        // 1) Tenta via endpoint server (usa chave de serviço, contorna RLS)
        const res = await fetch(`/api/service/${serviceId}`);
        if (res.ok) {
          const svc = await res.json();
          setService(svc);
        } else {
          // 2) Fallback: busca direto no Supabase pelo cliente
          const { data: svc, error: svcErr } = await supabase
            .from('Service')
            .select('id, title, description, price, availability, category, userId')
            .eq('id', String(serviceId))
            .single();

          if (svcErr || !svc) {
            console.error('Erro ao carregar serviço via Supabase:', svcErr?.message || 'Sem dados');
            setService(null);
          } else {
            const { data: userRow } = await supabase
              .from('User')
              .select('id, name, email')
              .eq('id', svc.userId)
              .single();

            setService({
              id: svc.id,
              title: svc.title,
              description: svc.description,
              price: svc.price,
              availability: svc.availability,
              category: svc.category,
              user: userRow || { id: svc.userId, name: 'Desconhecido', email: '' },
            });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar serviço:', error);
      }
      
      setLoading(false);
    };

    getServiceAndUser();
  }, [serviceId]);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user || !service) return;

      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        const token = sessionRes.session?.access_token;
        if (!token) {
          router.push(`/login?redirect=/chat/${serviceId}`);
          return;
        }
        const res = await fetch(`/api/chat/history?peerId=${encodeURIComponent(service.user.id)}`, {
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
          timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '',
        }));
        setMessages(formattedMessages);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      }
    };

    loadChatHistory();

    // Polling fallback: atualiza histórico a cada 5s caso Realtime esteja indisponível
    const interval = setInterval(() => {
      loadChatHistory();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [user, service]);

  useEffect(() => {
    if (!user || !service || channelRef.current) return;

    const handleMessage = async (payload: any) => {
      const newMessage = payload.new;
      if (!messages.some((msg) => msg.id === newMessage.id)) {
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
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };

    const channel = supabase
      .channel(`chat:${user.id}:${service.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Chat',
        },
        async (payload) => {
          const newMessage = payload.new;
          const involvesConversation =
            (newMessage.senderId === user.id && newMessage.receiverId === service.user.id) ||
            (newMessage.senderId === service.user.id && newMessage.receiverId === user.id);
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
              timestamp: new Date(newMessage.timestamp).toLocaleTimeString(),
            },
          ]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to chat channel:', `chat:${user.id}:${service.user.id}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [user, service, messages]);

  const sendMessage = async () => {
    if (!messageInput.trim() || !user || !service) return;

    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      if (!token) {
        console.error('Sessão ausente ao enviar mensagem');
        router.push(`/login?redirect=/chat/${serviceId}`);
        return;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageInput, receiverId: service.user.id }),
      });

      const payload = await res.json();
      if (!res.ok) {
        console.error('Erro ao enviar mensagem (API):', payload?.error || 'desconhecido');
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: payload.id,
          senderId: user.id,
          senderName: user.user_metadata?.name || 'Você',
          text: messageInput,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setMessageInput('');
    } catch (err: any) {
      console.error('Erro inesperado ao enviar mensagem:', err?.message || err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <p className="text-lg text-blue-300 animate-pulse">Carregando chat...</p>
      </div>
    );
  }

  if (!service) {
    return <div className="container mx-auto p-4">Serviço não encontrado.</div>;
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto p-4 py-12">
        <section className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-200">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            Chat com {service.user.name}
          </h2>
          <div className="flex-1 overflow-y-auto mb-4 border border-gray-200 p-3 rounded-lg bg-gray-50 h-96">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-2 p-3 rounded-lg max-w-[75%] ${
                  msg.senderId === user?.id
                    ? 'bg-blue-600 text-black ml-auto text-right'
                    : 'bg-gray-100 text-black mr-auto'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs text-black mt-1">
                  {msg.timestamp}
                </p>
              </div>
            ))}
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Enviar
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}