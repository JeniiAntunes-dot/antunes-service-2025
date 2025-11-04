"use client";

import { useEffect, useState } from "react";

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  userName: string;
  averageRating: string;
}

export default function ServicesList() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/services");
        if (!res.ok) throw new Error("Erro ao buscar os serviços");
        const data: Service[] = await res.json();
        setServices(data);
      } catch (err: any) {
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  if (loading) return <p>Carregando serviços...</p>;
  if (error) return <p className="text-red-500">Erro: {error}</p>;
  if (services.length === 0) return <p>Nenhum serviço encontrado.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {services.map((service) => (
        <div
          key={service.id}
          className="bg-white rounded-xl shadow-md p-5 hover:shadow-xl transition border border-gray-200"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            {service.title}
          </h2>
          <p className="text-gray-600 text-sm mb-2">{service.description}</p>
          <p className="text-gray-700">
            <strong>Preço:</strong> R${service.price.toFixed(2)}
          </p>
          <p className="text-gray-700">
            <strong>Provedor:</strong> {service.userName}
          </p>
          <p className="text-yellow-600 font-medium">
            <strong>Avaliação:</strong> {service.averageRating}
          </p>
          <a
            href={`/review/${service.id}`}
            className="mt-3 inline-block bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          >
            Avaliar
          </a>
        </div>
      ))}
    </div>
  );
}
