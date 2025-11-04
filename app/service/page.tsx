'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

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

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getServices();
    getUser();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-screen">
        <p className="text-lg text-gray-600">Carregando serviços...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-blue-600">Nossos Serviços</h1>
          {user && (
            <a
              href="/create-service"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Criar Serviço
            </a>
          )}
        </div>
        {services.length === 0 ? (
          <p className="text-center text-gray-500">Nenhum serviço disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow duration-300 border border-gray-100"
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{service.title}</h2>
                <p className="text-gray-600 mb-4 line-clamp-3">{service.description}</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-green-600 font-bold">${service.price}</span>
                  <span className="text-yellow-500 font-medium">
                    Avaliação: {service.averageRating} / 5
                  </span>
                </div>
                <p className="text-sm text-gray-500">Por: {service.userName}</p>
                <p className="text-sm text-gray-500">Status: {service.availability}</p>
                <p className="text-sm text-gray-500">Categoria: {service.category}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}