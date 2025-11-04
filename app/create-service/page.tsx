'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function CreateService() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [availability, setAvailability] = useState('available');
  const [category, setCategory] = useState('Limpeza');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Obtém token da sessão atual do Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token || sessionError) {
      setError('Token de autenticação ausente. Faça login novamente.');
      return;
    }

    try {
      const response = await fetch('/api/service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, price, category, availability }),
      });


      const data = await response.json();

      if (!response.ok) {
        console.error('Erro ao criar serviço:', data.error);
        setError(data.error || 'Erro ao criar serviço');
      } else {
        console.log('Serviço criado com sucesso:', data.service);
        router.push('/service');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erro inesperado ao criar serviço');
    }
  };

  return (
    <div className="container mx-auto p-4 text-black">
      <h1 className="text-3xl font-bold text-black mb-6">Criar Novo Serviço</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-black">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
            rows={4}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black">Preço ($)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black">Disponibilidade</label>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
            required
          >
            <option value="available">Disponível</option>
            <option value="unavailable">Indisponível</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-black">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
            required
          >
            <option value="Limpeza">Limpeza</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Consultoria">Consultoria</option>
            <option value="Outros">Outros</option>
            <option value="Pedreiro">Pedreiro</option>
            <option value="eletricista">eletricista</option>
            <option value="encanador">encanador</option>
            <option value="diarista">diarista</option>
            <option value="cozinheira">cozinheira</option>
            <option value="jardineiro">jardineiro</option>
            <option value="faz tudo">faz tudo</option>
            <option value="confeiteira">confeiteira</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
        >
          Criar Serviço
        </button>
      </form>
    </div>
  );
}