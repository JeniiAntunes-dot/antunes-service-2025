"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserResponse } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function Home() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [categoryQuery, setCategoryQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const getServices = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/service');
        const data = await res.json();
        if (!res.ok) {
          console.error('Erro ao carregar serviços:', data.error);
          setServices([]);
        } else {
          setServices(data);
        }
      } catch (err) {
        console.error('Erro inesperado ao carregar serviços:', err);
        setServices([]);
      }
      setLoading(false);
    };

    const syncSessionUser = async () => {
      const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        if (sessionErr.message !== 'Auth session missing!') {
          console.warn('Aviso ao carregar sessão:', sessionErr.message);
        }
        setUser(null);
        return;
      }
      setUser(sessionRes.session?.user ?? null);
    };

    getServices();
    syncSessionUser();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <p className="text-lg text-blue-300 animate-pulse">
          Carregando serviços...
        </p>
      </div>
    );
  }

  const openChat = (serviceId: string) => {
    router.push(`/chat/${serviceId}`);
  };

  const filteredServices = services.filter((s) => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return true;
    const categoryMatch = String(s.category || '').toLowerCase().includes(q);
    const titleMatch = String(s.title || '').toLowerCase().includes(q);
    return categoryMatch || titleMatch;
  });

  return (
    <div className="min-h-screen">
      <main className="container mx-auto p-4 py-12">
        <header className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img
              src="/logo.png"
              alt="Logo Antunes Serviços Autonomos"
              className="h-12 w-12 rounded"
            />
            <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 drop-shadow-lg">
              Bem-vindo ao Antunes Serviços Autonomos
            </h1>
          </div>
          <p className="text-xl text-gray-300 font-medium">
            Explore os serviços disponíveis e encontre o que você precisa!
          </p>
          {user && (
            <p className="text-md text-gray-300 mt-2">
              Olá, {user.user_metadata.name}!
            </p>
          )}
        </header>

        <section className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 mb-12 transform transition-all hover:scale-[1.01] duration-300">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 border-b-4 border-blue-300 pb-4">
            Todos os Serviços Disponíveis
          </h2>
          <div className="mb-6">
            <label htmlFor="category-search" className="sr-only">Pesquisar por título ou categoria</label>
            <input
              id="category-search"
              type="text"
              value={categoryQuery}
              onChange={(e) => setCategoryQuery(e.target.value)}
              placeholder="Pesquisar por título ou categoria..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>
          {filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 cursor-pointer animate-fade-up"
                >
                  <h3 className="text-2xl font-semibold text-blue-700 mb-3">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {service.description}
                  </p>
                  <div className="space-y-3">
                    <p className="text-lg text-green-600 font-bold">
                      Preço: ${service.price.toFixed(2)}
                    </p>
                    <p className="text-md text-gray-500">Disponibilidade: {service.availability}</p>
                    <p className="text-md text-gray-500">
                      Categoria: {service.category}
                    </p>
                    <p className="text-md text-gray-500">
                      Por: {service.userName}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openChat(service.id)}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                      >
                        Iniciar Chat
                      </button>
                      <button
                        onClick={() => router.push(`/review/${service.id}`)}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                      >
                        Avaliar Usuário
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-2xl text-gray-500">
                Nenhum serviço encontrado.
              </p>
              <p className="text-md text-gray-400 mt-2">
                Ajuste a busca por categoria ou crie o seu próprio serviço!
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
