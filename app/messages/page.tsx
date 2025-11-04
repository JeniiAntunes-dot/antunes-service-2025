'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type MessageItem = {
  id: string;
  message: string;
  timestamp: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        setError('Erro ao obter sessão.');
        setLoading(false);
        return;
      }
      const token = sessionRes.session?.access_token;
      const uid = sessionRes.session?.user?.id || null;
      setUserId(uid);
      if (!token) {
        setError('Token de autenticação ausente. Faça login.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/messages', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error || 'Falha ao carregar mensagens.');
        } else {
          setMessages(json.messages || []);
        }
      } catch (e) {
        setError('Erro de rede ao buscar mensagens.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  return (
    <div className="min-h-screen text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Mensagens</h1>
        {loading && (
          <div className="text-slate-300">Carregando suas mensagens...</div>
        )}
        {error && (
          <div className="text-red-400 mb-4">{error}</div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="text-slate-300">Nenhuma mensagem encontrada.</div>
        )}

        <ul className="space-y-3">
          {messages.map((m) => {
            const isMine = userId && m.senderId === userId;
            const otherUserId = userId && (m.senderId === userId ? m.receiverId : m.senderId);
            return (
              <li key={m.id} className="bg-white rounded-md p-4 shadow">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-500">
                    {m.timestamp ? new Date(m.timestamp as any).toLocaleString() : '-'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${isMine ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                    {isMine ? 'Enviada' : 'Recebida'}
                  </span>
                </div>
                <div className="text-sm text-slate-700 mb-2">
                  {m.message}
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-medium">De:</span> {m.senderName} {' '}
                  <span className="ml-4 font-medium">Para:</span> {m.receiverName}
                </div>
                {otherUserId && (
                  <div className="mt-3">
                    <button
                      onClick={() => router.push(`/chat/user/${otherUserId}`)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                      Abrir Chat
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}