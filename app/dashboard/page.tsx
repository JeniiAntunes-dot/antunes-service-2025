'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Service = {
  id: string;
  title: string;
  description: string;
  price: number;
  availability: string;
  category: string;
};

type UnreadMessageSummary = {
  serviceId: string;
  serviceTitle: string;
  unreadCount: number;
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUserAndData = async () => {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setUser(user);

      if (!user || !session?.access_token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/service/mine', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await res.json();
        if (!res.ok) {
          console.error('Erro ao carregar seus serviços:', payload.error);
          setServices([]);
        } else {
          setServices(Array.isArray(payload) ? payload : []);
        }
      } catch (err: any) {
        console.error('Erro inesperado ao carregar seus serviços:', err?.message || err);
        setServices([]);
      }

      const { data: unreadChats, error: unreadError } = await supabase
        .from('Chat')
        .select('id, "receiverId", "senderId"')
        .eq('receiverId', user.id)
        .is('read', null); 

      if (unreadError) {
        console.error('Erro ao carregar mensagens não lidas:', unreadError.message);
        setUnreadMessages([]);
      } else {
        const countsMap: Record<string, number> = {};
        unreadChats?.forEach((msg) => {
          const service = services.find((s) => s.id === msg.senderId); 
          if (service) {
            countsMap[service.id] = (countsMap[service.id] || 0) + 1;
          }
        });

        const summary = Object.entries(countsMap).map(([serviceId, count]) => {
          const service = services.find((s) => s.id === serviceId);
          return {
            serviceId,
            serviceTitle: service ? service.title : 'Serviço Desconhecido',
            unreadCount: count,
          };
        });

        setUnreadMessages(summary);
      }

      setLoading(false);
    };

    getUserAndData();
  }, []);

  const openChat = (serviceId: string) => {
    router.push(`/chat/${serviceId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <p className="text-lg text-indigo-300 animate-pulse">Carregando seu dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto p-4 py-12">
        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4 drop-shadow-lg">
            Seu Dashboard
          </h1>
          {user ? (
            <p className="text-2xl text-gray-300 font-medium">
              Bem-vindo, <span className="font-bold text-indigo-600">{user.user_metadata.name}</span>!
            </p>
          ) : (
            <p className="text-xl text-gray-300">Por favor, faça login para acessar seu dashboard.</p>
          )}
        </header>

        {user && (
          <div className="space-y-10">
            <section className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 transform transition-all hover:scale-[1.02] duration-300">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 border-b-4 border-indigo-200 pb-4">
                Mensagens Novas
              </h2>
              {unreadMessages.length > 0 ? (
                <ul className="space-y-4">
                  {unreadMessages.map(({ serviceId, serviceTitle, unreadCount }) => (
                    <li
                      key={serviceId}
                      className="flex justify-between items-center border-b border-gray-200 pb-3"
                    >
                      <div>
                        <p className="text-lg font-semibold text-indigo-700">{serviceTitle}</p>
                        <p className="text-sm text-gray-500">
                          Você tem <span className="font-bold">{unreadCount}</span> mensagem(s) nova(s)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openChat(serviceId)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                        >
                          Abrir Chat
                        </button>
                        <button
                          onClick={() => router.push(`/review/${serviceId}`)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                        >
                          Avaliar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-8">Nenhuma mensagem nova no momento.</p>
              )}
            </section>

            <section className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 transform transition-all hover:scale-[1.02] duration-300">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 border-b-4 border-indigo-200 pb-4">
                Seus Serviços
              </h2>
              {services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-200 cursor-pointer animate-fade-up"
                    >
                      <h3 className="text-xl font-semibold text-indigo-700 mb-3">{service.title}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">{service.description}</p>
                      <div className="space-y-3">
                        <p className="text-lg text-green-600 font-bold">
                          Preço: ${service.price.toFixed(2)}
                        </p>
                        <p className="text-md text-gray-500">
                          Disponibilidade:{' '}
                          {service.availability === 'available' ? '✅ Disponível' : '❌ Indisponível'}
                        </p>
                        <p className="text-md text-gray-500">Categoria: {service.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-2xl text-gray-500">Você ainda não criou nenhum serviço.</p>
                  <p className="text-md text-gray-400 mt-2">Comece agora criando seu primeiro serviço!</p>
                  <a
                    href="/create-service"
                    className="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
                  >
                    Criar Serviço
                  </a>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}