"use client";

import Link from "next/link";

export default function ProviderDashboard() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Painel do Provedor</h1>

      <div className="space-y-4">
        <Link
          href="/services"
          className="block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Ver todos os serviços
        </Link>

        <Link
          href="/services/create"
          className="block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Criar novo serviço
        </Link>

        <Link
          href="/messages"
          className="block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Acessar mensagens
        </Link>
      </div>
    </div>
  );
}
