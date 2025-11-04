'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function EditService() {
  const { id } = useParams();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchService() {
      const { data, error } = await supabase.from('Service').select('*').eq('id', id).single();
      if (error) setError(error.message);
      else {
        setTitle(data.title);
        setDescription(data.description);
        setPrice(data.price.toString());
        setCategory(data.category);
        setAvailability(data.availability);
      }
    }
    fetchService();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('Service').update({
      title,
      description,
      price: parseFloat(price),
      category,
      availability,
    }).eq('id', id);
    if (error) setError(error.message);
    else router.push('/provider-dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
      <div className="bg-white/90 p-10 rounded-2xl shadow-2xl w-full max-w-lg backdrop-blur-md">
        <h1 className="text-3xl font-bold text-blue-600 mb-6 text-center">Editar Serviço</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
              rows={4}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
              required
            >
              <option value="">Selecione uma categoria</option>
              <option value="Limpeza">Limpeza</option>
              <option value="Manutenção">Manutenção</option>
              <option value="Educação">Educação</option>
              <option value="Tecnologia">Tecnologia</option>
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Disponibilidade</label>
            <input
              type="text"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Ex: Seg a Sex, 9h-17h"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl">
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  );
}